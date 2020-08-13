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
export let arrowTarget = null; // turn arrow to a target position (should be an item object)

let mapContainer;
let markers = [];
let userMarker;
let markerCluster;
let positionTrackerInterval;
let arrowIcon;
let dotIcon;

let userPosition = null;

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

const createMarker = (item) => {

  if(!(item.value.lat && item.value.lng)) return;

  let placePosition = {lat: item.value.lat, lng: item.value.lng};

  let defaultIconImage = "/assets/items/Insel_see_64px_post.png"

  let icon = {
    url: item.value.imageAsset ? "/assets/items/" + item.value.imageAsset + "_64px_post.png" : defaultIconImage, // url
    scaledSize: {height: 64, width: 64}, // scaled size
    origin: {x:0, y:0}, // origin
    anchor: {x:32, y:64}, // anchor
    labelOrigin: new google.maps.Point(32, 70)
  };

  // add markers for user
  let marker = new google.maps.Marker({
    position: placePosition,
    icon: icon,
    visible: item.value.revealOnProximity ? false : true, 
    label: {
      color: "#000",
      fontFamily: "sans-serif",
      fontSize: "16px",
      text: item.value.name ? item.value.name : item.key,
    },
    markerItemKey: item.key,
    revealOnProximity: item.value.revealOnProximity ? item.value.revealOnProximity : undefined
    //map
  })
    
  marker.addListener('click', ()=> {
    setItemModal(item);
  });

  markers.push(marker)
  return marker;
}


const initMarkers = ()=>{
    console.log("initMarkers")

    markers.forEach((m)=>{
      m.setMap(null);
    })
    markers = [];

    if(!markerItems) return;

    markerItems.forEach((mi)=>{ 
      createMarker(mi)
    });

    markerCluster = new MarkerClusterer(map, markers, {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        minimumClusterSize: 2, 
        maxZoom: 16, 
    });

    //console.log(markers);
}

// callewd when markers are added or removed
const updateMarkers = (markerItems) => {
  if(!markerCluster) return;

  console.log("updateMarkers");
  
  markerItems.forEach((markerItem)=> {
    let m = markers.filter((m)=>m.markerItemKey == markerItem.key)

    // if this not already on the map -> add
    if(!m.length) {
      console.log("new marker found, adding", markerItem.key)
      let marker = createMarker(markerItem);
      //console.log(marker)
      markerCluster.addMarker(marker);
    } else {

      // check if position needs to be changed
      if(m[0].position.lat != markerItem.value.lat || m[0].position.lng != markerItem.value.lng) {
        m[0].setPosition({lat: markerItem.value.lat, lng: markerItem.value.lng})
      }

      // check if label needs to be changed
      if(m[0].getLabel().text != markerItem.value.name) {
        console.log("recreating marker")
        markerCluster.removeMarker(m[0])
        m[0] = createMarker(markerItem)
        markerCluster.addMarker(m[0])
      }      
    }

  })

  let i = markers.length
  while (i--) {
    if(!markerItems.filter((mi)=>mi.key == markers[i].markerItemKey).length) {
      console.log("marker was removed, removing", markers[i].label.text)
      //console.log(markers[i])
      markerCluster.removeMarker(markers[i]);
      markers.splice(i, 1);
    }      
  }

}

// called when user position changes
const updateMarkersPositionChange = () => {

  markers.forEach((m)=>{ 

    //console.log(m)

    if(!m) return

    if(m.revealOnProximity) {
      
      let distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(userPosition), m.position
      )
      //console.log(distance)

      if(distance < m.revealOnProximity) {
        m.setVisible(true)  
      } else {
        m.setVisible(false)  
      }
    }

  })

}

const getUserPosition = (pan = false)=> {

  // Try HTML5 geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position)=> {
      userPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      if(pan) {
        map.panTo(userPosition);
        map.setZoom(16);
      }

      if(!userMarker) {

          userMarker = new google.maps.Marker({
            map: map,
            position: userPosition,
            icon: arrowMode ? arrowIcon : dotIcon 

        }); 

      } else {

        userMarker.setPosition(userPosition);

        if(arrowMode) {
          let rotation = arrowDirection
          
          if(arrowTarget) {
            // calculate rotation
            // console.log("rotation for ", userPosition, arrowTarget, rotation)
            rotation = google.maps.geometry.spherical.computeHeading(new google.maps.LatLng(userPosition), new google.maps.LatLng(arrowTarget.value))
          
          }
          arrowIcon.rotation = rotation;

          userMarker.setIcon(arrowIcon);  
        
        } else {
          
          userMarker.setIcon(dotIcon);  
        
        }

      }

      updateMarkersPositionChange();

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

    positionTrackerInterval = setInterval(()=>{

      if(visible) {
        //console.log("checking user geolocation")
        getUserPosition()
      }

    }, 2000)
  }
}



/* lifecycle methods */

$: {
  //console.log("markerItems changed", markerItems)
  updateMarkers(markerItems);
}


afterUpdate(()=>{
  //console.log("afterUpdate")

  if(!map && googleReady) {
    initGoogleMap();
  }

  if(map && visible) {
    if(!markerCluster)
      initMarkers();
    if(!positionTrackerInterval)
      getUserPosition(true); // pan map to user once on open
    initPositiontracking();
  }
})

onDestroy(()=>{
  console.log("onDestroy")
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