<script>

import axios from 'axios';
import {onMount, onDestroy } from 'svelte';
import { getConfig, upload } from '../../shared/util.js';

require('./WebAudioRecorder/WebAudioRecorder.min.js');

export let onClose;
export let projectId;
export let onUpload;

let audioRecorder = null;
let status = "idle"; 
let uploadProgress = 0;
const audioType = "mp3"; // wav or mp3 also possible
let counterInterval;
let timeDisplay = "";

const init = ()=> {

    console.log("init audio recorder")

    console.log("creating audio context")
    let audioCtx = new AudioContext();

    navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
                    
      console.log("creatig source")
      let source = audioCtx.createMediaStreamSource(stream);

      console.log("creatig WebAudioRecorder")
      audioRecorder = new WebAudioRecorder(source, {
        workerDir: "/",     // must end with slash
        encoding: audioType
      });

      audioRecorder.onComplete = async (recorder, blob) => {  
        clearInterval(counterInterval);
        counterInterval = null;
        await send(blob);
      }

    })
    .catch(function(err) {
      console.log(err)
      alert("microphone access not supported on your device")
      navigator.mediaDevices.enumerateDevices().then(devices=>{console.log(devices)});
    });
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

  counterInterval = setInterval(()=>{
    let sec = audioRecorder.recordingTime() | 0;
    timeDisplay = "" + (minSecStr(sec / 60 | 0)) + ":" + (minSecStr(sec % 60));
  }, 200);
}

onMount(init);

onDestroy(()=>{
  if(counterInterval) clearInterval(counterInterval)
});

const cancel = ()=>{
  audioRecorder.cancelRecording(); 
  status = "idle";
  onClose();
}


</script>

<div id="container">

    <button on:click={onClose}>cancel</button>

    {#if audioRecorder}
      {#if status == "idle" && !audioRecorder.isRecording()}
        <button on:click={()=>{
          audioRecorder.startRecording(); 
          status = "recording"; 
          startRecordingCounter();}
        }>start recording</button>
      {/if}

      {#if status == "recording" && audioRecorder.isRecording()}
        <button on:click={()=>{audioRecorder.finishRecording()}}>finish recording</button>
        {timeDisplay}
      {/if}

      {#if status == "uploading"}<span>uploading... {uploadProgress}%</span>{/if}
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
  
