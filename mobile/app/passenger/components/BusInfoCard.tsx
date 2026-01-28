import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BusInfoCardProps {
  busNumber: string;
  driverName: string;
  currentPassengers: number;
  totalCapacity: number;
  status: string;
  onBookPress?: () => void;
}

export const BusInfoCard: React.FC<BusInfoCardProps> = ({
  busNumber,
  driverName,
  currentPassengers,
  totalCapacity,
  status,
  onBookPress,
}) => {
  const occupancyPercentage = Math.round((currentPassengers / totalCapacity) * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'delayed':
        return '#f59e0b';
      case 'inactive':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.busNumber}>{busNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Ionicons name="person" size={16} color="#3b82f6" />
        <Text style={styles.infoLabel}>Driver</Text>
        <Text style={styles.infoValue}>{driverName}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="people" size={16} color="#3b82f6" />
        <Text style={styles.infoLabel}>Occupancy</Text>
        <Text style={styles.infoValue}>
          {currentPassengers}/{totalCapacity} ({occupancyPercentage}%)
        </Text>
      </View>

      {onBookPress && (
        <>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.bookButton} onPress={onBookPress}>
            <Ionicons name="ticket" size={18} color="#ffffff" />
            <Text style={styles.bookButtonText}>Book Now</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  busNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginHorizontal: 8,
    minWidth: 50,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
  },
  bookButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});
