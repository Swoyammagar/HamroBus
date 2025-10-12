import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Platform } from 'react-native';
import { routes as initialRoutes, buses as allBuses } from '../data/dummyData';

// NOTE: react-leaflet is web-only. We guard rendering so native apps won't try to use it.
const RoutesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'add'>('all');
  const [routes, setRoutes] = useState(initialRoutes);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(routes[0]?._id ?? null);
  const [query, setQuery] = useState('');

  // Simple add form state (minimal scaffold; you can provide more fields later)
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');

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
const WebMap = null ;

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]} onPress={() => setActiveTab('all')}>
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All Routes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'add' && styles.tabBtnActive]} onPress={() => setActiveTab('add')}>
          <Text style={[styles.tabText, activeTab === 'add' && styles.tabTextActive]}>Add Route</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'all' ? (
        <View style={styles.splitRow}>
          <View style={styles.leftPane}>
            <TextInput placeholder="Filter routes..." value={query} onChangeText={setQuery} style={styles.searchInput} />
            <ScrollView style={{ marginTop: 12, flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
              {filtered.map(r => (
                <TouchableOpacity key={r._id} style={[styles.routeItem, selectedRouteId === r._id && styles.routeItemActive]} onPress={() => setSelectedRouteId(r._id)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeName}>{r.name}</Text>
                    <Text style={styles.routeNumber}>{r.routeNumber}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={styles.badgeBlue}><Text style={{ color: '#fff', fontWeight: '700' }}>{r.stops?.length ?? 0}</Text></View>
                    <Text style={{ marginTop: 6, color: '#6b7280' }}>{(r.assignedBusIds?.length ?? 0)} buses</Text>
                  </View>
                </TouchableOpacity>
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
              
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.addContainer, { marginTop: 12 }]}>
          <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>Route Name</Text>
          <TextInput style={styles.searchInput} placeholder="Enter route name" value={newName} onChangeText={setNewName} />

          <Text style={{ fontSize: 14, color: '#374151', marginTop: 12, marginBottom: 6 }}>Route Number</Text>
          <TextInput style={styles.searchInput} placeholder="e.g. R3" value={newNumber} onChangeText={setNewNumber} />

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
            <TouchableOpacity style={{ padding: 8 }} onPress={() => { setNewName(''); setNewNumber(''); }}>
              <Text style={{ color: '#374151' }}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 8, backgroundColor: '#059669', borderRadius: 6, marginLeft: 8 }} onPress={() => {
              if (!newName || !newNumber) {
                // @ts-ignore
                alert('Please fill route name and number');
                return;
              }
              const nr = { _id: 'rte_' + Math.random().toString(36).slice(2, 9), name: newName, routeNumber: newNumber, stops: [], assignedBusIds: [], assignedDriverIds: [], color: '#1890ff' };
              setRoutes(r => [nr, ...r]);
              setNewName(''); setNewNumber(''); setActiveTab('all'); setSelectedRouteId(nr._id);
            }}>
              <Text style={{ color: '#fff' }}>Add Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  tabBtnActive: { backgroundColor: '#10b98122', borderColor: '#10b981' },
  tabText: { color: '#374151', fontWeight: '600' },
  tabTextActive: { color: '#065f46' },
  splitRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  leftPane: { width: 340, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, height: 560 },
  rightPane: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, height: 560 },
  searchInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, color: '#111827' },
  routeItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 8 },
  routeItemActive: { backgroundColor: '#f0fdf4' },
  routeName: { fontWeight: '700', color: '#111827' },
  routeNumber: { color: '#6b7280', marginTop: 4 },
  badgeBlue: { marginTop: 4, backgroundColor: '#2563eb', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, marginLeft: 8 },
  mapHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mapArea: { flex: 1, borderRadius: 8, overflow: 'hidden', height: '100%' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 8, height: '100%' },
  mapLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  addContainer: { padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
});

export default RoutesPage;
