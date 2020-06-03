<script>

  import { emitMessage } from '../../shared/socketClient.js';
  import { getConfig } from '../../shared/util.js';

  import QRScanner from './QRScanner.svelte';
  import Camera from './Camera.svelte';

  export let attachmentMenuOpen;
  export let closeAttachmentMenu;
  export let scrollUp;
  export let googleMapsAPIKey;
  export let addItem;
  export let clearInput;
  
  let QRScannerOpen = false
  const openQRScanner = ()=> { QRScannerOpen = true; }
  const closeQRScanner = ()=> {
    QRScannerOpen = false;
    closeAttachmentMenu();
  }

  const sendQRCode = (code) => {
    let item = {
      message: "[QR code scanned]",
      attachment: {QRCode: code},
      params: {}
    }

    addItem({...item, side: "right"});
    emitMessage(item);
    clearInput();
    scrollUp();
  }

  let cameraOpen = false
  const openCamera = ()=> {
    cameraOpen = true;
  }
  const closeCamera = ()=> {
    cameraOpen = false;
    closeAttachmentMenu();
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
        }

        addItem({...item, side: "right"});
        emitMessage(item);
        clearInput();
      });
    } else {
      alert("geolocation not supported");
    }
    closeAttachmentMenu();
  }

  const sendImage = async (filename) => {
    let fileServerURL = await getConfig("fileServerURL");
    let item = {
      attachment: {
        mediatype: "image",
        imgSrc: fileServerURL + filename,  
        filename: filename
      },
      params: {}
    }
    
    addItem({...item, side: "right"});
    emitMessage(item);
    clearInput();
    scrollUp();
  }

</script>


{#if attachmentMenuOpen}
  <div class="input-container">      
      <button on:click={openCamera}>Camera</button>
      <button on:click={openQRScanner}>QR Code</button>
      <button on:click={getGPSLocation}>GPS Location</button>
      <button class="close-attachment" on:click={closeAttachmentMenu}>close</button>
  </div>  
{/if}
  
{#if QRScannerOpen}
  <div class="qr-scanner-container">
    <button class="close-qr" on:click={closeQRScanner}>close</button>
    <QRScanner
      onScan={(code)=>{
        closeQRScanner();
        sendQRCode(code);
      }}
    />
  </div>
{/if}

{#if cameraOpen}
  <div class="qr-scanner-container">
    <Camera
      onUpload={async (imageURL)=>{
        closeCamera();
        await sendImage(imageURL);
      }}
      onClose={closeCamera}
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

  .qr-scanner-container {
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