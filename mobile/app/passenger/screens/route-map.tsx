import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePassenger, type Bus, type Stop } from '../context/PassengerContext';
import { mockBusesData } from '../utils/mockData';
import { calculateCrowdPercentage, getCrowdLevel, getCrowdColor, formatTime } from '../utils/helpers';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MapPage = () => {
  const router = useRouter();
  const { routeId } = useLocalSearchParams();
  const { routes, selectedRoute, getBusesByRoute, setBuses } = usePassenger();
  const [busesList, setBusesList] = useState<Bus[]>([]);
  const [selectedBusModal, setSelectedBusModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [stopStopsModal, setStopStopsModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the route details
    const route = routes.find(r => r.id === routeId);
    if (route) {
      // Simulate fetching buses for this route
      const buses = mockBusesData.filter(b => b.routeId === routeId);
      setBusesList(buses);
      setBuses(buses);
      setLoading(false);
    }
  }, [routeId]);

  const handleBusPress = (bus: Bus) => {
    setSelectedBus(bus);
    setSelectedBusModal(true);
  };

  const handleBookBus = () => {
    setSelectedBusModal(false);
    if (selectedBus) {
      router.push({
        pathname: './bus-booking',
        params: { busId: selectedBus.id, routeId },
      });
    }
  };

  const BusMarker = ({ bus, index }: { bus: Bus; index: number }) => {
    const crowdPercentage = calculateCrowdPercentage(bus);
    const crowdColor = getCrowdColor(crowdPercentage);

    return (
      <TouchableOpacity
        key={bus.id}
        style={[styles.busMarker, { top: `${20 + index * 18}%`, left: `${30 + index * 15}%` }]}
        onPress={() => handleBusPress(bus)}
      >
        <View
          style={[
            styles.busIcon,
            {
              backgroundColor: crowdColor,
              borderColor: bus.status === 'delayed' ? '#f97316' : '#10b981',
            },
          ]}
        >
          <Ionicons name="bus" size={18} color="#ffffff" />
        </View>
        <Text style={styles.busBusNumber}>{bus.busNumber}</Text>
      </TouchableOpacity>
    );
  };

  const StopMarker = ({ stop, index, totalStops }: { stop: Stop; index: number; totalStops: number }) => {
    const isFirst = index === 0;
    const isLast = index === totalStops - 1;

    return (
      <TouchableOpacity
        key={stop.id}
        style={[
          styles.stopMarker,
          { top: `${15 + index * 20}%`, right: `${10 + (totalStops - index) * 5}%` },
        ]}
        onPress={() => setStopStopsModal(true)}
      >
        <View
          style={[
            styles.stopDot,
            {
              backgroundColor: isFirst ? '#10b981' : isLast ? '#ef4444' : '#3b82f6',
              width: isFirst || isLast ? 18 : 14,
              height: isFirst || isLast ? 18 : 14,
              borderRadius: isFirst || isLast ? 9 : 7,
            },
          ]}
        />
        <Text style={styles.stopName}>{stop.name}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const route = selectedRoute || routes.find(r => r.id === routeId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{route?.name}</Text>
          <Text style={styles.headerSubtitle}>{busesList.length} buses available</Text>
        </View>
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        {/* Map Background */}
        <View style={styles.mapBackground}>
          {/* Route Line */}
          <View style={styles.routeLine} />

          {/* Stop Markers */}
          {route?.stops.map((stop, index) => (
            <StopMarker
              key={stop.id}
              stop={stop}
              index={index}
              totalStops={route.stops.length}
            />
          ))}

          {/* Bus Markers */}
          {busesList.map((bus, index) => (
            <BusMarker key={bus.id} bus={bus} index={index} />
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>Start</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Stop</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>End</Text>
          </View>
        </View>
      </View>

      {/* Buses List */}
      <View style={styles.busesList}>
        <Text style={styles.busesListTitle}>Available Buses</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {busesList.map(bus => {
            const crowdPercentage = calculateCrowdPercentage(bus);
            const crowdLevel = getCrowdLevel(crowdPercentage);

            return (
              <TouchableOpacity
                key={bus.id}
                style={styles.busCard}
                onPress={() => handleBusPress(bus)}
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
                  onPress={() => handleBusPress(bus)}
                >
                  <Text style={styles.viewDetailsButtonText}>View Details</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bus Details Modal */}
      <Modal visible={selectedBusModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedBusModal(false)}
            >
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>

            {selectedBus && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selectedBus.busNumber}</Text>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Bus Information</Text>

                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={20} color="#3b82f6" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Driver</Text>
                      <Text style={styles.detailValue}>{selectedBus.driverName}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={20} color="#3b82f6" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Current Stop</Text>
                      <Text style={styles.detailValue}>{selectedBus.currentStop}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={20} color="#3b82f6" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Next Stop ETA</Text>
                      <Text style={styles.detailValue}>
                        {formatTime(selectedBus.estimatedNextStopTime)}
                      </Text>
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
                          width: `${calculateCrowdPercentage(selectedBus)}%`,
                          backgroundColor: getCrowdColor(calculateCrowdPercentage(selectedBus)),
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.occupancyDetails}>
                    <View style={styles.occupancyItem}>
                      <Text style={styles.occupancyLabel}>Occupied</Text>
                      <Text style={styles.occupancyValue}>{selectedBus.currentPassengers}</Text>
                    </View>
                    <View style={styles.occupancyItem}>
                      <Text style={styles.occupancyLabel}>Available</Text>
                      <Text style={styles.occupancyValue}>
                        {selectedBus.totalCapacity - selectedBus.currentPassengers}
                      </Text>
                    </View>
                    <View style={styles.occupancyItem}>
                      <Text style={styles.occupancyLabel}>Total</Text>
                      <Text style={styles.occupancyValue}>{selectedBus.totalCapacity}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity style={styles.bookButton} onPress={handleBookBus}>
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Stops Modal */}
      <Modal visible={stopStopsModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setStopStopsModal(false)}
            >
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Route Stops</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {route?.stops.map((stop, index) => (
                <View key={stop.id} style={styles.stopItem}>
                  <View style={styles.stopItemLeft}>
                    <View
                      style={[
                        styles.stopItemDot,
                        {
                          backgroundColor:
                            index === 0 ? '#10b981' : index === route.stops.length - 1 ? '#ef4444' : '#3b82f6',
                        },
                      ]}
                    />
                    <View style={styles.stopItemLine} />
                  </View>

                  <View style={styles.stopItemRight}>
                    <Text style={styles.stopItemName}>{stop.name}</Text>
                    <Text style={styles.stopItemTime}>{formatTime(stop.estimatedArrival)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#d1d5db',
    marginTop: 2,
  },
  mapContainer: {
    flex: 0.5,
    backgroundColor: '#ffffff',
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    position: 'relative',
  },
  routeLine: {
    position: 'absolute',
    width: '80%',
    height: 2,
    backgroundColor: '#d1d5db',
    top: '50%',
    left: '10%',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6b7280',
  },
  stopMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  stopDot: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  stopName: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
    maxWidth: 50,
    textAlign: 'center',
  },
  busMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  busIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  busBusNumber: {
    fontSize: 9,
    color: '#1f2937',
    marginTop: 2,
    fontWeight: '600',
  },
  busesList: {
    flex: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  busesListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginVertical: 8,
  },
  detailsSection: {
    marginVertical: 16,
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
    marginBottom: 20,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  stopItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stopItemLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  stopItemDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stopItemLine: {
    width: 2,
    height: 40,
    backgroundColor: '#d1d5db',
    marginTop: 4,
  },
  stopItemRight: {
    flex: 1,
    justifyContent: 'center',
  },
  stopItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  stopItemTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

export default MapPage;
