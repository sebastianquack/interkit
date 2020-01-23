<script>

import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';

const mapStyles = require('./GoogleMapStyles.json')

export let visible;
export let googleReady;
export let onClose;

let places = [];

let mapContainer;
let markers = [];
let userMarker;
let map;

const initGoogleMap = ()=>{
    map = new google.maps.Map(mapContainer, {
      zoom: 1,
      center: {lat: 0, lng: 0},
      streetViewControl: false, 
      fullscreenControl: false, 
      mapTypeControl: false,
      styles: mapStyles // change default map styles
    });

    var latlngbounds = new google.maps.LatLngBounds();

    markers.forEach((m)=>{
      m.setMap(null);
    })
    markers = [];

    places.forEach((p, index)=>{      

      let placePosition = {lat: p.lat, lng: p.lon};

      let icon = {
        url: "/images/marker.png", // url
        scaledSize: {height: 50, width: 50}, // scaled size
        origin: {x:0, y:0}, // origin
        anchor: {x:25, y:50}, // anchor
        labelOrigin: new google.maps.Point(25 + (p.labelOffsetX ? p.labelOffsetX : 0), 60 + (p.labelOffsetY ? p.labelOffsetY : 0))
      };
    
      // add markers for user
      let marker = new google.maps.Marker({
        position: placePosition,
        icon: icon,
        label: {
          color: "#000",
          fontFamily: "thin",
          fontSize: "16px",
          text: p["label_" + this.props.locale].toUpperCase(),
        },
        map
      })
        
      marker.addListener('click', ()=> {
        console.log(p);
      });

      markers.push(marker)
      latlngbounds.extend(placePosition);

    });
    
    map.fitBounds(latlngbounds);
      
}

afterUpdate(()=>{
  if(!map && googleReady) {
    initGoogleMap();
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

      if(userMarker) userMarker.setMap(null);
      userMarker = new google.maps.Marker({
          map: this.map,
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

<div id="map-container" style="visibility: {visible ? 'visible' : 'hidden'}">     
  <div id="map" bind:this={mapContainer}></div>
  <img id="locate-button" alt="locat button" src="locate.png" on:click={getUserPosition} />
  <button id="close" on:click={onClose}>close</button>
</div>



<style>

#map-container {
  width: 100%; 
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}

#map {
  width: 100%; 
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
}

#close {
  position: absolute;
  top: 5px;
  right: 5px;
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