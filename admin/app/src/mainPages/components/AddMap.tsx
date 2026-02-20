// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AddMapProps {
  stops: Array<{ stopName: string; latitude: number; longitude: number; sequence: number }>;
  onMapClick: (lat: number, lng: number) => void;
}

const AddMap: React.FC<AddMapProps> = ({ stops, onMapClick }) => {
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
        console.error('Failed to load leaflet:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onResize = () => {
      const m = mapRef.current;
      if (m && typeof m.invalidateSize === 'function') m.invalidateSize();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!leaflet) return <View style={s.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Loading map...</Text></View>;

  const { MapContainer, TileLayer, Marker, Popup } = leaflet;
  const center = stops && stops.length ? [stops[0].latitude, stops[0].longitude] : [27.7172, 85.3240];

  const handleMapClick = (e: any) => {
    if (e && e.latlng) {
      const { lat, lng } = e.latlng;
      console.log('Map clicked at:', lat, lng); // Debug log
      onMapClick(lat, lng);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Pick stop locations</Text>
        <Text style={s.subtitle}>Click on the map to add stops</Text>
      </View>

      <View style={s.mapContainer}>
        <MapContainer
          key={`addmap-${stops.length}`}
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%', cursor: 'crosshair' }}
          whenCreated={(mapInstance: any) => {
            mapRef.current = mapInstance;
            // Remove any previous click listeners to avoid duplicates
            mapInstance.off('click');
            // Add click event listener
            mapInstance.on('click', handleMapClick);
            // Invalidate size after a delay to ensure proper rendering
            setTimeout(() => {
              if (mapInstance && typeof mapInstance.invalidateSize === 'function') {
                mapInstance.invalidateSize(false);
              }
            }, 500);
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
            eventHandlers={{ 
              load: () => setTilesLoaded(true), 
              tileerror: () => setTilesLoaded(true) 
            }}
          />
          {stops && stops.length > 0 && stops.map((stop, i) => (
            <Marker 
              key={`${stop.latitude}-${stop.longitude}-${i}`} 
              position={[stop.latitude, stop.longitude]}
            >
              <Popup>
                <div style={{ fontSize: '12px' }}>
                  <strong>{stop.stopName}</strong><br />
                  Seq: {stop.sequence}
                </div>
              </Popup>
            </Marker>
          ))}
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
  header: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontWeight: '700', fontSize: 14, color: '#1f2937' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  mapContainer: { flex: 1, position: 'relative' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapLoadingOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
});

export default AddMap;