// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, Pressable } from 'react-native';
import { Tabs, SearchBar, Button, Input, StatusBadge } from '../../components/ui';
import { useRoute, type DayOfWeek, type RouteRecord } from '../../context/domains';
import WebMap from './Maps/WebMap';
import AddMap from './Maps/AddMap';
import RouteDetailModal from './Maps/RouteDetailModal';

const RoutesPage: React.FC = () => {
  const { routes, createRoute, fetchAllRoutes, updateRoute, deleteRoute, loading: routeLoading, error: routeError } = useRoute();
  const [activeTab, setActiveTab] = useState<'all' | 'add'>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRecord | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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
  const [newStops, setNewStops] = useState<Array<{ stopName: string; latitude: number; longitude: number; sequence: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const id = 'leaflet-css';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
    }
  }, []);

  useEffect(() => { fetchAllRoutes(); }, []);

  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0]._id ?? null);
    }
  }, [routes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(r =>
      (r.routeName || '').toLowerCase().includes(q) ||
      (r.routeNumber || '').toLowerCase().includes(q)
    );
  }, [query, routes]);

  const selectedRoute = useMemo(() => routes.find(r => r._id === selectedRouteId) ?? null, [routes, selectedRouteId]);

  const resetForm = () => {
    setNewName(''); setNewNumber(''); setSource(''); setDestination('');
    setDistance(''); setEstimatedDuration(''); setFareInfo('');
    setFirstBusTiming(''); setLastBusTiming(''); setOperatingDays([]); setNewStops([]);
  };

  return (
    // @ts-ignore
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
          {/* Left pane — route list */}
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
              <View style={styles.centerState}>
                <Text style={{ color: '#6b7280' }}>Loading routes...</Text>
              </View>
            ) : routeError ? (
              // @ts-ignore
              <View style={styles.centerState}>
                <Text style={{ color: '#ef4444' }}>{routeError}</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.routeScroll}
                contentContainerStyle={{ paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {filtered.map(r => (
                  // @ts-ignore
                  <View
                    key={r._id}
                    style={[styles.routeCard, selectedRouteId === r._id && styles.routeCardActive]}
                  >
                    <Pressable
                      onPress={() => r._id && setSelectedRouteId(r._id)}
                      // @ts-ignore
                      style={({ hovered }) => [{ cursor: 'pointer' }, hovered && { opacity: 0.85 }]}
                    >
                      <View style={styles.routeCardTopRow}>
                        <Text style={[styles.routeName, selectedRouteId === r._id && { color: '#fff' }]}>
                          {r.routeName}
                        </Text>
                        <StatusBadge label={`${r.stops?.length ?? 0} stops`} variant="info" />
                      </View>
                      <View style={styles.routeCardBottomRow}>
                        <Text style={[styles.routeNumber, selectedRouteId === r._id && { color: '#e5e7eb' }]}>
                          {r.routeNumber}
                        </Text>
                        <Text style={[styles.busText, selectedRouteId === r._id && { color: '#e5e7eb' }]}>
                          {r.assignedBusIds?.length ?? 0} buses
                        </Text>
                      </View>
                    </Pressable>
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
                  <View style={styles.centerState}>
                    <Text style={{ color: '#6b7280' }}>No routes found</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>

          {/* Right pane — map */}
          {/* @ts-ignore */}
          <View style={styles.rightPane}>
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
              <View style={styles.mapPlaceholder}>
                <Text style={{ color: '#6b7280' }}>Map is available on web only.</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        // @ts-ignore
        <View style={styles.splitRow}>
          {/* Left pane — add route form (scrollable) */}
          {/* @ts-ignore */}
          <View style={styles.leftPane}>
            <ScrollView
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>Route Name</Text>
                <Input placeholder="e.g., Downtown Express" value={newName} onChangeText={setNewName} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Route Number</Text>
                <Input placeholder="e.g., R3" value={newNumber} onChangeText={setNewNumber} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Source</Text>
                <Input placeholder="e.g., Kathmandu Bus Park" value={source} onChangeText={setSource} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Destination</Text>
                <Input placeholder="e.g., Bhaktapur" value={destination} onChangeText={setDestination} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Distance (km)</Text>
                <Input placeholder="e.g., 50" value={distance} onChangeText={setDistance} keyboardType="decimal-pad" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Estimated Duration (hours)</Text>
                <Input placeholder="e.g., 2.5" value={estimatedDuration} onChangeText={setEstimatedDuration} keyboardType="decimal-pad" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Fare (per passenger)</Text>
                <Input placeholder="e.g., 300" value={fareInfo} onChangeText={setFareInfo} keyboardType="decimal-pad" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>First Bus Timing</Text>
                <Input placeholder="e.g., 06:00 AM" value={firstBusTiming} onChangeText={setFirstBusTiming} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Last Bus Timing</Text>
                <Input placeholder="e.g., 08:00 PM" value={lastBusTiming} onChangeText={setLastBusTiming} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Operating Days</Text>
                <View style={styles.daysContainer}>
                  {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as DayOfWeek[]).map((day) => (
                    <Button
                      key={day}
                      variant={operatingDays.includes(day) ? 'primary' : 'outline'}
                      size="sm"
                      onPress={() =>
                        setOperatingDays(prev =>
                          prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                        )
                      }
                      style={styles.dayButton}
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Bus Stops (click on map to add)</Text>
                {newStops.map((st, idx) => (
                  <View key={`${st.latitude}_${st.longitude}_${idx}`} style={styles.stopItemContainer}>
                    <View style={styles.stopSequence}>
                      <Text style={styles.stopSequenceText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.stopInputs}>
                      <Input
                        value={st.stopName}
                        onChangeText={(t) =>
                          setNewStops(s => s.map((x, i) => i === idx ? { ...x, stopName: t } : x))
                        }
                        placeholder={`Stop ${idx + 1} name`}
                        style={{ marginBottom: 4 }}
                      />
                      <Text style={styles.coordinatesText}>
                        {st.latitude.toFixed(5)}, {st.longitude.toFixed(5)}
                      </Text>
                    </View>
                    <Button
                      variant="danger"
                      size="sm"
                      onPress={() =>
                        setNewStops(s =>
                          s.filter((_, i) => i !== idx).map((stop, i) => ({ ...stop, sequence: i + 1 }))
                        )
                      }
                    >
                      ✕
                    </Button>
                  </View>
                ))}
                {newStops.length === 0 && (
                  // @ts-ignore
                  <View style={styles.emptyStops}>
                    <Text style={{ color: '#9ca3af', fontSize: 13 }}>No stops added yet. Click on the map →</Text>
                  </View>
                )}
              </View>

              <View style={styles.formActions}>
                <Button variant="secondary" onPress={resetForm}>Reset</Button>
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
                        stops: newStops.map((s, idx) => ({ ...s, sequence: idx + 1 })),
                        operatingDays,
                        firstBusTiming,
                        lastBusTiming,
                        fareInfo: parseFloat(fareInfo),
                      };
                      const result = await createRoute(payload);
                      if (result.success) {
                        // @ts-ignore
                        alert('Route created successfully!');
                        resetForm();
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

          {/* Right pane — add map */}
          {/* @ts-ignore */}
          <View style={styles.rightPane}>
            {Platform.OS === 'web' ? (
              // @ts-ignore
              <AddMap
                stops={newStops}
                onMapClick={(lat, lng) =>
                  setNewStops(s => [
                    ...s,
                    { stopName: `Stop ${s.length + 1}`, latitude: lat, longitude: lng, sequence: s.length + 1 },
                  ])
                }
                onRemoveStop={(index) =>
                  setNewStops(s =>
                    s.filter((_, i) => i !== index).map((stop, i) => ({ ...stop, sequence: i + 1 }))
                  )
                }
              />
            ) : (
              // @ts-ignore
              <View style={styles.mapPlaceholder}>
                <Text style={{ color: '#6b7280' }}>Map is available on web only.</Text>
              </View>
            )}
          </View>
        </View>
      )}

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
  // ── Root ──────────────────────────────────────────────────────────────────
  container: {
    flex: 1,
    padding: 16,
    // Fill whatever height the parent gives (sidebar layout)
    // overflow hidden so inner ScrollViews handle scroll, not the page
    overflow: 'hidden',
  },

  // ── Two-column layout ─────────────────────────────────────────────────────
  splitRow: {
    flex: 1,           // fills remaining height after Tabs
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    // No fixed height — grows to fill container
    minHeight: 0,      // critical: allows flex children to shrink/scroll
  },

  // ── Left pane (route list OR add-form) ───────────────────────────────────
  leftPane: {
    width: 340,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    // Fill height of splitRow, content scrolls inside
    flexShrink: 0,
    overflow: 'hidden',  // clip so inner ScrollView handles overflow
  },

  routeScroll: {
    flex: 1,
    marginTop: 12,
  },

  // ── Right pane (map) ─────────────────────────────────────────────────────
  rightPane: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 0,
  },

  // ── Route cards ───────────────────────────────────────────────────────────
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
  routeName: { fontWeight: '700', color: '#111827', fontSize: 15, flex: 1, marginRight: 8 },
  routeNumber: { color: '#6b7280', fontSize: 13 },
  busText: { color: '#6b7280', fontSize: 13 },

  // ── Map placeholder ───────────────────────────────────────────────────────
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },

  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayButton: { minWidth: 52 },

  stopItemContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 10,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 6,
  },
  stopSequence: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    flexShrink: 0,
  },
  stopSequenceText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  stopInputs: { flex: 1 },
  coordinatesText: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' },

  emptyStops: {
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
  },

  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    justifyContent: 'flex-end',
  },

  // ── Shared states ─────────────────────────────────────────────────────────
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
});

export default RoutesPage;