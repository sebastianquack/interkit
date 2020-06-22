<script>

import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';
import { getConfig } from '../../shared/util.js';

const mapStyles = require('../../shared/GoogleMapStyles.json')

export let visible;
export let googleReady;
export let map = null;
export let markerItems;
export let setItemModal;

let mapContainer;
let markers = [];
let userMarker;
let fitBoundsDone = false;

const initGoogleMap = async ()=>{
    console.log("initGoogleMap");

    let defaultPos = {lat: await getConfig("defaultLat"), lng: await getConfig("defaultLng")};
    let defaultZoom = await getConfig("defaultZoom");
    console.log("defaultZoom", defaultZoom, typeof defaultZoom);

    map = new google.maps.Map(mapContainer, {
      zoom: defaultZoom,
      center: defaultPos,
      streetViewControl: false, 
      fullscreenControl: false, 
      mapTypeControl: false,
      styles: mapStyles // change default map styles
    });
    //console.log(map);
}

const initMarkers = ()=>{
    var latlngbounds = new google.maps.LatLngBounds();

    markers.forEach((m)=>{
      m.setMap(null);
    })
    markers = [];

    if(!markerItems) return;

    markerItems.forEach((p, index)=>{      

      if(!(p.value.lat && p.value.lng)) return;

      let placePosition = {lat: p.value.lat, lng: p.value.lng};

      let icon = {
        url: "/marker.png", // url
        scaledSize: {height: 50, width: 50}, // scaled size
        origin: {x:0, y:0}, // origin
        anchor: {x:25, y:50}, // anchor
        labelOrigin: new google.maps.Point(25, 60)
      };
    
      // add markers for user
      let marker = new google.maps.Marker({
        position: placePosition,
        icon: icon,
        label: {
          color: "#000",
          fontFamily: "sans-serif",
          fontSize: "16px",
          text: p.key,
        },
        map
      })
        
      marker.addListener('click', ()=> {
        setItemModal(p);
      });

      markers.push(marker)
      latlngbounds.extend(placePosition);

    });
    
    if(!fitBoundsDone && markers.length > 1) {
      map.fitBounds(latlngbounds);
      fitBoundsDone = true;
    }
}

afterUpdate(()=>{
  //console.log("googleReady", googleReady);
  if(!map && googleReady) {
    initGoogleMap();
  }

  if(map) {
    //console.log("todo: compare marker items");
    initMarkers();
  }
})


const getUserPosition = ()=> {

  // Try HTML5 geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position)=> {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      console.log("setting userPosition");
      map.panTo(pos);
      map.setZoom(16);

      if(userMarker) userMarker.setMap(null);
      userMarker = new google.maps.Marker({
          map: map,
          position: pos,
          icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#000',
              fillOpacity: 0.6,
              strokeColor: '#000',
              strokeOpacity: 0.9,
              strokeWeight: 1,
              scale: 6
          }

      });

    }, ()=> {
      alert("couldn't get location");
    }, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  } else {
    alert("browser doesn't support location");
  }

}

</script>

<div id="map-container" style="display: {visible ? 'block' : 'none'}">     
  <div id="map" bind:this={mapContainer}></div>
  <img id="locate-button" alt="locat button" src="locate.png" on:click={getUserPosition} />
</div>



<style>

#map-container {
  width: 100%; 
  height: 100%;
  position: relative;
}

#map {
  width: 100%; 
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}

#locate-button {
  position: absolute;
  width: 30px;
  height: 30px;
  right: 10px;
  bottom: 120px;
  padding: 5px;
  box-shadow: 2px 2px #ddd;
  border-radius: 2px;
  background-color: white;
  font-weight: bold;
}

#locate-button:hover {
  cursor: pointer
}

</style>