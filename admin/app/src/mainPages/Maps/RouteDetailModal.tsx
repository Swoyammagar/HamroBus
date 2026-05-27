// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Modal, Platform } from 'react-native';
import { Button, Input, FeedbackModal } from '../../../components/ui';
import { type RouteRecord, type DayOfWeek, type RouteStop } from '../../../context/domains';
import AddMap from './AddMap';

interface RouteDetailModalProps {
  visible: boolean;
  route: RouteRecord | null;
  onClose: () => void;
  onUpdate: (routeId: string, payload: any) => Promise<{ success: boolean; message?: string }>;
  onDelete: (routeId: string) => Promise<{ success: boolean; message?: string }> | void;
  onFeedback?: (feedback: { type: 'success' | 'error' | 'info' | 'warning'; title?: string; message: string }) => void;
}

const RouteDetailModal: React.FC<RouteDetailModalProps> = ({ visible, route, onClose, onUpdate, onDelete, onFeedback }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; title?: string; message: string } | null>(null);

  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editDistance, setEditDistance] = useState('');
  const [editEstimatedDuration, setEditEstimatedDuration] = useState('');
  const [editFareInfo, setEditFareInfo] = useState('');
  const [editFirstBusTiming, setEditFirstBusTiming] = useState('');
  const [editLastBusTiming, setEditLastBusTiming] = useState('');
  const [editOperatingDays, setEditOperatingDays] = useState<DayOfWeek[]>([]);
  const [editStops, setEditStops] = useState<RouteStop[]>([]);

  useEffect(() => {
    if (route && visible) {
      setEditName(route.routeName || '');
      setEditNumber(route.routeNumber || '');
      setEditSource(route.source || '');
      setEditDestination(route.destination || '');
      setEditDistance(route.distance?.toString() || '');
      setEditEstimatedDuration(route.estimatedDuration?.toString() || '');
      setEditFareInfo(route.fareInfo?.toString() || '');
      setEditFirstBusTiming(route.firstBusTiming || '');
      setEditLastBusTiming(route.lastBusTiming || '');
      setEditOperatingDays(route.operatingDays || []);
      setEditStops(route.stops || []);
      setIsEditMode(false);
    }
  }, [route, visible]);

  if (!route) return null;

  const handleSave = async () => {
    if (!route._id) return;
    if (!editName || !editNumber || !editSource || !editDestination || !editDistance || !editOperatingDays.length || !editStops.length) {
      setFeedback({ type: 'warning', title: 'Missing Details', message: 'Please fill in all required fields and add at least one stop.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        routeName: editName,
        routeNumber: editNumber,
        source: editSource,
        destination: editDestination,
        distance: parseFloat(editDistance),
        estimatedDuration: editEstimatedDuration ? parseFloat(editEstimatedDuration) : undefined,
        stops: editStops.map((s, idx) => ({
          stopName: s.stopName,
          latitude: s.latitude,
          longitude: s.longitude,
          sequence: idx + 1,
        })),
        operatingDays: editOperatingDays,
        firstBusTiming: editFirstBusTiming,
        lastBusTiming: editLastBusTiming,
        fareInfo: parseFloat(editFareInfo),
      };

      const result = await onUpdate(route._id, payload);
      if (result.success) {
        onFeedback?.({ type: 'success', title: 'Route Updated', message: result.message || 'Route updated successfully.' });
        onClose();
      } else {
        setFeedback({ type: 'error', title: 'Update Failed', message: result.message || 'Unable to update route.' });
      }
    } catch (error) {
      console.error('Error updating route:', error);
      setFeedback({ type: 'error', title: 'Update Failed', message: 'Failed to update route.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!route._id) return;
    setIsDeleting(true);
    try {
      await onDelete(route._id);
    } catch (error) {
      console.error('Error deleting route:', error);
      setFeedback({ type: 'error', title: 'Delete Failed', message: 'Failed to delete route.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={s.overlay}>
        <View style={s.modalContent}>
          <View style={s.header}>
            <Text style={s.title}>{isEditMode ? 'Edit Route' : 'Route Details'}</Text>
            <Button
              size="sm"
              variant="outline"
              onPress={onClose}
              style={s.closeBtn}
            >
              ✕
            </Button>
          </View>

          {!isEditMode ? (
            <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 16 }}>
              <View style={s.group}>
                <Text style={s.label}>Route Name</Text>
                <Text style={s.value}>{route.routeName || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>Route Number</Text>
                <Text style={s.value}>{route.routeNumber || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>Source</Text>
                <Text style={s.value}>{route.source || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>Destination</Text>
                <Text style={s.value}>{route.destination || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>Distance (km)</Text>
                <Text style={s.value}>{route.distance?.toString() || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>Est. Duration (hours)</Text>
                <Text style={s.value}>{route.estimatedDuration?.toString() || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>Fare (per passenger)</Text>
                <Text style={s.value}>Rs. {route.fareInfo?.toString() || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>First Bus Timing</Text>
                <Text style={s.value}>{route.firstBusTiming || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>Last Bus Timing</Text>
                <Text style={s.value}>{route.lastBusTiming || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>Operating Days</Text>
                <Text style={s.value}>{route.operatingDays?.join(', ') || 'N/A'}</Text>
              </View>

              <View style={s.group}>
                <Text style={s.label}>Bus Stops ({route.stops?.length || 0})</Text>
                {route.stops?.map((stop, idx) => (
                  <View key={idx} style={s.stopItem}>
                    <Text style={s.stopText}>{idx + 1}. {stop.stopName}</Text>
                    <Text style={s.coordText}>{stop.latitude?.toFixed(5)}, {stop.longitude?.toFixed(5)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={s.editModeContainer}>
              <View style={s.editLeftPane}>
                <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
                  <View style={s.formGroup}>
                    <Text style={s.label}>Route Name</Text>
                    <Input placeholder="e.g., Downtown Express" value={editName} onChangeText={setEditName} />
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>Route Number</Text>
                    <Input placeholder="e.g., R3" value={editNumber} onChangeText={setEditNumber} />
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>Source</Text>
                    <Input placeholder="e.g., Kathmandu Bus Park" value={editSource} onChangeText={setEditSource} />
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>Destination</Text>
                    <Input placeholder="e.g., Bhaktapur" value={editDestination} onChangeText={setEditDestination} />
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>Distance (km)</Text>
                    <Input
                      placeholder="e.g., 50"
                      value={editDistance}
                      onChangeText={setEditDistance}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>Estimated Duration (hours)</Text>
                    <Input
                      placeholder="e.g., 2.5"
                      value={editEstimatedDuration}
                      onChangeText={setEditEstimatedDuration}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>Fare (per passenger)</Text>
                    <Input
                      placeholder="e.g., 300"
                      value={editFareInfo}
                      onChangeText={setEditFareInfo}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>First Bus Timing</Text>
                    <Input
                      placeholder="e.g., 06:00 AM"
                      value={editFirstBusTiming}
                      onChangeText={setEditFirstBusTiming}
                    />
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>Last Bus Timing</Text>
                    <Input
                      placeholder="e.g., 08:00 PM"
                      value={editLastBusTiming}
                      onChangeText={setEditLastBusTiming}
                    />
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>Operating Days</Text>
                    <View style={s.daysContainer}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                        <Button
                          key={day}
                          variant={editOperatingDays.includes(day as DayOfWeek) ? 'primary' : 'outline'}
                          size="sm"
                          onPress={() => {
                            if (editOperatingDays.includes(day as DayOfWeek)) {
                              setEditOperatingDays(editOperatingDays.filter(d => d !== day));
                            } else {
                              setEditOperatingDays([...editOperatingDays, day as DayOfWeek]);
                            }
                          }}
                          style={s.dayButton}
                        >
                          {day.slice(0, 3)}
                        </Button>
                      ))}
                    </View>
                  </View>

                  <View style={s.formGroup}>
                    <Text style={s.label}>Bus Stops (click on map to add location)</Text>
                    <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ paddingBottom: 8 }}>
                      {editStops.map((st, idx) => (
                        <View key={`${st.latitude}_${st.longitude}_${idx}`} style={s.stopItemContainer}>
                          <View style={s.stopSequence}>
                            <Text style={s.stopSequenceText}>{idx + 1}</Text>
                          </View>
                          <View style={s.stopInputs}>
                            <Input
                              value={st.stopName}
                              onChangeText={(t) => setEditStops(s => s.map((x, i) => i === idx ? { ...x, stopName: t } : x))}
                              placeholder={`Stop ${idx + 1} name`}
                              style={{ marginBottom: 6 }}
                            />
                            <Text style={s.coordinatesText}>
                              Lat: {st.latitude.toFixed(5)}, Lng: {st.longitude.toFixed(5)}
                            </Text>
                          </View>
                          <Button
                            variant="danger"
                            size="sm"
                            onPress={() => setEditStops(s =>
                              s.filter((_, i) => i !== idx).map((stop, i) => ({ ...stop, sequence: i + 1 }))
                            )}
                          >
                            ✕
                          </Button>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </ScrollView>
              </View>

              <View style={s.editRightPane}>
                <View style={s.mapArea}>
                  {Platform.OS === 'web' ? (
                    <AddMap
                      stops={editStops}
                      onMapClick={(lat, lng) =>
                        setEditStops(s => [
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
                        setEditStops(s =>
                          s
                            .filter((_, i) => i !== index)
                            .map((stop, i) => ({ ...stop, sequence: i + 1 }))
                        )
                      }
                    />
                  ) : (
                    <View style={s.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Map is available on web only.</Text></View>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={s.footer}>
            {!isEditMode ? (
              <>
                <Button variant="secondary" onPress={onClose} style={{ flex: 1 }}>
                  Close
                </Button>
                <Button variant="primary" onPress={() => setIsEditMode(true)} style={{ flex: 1, marginLeft: 8 }}>
                  Edit
                </Button>
                <Button variant="danger" onPress={handleDelete} loading={isDeleting} disabled={isDeleting} style={{ flex: 1, marginLeft: 8 }}>
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onPress={() => setIsEditMode(false)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button
                  variant="success"
                  onPress={handleSave}
                  loading={isSubmitting}
                  disabled={isSubmitting || !editName || !editNumber || !editSource || !editDestination || !editDistance || !editOperatingDays.length || !editStops.length}
                  style={{ flex: 1, marginLeft: 8 }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </View>
        </View>
        <FeedbackModal
          visible={!!feedback}
          type={feedback?.type}
          title={feedback?.title}
          message={feedback?.message || ''}
          onClose={() => setFeedback(null)}
        />
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 1200, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  closeBtn: { padding: 4 },
  body: { flex: 1, padding: 16 },
  editModeContainer: { flex: 1, flexDirection: 'row', gap: 12, padding: 16 },
  editLeftPane: { width: 380, borderRightWidth: 1, borderRightColor: '#e5e7eb', paddingRight: 16 },
  editRightPane: { flex: 1 },

  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  value: { fontSize: 14, color: '#4b5563', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f3f4f6', borderRadius: 6 },

  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayButton: { flex: 0.3, minWidth: 60 },

  stopItemContainer: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 10, backgroundColor: '#f9fafb', padding: 10, borderRadius: 6 },
  stopSequence: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  stopSequenceText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stopInputs: { flex: 1 },

  group: { marginBottom: 16 },
  stopItem: { backgroundColor: '#f9fafb', padding: 10, borderRadius: 6, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  stopText: { fontSize: 13, fontWeight: '500', color: '#1f2937' },
  coordText: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  coordinatesText: { fontSize: 12, color: '#6b7280', marginTop: 2, fontFamily: 'monospace' },

  mapArea: { flex: 1, borderRadius: 8, overflow: 'hidden', height: '100%', minHeight: 400 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: 8, height: '100%' },

  footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
});

export default RouteDetailModal;
