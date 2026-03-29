import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface BusStop {
  id?: number | string;
  _id?: string;
  name: string;
  latitude: number;
  longitude: number;
  order?: number;
}

interface BusLocation {
  busId: string;
  driverId?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp?: string;
}

interface DriverLocation {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy?: number;
  timestamp: string;
}

interface PassengerMapProps {
  busStops: BusStop[];
  routePolyline: Array<{ latitude: number; longitude: number }>;
  busLocation?: BusLocation | null;
  driverLocation?: DriverLocation | null;
  driverLocations?: DriverLocation[];
  currentLocation?: { latitude: number; longitude: number } | null;
  loading?: boolean;
  onStopPress?: (stop: BusStop) => void;
  showUserLocation?: boolean;
}

export default function PassengerMap({
  busStops,
  routePolyline,
  busLocation,
  driverLocation,
  driverLocations,
  currentLocation,
  loading = false,
  onStopPress,
  showUserLocation = false,
}: PassengerMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [driverFunctionReady, setDriverFunctionReady] = useState(false);
  const previousDriverIdsRef = useRef<Set<string>>(new Set());
  const activeDriverLocations = (driverLocations && driverLocations.length > 0)
    ? driverLocations
    : driverLocation
    ? [driverLocation]
    : [];

  // Update bus location when it changes
  useEffect(() => {
    if (busLocation && webViewRef.current) {
      const js = `updateBusLocation(${busLocation.latitude}, ${busLocation.longitude}, ${busLocation.heading || 0});`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [busLocation]);

  // Update driver location when it changes
  useEffect(() => {
    if (activeDriverLocations.length === 0) {
      console.log('⚠️ [PASSENGER MAP] No driver location available yet');
      const previousDriverIds = previousDriverIdsRef.current;
      if (previousDriverIds.size > 0 && webViewRef.current && driverFunctionReady) {
        previousDriverIds.forEach((driverId) => {
          webViewRef.current?.injectJavaScript(`
            (function() {
              if (typeof removeDriverLocation === 'function') {
                removeDriverLocation(${JSON.stringify(driverId)});
              }
            })();
            true;
          `);
        });
      }
      previousDriverIdsRef.current = new Set();
      return;
    }
    
    if (!webViewRef.current) {
      console.log('⚠️ [PASSENGER MAP] WebView ref not ready');
      return;
    }
    
    if (!driverFunctionReady) {
      console.log('⚠️ [PASSENGER MAP] Driver function not ready yet, waiting for signal');
      return;
    }

    const currentDriverIds = new Set(activeDriverLocations.map((driver) => driver.driverId));
    const previousDriverIds = previousDriverIdsRef.current;

    previousDriverIds.forEach((driverId) => {
      if (!currentDriverIds.has(driverId) && webViewRef.current) {
        const removeJs = `
          (function() {
            if (typeof removeDriverLocation === 'function') {
              removeDriverLocation(${JSON.stringify(driverId)});
            }
          })();
          true;
        `;
        webViewRef.current.injectJavaScript(removeJs);
      }
    });
    
    activeDriverLocations.forEach((driver) => {
      console.log('🗺️ [PASSENGER MAP] Injecting driver location:', {
        driverId: driver.driverId,
        lat: driver.latitude,
        lng: driver.longitude,
        heading: driver.heading,
        speed: driver.speed,
      });

      const js = `
        (function() {
          if (typeof updateDriverLocation === 'function') {
            updateDriverLocation(
              ${JSON.stringify(driver.driverId)},
              ${JSON.stringify(driver.latitude)},
              ${JSON.stringify(driver.longitude)},
              ${JSON.stringify(driver.heading || 0)},
              ${JSON.stringify(driver.speed || 0)}
            );
          }
        })();
        true;
      `;
      webViewRef.current?.injectJavaScript(js);
    });

    previousDriverIdsRef.current = currentDriverIds;
  }, [activeDriverLocations, driverFunctionReady]);

  // Update user location when it changes
  useEffect(() => {
    if (currentLocation && showUserLocation && webViewRef.current) {
      const js = `updateUserLocation(${currentLocation.latitude}, ${currentLocation.longitude});`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [currentLocation, showUserLocation]);

  const defaultCenter = busStops[0] || { latitude: 27.7172, longitude: 85.3240 }; // Kathmandu

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html { margin: 0; padding: 0; height: 100%; }
    #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Initialize map
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: true
    }).setView([${defaultCenter.latitude}, ${defaultCenter.longitude}], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Store markers
    let busMarker = null;
    const driverMarkers = {};
    let userMarker = null;
    const busStopMarkers = [];

    // =============================
// ROAD ROUTE USING OSRM
// =============================

let routeLine = null;

async function drawRoadRoute() {
  const stops = ${JSON.stringify(busStops)};

  if (stops.length < 2) return;

  // Convert stops into OSRM coordinate string
  const coords = stops
    .map(s => s.longitude + "," + s.latitude)
    .join(";");

  const url =
    "https://router.project-osrm.org/route/v1/driving/" +
    coords +
    "?overview=full&geometries=geojson";

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.routes || !data.routes.length) return;

    const route = data.routes[0];

    const latlngs = route.geometry.coordinates.map(c => [c[1], c[0]]);

    if (routeLine) {
      map.removeLayer(routeLine);
    }

    routeLine = L.polyline(latlngs, {
      color: "#3B82F6",
      weight: 5,
      opacity: 0.9
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

  } catch (err) {
    console.error("Route fetch error", err);
  }
}

drawRoadRoute();

    // Add bus stop markers
    const busStops = ${JSON.stringify(busStops)};
    busStops.forEach((stop, index) => {
      const icon = L.divIcon({
        html: \`<div style="
          background-color: #10B981;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">\${index + 1}</div>\`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon })
        .bindPopup(\`<b>\${stop.name}</b><br>Stop #\${index + 1}\`)
        .addTo(map);

        marker.on('click', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'stopPressed',
              stop: stop,
            }));
          }
        });
      
      busStopMarkers.push(marker);
    });

    // Fit bounds to show all bus stop markers
    const allCoords = [];
    busStops.forEach(s => {
      allCoords.push([s.latitude, s.longitude]);
    });
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [50, 50] });
    }

    // Function to update bus location from React Native
    window.updateBusLocation = function(lat, lng, heading) {
      if (busMarker) {
        busMarker.setLatLng([lat, lng]);
        map.panTo([lat, lng]);
      } else {
        const busIcon = L.divIcon({
          html: \`<div style="
            width: 48px;
            height: 48px;
            position: relative;
            transform: rotate(\${heading}deg);
          ">
            <div style="
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background-color: rgba(239, 68, 68, 0.2);
              position: absolute;
              animation: pulse 2s infinite;
            "></div>
            <div style="
              width: 48px;
              height: 48px;
              border-radius: 50%;
              background-color: #EF4444;
              border: 4px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
              position: relative;
              z-index: 1;
            ">🚌</div>
          </div>
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              100% { transform: scale(1.5); opacity: 0; }
            }
          </style>\`,
          className: '',
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });
        busMarker = L.marker([lat, lng], { icon: busIcon })
          .bindPopup('<b>Bus Location</b><br>Live tracking')
          .addTo(map);
      }
    };

    // Function to update driver location from React Native
    window.updateDriverLocation = function(driverId, lat, lng, heading, speed) {
      const key = String(driverId);
      console.log('🚗 [WEBVIEW] updateDriverLocation called:', { driverId: key, lat, lng, heading, speed });

      if (driverMarkers[key]) {
        driverMarkers[key].setLatLng([lat, lng]);
      } else {
        const driverIcon = L.divIcon({
          html: \`<div style="
            width: 50px;
            height: 50px;
            position: relative;
            transform: rotate(\${heading}deg);
          ">
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background-color: rgba(59, 130, 246, 0.2);
              position: absolute;
              animation: pulse 2s infinite;
            "></div>
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background-color: #3B82F6;
              border: 4px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
              position: relative;
              z-index: 1;
            ">🚗</div>
          </div>\`,
          className: '',
          iconSize: [50, 50],
          iconAnchor: [25, 25]
        });
        driverMarkers[key] = L.marker([lat, lng], { icon: driverIcon })
          .bindPopup(\`<b>Driver Location</b><br>Driver: \${key.slice(0, 8)}...<br>Speed: \${Number(speed || 0).toFixed(1)} km/h<br>Heading: \${Number(heading || 0)}°\`)
          .addTo(map);
      }

      map.panTo([lat, lng]);
    };

    window.removeDriverLocation = function(driverId) {
      const key = String(driverId);
      if (driverMarkers[key]) {
        map.removeLayer(driverMarkers[key]);
        delete driverMarkers[key];
      }
    };

    // Signal that updateDriverLocation is ready
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('driverLocationFunctionReady');
      console.log('✅ [WEBVIEW] Sent driverLocationFunctionReady signal');
    }

    // Function to update user location from React Native
    window.updateUserLocation = function(lat, lng) {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        const userIcon = L.divIcon({
          html: \`<div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: rgba(59, 130, 246, 0.2);
            border: 3px solid #3B82F6;
            display: flex;
            align-items: center;
            justify-content: center;
          "><div style="
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: #3B82F6;
          "></div></div>\`,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
        userMarker = L.marker([lat, lng], { icon: userIcon })
          .bindPopup('Your Location')
          .addTo(map);
      }
    };
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
        scalesPageToFit={true}
        onMessage={(event) => {
          const message = event.nativeEvent.data;
          console.log('📨 [PASSENGER MAP] WebView message:', message);

            try {
              const payload = JSON.parse(message);
              if (payload?.type === 'stopPressed' && payload?.stop && onStopPress) {
                onStopPress(payload.stop);
                return;
              }
            } catch {
              // Non-JSON lifecycle messages are expected.
            }
          
          if (message === 'driverLocationFunctionReady') {
            console.log('✅ [PASSENGER MAP] Driver location function is ready!');
            setDriverFunctionReady(true);
          }
        }}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
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
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
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