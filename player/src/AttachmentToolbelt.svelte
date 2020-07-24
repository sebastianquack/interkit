<script>

  import { getConfig, postPlayerMessage } from '../../shared/util.js';

  import QRScanner from './QRScanner.svelte';
  import Camera from './Camera.svelte';
  import AudioRecorder from './AudioRecorder.svelte';

  export let attachmentMenuOpen;
  export let closeAttachmentMenu;
  export let scrollUp;
  export let googleMapsAPIKey;
  export let addItem;
  export let clearInput;
  export let projectId;
  export let currentNode;
  export let playerId;
  export let inputInterface;

  let toolOpen = null;
  const openTool = (tool) => {
    toolOpen = tool;
  }
  const closeTool = () => {
    toolOpen = null;
    closeAttachmentMenu();
  }

  const sendQRCode = (code) => {
    let item = {
      message: "[QR code scanned]",
      attachment: {QRCode: code},
      params: {},
      node: currentNode._id, board: currentNode.board, project: projectId, sender: playerId
    }

    addItem({...item, side: "right"});
    postPlayerMessage(item);
    clearInput();
    scrollUp();
  }

  const getGPSLocation = ()=>{
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position)=>{
        console.log("gps", position.coords);

        let mapUrl = "https://www.google.com/maps/@"+position.coords.latitude+","+position.coords.longitude+",18z";
        let mapImgUrl = 
          "https://maps.googleapis.com/maps/api/staticmap?center="
          +position.coords.latitude+","+position.coords.longitude
          +"&zoom=18&size=150x150"
          //+"&markers=size:small%7Ccolor:black%7C"+position.coords.latitude+","+position.coords.longitude
          +"&key="+googleMapsAPIKey
          +"&style=element:geometry%7Ccolor:0xf5f5f5&style=element:labels.icon%7Cvisibility:off&style=element:labels.text.fill%7Ccolor:0x616161&style=element:labels.text.stroke%7Ccolor:0xf5f5f5&style=feature:administrative.land_parcel%7Celement:labels.text.fill%7Ccolor:0xbdbdbd&style=feature:poi%7Celement:geometry%7Ccolor:0xeeeeee&style=feature:poi%7Celement:labels.text.fill%7Ccolor:0x757575&style=feature:poi.park%7Celement:geometry%7Ccolor:0xe5e5e5&style=feature:poi.park%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&style=feature:road%7Celement:geometry%7Ccolor:0xffffff&style=feature:road.arterial%7Celement:labels.text.fill%7Ccolor:0x757575&style=feature:road.highway%7Celement:geometry%7Ccolor:0xdadada&style=feature:road.highway%7Celement:labels.text.fill%7Ccolor:0x616161&style=feature:road.local%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&style=feature:transit.line%7Celement:geometry%7Ccolor:0xe5e5e5&style=feature:transit.station%7Celement:geometry%7Ccolor:0xeeeeee&style=feature:water%7Celement:geometry%7Ccolor:0xc9c9c9&style=feature:water%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&";
        
        let item = {
          attachment: {
            mediatype: "GPS",
            imgSrc: mapImgUrl,
            lat: position.coords.latitude, 
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          },
          params: {},
          node: currentNode._id, board: currentNode.board, project: projectId, sender: playerId        
        }

        addItem({...item, side: "right"});
        postPlayerMessage(item);
        clearInput();
      });
    } else {
      alert("geolocation not supported");
    }
    closeAttachmentMenu();
  }

  const sendAttachment = async (fileObject, mediatype) => {
    let fileServerURL = await getConfig("fileServerURL");
    console.log("fileServerURL", fileServerURL);

    console.log("fileObj", fileObject)

    let item = {
      attachment: {
        mediatype,
        imgSrc: mediatype == "image" ? fileServerURL + fileObject.filename : undefined,  
        audioSrc: mediatype == "audio" ? fileServerURL + fileObject.filename : undefined,
        key: fileObject.key
      },
      params: {},
      node: currentNode._id, board: currentNode.board, project: projectId, sender: playerId
    }
    
    addItem({...item, side: "right"});
    postPlayerMessage(item);
    clearInput();
    scrollUp();
  }


  let singleTool = null;

  $: {
    if(!inputInterface.text && inputInterface.attachments 
      && !inputInterface.image 
      && inputInterface.audio 
      && !inputInterface.qr 
      && !inputInterface.gps) 
      singleTool = "audio"
    else 
      singleTool = null;
  }

</script>


{#if (inputInterface.attachments && attachmentMenuOpen) || (inputInterface.attachments && !inputInterface.text && !singleTool)}
  <div class="input-container">      
      {#if inputInterface.image}<button on:click={()=>{openTool("camera")}}>Photo</button>{/if}
      {#if inputInterface.audio}<button on:click={()=>{openTool("audio")}}>Audio</button>{/if}
      {#if inputInterface.qr}<button on:click={()=>{openTool("qr-code")}}>QR</button>{/if}
      {#if inputInterface.gps}<button on:click={getGPSLocation}>GPS</button>{/if}
      {#if inputInterface.text}<button class="close-attachment" on:click={closeAttachmentMenu}>close</button>{/if}
  </div>  
{/if}
  
{#if toolOpen == "qr-code"}
  <div class="tool-container">
    <button class="close-qr" on:click={closeTool}>close</button>
    <QRScanner
      onScan={(code)=>{
        closeTool();
        sendQRCode(code);
      }}
    />
  </div>
{/if}

{#if toolOpen == "camera"}
  <div class="tool-container">
    <Camera
      {projectId}
      onUpload={async (fileObject)=>{
        closeTool();
        await sendAttachment(fileObject, "image");
      }}
      onClose={closeTool}
    />
  </div>
{/if}

{#if toolOpen == "audio" || singleTool == "audio"}
  <div class="input-container">
    <AudioRecorder
      {projectId}
      onUpload={async (audioURL)=>{
        closeTool();
        await sendAttachment(audioURL, "audio");
      }}
      onClose={closeTool}
      singleTool={singleTool == "audio"}
    />
  </div>
{/if}


<style>

  .input-container {
    background-color: white;
    width: 100%;
    padding-left: 10px;
    padding-right: 10px;
    padding-top: 10px;
    position: absolute;
    bottom: 0px;
    left: 0px;
    box-sizing: border-box;
    display: flex;
    border-top: 1px solid gray;
    height: 55px;
  }

  .input-container button {
    margin-right: 10px;
  }

  button {
    margin-bottom: 10px;
  }

  button:hover {
    cursor: pointer;
  }

  .close-attachment {
    position: absolute;
    right: 0;
    top: 10px;
  }

  .tool-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .close-qr {
    position: absolute;
    top: 5px;
    right: 5px;
  }


</style>