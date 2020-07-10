<script>

import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';
import { getConfig } from '../../shared/util.js';

import MarkerClusterer from '@google/markerclustererplus';

const mapStyles = require('../../shared/GoogleMapStyles.json')

export let visible;
export let googleReady;
export let map = null;
export let markerItems;
export let setItemModal;

export let arrowMode = false; // activate to turn on the directional arrow
export let arrowDirection = 0; // turn it manually
export let arrowTarget = null; // turn is to a target position

let mapContainer;
let markers = [];
let userMarker;
let fitBoundsDone = false;
let latlngbounds;
let markerCluster;
let positionTrackerInterval;
let arrowIcon;
let dotIcon;

const initGoogleMap = async ()=>{
    console.log("initGoogleMap");

    arrowIcon = {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      fillColor: '#000',
      fillOpacity: 0.6,
      strokeColor: '#000',
      strokeOpacity: 0.9,
      strokeWeight: 1,
      scale: 6,
      rotation: 0
    }

    dotIcon = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#000',
      fillOpacity: 0.6,
      strokeColor: '#000',
      strokeOpacity: 0.9,
      strokeWeight: 1,
      scale: 6,
    }

    let defaultPos = {lat: await getConfig("defaultLat"), lng: await getConfig("defaultLng")};
    let defaultZoom = await getConfig("defaultZoom");
    console.log("defaultZoom", defaultZoom, typeof defaultZoom);

    map = new google.maps.Map(mapContainer, {
      zoom: 5, //defaultZoom,
      center: defaultPos,
      streetViewControl: false, 
      fullscreenControl: false, 
      mapTypeControl: false,
      styles: mapStyles // change default map styles
    });
    //console.log(map);
}

const initMarkers = ()=>{
    console.log("initMarkers")
    latlngbounds = new google.maps.LatLngBounds();
    fitBoundsDone = false;

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
          text: p.value.name ? p.value.name : p.key,
        },
        //map
      })
        
      marker.addListener('click', ()=> {
        setItemModal(p);
      });

      markers.push(marker)
      latlngbounds.extend(placePosition);    

      // for testig - set marker to arrowTarget
      //if(!arrowTarget)
      //arrowTarget = placePosition;
    })

    console.log(markerItems);
}

const getUserPosition = (pan = false)=> {

  // Try HTML5 geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position)=> {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      //console.log("setting userPosition");
      if(pan) {
        map.panTo(pos);
        map.setZoom(16);
      }

      if(!userMarker) {

          userMarker = new google.maps.Marker({
          map: map,
          position: pos,
          icon: arrowMode ? arrowIcon : dotIcon 
        }); 

      } else {

        userMarker.setPosition(pos);

        if(arrowMode) {
          let rotation = arrowDirection
          
          if(arrowTarget) {
            // calculate rotation
            //console.log("rotation for ", pos, arrowTarget, rotation)
            rotation = google.maps.geometry.spherical.computeHeading(new google.maps.LatLng(pos), new google.maps.LatLng(arrowTarget))
          
          }
          arrowIcon.rotation = rotation;

          userMarker.setIcon(arrowIcon);  
        
        } else {
          
          userMarker.setIcon(dotIcon);  
        
        }

      }

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

const initPositiontracking = () => {
  if(!positionTrackerInterval) {

    setInterval(()=>{

      if(visible) {
        //console.log("checking user geolocation")
        getUserPosition()
      }

    }, 2000)
  }
}



/* lifecycle methods */

afterUpdate(()=>{
  console.log("afterUpdate", visible)

  if(!map && googleReady) {
    initGoogleMap();
  }

  if(map) {
    if(markers.length != markerItems.length) {
      initMarkers(); // resets  fitsboundsdone
    }
  }

  if(map && visible && !fitBoundsDone && markers.length > 1) {
      console.log("doing positioning and clustering")
      //map.fitBounds(latlngbounds); // this doesn't work while map is still in display: none
      
      markerCluster = new MarkerClusterer(map, markers, {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        minimumClusterSize: 2,  
      });

      fitBoundsDone = true;

      initPositiontracking();
      getUserPosition(true); // pan map to user once on open
  }
})

onDestroy(()=>{
  if(positionTrackerInterval) {
    clearInterval(positionTrackerInterval)
  }
})


</script>

<div id="map-container" style="display: {visible ? 'block' : 'none'}">     
  <div id="map" bind:this={mapContainer}></div>
  <img id="locate-button" alt="locat button" src="locate.png" on:click={()=>getUserPosition(true)} />
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