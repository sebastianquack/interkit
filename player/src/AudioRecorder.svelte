<script>

import axios from 'axios';
import {onMount, onDestroy } from 'svelte';
import { getConfig, upload } from '../../shared/util.js';

require('./WebAudioRecorder.min.js');

export let onClose;
export let projectId;
export let onUpload;

let audioRecorder = null;
let status = "idle"; 
let uploadProgress = 0;
const audioType = "ogg"; // wav or mp3 also possible
let counterInterval;
let timeDisplay = "";

const init = ()=> {

    navigator.mediaDevices.getUserMedia ({audio: true}).then((stream) => {
        
      let audioCtx = new AudioContext();
      let source = audioCtx.createMediaStreamSource(stream);

      audioRecorder = new WebAudioRecorder(source, {
        workerDir: "/",     // must end with slash
        encoding: audioType
      });

      audioRecorder.onComplete = async (recorder, blob) => {  
        clearInterval(counterInterval);
        counterInterval = null;
        await send(blob);
      }

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


</script>

<div id="container">
    {#if audioRecorder}
      {#if status == "idle" && !audioRecorder.isRecording()}
        <button on:click={()=>{
          audioRecorder.startRecording(); 
          status = "recording"; 
          startRecordingCounter();}
        }>start recording</button>
      {/if}

      {#if status == "recording" && audioRecorder.isRecording()}
        <button on:click={()=>{audioRecorder.canceltRecording()}}>cancel recording</button>
        <button on:click={()=>{audioRecorder.finishRecording()}}>finish recording</button>
        {timeDisplay}
      {/if}

      {#if status == "uploading"}<span>uploading... {uploadProgress}%</span>{/if}
    {/if}  

    <button on:click={onClose}>close</button>
</div>


<style>
  #container {
    height: 100%;
    width: 100%;
    background-color: white;
    box-sizing: border-box;
  }

</style>
  
