// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Platform } from 'react-native';
import { Button } from '../../../components/ui';

interface WebMapProps {
  route: any | null;
  routes: any[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

const WebMap: React.FC<WebMapProps> = ({ route, routes, selectedRouteId, onSelectRoute }) => {
  const [leaflet, setLeaflet] = useState<any>(null);
  const mapRef = React.useRef<any>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rl = await import('react-leaflet');
        const L = await import('leaflet');
        try {
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });
        } catch (e) {
          // ignore
        }
        if (mounted) setLeaflet({ ...rl, L });
      } catch (e) {
        // import failed
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onResize = () => {
      const m = mapRef.current;
      if (m && typeof m.invalidateSize === 'function') {
        m.invalidateSize();
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const c = route && route.stops && route.stops.length ? [route.stops[0].latitude, route.stops[0].longitude] : [27.7172, 85.3240];
    const id = setTimeout(() => {
      if (typeof m.invalidateSize === 'function') m.invalidateSize();
      try {
        if (typeof m.setView === 'function') m.setView(c, m.getZoom ? m.getZoom() : 12);
      } catch (e) {
        // ignore
      }
    }, 150);
    return () => clearTimeout(id);
  }, [route]);

  if (!leaflet) return <View style={s.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Loading map...</Text></View>;

  const { MapContainer, TileLayer, Marker, Popup, Polyline } = leaflet;

  const center = route && route.stops && route.stops.length ? [route.stops[0].latitude, route.stops[0].longitude] : [27.7172, 85.3240];
  const positions = (route?.stops?.map((s: any) => [s.latitude, s.longitude]) ?? []) as any[];

  return (
    <View style={s.container}>
      {/* Route Dropdown */}
      <View style={s.dropdownContainer}>
        <select
          value={selectedRouteId ?? ''}
          onChange={(e) => onSelectRoute(e.target.value)}
          style={s.webSelect as any}
        >
          <option value="" disabled>
            Select a Route
          </option>
          {(routes ?? []).map((r) => (
            <option key={r._id} value={r._id}>
              {r.routeName} ({r.routeNumber})
            </option>
          ))}
        </select>
      </View>

      {/* Map */}
      <View style={s.mapContainer}>
        <MapContainer
          key={route?._id ?? 'map'}
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance: any) => {
            mapRef.current = mapInstance;
            setTimeout(() => mapInstance.invalidateSize && mapInstance.invalidateSize(), 200);
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileload: () => {},
              load: () => setTilesLoaded(true),
              tileerror: () => setTilesLoaded(true),
            }}
          />
          {route && positions.length > 0 && positions.map((pos: any, idx: number) => (
            <Marker key={idx} position={pos}>
              <Popup>{route.stops[idx]?.stopName || `Stop ${idx + 1}`}</Popup>
            </Marker>
          ))}
          {positions.length > 1 && (
            <Polyline positions={positions} color={'#3b82f6'} />
          )}
        </MapContainer>

        {!tilesLoaded && (
          <View style={s.mapLoadingOverlay}>
            <Text style={{ color: '#fff' }}>Loading tiles...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  dropdown: { maxHeight: 120, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  routeButton: { marginHorizontal: 8, marginVertical: 4, paddingVertical: 8 },
  routeButtonActive: { backgroundColor: '#10b981' },
  routeButtonText: { fontSize: 12, fontWeight: '500', color: '#1f2937' },
  mapContainer: { flex: 1, position: 'relative' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dropdownContainer: {
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
},

webSelect: {
  width: '100%',
  padding: '8px',
  fontSize: '14px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
},
  mapLoadingOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
});

export default WebMap;
