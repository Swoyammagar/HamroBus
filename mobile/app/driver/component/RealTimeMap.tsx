import React, { useRef, useEffect } from 'react';
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
}: OpenStreetMapProps) {
  const webViewRef = useRef<WebView>(null);

  // Update map when location changes
  useEffect(() => {
    if (currentLocation && webViewRef.current) {
      const js = `updateDriverLocation(${currentLocation.latitude}, ${currentLocation.longitude});`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [currentLocation]);

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
    }).setView([${currentLocation?.latitude || busStops[0]?.latitude || 40.7489}, ${currentLocation?.longitude || busStops[0]?.longitude || -73.9680}], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Store markers
    let driverMarker = null;
    const busStopMarkers = [];

    // Add route polyline
    const routeCoords = ${JSON.stringify(routePolyline.map(p => [p.latitude, p.longitude]))};
    if (routeCoords.length > 1) {
      L.polyline(routeCoords, {
        color: '${palette.primary}',
        weight: 3,
        opacity: 0.8
      }).addTo(map);
    }

    // Add bus stop markers
    const busStops = ${JSON.stringify(busStops)};
    busStops.forEach(stop => {
      const color = '${busStops.map(s => `${s.id}:${getMarkerColor(s.status)}`).join(',')}';
      const stopColor = color.split(',').find(c => c.startsWith(stop.id + ':'))?.split(':')[1] || '#64748B';
      
      const icon = L.divIcon({
        html: \`<div style="
          background-color: \${stopColor};
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">\${stop.status === 'completed' ? '✓' : stop.id}</div>\`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon })
        .bindPopup(\`<b>\${stop.name}</b><br>\${stop.time} • \${stop.passengers} passengers\`)
        .addTo(map);
      
      busStopMarkers.push(marker);
    });

    // Add driver location marker
    ${currentLocation ? `
    const driverIcon = L.divIcon({
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

    driverMarker = L.marker([${currentLocation.latitude}, ${currentLocation.longitude}], { icon: driverIcon })
      .bindPopup('Your Location')
      .addTo(map);
    ` : ''}

    // Fit bounds to show all markers
    const allCoords = [...routeCoords];
    ${currentLocation ? `allCoords.push([${currentLocation.latitude}, ${currentLocation.longitude}]);` : ''}
    if (allCoords.length > 0) {
      map.fitBounds(allCoords, { padding: [50, 50] });
    }

    // Function to update driver location from React Native
    window.updateDriverLocation = function(lat, lng) {
      if (driverMarker) {
        driverMarker.setLatLng([lat, lng]);
      } else {
        const driverIcon = L.divIcon({
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
        driverMarker = L.marker([lat, lng], { icon: driverIcon })
          .bindPopup('Your Location')
          .addTo(map);
      }
      map.setView([lat, lng], map.getZoom());
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