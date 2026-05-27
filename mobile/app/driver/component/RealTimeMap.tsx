import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { palette } from '../theme';
import { LocationCoords } from '../hooks/useLocation';

interface BusStop {
  id: number;
  name: string;
  status: 'completed' | 'active' | 'upcoming';
  passengers: number;
  time: string;
  latitude: number;
  longitude: number;
}

interface OpenStreetMapProps {
  currentLocation: LocationCoords | null;
  busStops: BusStop[];
  routePolyline: Array<{ latitude: number; longitude: number }>;
  loading: boolean;
  onStopPress?: (stop: BusStop) => void;
}

export default function OpenStreetMap({
  currentLocation,
  busStops,
  routePolyline,
  loading,
  onStopPress,
}: OpenStreetMapProps) {

  const webViewRef = useRef<WebView>(null);

  const [mapReady, setMapReady] = useState(false);
  const [driverLocationReady, setDriverLocationReady] = useState(false);

  useEffect(() => {
    if (!currentLocation) {
      return;
    }

    if (!webViewRef.current) {
      return;
    }

    if (!driverLocationReady) {
      return;
    }


    const lat = JSON.stringify(currentLocation.latitude);
    const lng = JSON.stringify(currentLocation.longitude);

    const js = `
      (function() {
        if(typeof window.updateDriverLocation === 'function'){
          window.updateDriverLocation(${lat}, ${lng});
        } else {
          console.error(' updateDriverLocation is not a function!');
        }
      })();
      true;
    `;

    webViewRef.current.injectJavaScript(js);
  }, [currentLocation, driverLocationReady]);

  const getMarkerColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'active': return '#2563EB';
      case 'upcoming': return '#F59E0B';
      default: return '#64748B';
    }
  };

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<style>
body, html { margin:0; padding:0; height:100%; }
#map { height:100%; width:100%; }

.route-btn {
  position:absolute;
  top:60px;
  right:18px;
  z-index:2000;
  background:#2563EB;
  color:white;
  padding:8px 12px;
  border-radius:8px;
  font-family:sans-serif;
  font-size:14px;
  cursor:pointer;
}

.route-panel {
  position:absolute;
  bottom:-100%;
  left:0;
  width:93%;
  max-height:55%;
  background:white;
  border-top-left-radius:18px;
  border-top-right-radius:18px;
  box-shadow:0 -4px 12px rgba(0,0,0,0.3);
  padding:15px;
  overflow-y:auto;
  font-family:sans-serif;
  transition:bottom 0.3s ease;
  z-index:2000;
}

.route-panel.open {
  bottom:0;
}

.step {
  font-size:13px;
  margin-bottom:8px;
  padding:6px;
  border-radius:6px;
}

.step.active {
  background:#DBEAFE;
  font-weight:bold;
}
</style>
</head>

<body>

<div id="map"></div>
<div class="route-btn" id="routeBtn">Route Info</div>

<div class="route-panel" id="routePanel">
  <h3>Navigation</h3>
  <div id="distance"></div>
  <div id="duration"></div>
  <hr/>
  <div id="nextTurn" style="margin-bottom:10px;font-weight:bold;"></div>
  <div id="instructions"></div>
</div>

<script>

const stops = ${JSON.stringify(busStops)};

const initialLat = stops[0]?.latitude || 27.7172;
const initialLng = stops[0]?.longitude || 85.3240;

const map = L.map('map',{ zoomControl:true }).setView(
  [initialLat, initialLng],
  14
);


L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'© OpenStreetMap contributors'
}).addTo(map);


if(window.ReactNativeWebView){
  window.ReactNativeWebView.postMessage('mapReady');
}

let driverMarker = null;
let routeLine = null;
let stepMarkers = [];
let currentStepIndex = 0;
let stepsData = [];

/* =========================
   DRIVER FOLLOW MODE
========================= */

window.updateDriverLocation = function(lat,lng){

  if(!driverMarker){
    driverMarker = L.circleMarker([lat,lng],{
      radius:8,
      color:'#2563EB',
      fillColor:'#2563EB',
      fillOpacity:1
    }).addTo(map);
  } else {
    driverMarker.setLatLng([lat,lng]);
  }

  map.setView([lat,lng], map.getZoom(), { animate:true });
  updateStepHighlight(lat,lng);
};

if(window.ReactNativeWebView){
  window.ReactNativeWebView.postMessage('driverLocationReady');
}

/* =========================
   ROUTE FETCH
========================= */

async function fetchRoute(){
  if(stops.length < 2) return;

  const coords = stops.map(s=>\`\${s.longitude},\${s.latitude}\`).join(';');

  const url = \`https://router.project-osrm.org/route/v1/driving/\${coords}?overview=full&geometries=geojson&steps=true\`;

  const res = await fetch(url);
  const data = await res.json();
  if(!data.routes || !data.routes.length) return;

  const route = data.routes[0];

  const latlngs = route.geometry.coordinates.map(c=>[c[1],c[0]]);
  routeLine = L.polyline(latlngs,{ color:'#2563EB', weight:5 }).addTo(map);

  map.fitBounds(routeLine.getBounds(),{ padding:[40,40] });

  document.getElementById('distance').innerHTML =
    "Total Distance: " + (route.distance/1000).toFixed(2) + " km";

  document.getElementById('duration').innerHTML =
    "Estimated Time: " + Math.round(route.duration/60) + " min";

  const container = document.getElementById("instructions");
  container.innerHTML = "";
  stepsData = [];

  route.legs.forEach(leg=>{
    leg.steps.forEach(step=>{
      const div = document.createElement("div");
      div.className = "step";

      const road = step.name || "";
      const type = step.maneuver.type.replace("_"," ");
      const modifier = step.maneuver.modifier || "";

      let text = type;
      if(modifier) text += " " + modifier;
      if(road) text += " onto " + road;

      div.innerHTML = "• " + text;

      container.appendChild(div);

      stepsData.push({
        lat: step.maneuver.location[1],
        lng: step.maneuver.location[0],
        text: text,
        element: div
      });
    });
  });

  highlightStep(0);
}

fetchRoute();

/* =========================
   STEP HIGHLIGHTING
========================= */

function highlightStep(index){
  stepsData.forEach((s,i)=>{
    s.element.classList.remove("active");
    if(i===index){
      s.element.classList.add("active");
      document.getElementById("nextTurn").innerHTML =
        "Next: " + s.text;
    }
  });
  currentStepIndex = index;
}

function updateStepHighlight(lat,lng){
  if(!stepsData.length) return;

  const next = stepsData[currentStepIndex];
  const dist = map.distance([lat,lng],[next.lat,next.lng]);

  if(dist < 40 && currentStepIndex < stepsData.length-1){
    highlightStep(currentStepIndex+1);
  }
}

/* =========================
   MARKERS
========================= */

stops.forEach(stop=>{
  const marker = L.marker([stop.latitude,stop.longitude])
    .bindPopup(stop.name)
    .addTo(map);

  marker.on('click', () => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'stopPressed', stop })
      );
    }
  });
});

/* =========================
   PANEL TOGGLE
========================= */

const btn = document.getElementById("routeBtn");
const panel = document.getElementById("routePanel");

btn.addEventListener("click",()=>{
  panel.classList.toggle("open");
});

</script>
</body>
</html>
`;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onLoadEnd={() => {
          setMapReady(true);
        }}
        onMessage={(event) => {
          const message = event.nativeEvent.data;

          try {
            const payload = JSON.parse(message);
            if (payload?.type === 'stopPressed' && payload?.stop && onStopPress) {
              onStopPress(payload.stop);
              return;
            }
          } catch {
          }

          if (message === 'mapReady') {
            setMapReady(true);
          }
          if (message === 'driverLocationReady') {
            setDriverLocationReady(true);
          }
        }}
        scalesPageToFit={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        )}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.background,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
