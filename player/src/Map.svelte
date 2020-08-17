<script>

import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';
import { getConfig, getPlayerVar, getProjectVar } from '../../shared/util.js';

import MarkerClusterer from '@google/markerclustererplus';

const mapStyles = require('../../shared/GoogleMapStyles.json')

export let visible;
export let googleReady;
export let map = null;
export let markerItems;
export let setItemModal;

export let mapItem;

export let arrowMode = false; // activate to turn on the directional arrow
export let arrowDirection = 0; // turn it manually
export let arrowTarget = null; // turn arrow to a target position (should be an item object)

export let playerId
export let projectId

let mapContainer;
let markers = [];
let userMarker;
let markerCluster;
let positionTrackerInterval;
let boatIcon;
let navigatorPermissionsNotAvailable;

let userPosition = null;
let locationIssue = false;
let boatName = null;
let boatData = {};



let permissionState = "init"


const initGoogleMap = async ()=>{
    console.log("initGoogleMap");

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

  let icon = {
    url: item.value.markerAsset ? "/assets/" + item.value.markerAsset : "/marker.png", // url
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
      fontFamily: "EurostyleLTStd, sans-serif",
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
        maxZoom: 14, 
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

  // prompt -> ok-ask -> ... -> granted
  // prompt -> ok-ask -> ... -> denied
  // prompt -> do-no-ask

  if(permissionState == "prompt") {
    if(confirm("Gleich wird dich dein Gerät fragen, ob du deine Geoposition teilen willst. Stimme zu, um BOTBOOT im vollem Umfang spielen zu können.")) {
      permissionState = "ok-ask";
    } else {
      alert("Falls du die Lokalisierung später aktivieren willst, lade die Seite neu oder wende dich an den Support.")
      permissionState = "do-not-ask"
    }
  }

  if(permissionState == "ok-ask" || permissionState == "granted") {
    // Try HTML5 geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position)=> {
        userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        locationIssue = false // prevent recurring failure notifications triggered by system

        if (navigatorPermissionsNotAvailable) localStorage.setItem("locationPermissionState", "granted") // persist

        if(pan) {
          map.panTo(userPosition);
          map.setZoom(18);
        }

        updateUserMarker(userPosition)

      }, ()=> {
        if(!locationIssue) {
          alert("couldn't get location");
          locationIssue = true;  
        }

        if (navigatorPermissionsNotAvailable) permissionState="do-not-ask" // do not persist
        
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10
      });
    } else {
      alert("browser doesn't support location");
    }

  }

}


/* lifecycle methods */

$: {
  //console.log("markerItems changed", markerItems)
  updateMarkers(markerItems);
}

$: {
  if(visible) {
    console.log("map visible", visible)
    getUserPosition(true)
  }
}

afterUpdate(()=>{
  //console.log("afterUpdate")

  if(!map && googleReady) {
    initGoogleMap();
  }

  if(map && visible) {
    if(!markerCluster)
      initMarkers();
    /*if(!positionTrackerInterval)
      getUserPosition(true); // pan map to user once on open*/
    //initPositiontracking();
  }
})

function handlePermission() {
  if (navigator.permissions) { // most systems
    navigator.permissions.query({name:'geolocation'}).then(function(result) {
      permissionState = result.state;
      report(result.state);
      result.onchange = function() {
        report(result.state);
      }
    });
  } else { // safari (ios and desktop)
    navigatorPermissionsNotAvailable = true
    const storedPermissionState = localStorage.getItem("locationPermissionState")
    if (storedPermissionState && permissionState == "init") { // get initial permissionState from localStorage
      permissionState = storedPermissionState
    } else {
      permissionState = "prompt"
    }
  }
}

function report(state) {
  console.log('geo permission: ' + state);
}

onMount(()=>{
  handlePermission();  
})

const updateUserMarker = async (userPosition) => {

  console.log("updateUserMarker")

  if(!userMarker) {

    boatName = await getPlayerVar({playerId, projectId}, "boatName")

    if(boatName) {
      let boatTypeKey = await getPlayerVar({playerId, projectId}, "boatType")
      let boatTypes = await getProjectVar({projectId}, "boatTypes")
      console.log("boatTypes", boatTypes, boatTypeKey)
      boatData = boatTypes[boatTypeKey]
      console.log("boatData", boatData)

      if(boatData) {
      
        boatIcon = {
            url: "/assets/" + boatData.markerAsset,
            scaledSize: {height: 50, width: 50}, // scaled size
            origin: {x:0, y:0}, // origin
            anchor: {x:25, y:25}, // anchor
            labelOrigin: new google.maps.Point(25, 60)
        }
        console.log("set boatIcon to", boatIcon)

        // recreate userMarker if we don#'t have it yet
        if(!userMarker && map) {
          userMarker = new google.maps.Marker({
            map: map,
            position: userPosition,
            icon: boatIcon,
            label: boatIcon ? {
              color: "#FF7758",
              fontFamily: "EurostyleLTStd, sans-serif",
              fontSize: "16px",
              text: boatName ? boatName : "DU",
            } : undefined, 
          });  
        }
        console.log(userMarker)

      }
    }
      
  }

  if(userMarker && userPosition) {
    userMarker.setPosition(userPosition);
  }

  if(userPosition) {
    updateMarkersPositionChange();
  }
}


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
  {#if arrowMode}
    <div class="windicator">
      <img alt="Wind Direction Indicator" style="transform: rotate({arrowDirection}deg)" src="/assets/icons/Wind.svg" />
    </div>
  {/if}
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

.windicator {
  position: absolute;
  bottom: 24px;
  left: 24px;
  width: 40px;
  height: 40px;
  padding: 8px;
  z-index: 100;
  background: url("/assets/icons/Union.svg") no-repeat 0 0;
}

.windicator img {
  width: 30px;
  height: 30px;
  transition: all 3s;
  transform-origin: 50%;
  /*background-color: black;*/
}

</style>