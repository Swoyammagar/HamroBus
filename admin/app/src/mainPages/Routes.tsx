// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import { Tabs, SearchBar, Button, Input, StatusBadge } from '../../components/ui';
import { useRoute, type DayOfWeek, type RouteRecord } from '../../context/domains';
import WebMap from './components/WebMap';
import AddMap from './components/AddMap';
import RouteDetailModal from './components/RouteDetailModal';

// NOTE: react-leaflet is web-only. We guard rendering so native apps won't try to use it.
const RoutesPage: React.FC = () => {
  const { routes, createRoute, fetchAllRoutes, updateRoute, deleteRoute, loading: routeLoading, error: routeError } = useRoute();
  const [activeTab, setActiveTab] = useState<'all' | 'add'>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Modal state for viewing/editing routes
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRecord | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add form state - basic info
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [distance, setDistance] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [fareInfo, setFareInfo] = useState('');
  const [firstBusTiming, setFirstBusTiming] = useState('');
  const [lastBusTiming, setLastBusTiming] = useState('');
  const [operatingDays, setOperatingDays] = useState<DayOfWeek[]>([]);
  
  // Stops with proper structure
  const [newStops, setNewStops] = useState<Array<{ stopName: string; latitude: number; longitude: number; sequence: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch routes on mount and set initial selection
  useEffect(() => {
    fetchAllRoutes();
  }, []);

  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0]._id ?? null);
    }
  }, [routes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(r => (r.routeName || '').toLowerCase().includes(q) || 
                        (r.routeNumber || '').toLowerCase().includes(q));
  }, [query, routes]);

  const selectedRoute = useMemo(() => routes.find(r => r._id === selectedRouteId) ?? null, [routes, selectedRouteId]);

  // @ts-ignore
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
        // @ts-ignore
        <View style={styles.splitRow}>
          {/* @ts-ignore */}
          <View style={styles.leftPane}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Filter routes..."
              onClear={() => setQuery('')}
            />
            {routeLoading ? (
              // @ts-ignore
              <View style={styles.loadingContainer}>
                <Text style={{ color: '#6b7280' }}>Loading routes...</Text>
              </View>
            ) : routeError ? (
              // @ts-ignore
              <View style={styles.loadingContainer}>
                <Text style={{ color: '#ef4444' }}>{routeError}</Text>
              </View>
            ) : (
              <ScrollView style={{ marginTop: 12, flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
                {filtered.map(r => (
                  // @ts-ignore
                  <View
                    key={r._id}
                    style={[
                      styles.routeCard,
                      selectedRouteId === r._id && styles.routeCardActive,
                    ]}
                  >
                    {/* Clickable Main Area */}
                    <Pressable
                      onPress={() => r._id && setSelectedRouteId(r._id)}
                      style={({ hovered }) => [
                        { cursor: 'pointer' },
                        hovered && { opacity: 0.85 },
                      ]}
                    >
                      <View style={styles.routeCardTopRow}>
                        <Text
                          style={[
                            styles.routeName,
                            selectedRouteId === r._id && { color: '#fff' },
                          ]}
                        >
                          {r.routeName}
                        </Text>

                        <View style={styles.badgeContainer}>
                          <StatusBadge
                            label={`${r.stops?.length ?? 0} stops`}
                            variant="info"
                          />
                        </View>
                      </View>

                      <View style={styles.routeCardBottomRow}>
                        <Text
                          style={[
                            styles.routeNumber,
                            selectedRouteId === r._id && { color: '#e5e7eb' },
                          ]}
                        >
                          {r.routeNumber}
                        </Text>

                        <Text
                          style={[
                            styles.busText,
                            selectedRouteId === r._id && { color: '#e5e7eb' },
                          ]}
                        >
                          {(r.assignedBusIds?.length ?? 0)} buses
                        </Text>
                      </View>
                    </Pressable>

                    {/* View Details Button */}
                    <Button
                      variant={selectedRouteId === r._id ? 'success' : 'primary'}
                      size="sm"
                      style={{ marginTop: 10 }}
                      onPress={() => {
                        setEditingRoute(r);
                        setShowDetailModal(true);
                        setIsEditMode(false);
                      }}
                    >
                      View Details
                    </Button>
                  </View>
                ))}
                {filtered.length === 0 && (
                  // @ts-ignore
                  <View style={styles.emptyContainer}>
                    <Text style={{ color: '#6b7280' }}>No routes found</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
          {/* @ts-ignore */}
          <View style={styles.rightPane}>
            {/* @ts-ignore */}
            <View style={styles.mapArea}>
              {Platform.OS === 'web' ? (
                // @ts-ignore
                <WebMap 
                  route={selectedRoute} 
                  routes={routes} 
                  selectedRouteId={selectedRouteId}
                  onSelectRoute={setSelectedRouteId}
                />
              ) : (
                // @ts-ignore
                <View style={styles.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Map is available on web only.</Text></View>
              )}
            </View>
          </View>
        </View>
  ) : (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={[styles.addContainer, { marginTop: 12 }]}>
          <View style={styles.addLeftPane}>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Route Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Route Name</Text>
                <Input placeholder="e.g., Downtown Express" value={newName} onChangeText={setNewName} />
              </View>

              {/* Route Number */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Route Number</Text>
                <Input placeholder="e.g., R3" value={newNumber} onChangeText={setNewNumber} />
              </View>

              {/* Source */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Source</Text>
                <Input placeholder="e.g., Kathmandu Bus Park" value={source} onChangeText={setSource} />
              </View>

              {/* Destination */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Destination</Text>
                <Input placeholder="e.g., Bhaktapur" value={destination} onChangeText={setDestination} />
              </View>

              {/* Distance */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Distance (km)</Text>
                <Input 
                  placeholder="e.g., 50" 
                  value={distance} 
                  onChangeText={setDistance}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Estimated Duration */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Estimated Duration (hours)</Text>
                <Input 
                  placeholder="e.g., 2.5" 
                  value={estimatedDuration} 
                  onChangeText={setEstimatedDuration}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Fare Info */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Fare (per passenger)</Text>
                <Input 
                  placeholder="e.g., 300" 
                  value={fareInfo} 
                  onChangeText={setFareInfo}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* First Bus Timing */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>First Bus Timing</Text>
                <Input 
                  placeholder="e.g., 06:00 AM" 
                  value={firstBusTiming} 
                  onChangeText={setFirstBusTiming}
                />
              </View>

              {/* Last Bus Timing */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Bus Timing</Text>
                <Input 
                  placeholder="e.g., 08:00 PM" 
                  value={lastBusTiming} 
                  onChangeText={setLastBusTiming}
                />
              </View>

              {/* Operating Days */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Operating Days</Text>
                <View style={styles.daysContainer}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <Button
                      key={day}
                      variant={operatingDays.includes(day as DayOfWeek) ? 'primary' : 'outline'}
                      size="sm"
                      onPress={() => {
                        if (operatingDays.includes(day as DayOfWeek)) {
                          setOperatingDays(operatingDays.filter(d => d !== day));
                        } else {
                          setOperatingDays([...operatingDays, day as DayOfWeek]);
                        }
                      }}
                      style={styles.dayButton}
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </View>
              </View>

              {/* Bus Stops */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Bus Stops (click on map to add location)</Text>
                <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ paddingBottom: 8 }}>
                  {newStops.map((st, idx) => (
                    <View key={`${st.latitude}_${st.longitude}_${idx}`} style={styles.stopItemContainer}>
                      <View style={styles.stopSequence}>
                        <Text style={styles.stopSequenceText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.stopInputs}>
                        <Input
                          value={st.stopName}
                          onChangeText={(t) => setNewStops(s => s.map((x, i) => i === idx ? { ...x, stopName: t } : x))}
                          placeholder={`Stop ${idx + 1} name`}
                          style={{ marginBottom: 6 }}
                        />
                        <Text style={styles.coordinatesText}>
                          Lat: {st.latitude.toFixed(5)}, Lng: {st.longitude.toFixed(5)}
                        </Text>
                      </View>
                      <Button
                        variant="danger"
                        size="sm"
                        onPress={() => setNewStops(s => 
                          s.filter((_, i) => i !== idx).map((stop, i) => ({ ...stop, sequence: i + 1 }))
                        )}
                      >
                        ✕
                      </Button>
                    </View>
                  ))}
                </ScrollView>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    // This will be triggered when user clicks map, so we just show instruction here
                  }}
                  style={{ marginTop: 8 }}
                >
                  + Add Stop (Click on map)
                </Button>
              </View>

              {/* Form Actions */}
              <View style={styles.formActions}>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setNewName('');
                    setNewNumber('');
                    setSource('');
                    setDestination('');
                    setDistance('');
                    setEstimatedDuration('');
                    setFareInfo('');
                    setFirstBusTiming('');
                    setLastBusTiming('');
                    setOperatingDays([]);
                    setNewStops([]);
                  }}
                >
                  Reset
                </Button>
                <Button
                  variant="success"
                  loading={isSubmitting}
                  disabled={isSubmitting || !newName || !newNumber || !source || !destination || !distance || !operatingDays.length || !newStops.length}
                  onPress={async () => {
                    if (!newName || !newNumber || !source || !destination || !distance || !operatingDays.length || !newStops.length) {
                      // @ts-ignore
                      alert('Please fill in all required fields and add at least one stop');
                      return;
                    }

                    setIsSubmitting(true);
                    try {
                      const payload = {
                        routeName: newName,
                        routeNumber: newNumber,
                        source,
                        destination,
                        distance: parseFloat(distance),
                        estimatedDuration: estimatedDuration ? parseFloat(estimatedDuration) : undefined,
                        stops: newStops.map((s, idx) => ({
                          stopName: s.stopName,
                          latitude: s.latitude,
                          longitude: s.longitude,
                          sequence: idx + 1,
                        })),
                        operatingDays,
                        firstBusTiming,
                        lastBusTiming,
                        fareInfo: parseFloat(fareInfo),
                      };

                      const result = await createRoute(payload);
                      if (result.success) {
                        // @ts-ignore
                        alert('Route created successfully!');
                        // Reset form
                        setNewName('');
                        setNewNumber('');
                        setSource('');
                        setDestination('');
                        setDistance('');
                        setEstimatedDuration('');
                        setFareInfo('');
                        setFirstBusTiming('');
                        setLastBusTiming('');
                        setOperatingDays([]);
                        setNewStops([]);
                        setActiveTab('all');
                      } else {
                        // @ts-ignore
                        alert(`Error: ${result.message}`);
                      }
                    } catch (error) {
                      console.error('Error creating route:', error);
                      // @ts-ignore
                      alert('Failed to create route. Please try again.');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Add Route'}
                </Button>
              </View>
            </ScrollView>
          </View>

          <View style={styles.addRightPane}>
            <View style={styles.mapArea}>
              {Platform.OS === 'web' ? (
                // @ts-ignore
                // <AddMap 
                //   stops={newStops} 
                //   onMapClick={(lat, lng) => setNewStops(s => [...s, { stopName: `Stop ${s.length + 1}`, latitude: lat, longitude: lng, sequence: s.length + 1 }])} 
                // />
                <AddMap 
                  stops={newStops}
                  onMapClick={(lat, lng) =>
                    setNewStops(s => [
                      ...s,
                      {
                        stopName: `Stop ${s.length + 1}`,
                        latitude: lat,
                        longitude: lng,
                        sequence: s.length + 1,
                      },
                    ])
                  }
                  onRemoveStop={(index) =>
                    setNewStops(s =>
                      s
                        .filter((_, i) => i !== index)
                        .map((stop, i) => ({ ...stop, sequence: i + 1 }))
                    )
                  }
                />
              ) : (
                <View style={styles.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Map is available on web only.</Text></View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      )}

      {/* Route Detail Modal */}
      <RouteDetailModal 
        visible={showDetailModal} 
        route={editingRoute}
        onClose={() => {
          setShowDetailModal(false);
          setEditingRoute(null);
          setIsEditMode(false);
          fetchAllRoutes();
        }}
        onUpdate={updateRoute}
        onDelete={deleteRoute}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  splitRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  leftPane: { width: 340, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, height: 560 },
  rightPane: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, height: 560 },
  addContainer: { flexDirection: 'row', gap: 12 },
  addLeftPane: { width: 420, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, flexDirection: 'column' },
  addRightPane: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, minHeight: 400 },
  
  // Form styles
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  
  // Days container
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayButton: { flex: 0.3, minWidth: 60 },
  
  // Stops
  stopItemContainer: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 10, backgroundColor: '#f9fafb', padding: 10, borderRadius: 6 },
  stopSequence: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  stopSequenceText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stopInputs: { flex: 1 },
  coordinatesText: { fontSize: 12, color: '#6b7280', marginTop: 2, fontFamily: 'monospace' },
  
  // Form actions
  formActions: { flexDirection: 'row', gap: 8, marginTop: 16, justifyContent: 'flex-end' },
  
  // Route items
  routeItemWrapper: { marginBottom: 8, width: '100%' },
  routeItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  routeItemActive: {},
  routeName: { fontWeight: '700', color: '#111827', fontSize: 15 },
  routeNumber: { color: '#6b7280', marginTop: 4, fontSize: 13 },
  routeCard: {
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#e5e7eb',
  borderRadius: 10,
  padding: 12,
  marginBottom: 12,
},

routeCardActive: {
  backgroundColor: '#16a34a',
  borderColor: '#16a34a',
},

routeCardTopRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

routeCardBottomRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 6,
},

badgeContainer: {
  marginLeft: 8,
},

busText: {
  color: '#6b7280',
  fontSize: 13,
},
  // Loading/Empty states
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // Map
  mapHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mapArea: { flex: 1, borderRadius: 8, overflow: 'hidden', height: '100%', minHeight: 400 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 8, height: '100%' },
  mapLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 700, maxHeight: '90%', flexDirection: 'column' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { flex: 1, padding: 16 },
  modalFooter: { flexDirection: 'row', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', justifyContent: 'flex-end' },
  
  // Detail view
  detailGroup: { marginBottom: 16 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  stopDetailItem: { padding: 10, backgroundColor: '#f9fafb', borderRadius: 6, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
});

export default RoutesPage;
