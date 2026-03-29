import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StopArrivalItem } from '../services/routeService';

type Props = {
  visible: boolean;
  loading: boolean;
  stopName: string;
  arrivals: StopArrivalItem[];
  onClose: () => void;
};

export default function StopArrivalsModal({ visible, loading, stopName, arrivals, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Stop Arrivals</Text>
              <Text style={styles.stopName}>{stopName || 'Selected stop'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.stateText}>Loading arrivals...</Text>
            </View>
          ) : arrivals.length === 0 ? (
            <View style={styles.stateWrap}>
              <Ionicons name="time-outline" size={30} color="#9ca3af" />
              <Text style={styles.stateText}>No scheduled arrivals for this stop.</Text>
            </View>
          ) : (
            <FlatList
              data={arrivals}
              keyExtractor={(item, idx) => `${item.scheduleId || 'schedule'}-${idx}`}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.busText}>{item.bus?.busNumber || 'Bus'}</Text>
                    <Text style={styles.timeText}>{item.arrivalTime}</Text>
                  </View>
                  <Text style={styles.metaText}>
                    {item.dayOfWeek || 'Day not set'}
                    {item.driver?.firstName ? `  •  ${item.driver.firstName} ${item.driver.lastName || ''}` : ''}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  stopName: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    paddingBottom: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  busText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
