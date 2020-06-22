<script>

import axios from 'axios';
import {onMount, onDestroy } from 'svelte';
import { getConfig, upload } from '../../shared/util.js';

import EncoderMp3 from './encoder-mp3-worker.js'

export let onClose;
export let projectId;
export let onUpload;

let audioCtx;
let encoderWorker;
let encoderMimeType;
let micAudioStream;
let inputStreamNode
let destinationNode;
let chunks = [];
let chunkType = '';

let status = "idle"; 
let uploadProgress = 0;
let counterInterval;
let timeDisplay = "";
let baseUrl;
let audioType = "mp3";
let blobUrl = null;


const init = async ()=> {
  console.log("init audio recorder")
  window.AudioContext = window.AudioContext || window.webkitAudioContext

  baseUrl = await getConfig("socketURL");
}

const createWorker = (fn) => {
  var js = fn
    .toString()
    .replace(/^function\s*\(\)\s*{/, '')
    .replace(/}$/, '')
  var blob = new Blob([js])
  return new Worker(URL.createObjectURL(blob))
}

const startRecording = () => {
  if(status != "idle") return
  status = "preparing"; 

  // This is the case on ios/chrome, when clicking links from within ios/slack (sometimes), etc.
  if (!navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Missing support for navigator.mediaDevices.getUserMedia') // temp: helps when testing for strange issues on ios/safari
    return
  }

  audioCtx = new AudioContext()

  if (audioCtx.createMediaStreamDestination) {
    destinationNode = audioCtx.createMediaStreamDestination()
  }
  else {
    destinationNode = audioCtx.destination
  }
  
  // Create web worker for doing the encoding
  encoderWorker = createWorker(EncoderMp3)
  encoderWorker.postMessage(['init', { baseUrl, sampleRate: audioCtx.sampleRate }])
  encoderMimeType = 'audio/mpeg'
  encoderWorker.addEventListener('message', (e) => {
    let event = new Event('dataavailable')
    event.data = new Blob(e.data, { type: encoderMimeType })
    onDataAvailable(event)
  })
  
  // Setup media constraints
  const userMediaConstraints = {
    audio: true
  }
  
  // This will prompt user for permission if needed
  return navigator.mediaDevices.getUserMedia(userMediaConstraints)
  .then((stream) => {
    startRecordingWithStream(stream)
  })
  .catch((error) => {
    alert('Error with getUserMedia: ' + error.message) // temp: helps when testing for strange issues on ios/safari
    console.log(error)
  })
}

const startRecordingWithStream = (stream) => {
  micAudioStream = stream
  inputStreamNode = audioCtx.createMediaStreamSource(micAudioStream)
  audioCtx = inputStreamNode.context
  inputStreamNode.connect(destinationNode)
  status = "recording"
  startRecordingCounter();
}
   
const finishRecording = ()=>{
  console.log("finishRecording")
  status = 'inactive'
  encoderWorker.postMessage(['dump', audioCtx.sampleRate])
  if(counterInterval) clearInterval(counterInterval)
}

const onDataAvailable = (evt) => {
    // console.log('state', this.mediaRecorder.state)
    // console.log('evt.data', evt.data)

    chunks.push(evt.data)
    chunkType = evt.data.type

    if (status !== 'inactive') {
      return
    }

    let blob = new Blob(chunks, { 'type': chunkType })
    blobUrl = URL.createObjectURL(blob)
    console.log(blobUrl);
    /*const recording = {
      ts: new Date().getTime(),
      blobUrl: blobUrl,
      mimeType: blob.type,
      size: blob.size
    }*/

    chunks = []
    chunkType = null

    if (destinationNode) {
      destinationNode.disconnect()
      destinationNode = null
    }
    if (inputStreamNode) {
      inputStreamNode.disconnect()
      inputStreamNode = null
    }

    //send(blob);
}

const send = async (blob)=> {
  status = "uploading";
  let fileName = "audio-" + Math.floor(10000 * Math.random()) + "." + audioType;
  var file = new File( [blob], fileName, { type: 'audio/' + audioType } ); 
  console.log(file)
  await upload(file, progressEvent => {console.log(progressEvent); uploadProgress = progressEvent}, projectId) 
  await onUpload(fileName);
}

let recordingStartTime;
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

    {#if status == "idle"}
      <button on:click={startRecording}>start recording</button>
    {/if}

    {#if status == "recording"}
      <button on:click={finishRecording}>finish recording</button>
      {timeDisplay}
    {/if}

    {#if status == "uploading"}<span>uploading... {uploadProgress}%</span>{/if}

    {#if blobUrl}
      <audio controls="controls">
        <source src={blobUrl} type="audio/mp3">
      </audio>
    {/if}
    
</div>


<style>
  #container {
    height: 100%;
    width: 100%;
    background-color: white;
    box-sizing: border-box;
  }

</style>
  
