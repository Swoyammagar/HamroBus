import React, { useEffect, useRef, useState } from 'react';
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
  busNumber?: string;
  driverId: string;
  driverName?: string;
  driverProfileImgUrl?: string;
  tripStatus?: string;
  isOnBreak?: boolean;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy?: number;
  timestamp: string;
  sosActive?: boolean;
  sosCategory?: string;
  isOffline?: boolean;
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

  useEffect(() => {
    if (busLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `updateBusLocation(${busLocation.latitude}, ${busLocation.longitude}, ${busLocation.heading || 0}); true;`
      );
    }
  }, [busLocation]);

  useEffect(() => {
    if (activeDriverLocations.length === 0) {
      previousDriverIdsRef.current = new Set();
      return;
    }

    if (!webViewRef.current || !driverFunctionReady) {
      return;
    }

    const currentDriverIds = new Set(activeDriverLocations.map((driver) => driver.driverId));

    previousDriverIdsRef.current.forEach((driverId) => {
      if (!currentDriverIds.has(driverId)) {
        webViewRef.current?.injectJavaScript(
          `(function(){ if (typeof removeDriverLocation === 'function') { removeDriverLocation(${JSON.stringify(driverId)}); } })(); true;`
        );
      }
    });

    activeDriverLocations.forEach((driver) => {
      const js = `
        (function() {
          if (typeof updateDriverLocation === 'function') {
            updateDriverLocation(
              ${JSON.stringify(driver.driverId)},
              ${JSON.stringify(driver.latitude)},
              ${JSON.stringify(driver.longitude)},
              ${JSON.stringify(driver.heading || 0)},
              ${JSON.stringify(driver.speed || 0)},
              ${JSON.stringify(driver.busNumber || '')},
              ${JSON.stringify(driver.driverName || '')},
              ${JSON.stringify(driver.driverProfileImgUrl || '')},
              ${JSON.stringify(driver.tripStatus || '')},
              ${JSON.stringify(Boolean(driver.isOnBreak || driver.tripStatus === 'on-break'))},
              ${JSON.stringify(Boolean(driver.sosActive || driver.tripStatus === 'sos-active'))},
              ${JSON.stringify(driver.sosCategory || '')},
              ${JSON.stringify(Boolean(driver.isOffline || driver.tripStatus === 'offline'))}
            );
          }
        })();
        true;
      `;
      webViewRef.current?.injectJavaScript(js);
    });

    previousDriverIdsRef.current = currentDriverIds;
  }, [activeDriverLocations, driverFunctionReady]);

  useEffect(() => {
    if (currentLocation && showUserLocation && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `updateUserLocation(${currentLocation.latitude}, ${currentLocation.longitude}); true;`
      );
    }
  }, [currentLocation, showUserLocation]);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${busStops[0]?.latitude || 27.7172}, ${busStops[0]?.longitude || 85.3240}], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const busStops = ${JSON.stringify(busStops)};
    const routePolyline = ${JSON.stringify(routePolyline)};
    const driverMarkers = {};
    let busMarker = null;
    let userMarker = null;
    let routeLine = null;

    function drawRoute() {
      if (!Array.isArray(routePolyline) || routePolyline.length < 2) return;
      const latlngs = routePolyline.map((point) => [point.latitude, point.longitude]);
      if (routeLine) {
        map.removeLayer(routeLine);
      }
      routeLine = L.polyline(latlngs, { color: '#3B82F6', weight: 5, opacity: 0.9 }).addTo(map);
    }

    drawRoute();

    busStops.forEach((stop, index) => {
      const icon = L.divIcon({
        html: '<div style="background-color:#10B981;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">' + (index + 1) + '</div>',
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([stop.latitude, stop.longitude], { icon })
        .bindPopup('<b>' + stop.name + '</b><br>Stop #' + (index + 1))
        .addTo(map);

      marker.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stopPressed', stop }));
        }
      });
    });

    if (busStops.length > 0) {
      map.fitBounds(busStops.map((s) => [s.latitude, s.longitude]), { padding: [50, 50] });
    }

    window.updateBusLocation = function(lat, lng, heading) {
      const busIcon = L.divIcon({
        html: '<div style="width:48px;height:48px;position:relative;transform:rotate(' + (heading || 0) + 'deg);">'
          + '<div style="width:48px;height:48px;border-radius:50%;background-color:rgba(239,68,68,0.2);position:absolute;animation:pulse 2s infinite;"></div>'
          + '<div style="width:48px;height:48px;border-radius:50%;background-color:#EF4444;border:4px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(239,68,68,0.5);position:relative;z-index:1;">🚌</div>'
          + '</div>',
        className: '',
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      if (busMarker) {
        busMarker.setLatLng([lat, lng]);
      } else {
        busMarker = L.marker([lat, lng], { icon: busIcon }).bindPopup('<b>Bus Location</b><br>Live tracking').addTo(map);
      }
    };

    window.updateDriverLocation = function(driverId, lat, lng, heading, speed, busNumber, driverName, driverProfileImgUrl, tripStatus, isOnBreak, sosActive, sosCategory, isOffline) {
      const key = String(driverId);
      // If driver is offline, remove marker from the map and stop.
      if (Boolean(isOffline)) {
        try {
          if (driverMarkers[key]) {
            map.removeLayer(driverMarkers[key]);
            delete driverMarkers[key];
          }
        } catch (e) {
          console.warn('Error removing offline driver marker', e);
        }
        return;
      }
      const safeDriverName = String(driverName || '').trim() || ('Driver ' + key.slice(-4));
      const safeBusNumber = String(busNumber || '').trim() || 'Bus';
      const onBreak = Boolean(isOnBreak || tripStatus === 'on-break');
      const activeSos = Boolean(sosActive || tripStatus === 'sos-active');
      const offline = Boolean(isOffline || tripStatus === 'offline');
      const markerColor = activeSos ? '#DC2626' : offline ? '#6B7280' : onBreak ? '#F59E0B' : '#3B82F6';
      const pulseColor = activeSos ? 'rgba(220, 38, 38, 0.28)' : offline ? 'rgba(107, 114, 128, 0.2)' : onBreak ? 'rgba(245, 158, 11, 0.25)' : 'rgba(59, 130, 246, 0.2)';
      const profileHtml = driverProfileImgUrl ? '<img src="' + String(driverProfileImgUrl) + '" alt="Driver" style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:2px solid white;margin-bottom:6px;" />' : '';

      const driverIcon = L.divIcon({
        html: '<div style="width:50px;height:50px;position:relative;transform:rotate(' + (heading || 0) + 'deg);">'
          + '<div style="width:50px;height:50px;border-radius:50%;background-color:' + pulseColor + ';position:absolute;animation:pulse 2s infinite;"></div>'
          + '<div style="width:50px;height:50px;border-radius:50%;background-color:' + markerColor + ';border:4px solid white;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 12px rgba(15,23,42,0.35);position:relative;z-index:1;">' + (activeSos ? '🆘' : '🚗') + '</div>'
          + '</div>',
        className: '',
        iconSize: [50, 50],
        iconAnchor: [25, 25]
      });

      const popupContent = '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">' +
        profileHtml +
        '<b>' + safeDriverName + '</b>' +
        '<div>🚌 ' + safeBusNumber + '</div>' +
        '<div><b>Status:</b> ' + (activeSos ? ('SOS Active' + (sosCategory ? ' (' + String(sosCategory) + ')' : '')) : offline ? 'Offline' : onBreak ? 'On Break' : 'In Trip') + '</div>' +
        '<div><b>Speed:</b> ' + Number(speed || 0).toFixed(1) + ' km/h</div>' +
        '<div><b>Heading:</b> ' + Number(heading || 0) + '°</div>' +
      '</div>';

      if (driverMarkers[key]) {
        driverMarkers[key].setLatLng([lat, lng]);
        driverMarkers[key].setIcon(driverIcon);
        driverMarkers[key].setPopupContent(popupContent);
      } else {
        driverMarkers[key] = L.marker([lat, lng], { icon: driverIcon }).bindPopup(popupContent).addTo(map);
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

    window.updateUserLocation = function(lat, lng) {
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        const userIcon = L.divIcon({
          html: '<div style="width:40px;height:40px;border-radius:50%;background-color:rgba(59,130,246,0.2);border:3px solid #3B82F6;display:flex;align-items:center;justify-content:center;"><div style="width:16px;height:16px;border-radius:50%;background-color:#3B82F6;"></div></div>',
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
        userMarker = L.marker([lat, lng], { icon: userIcon }).bindPopup('Your Location').addTo(map);
      }
    };

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('driverLocationFunctionReady');
    }
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
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onMessage={(event) => {
          const message = event.nativeEvent.data;

          try {
            const payload = JSON.parse(message);
            if (payload?.type === 'stopPressed' && payload?.stop && onStopPress) {
              onStopPress(payload.stop);
              return;
            }
          } catch {
            // lifecycle message
          }

          if (message === 'driverLocationFunctionReady') {
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
