// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Modal } from 'react-native';
import { Button, Input } from '../../../components/ui';
import { RouteRecord, DayOfWeek } from '../../../context/RouteContext';

interface RouteDetailModalProps {
  visible: boolean;
  route: RouteRecord | null;
  onClose: () => void;
  onUpdate: (routeId: string, payload: any) => Promise<{ success: boolean; message?: string }>;
  onDelete: (routeId: string) => Promise<{ success: boolean; message?: string }>;
}

const RouteDetailModal: React.FC<RouteDetailModalProps> = ({ visible, route, onClose, onUpdate, onDelete }) => {
  const [editData, setEditData] = useState<RouteRecord | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (route) {
      setEditData({ ...route });
      setIsEditMode(false);
    }
  }, [route, visible]);

  if (!editData) return null;

  const handleSave = async () => {
    if (!editData._id) return;
    setIsSubmitting(true);
    try {
      const payload = {
        routeName: editData.routeName,
        routeNumber: editData.routeNumber,
        source: editData.source,
        destination: editData.destination,
        distance: editData.distance,
        estimatedDuration: editData.estimatedDuration,
        stops: editData.stops,
        operatingDays: editData.operatingDays,
        firstBusTiming: editData.firstBusTiming,
        lastBusTiming: editData.lastBusTiming,
        fareInfo: editData.fareInfo,
      };

      const result = await onUpdate(editData._id, payload);
      if (result.success) {
        alert('Route updated successfully!');
        onClose();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating route:', error);
      alert('Failed to update route.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editData._id) return;
    if (!confirm('Are you sure you want to delete this route?')) return;

    setIsDeleting(true);
    try {
      const result = await onDelete(editData._id);
      if (result.success) {
        alert('Route deleted successfully!');
        onClose();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      alert('Failed to delete route.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={s.overlay}>
        <View style={s.modalContent}>
          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>Route Details</Text>
            <Button
              size="sm"
              variant="outline"
              onPress={onClose}
              style={s.closeBtn}
            >
              ✕
            </Button>
          </View>

          {/* Body - Scrollable */}
          <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Route Name */}
            <View style={s.group}>
              <Text style={s.label}>Route Name</Text>
              <Input 
                value={editData.routeName || ''} 
                onChangeText={(t) => setEditData({ ...editData, routeName: t })}
                editable={isEditMode}
              />
            </View>

            {/* Route Number */}
            <View style={s.group}>
              <Text style={s.label}>Route Number</Text>
              <Input 
                value={editData.routeNumber || ''} 
                onChangeText={(t) => setEditData({ ...editData, routeNumber: t })}
                editable={isEditMode}
              />
            </View>

            {/* Source */}
            <View style={s.group}>
              <Text style={s.label}>Source</Text>
              <Input 
                value={editData.source || ''} 
                onChangeText={(t) => setEditData({ ...editData, source: t })}
                editable={isEditMode}
              />
            </View>

            {/* Destination */}
            <View style={s.group}>
              <Text style={s.label}>Destination</Text>
              <Input 
                value={editData.destination || ''} 
                onChangeText={(t) => setEditData({ ...editData, destination: t })}
                editable={isEditMode}
              />
            </View>

            {/* Distance */}
            <View style={s.group}>
              <Text style={s.label}>Distance (km)</Text>
              <Input 
                value={editData.distance?.toString() || ''} 
                onChangeText={(t) => setEditData({ ...editData, distance: parseFloat(t) })}
                editable={isEditMode}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Estimated Duration */}
            <View style={s.group}>
              <Text style={s.label}>Est. Duration (hours)</Text>
              <Input 
                value={editData.estimatedDuration?.toString() || ''} 
                onChangeText={(t) => setEditData({ ...editData, estimatedDuration: parseFloat(t) })}
                editable={isEditMode}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Fare Info */}
            <View style={s.group}>
              <Text style={s.label}>Fare (per passenger)</Text>
              <Input 
                value={editData.fareInfo?.toString() || ''} 
                onChangeText={(t) => setEditData({ ...editData, fareInfo: parseFloat(t) })}
                editable={isEditMode}
                keyboardType="decimal-pad"
              />
            </View>

            {/* First Bus Timing */}
            <View style={s.group}>
              <Text style={s.label}>First Bus Timing</Text>
              <Input 
                value={editData.firstBusTiming || ''} 
                onChangeText={(t) => setEditData({ ...editData, firstBusTiming: t })}
                editable={isEditMode}
              />
            </View>

            {/* Last Bus Timing */}
            <View style={s.group}>
              <Text style={s.label}>Last Bus Timing</Text>
              <Input 
                value={editData.lastBusTiming || ''} 
                onChangeText={(t) => setEditData({ ...editData, lastBusTiming: t })}
                editable={isEditMode}
              />
            </View>

            {/* Operating Days */}
            <View style={s.group}>
              <Text style={s.label}>Operating Days</Text>
              <Text style={s.value}>{editData.operatingDays?.join(', ') || 'N/A'}</Text>
            </View>

            {/* Bus Stops */}
            <View style={s.group}>
              <Text style={s.label}>Bus Stops ({editData.stops?.length || 0})</Text>
              {editData.stops?.map((stop, idx) => (
                <View key={idx} style={s.stopItem}>
                  <Text style={s.stopText}>{idx + 1}. {stop.stopName}</Text>
                  <Text style={s.coordText}>{stop.latitude?.toFixed(5)}, {stop.longitude?.toFixed(5)}</Text>
                </View>
              ))}
            </View>

            {/* Assigned Buses */}
            <View style={s.group}>
              <Text style={s.label}>Assigned Buses ({editData.assignedBusIds?.length || 0})</Text>
              <Text style={s.value}>{editData.assignedBusIds?.length ? editData.assignedBusIds.join(', ') : 'None'}</Text>
            </View>

            {/* Assigned Drivers */}
            <View style={s.group}>
              <Text style={s.label}>Assigned Drivers ({editData.assignedDriverIds?.length || 0})</Text>
              <Text style={s.value}>{editData.assignedDriverIds?.length ? editData.assignedDriverIds.join(', ') : 'None'}</Text>
            </View>
          </ScrollView>

          {/* Footer - Actions */}
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
                <Button variant="success" onPress={handleSave} loading={isSubmitting} disabled={isSubmitting} style={{ flex: 1, marginLeft: 8 }}>
                  Save
                </Button>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  closeBtn: { padding: 4 },
  body: { flex: 1, padding: 16 },
  group: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  value: { fontSize: 14, color: '#4b5563', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f3f4f6', borderRadius: 6 },
  stopItem: { backgroundColor: '#f9fafb', padding: 8, borderRadius: 6, marginTop: 6, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  stopText: { fontSize: 13, fontWeight: '500', color: '#1f2937' },
  coordText: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  footer: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
});

export default RouteDetailModal;
