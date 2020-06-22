<script>

import axios from 'axios';
import {onMount, onDestroy } from 'svelte';
import { getConfig, upload } from '../../shared/util.js';

import EncoderMp3 from './encoder-mp3-worker.js'
import EncoderWav from './encoder-wav-worker.js'

export let onClose;
export let projectId;
export let onUpload;

let status = "inactive"; 
let uploadProgress = 0;
let counterInterval;
let timeDisplay = "";
let audioType = "mp3"; // file ending for upload
let recording = null;
let recordingStartTime;

// adapted from https://github.com/kaliatech/web-audio-recording-tests/blob/master/src/shared/RecorderService.js

let BASE_URL;
let audioCtx;
let encoderWorker;
let encoderMimeType;
let micAudioStream;
let inputStreamNode;
let micGainNode;
let analyserNode;
let processorNode;
let outputGainNode;
let destinationNode;
let dynamicsCompressorNode;
let mediaRecorder;
let chunks = [];
let chunkType = '';
let slicing;
let em;

let config = {
      broadcastAudioProcessEvents: false,
      createAnalyserNode: false,
      createDynamicsCompressorNode: false,
      forceScriptProcessor: false,
      manualEncoderId: 'mp3',
      micGain: 0.75,
      processorBufferSize: 2048,
      stopTracksAndCloseCtxWhenFinished: true,
      usingMediaRecorder: typeof window.MediaRecorder !== 'undefined',
      enableEchoCancellation: true
    }

const init = async ()=> {
  console.log("init audio recorder")
  window.AudioContext = window.AudioContext || window.webkitAudioContext
  BASE_URL = await getConfig("socketURL");
  em = document.createDocumentFragment()
}

const createWorker = (fn) => {
    var js = fn
      .toString()
      .replace(/^function\s*\(\)\s*{/, '')
      .replace(/}$/, '')
    var blob = new Blob([js])
    return new Worker(URL.createObjectURL(blob))
  }

const startRecording = (timeslice) => {
  if (status !== 'inactive') {
    return
  }

  // This is the case on ios/chrome, when clicking links from within ios/slack (sometimes), etc.
  if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Missing support for navigator.mediaDevices.getUserMedia') // temp: helps when testing for strange issues on ios/safari
    return
  }

  audioCtx = new AudioContext()
  micGainNode = audioCtx.createGain()
  outputGainNode = audioCtx.createGain()

  if (config.createDynamicsCompressorNode) {
    dynamicsCompressorNode = audioCtx.createDynamicsCompressor()
  }

  if (config.createAnalyserNode) {
    analyserNode = audioCtx.createAnalyser()
  }

  // If not using MediaRecorder(i.e. safari and edge), then a script processor is required. It's optional
  // on browsers using MediaRecorder and is only useful if wanting to do custom analysis or manipulation of
  // recorded audio data.
  if (config.forceScriptProcessor || config.broadcastAudioProcessEvents || !config.usingMediaRecorder) {
    processorNode = audioCtx.createScriptProcessor(config.processorBufferSize, 1, 1) // TODO: Get the number of channels from mic
  }

  // Create stream destination on chrome/firefox because, AFAICT, we have no other way of feeding audio graph output
  // in to MediaRecorderSafari/Edge don't have this method as of 2018-04.
  if (audioCtx.createMediaStreamDestination) {
    destinationNode = audioCtx.createMediaStreamDestination()
  }
  else {
    destinationNode = audioCtx.destination
  }

  // Create web worker for doing the encoding
  if (!config.usingMediaRecorder) {
    if (config.manualEncoderId === 'mp3') {
      // This also works and avoids weirdness imports with workers
      // encoderWorker = new Worker(BASE_URL + '/workers/encoder-ogg-worker.js')
      encoderWorker = createWorker(EncoderMp3)
      encoderWorker.postMessage(['init', { baseUrl: BASE_URL, sampleRate: audioCtx.sampleRate }])
      encoderMimeType = 'audio/mpeg'
    }
    else if (config.manualEncoderId === 'ogg') {
      encoderWorker = createWorker(EncoderOgg)
      encoderWorker.postMessage(['init', { baseUrl: BASE_URL, sampleRate: audioCtx.sampleRate }])
      encoderMimeType = 'audio/ogg'
    }
    else {
      encoderWorker = createWorker(EncoderWav)
      encoderMimeType = 'audio/wav'
    }
    encoderWorker.addEventListener('message', (e) => {
      let event = new Event('dataavailable')
      if (config.manualEncoderId === 'ogg') {
        event.data = e.data
      }
      else {
        event.data = new Blob(e.data, { type: encoderMimeType })
      }
      _onDataAvailable(event)
    })
  }

  // Setup media constraints
  const userMediaConstraints = {
    audio: {
      echoCancellation: config.enableEchoCancellation
    }
  }
  if (config.deviceId) {
    userMediaConstraints.audio.deviceId = config.deviceId
  }

  // This will prompt user for permission if needed
  return navigator.mediaDevices.getUserMedia(userMediaConstraints)
    .then((stream) => {
      _startRecordingWithStream(stream, timeslice)
    })
    .catch((error) => {
      alert('Error with getUserMedia: ' + error.message) // temp: helps when testing for strange issues on ios/safari
      console.log(error)
    })
}

const _startRecordingWithStream = (stream, timeslice) => {
  micAudioStream = stream

  inputStreamNode = audioCtx.createMediaStreamSource(micAudioStream)
  audioCtx = inputStreamNode.context

  // Kind-of a hack to allow hooking in to audioGraph inputStreamNode
  /*if (onGraphSetupWithInputStream) {
    onGraphSetupWithInputStream(inputStreamNode)
  }*/

  inputStreamNode.connect(micGainNode)
  micGainNode.gain.setValueAtTime(config.micGain, audioCtx.currentTime)

  let nextNode = micGainNode
  if (dynamicsCompressorNode) {
    micGainNode.connect(dynamicsCompressorNode)
    nextNode = dynamicsCompressorNode
  }

  status = 'recording'
  startRecordingCounter();

  if (processorNode) {
    nextNode.connect(processorNode)
    processorNode.connect(outputGainNode)
    processorNode.onaudioprocess = (e) => _onAudioProcess(e)
  }
  else {
    nextNode.connect(outputGainNode)
  }

  if (analyserNode) {
    // TODO: If we want the analyser node to receive the processorNode's output, this needs to be changed _and_
    //       processor node needs to be modified to copy input to output. It currently doesn't because it's not
    //       needed when doing manual encoding.
    // processorNode.connect(analyserNode)
    nextNode.connect(analyserNode)
  }

  outputGainNode.connect(destinationNode)

  if (config.usingMediaRecorder) {
    mediaRecorder = new MediaRecorder(destinationNode.stream)
    mediaRecorder.addEventListener('dataavailable', (evt) => _onDataAvailable(evt))
    mediaRecorder.addEventListener('error', (evt) => _onError(evt))

    mediaRecorder.start(timeslice)
  }
  else {
    // Output gain to zero to prevent feedback. Seems to matter only on Edge, though seems like should matter
    // on iOS too.  Matters on chrome when connecting graph to directly to audioCtx.destination, but we are
    // not able to do that when using MediaRecorder.
    outputGainNode.gain.setValueAtTime(0, audioCtx.currentTime)
    // outputGainNode.gain.value = 0

    // Todo: Note that time slicing with manual wav encoderWav won't work. To allow it would require rewriting the encoderWav
    // to assemble all chunks at end instead of adding header to each chunk.
    /*if (timeslice) {
      console.log('Time slicing without MediaRecorder is not yet supported. The resulting recording will not be playable.')
      slicing = setInterval(function () {
        if (status === 'recording') {
          encoderWorker.postMessage(['dump', audioCtx.sampleRate])
        }
      }, timeslice)
    }*/
  }
}

const _onAudioProcess = (e) => {
    // console.log('onaudioprocess', e)
    // let inputBuffer = e.inputBuffer
    // let outputBuffer = e.outputBuffer
    // console.log(this.micAudioStream)
    // console.log(this.audioCtx)
    // console.log(this.micAudioStream.getTracks().forEach((track) => console.log(track)))

    // this.onAudioEm.dispatch(new Event('onaudioprocess', {inputBuffer:inputBuffer,outputBuffer:outputBuffer}))

    if (config.broadcastAudioProcessEvents) {
      em.dispatchEvent(new CustomEvent('onaudioprocess', {
        detail: {
          inputBuffer: e.inputBuffer,
          outputBuffer: e.outputBuffer
        }
      }))
    }

    // // Example handling:
    // let inputBuffer = e.inputBuffer
    // let outputBuffer = e.outputBuffer
    // // Each channel (usually only one)
    // for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
    //   let inputData = inputBuffer.getChannelData(channel)
    //   let outputData = outputBuffer.getChannelData(channel)
    //
    //   // Each sample
    //   for (let sample = 0; sample < inputBuffer.length; sample++) {
    //     // Make output equal to the same as the input (thus processor is doing nothing at this time)
    //     outputData[sample] = inputData[sample]
    //   }
    // }

    // When manually encoding (safari/edge), there's no reason to copy data to output buffer.  We set the output
    // gain to 0 anyways (which is required on Edge if we did copy data to output). However, if using a MediaRecorder
    // and a processor (all other browsers), then it would be required to copy the data otherwise the graph would
    // generate no data for the MediaRecorder to consume.
    // if (this.forceScriptProcessor) {

    // // Copy input to output
    // let inputBuffer = e.inputBuffer
    // let outputBuffer = e.outputBuffer
    // // This doesn't work on iOS/Safari. Guessing it doesn't have copyToChannel support, but haven't verified.
    // for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
    //   outputBuffer.copyToChannel(inputBuffer.getChannelData(channel), channel)
    // }

    // Safari and Edge require manual encoding via web worker. Single channel only for now.
    // Example stereo encoderWav: https://github.com/MicrosoftEdge/Demos/blob/master/microphone/scripts/recorderworker.js
    if (!config.usingMediaRecorder) {
      if (status === 'recording') {
        if (config.broadcastAudioProcessEvents) {
          encoderWorker.postMessage(['encode', e.outputBuffer.getChannelData(0)])
        }
        else {
          encoderWorker.postMessage(['encode', e.inputBuffer.getChannelData(0)])
        }
      }
    }
  }

const stopRecording = () => {
  if (status === 'inactive') {
    return
  }
  if (config.usingMediaRecorder) {
    status = 'inactive'
    mediaRecorder.stop()
  }
  else {
    status = 'inactive'
    encoderWorker.postMessage(['dump', audioCtx.sampleRate])
    clearInterval(slicing)

    // TODO: There should be a more robust way to handle this
    // Without something like this, I think  the last recorded sample could be lost due to timing
    // setTimeout(() => {
    //   status = 'inactive'
    //   encoderWorker.postMessage(['dump', audioCtx.sampleRate])
    // }, 100)
  }
}

const _onDataAvailable = (evt) => {
  // console.log('status', mediaRecorder.status)
  // console.log('evt.data', evt.data)

  chunks.push(evt.data)
  chunkType = evt.data.type

  if (status !== 'inactive') {
    return
  }

  let blob = new Blob(chunks, { 'type': chunkType })
  let blobUrl = URL.createObjectURL(blob)
  recording = {
    ts: new Date().getTime(),
    blobUrl: blobUrl,
    mimeType: blob.type,
    size: blob.size
  }

  chunks = []
  chunkType = null

  if (destinationNode) {
    destinationNode.disconnect()
    destinationNode = null
  }
  if (outputGainNode) {
    outputGainNode.disconnect()
    outputGainNode = null
  }
  if (analyserNode) {
    analyserNode.disconnect()
    analyserNode = null
  }
  if (processorNode) {
    processorNode.disconnect()
    processorNode = null
  }
  if (encoderWorker) {
    encoderWorker.postMessage(['close'])
    encoderWorker = null
  }
  if (dynamicsCompressorNode) {
    dynamicsCompressorNode.disconnect()
    dynamicsCompressorNode = null
  }
  if (micGainNode) {
    micGainNode.disconnect()
    micGainNode = null
  }
  if (inputStreamNode) {
    inputStreamNode.disconnect()
    inputStreamNode = null
  }

  if (config.stopTracksAndCloseCtxWhenFinished) {
    // This removes the red bar in iOS/Safari
    if(micAudioStream)
      micAudioStream.getTracks().forEach((track) => track.stop())
    micAudioStream = null

    if(audioCtx)
      audioCtx.close()
    audioCtx = null
  }

  //em.dispatchEvent(new CustomEvent('recording', { detail: { recording: recording } }))
  send(blob);

}

const send = async (blob)=> {
  status = "uploading";
  let fileName = "audio-" + Math.floor(10000 * Math.random()) + "." + audioType;
  var file = new File( [blob], fileName, { type: 'audio/' + audioType } ); 
  console.log(file)
  await upload(file, progressEvent => {console.log(progressEvent); uploadProgress = progressEvent}, projectId) 
  await onUpload(fileName);
}

const startRecordingCounter = () => {
  const minSecStr = function(n) {
    return (n < 10 ? "0" : "") + n;
  };
  recordingStartTime = Date.now()
  counterInterval = setInterval(()=>{
    let sec = parseInt((Date.now() - recordingStartTime) / 1000);
    timeDisplay = "" + (minSecStr(sec / 60 | 0)) + ":" + (minSecStr(sec % 60));
  }, 200);
}

onMount(init);

onDestroy(()=>{
  if(counterInterval) clearInterval(counterInterval)
});

const cancel = ()=>{
  status = "idle";
  onClose();
}


</script>

<div id="container">

    <button on:click={onClose}>cancel</button>

    {#if status == "inactive"}
      <button on:click={startRecording}>start recording</button>
    {/if}

    {#if status == "recording"}
      <button on:click={stopRecording}>finish recording</button>
      {timeDisplay}
    {/if}

    {#if status == "uploading"}<span>uploading... {uploadProgress}%</span>{/if}

    <!--
    {#if recording}
      <audio controls="controls">
        <source src={recording.blobUrl} type={recording.mimeType}>
      </audio>
    {/if}
    -->
    
</div>


<style>
  #container {
    height: 100%;
    width: 100%;
    background-color: white;
    box-sizing: border-box;
  }

</style>
  
