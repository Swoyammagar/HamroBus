import { View, Text, StyleSheet } from "react-native";
import React, { useState, useEffect, useRef } from "react";


const Map: React.FC<{ route?: any | null }> = ({ route }) => {
  const [leaflet, setLeaflet] = useState<any>(null);
  const mapRef = useRef<any>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  // Dummy route with Kathmandu bus park coordinates
  const dummyRoute = route ?? {
    name: 'Kathmandu Bus Park Route',
    stops: [
      { name: 'Bus Park', lat: 27.7172, lng: 85.3240 },
      { name: 'Ratna Park', lat: 27.7090, lng: 85.3168 }
    ],
    color: '#FF6600'
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // dynamic import so native builds don't fail
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
        // leaflet not available (native), silently fail
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onResize = () => {
      const m = mapRef.current;
      if (m && typeof m.invalidateSize === 'function') m.invalidateSize();
    };
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return () => {};
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const c = dummyRoute && dummyRoute.stops && dummyRoute.stops.length ? [dummyRoute.stops[0].lat, dummyRoute.stops[0].lng] : [27.7172, 85.3240];
    const id = setTimeout(() => {
      if (typeof m.invalidateSize === 'function') m.invalidateSize();
      try { if (typeof m.setView === 'function') m.setView(c, m.getZoom ? m.getZoom() : 12); } catch (e) {}
    }, 150);
    return () => clearTimeout(id);
  }, [leaflet, dummyRoute]);

  if (!leaflet) return (
    <View style={styles.mapPlaceholder}>
      <Text style={{ color: '#6b7280' }}>Loading map...</Text>
    </View>
  );

  const { MapContainer, TileLayer, Marker, Popup, Polyline } = leaflet;
  const center = dummyRoute && dummyRoute.stops && dummyRoute.stops.length ? [dummyRoute.stops[0].lat, dummyRoute.stops[0].lng] : [27.7172, 85.3240];
  const positions = dummyRoute?.stops?.map((s: any) => [s.lat, s.lng]) ?? [];

  return (
    <View style={styles.container}>
      {/* @ts-ignore */}
      <MapContainer
        key={dummyRoute?._id ?? 'map'}
        center={center}
        zoom={13}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        whenCreated={(mapInstance: any) => {
          mapRef.current = mapInstance;
          setTimeout(() => mapInstance.invalidateSize && mapInstance.invalidateSize(), 200);
        }}
      >
        {/* @ts-ignore */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileload: () => {},
            load: () => setTilesLoaded(true),
            tileerror: () => setTilesLoaded(true),
          }}
        />
        {positions.map((pos: any, idx: number) => (
          // @ts-ignore
          <Marker key={idx} position={pos}>
            {/* @ts-ignore */}
            <Popup>{dummyRoute.stops[idx].name}</Popup>
          </Marker>
        ))}
        {positions.length > 1 && (
          // @ts-ignore
          <Polyline positions={positions} color={dummyRoute.color ?? '#1890ff'} />
        )}
      </MapContainer>

      {!tilesLoaded && (
        <View style={styles.mapLoadingOverlay}>
          <Text style={{ color: '#fff' }}>Loading tiles...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, position: 'relative' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', minHeight: 0, width: '100%' },
  mapLoadingOverlay: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 6 }
});

export default Map;