import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { routes as initialRoutes, buses as allBuses } from '../data/dummyData';
import { Tabs, SearchBar, Button, Input, StatusBadge } from '../../components/ui';

// NOTE: react-leaflet is web-only. We guard rendering so native apps won't try to use it.
const RoutesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'add'>('all');
  const [routes, setRoutes] = useState(initialRoutes);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(routes[0]?._id ?? null);
  const [query, setQuery] = useState('');

  // Simple add form state (minimal scaffold; you can provide more fields later)
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newStops, setNewStops] = useState<Array<{ name: string; lat: number; lng: number }>>([]);

  // Inject leaflet CSS for web at runtime (avoids bundling CSS import issues)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const id = 'leaflet-css';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        // avoid integrity/crossorigin to reduce CDN/CSP issues in dev
        document.head.appendChild(link);
      }
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(r => (r.name || '').toLowerCase().includes(q) || 
                        (r.routeNumber || '').toLowerCase().includes(q));
  }, [query, routes]);

  const selectedRoute = useMemo(() => routes.find(r => r._id === selectedRouteId) ?? null, [routes, selectedRouteId]);

  // Web map component using react-leaflet (dynamically imported to reduce native bundling issues)
  const WebMap: React.FC<{ route: any | null }> = ({ route }) => {
    const [leaflet, setLeaflet] = useState<any>(null);
    const mapRef = React.useRef<any>(null);
    const [tilesLoaded, setTilesLoaded] = useState(false);

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          // dynamic import so native builds don't fail
          const rl = await import('react-leaflet');
          const L = await import('leaflet');
          // fix default icon paths for leaflet in some setups
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
          // console.warn('react-leaflet import failed', e);
        }
      })();
      return () => { mounted = false; };
    }, []);
    // add a single resize listener and ensure the map invalidates size when needed
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

    // when the route prop changes, re-center and invalidate size so tiles render fully
    useEffect(() => {
      const m = mapRef.current;
      if (!m) return;
      // compute center for the new route
      const c = route && route.stops && route.stops.length ? [route.stops[0].lat, route.stops[0].lng] : [27.7172, 85.3240];
      // small delay to allow layout to settle
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

  if (!leaflet) return <View style={styles.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Loading map...</Text></View>;

    const { MapContainer, TileLayer, Marker, Popup, Polyline } = leaflet;

    const center = route && route.stops && route.stops.length ? [route.stops[0].lat, route.stops[0].lng] : [27.7172, 85.3240];
    const positions = route?.stops?.map((s: any) => [s.lat, s.lng]) ?? [];

    return (
      <View style={{ height: '100%', width: '100%' }}>
        {/* @ts-ignore */}
        <MapContainer
          key={route?._id ?? 'map'}
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance: any) => {
            mapRef.current = mapInstance;
            // ensure correct sizing after creation
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
              <Popup>{route.stops[idx].name}</Popup>
            </Marker>
          ))}
          {positions.length > 1 && (
            // @ts-ignore
            <Polyline positions={positions} color={route.color ?? '#1890ff'} />
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

  // AddMap: used in Add Route tab to capture click coordinates and show markers for stops
  const AddMap: React.FC<{ stops: any[]; onMapClick: (lat: number, lng: number) => void }> = ({ stops, onMapClick }) => {
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
          } catch (e) {}
          if (mounted) setLeaflet({ ...rl, L });
        } catch (e) {
          // ignore
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

    if (!leaflet) return <View style={styles.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Loading map...</Text></View>;

    const { MapContainer, TileLayer, Marker, Popup } = leaflet;
    const center = stops && stops.length ? [stops[0].lat, stops[0].lng] : [27.7172, 85.3240];

    return (
      <View style={{ height: '100%', width: '100%' }}>
        {/* @ts-ignore */}
        <MapContainer
          key={`addmap`}
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance: any) => {
            mapRef.current = mapInstance;
            // listen for clicks
            try {
              mapInstance.on('click', (e: any) => {
                const { lat, lng } = e.latlng || {};
                if (lat && lng) onMapClick(lat, lng);
              });
            } catch (e) {}
            setTimeout(() => mapInstance.invalidateSize && mapInstance.invalidateSize(), 200);
          }}
        >
          {/* @ts-ignore */}
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{ load: () => setTilesLoaded(true), tileerror: () => setTilesLoaded(true) }}
          />
          {stops.map((s, i) => (
            // @ts-ignore
            <Marker key={`${s.lat}_${s.lng}_${i}`} position={[s.lat, s.lng]}>
              {/* @ts-ignore */}
              <Popup>{s.name || `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`}</Popup>
            </Marker>
          ))}
        </MapContainer>
        {!tilesLoaded && (
          <View style={styles.mapLoadingOverlay}><Text style={{ color: '#fff' }}>Loading tiles...</Text></View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Tabs
        tabs={[
          { key: 'all', label: 'All Routes' },
          { key: 'add', label: 'Add Route' },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as 'all' | 'add')}
      />

      {activeTab === 'all' ? (
        <View style={styles.splitRow}>
          <View style={styles.leftPane}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Filter routes..."
              onClear={() => setQuery('')}
            />
            <ScrollView style={{ marginTop: 12, flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
              {filtered.map(r => (
                <Button
                  key={r._id}
                  onPress={() => setSelectedRouteId(r._id)}
                  variant={selectedRouteId === r._id ? 'primary' : 'outline'}
                  style={[styles.routeItem, selectedRouteId === r._id && styles.routeItemActive]}
                >
                  <View style={{ flex: 1, alignItems: 'flex-start' }}>
                    <Text style={[styles.routeName, selectedRouteId === r._id && { color: '#fff' }]}>{r.name}</Text>
                    <Text style={[styles.routeNumber, selectedRouteId === r._id && { color: '#e5e7eb' }]}>{r.routeNumber}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <StatusBadge label={`${r.stops?.length ?? 0} stops`} variant="info" />
                    <Text style={[{ marginTop: 6, color: '#6b7280' }, selectedRouteId === r._id && { color: '#e5e7eb' }]}>
                      {(r.assignedBusIds?.length ?? 0)} buses
                    </Text>
                  </View>
                </Button>
              ))}
            </ScrollView>
          </View>
          <View style={styles.rightPane}>
            <View style={styles.mapHeaderRow}>
              <Text style={{ fontWeight: '700' }}>Route selector</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <select style={{ width: '100%', padding: 8 }} value={selectedRouteId ?? ''} onChange={(e: any) => setSelectedRouteId(e.target.value)}>
                  <option value="">-- Select route --</option>
                  {routes.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </View>
            </View>
            <View style={styles.mapArea}>
              {Platform.OS === 'web' ? (
                // @ts-ignore
                <WebMap route={selectedRoute} />
              ) : (
                <View style={styles.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Map is available on web only.</Text></View>
              )}
            </View>
          </View>
        </View>
  ) : (
    
        <View style={[styles.addContainer, { marginTop: 12 }]}>
          <View style={styles.leftPane}>
            <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Route Name</Text>
            <Input placeholder="Enter route name" value={newName} onChangeText={setNewName} />

            <Text style={{ fontSize: 14, color: '#374151', marginTop: 12, marginBottom: 6 }}>Route Number</Text>
            <Input placeholder="e.g. R3" value={newNumber} onChangeText={setNewNumber} />

            <Text style={{ fontSize: 14, color: '#374151', marginTop: 12, marginBottom: 6 }}>Stops (click on the map to add a stop at the clicked location)</Text>
            <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {newStops.map((st, idx) => (
                <View key={`${st.lat}_${st.lng}_${idx}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      value={st.name}
                      onChangeText={(t) => setNewStops(s => s.map((x, i) => i === idx ? { ...x, name: t } : x))}
                      placeholder={`Stop ${idx + 1} name`}
                    />
                  </View>
                  <Button
                    variant="danger"
                    size="sm"
                    onPress={() => setNewStops(s => s.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </Button>
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
              <Button
                variant="secondary"
                onPress={() => { setNewName(''); setNewNumber(''); setNewStops([]); }}
              >
                Reset
              </Button>
              <Button
                variant="success"
                onPress={() => {
                  if (!newName || !newNumber) {
                    // @ts-ignore
                    alert('Please fill route name and number');
                    return;
                  }
                  const nr = { _id: 'rte_' + Math.random().toString(36).slice(2, 9), name: newName, routeNumber: newNumber, stops: newStops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng })), assignedBusIds: [], assignedDriverIds: [], color: '#1890ff' };
                  setRoutes(r => [nr, ...r]);
                  setNewName(''); setNewNumber(''); setNewStops([]); setActiveTab('all'); setSelectedRouteId(nr._id);
                }}
              >
                Add Route
              </Button>
            </View>
          </View>

          <View style={styles.rightPane}>
            <View style={styles.mapHeaderRow}>
              <Text style={{ fontWeight: '700' }}>Pick stop location</Text>
            </View>
            <View style={styles.mapArea}>
              {Platform.OS === 'web' ? (
                // @ts-ignore
                <AddMap stops={newStops} onMapClick={(lat, lng) => setNewStops(s => [...s, { name: `Stop ${s.length + 1}`, lat, lng }])} />
              ) : (
                <View style={styles.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Map is available on web only.</Text></View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  splitRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  leftPane: { width: 340, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, height: 560 },
  rightPane: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, height: 560 },
  routeItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, width: '100%' },
  routeItemActive: {},
  routeName: { fontWeight: '700', color: '#111827', fontSize: 15 },
  routeNumber: { color: '#6b7280', marginTop: 4, fontSize: 13 },
  mapHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mapArea: { flex: 1, borderRadius: 8, overflow: 'hidden', height: '100%' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 8, height: '100%' },
  mapLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  addContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
});

export default RoutesPage;
