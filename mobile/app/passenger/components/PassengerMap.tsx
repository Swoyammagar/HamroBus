// mobile/app/passenger/components/PassengerMap.tsx
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface BusStop {
  id: number | string;
  name: string;
  latitude: number;
  longitude: number;
  order?: number;
}

interface BusLocation {
  busId: string;
  latitude: number;
  longitude: number;
  heading?: number;
}

interface PassengerMapProps {
  busStops: BusStop[];
  routePolyline: Array<{ latitude: number; longitude: number }>;
  busLocation?: BusLocation | null;
  currentLocation?: { latitude: number; longitude: number } | null;
  loading?: boolean;
  onStopPress?: (stop: BusStop) => void;
  showUserLocation?: boolean;
}

export default function PassengerMap({
  busStops,
  routePolyline,
  busLocation,
  currentLocation,
  loading = false,
  showUserLocation = false,
}: PassengerMapProps) {
  const webViewRef = useRef<WebView>(null);

  // Update bus location when it changes
  useEffect(() => {
    if (busLocation && webViewRef.current) {
      const js = `updateBusLocation(${busLocation.latitude}, ${busLocation.longitude}, ${busLocation.heading || 0});`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [busLocation]);

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
    let userMarker = null;
    const busStopMarkers = [];

    // Add route polyline
    const routeCoords = ${JSON.stringify(routePolyline.map(p => [p.latitude, p.longitude]))};
    if (routeCoords.length > 1) {
      L.polyline(routeCoords, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.7
      }).addTo(map);
    }

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
      
      busStopMarkers.push(marker);
    });

    // Add initial bus location if available
    ${busLocation ? `
    const busIcon = L.divIcon({
      html: \`<div style="
        width: 48px;
        height: 48px;
        position: relative;
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

    busMarker = L.marker([${busLocation.latitude}, ${busLocation.longitude}], { icon: busIcon })
      .bindPopup('<b>Bus Location</b><br>Live tracking')
      .addTo(map);
    ` : ''}

    // Add user location if available
    ${showUserLocation && currentLocation ? `
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

    userMarker = L.marker([${currentLocation.latitude}, ${currentLocation.longitude}], { icon: userIcon })
      .bindPopup('Your Location')
      .addTo(map);
    ` : ''}

    // Fit bounds to show all markers
    const allCoords = [...routeCoords];
    ${busLocation ? `allCoords.push([${busLocation.latitude}, ${busLocation.longitude}]);` : ''}
    ${showUserLocation && currentLocation ? `allCoords.push([${currentLocation.latitude}, ${currentLocation.longitude}]);` : ''}
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
              transform: rotate(\${heading}deg);
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