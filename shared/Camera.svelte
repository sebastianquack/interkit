<script>

import axios from 'axios';
import {onMount, onDestroy } from 'svelte';
import { getConfig } from './util.js';

let videoElement;
let mediaStream;
let canvasElement;
let canvas;

export let onUpload;

const init = ()=> {
    videoElement = document.getElementById("video");
    canvasElement = document.getElementById("canvas");
    canvas = canvasElement.getContext("2d");
    
    // Use facingMode: environment to attemt to get the front camera on phones
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function(stream) {
      mediaStream = stream;
      video.srcObject = stream;
      video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
      video.play();
    });
}

let snapped = false;
const snap = ()=> {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      snapped = true;
      videoElement.hidden = true;
      canvasElement.hidden = false;
      canvasElement.height = video.videoHeight;
      canvasElement.width = video.videoWidth;
      canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);     
    }
}

const cancel = ()=> {
  videoElement.hidden = false;
  canvasElement.hidden = true;
  snapped = false;
}

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

const send = async ()=> {
  
  let fileType = "image/jpeg";
  let fileName = "image-" + Math.floor(10000 * Math.random()) + ".jpg";
  
  let dataURL = canvasElement.toDataURL('image/jpeg', 0.75);
  let blob = dataURItoBlob(dataURL);
  var file = new File( [blob], fileName, { type: 'image/jpeg' } ); 
  
  let response = await axios.post("/api/s3_sign", {
      fileName : fileName,
      fileType : fileType
  });
  if(!response) return null;
  console.log(response);

  var returnData = response.data.data.returnData;
  var signedRequest = returnData.signedRequest;
  
  console.log("Recieved a signed request " + signedRequest);
  
  let options = {
      headers: {
        'Content-Type': fileType
      },
      onUploadProgress: progressEvent => {console.log(progressEvent.loaded);}
    };
  
  let uploadResponse = await axios.put(signedRequest, file, options)
  console.log("Response from s3", uploadResponse);

  const res = await fetch("/api/file", {
      method: "post", 
      body: JSON.stringify([{
        filename: fileName,
        path: fileName
      }])
  });
  const json = await res.json();  
  console.log("new file created", json);

  let fileServerURL = await getConfig("fileServerURL");
  onUpload(fileServerURL + fileName);
}

onMount(init);

onDestroy(()=>{
  console.log("stopping video stream", mediaStream);
  mediaStream.getTracks().forEach((track)=>{
    track.stop();
  });

});

</script>

<div id="container">
  <video id="video"></video>
  <canvas id="canvas" hidden="hidden"></canvas>
  {#if snapped}
    <button on:click={send}>send</button>
    <button on:click={cancel}>cancel</button>
  {:else}
    <button on:click={snap}>snap</button>
  {/if}
</div>


<style>
  #container {
    height: 100%;
    width: 100%;
    background-color: white;
    box-sizing: border-box;
  }

  canvas, video {
    width: 100%;
    box-sizing: border-box;
  }
</style>
  
