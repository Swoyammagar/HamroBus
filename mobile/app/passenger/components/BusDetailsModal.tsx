import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Bus } from '../context/PassengerContext';
import { calculateCrowdPercentage, getCrowdColor, formatTime } from '../utils/helpers';

interface BusDetailsModalProps {
  visible: boolean;
  bus: Bus | null;
  onClose: () => void;
  onBookNow: () => void;
}

const BusDetailsModal: React.FC<BusDetailsModalProps> = ({ visible, bus, onClose, onBookNow }) => {
  if (!bus) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>{bus.busNumber}</Text>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Bus Information</Text>

              <View style={styles.detailRow}>
                <Ionicons name="person" size={20} color="#3b82f6" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Driver</Text>
                  <Text style={styles.detailValue}>{bus.driverName}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color="#3b82f6" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Current Stop</Text>
                  <Text style={styles.detailValue}>{bus.currentStop}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="time" size={20} color="#3b82f6" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Next Stop ETA</Text>
                  <Text style={styles.detailValue}>{formatTime(bus.estimatedNextStopTime)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Occupancy</Text>

              <View style={styles.crowdBar}>
                <View
                  style={[
                    styles.crowdFill,
                    {
                      width: `${calculateCrowdPercentage(bus)}%`,
                      backgroundColor: getCrowdColor(calculateCrowdPercentage(bus)),
                    },
                  ]}
                />
              </View>

              <View style={styles.occupancyDetails}>
                <View style={styles.occupancyItem}>
                  <Text style={styles.occupancyLabel}>Occupied</Text>
                  <Text style={styles.occupancyValue}>{bus.currentPassengers}</Text>
                </View>
                <View style={styles.occupancyItem}>
                  <Text style={styles.occupancyLabel}>Available</Text>
                  <Text style={styles.occupancyValue}>
                    {bus.totalCapacity - bus.currentPassengers}
                  </Text>
                </View>
                <View style={styles.occupancyItem}>
                  <Text style={styles.occupancyLabel}>Total</Text>
                  <Text style={styles.occupancyValue}>{bus.totalCapacity}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.bookButton} onPress={onBookNow}>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.bookButtonText}>Book Now</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  closeButton: {
    padding: 8,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  detailsSection: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  crowdBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  crowdFill: {
    height: '100%',
  },
  occupancyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  occupancyItem: {
    alignItems: 'center',
  },
  occupancyLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  occupancyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: 4,
  },
  bookButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginVertical: 16,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default BusDetailsModal;
