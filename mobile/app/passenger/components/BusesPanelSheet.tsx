import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Bus } from '../context/PassengerContext';
import { calculateCrowdPercentage, getCrowdLevel, getCrowdColor } from '../utils/helpers';

const { height: screenHeight } = Dimensions.get('window');

interface BusesPanelSheetProps {
  buses: Bus[];
  onClose: () => void;
  onBusPress: (bus: Bus) => void;
}

const BusesPanelSheet: React.FC<BusesPanelSheetProps> = ({ buses, onClose, onBusPress }) => {
  return (
    <View style={styles.busesPanel}>
      <View style={styles.busesPanelHeader}>
        <Text style={styles.busesPanelTitle}>Available Buses</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.busesPanelScroll}>
        {buses.map(bus => {
          const crowdPercentage = calculateCrowdPercentage(bus);
          const crowdLevel = getCrowdLevel(crowdPercentage);

          return (
            <TouchableOpacity
              key={bus.id}
              style={styles.busCard}
              onPress={() => onBusPress(bus)}
            >
              <View style={styles.busCardHeader}>
                <Text style={styles.busCardBusNumber}>{bus.busNumber}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        bus.status === 'active'
                          ? '#dcfce7'
                          : bus.status === 'delayed'
                          ? '#fef3c7'
                          : '#fee2e2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          bus.status === 'active'
                            ? '#166534'
                            : bus.status === 'delayed'
                            ? '#92400e'
                            : '#991b1b',
                      },
                    ]}
                  >
                    {bus.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.busCardDriver}>Driver: {bus.driverName}</Text>

              <View style={styles.crowdBar}>
                <View
                  style={[
                    styles.crowdFill,
                    {
                      width: `${crowdPercentage}%`,
                      backgroundColor: getCrowdColor(crowdPercentage),
                    },
                  ]}
                />
              </View>
              <Text style={styles.crowdText}>
                {crowdLevel} • {bus.currentPassengers}/{bus.totalCapacity} seats
              </Text>

              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => onBusPress(bus)}
              >
                <Text style={styles.viewDetailsButtonText}>View Details</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  busesPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 16,
    maxHeight: screenHeight * 0.4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  busesPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  busesPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  busesPanelScroll: {
    paddingHorizontal: 16,
  },
  busCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 200,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  busCardBusNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  busCardDriver: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 8,
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
  crowdText: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 8,
  },
  viewDetailsButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default BusesPanelSheet;
