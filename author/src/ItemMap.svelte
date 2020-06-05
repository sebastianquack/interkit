<script>

import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';

const mapStyles = require('../../shared/GoogleMapStyles.json')

export let googleReady;
export let coords;
export let label;
export let updateCoords;

let map;
let mapContainer;
let marker;

const labelObj = (text) => {
  return {
    color: "#000",
    fontFamily: "sans-serif",
    fontSize: "16px",
    text,
  }
}

const initGoogleMap = ()=>{
    map = new google.maps.Map(mapContainer, {
      zoom: 16,
      center: coords,
      streetViewControl: false, 
      fullscreenControl: false, 
      mapTypeControl: false,
      styles: mapStyles // change default map styles
    });

    let icon = {
      url: "/marker.png", // url
      scaledSize: {height: 50, width: 50}, // scaled size
      origin: {x:0, y:0}, // origin
      anchor: {x:25, y:50}, // anchor
      labelOrigin: new google.maps.Point(25, 60)
    };
    
    // add markers for user
    marker = new google.maps.Marker({
      position: coords,
      icon: icon,
      draggable:true,
      animation: google.maps.Animation.DROP,
      label: labelObj(label),
      map
    })

    google.maps.event.addListener(marker, 'dragend', ()=> {
      let newPos = marker.getPosition();
      updateCoords(newPos);
    });

    console.log(coords);
}

afterUpdate(()=>{
  if(!map && googleReady && coords) {
    initGoogleMap();
  }

  if(map && marker) {
    console.log("updating label");
    marker.setLabel(labelObj(label));
  }
})

</script>

<div id="map-container">     
  <div id="map" bind:this={mapContainer}></div>
</div>



<style>

#map-container {
  width: 100%; 
  max-width: 400px;
  height: 300px;
  position: relative;
  margin-top: 10px;
  margin-bottom: 10px;
  box-sizing: border-box;
}

#map {
  width: 100%; 
  height: 100%;
  box-sizing: border-box;
  position: relative;
}

</style>