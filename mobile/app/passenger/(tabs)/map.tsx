import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { usePassenger, type Route, type Bus } from '../context/PassengerContext';
import { mockRoutesData, mockBusesData } from '../utils/mockData';
import PassengerMap from '../components/PassengerMap';
import FloatingBusButton from '../components/FloatingBusButton';
import BusesPanelSheet from '../components/BusesPanelSheet';
import BusDetailsModal from '../components/BusDetailsModal';
import { useDriverTracking } from '../hooks/useDriverTracking';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MapTab = () => {
  const router = useRouter();
  const { routeId } = useLocalSearchParams();
  const { setSelectedRoute, routes, selectedBus, setBuses } = usePassenger();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteForMap, setSelectedRouteForMap] = useState<Route | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [busesList, setBusesList] = useState<Bus[]>([]);
  const [selectedBusModal, setSelectedBusModal] = useState(false);
  const [selectedBusForModal, setSelectedBusForModal] = useState<Bus | null>(null);
  const [showBusesPanel, setShowBusesPanel] = useState(false);

  // Enable tracking when a bus is selected
  const { driverLocation, isConnected, error: trackingError } = useDriverTracking({
    busId: selectedBus?.id || null,
    enabled: !!selectedBus && showMap,
  });

  // Handle routeId from navigation (coming from home screen)
  useEffect(() => {
    if (routeId) {
      const route = routes.find(r => r.id === routeId);
      if (route) {
        handleRoutePress(route);
      }
    }
  }, [routeId]);

  // Fetch buses for selected route
  useEffect(() => {
    if (selectedRouteForMap) {
      const buses = mockBusesData.filter(b => b.routeId === selectedRouteForMap.id);
      setBusesList(buses);
      setBuses(buses);
    }
  }, [selectedRouteForMap]);

  // Filter routes based on search query
  const filteredRoutes = mockRoutesData.filter(route =>
    route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.stops.some(stop => stop.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleRoutePress = (route: Route) => {
    setSelectedRoute(route);
    setSelectedRouteForMap(route);
    setShowMap(true);
  };

  const handleBackToList = () => {
    setShowMap(false);
    setSelectedRouteForMap(null);
    setBusesList([]);
    setShowBusesPanel(false);
  };

  const handleBusPress = (bus: Bus) => {
    setSelectedBusForModal(bus);
    setSelectedBusModal(true);
  };

  const handleBookBus = () => {
    setSelectedBusModal(false);
    if (selectedBusForModal) {
      router.push({
        pathname: '../screens/bus-booking',
        params: { busId: selectedBusForModal.id, routeId: selectedRouteForMap?.id },
      });
    }
  };

  useEffect(() => {
    if (trackingError) {
      Alert.alert('Tracking Error', trackingError);
    }
  }, [trackingError]);

  if (showMap && selectedRouteForMap) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{selectedRouteForMap.name}</Text>
            <Text style={styles.headerSubtitle}>
              {isConnected ? '🟢 Live Tracking' : '⚪ Not Connected'}
            </Text>
          </View>
        </View>

        <PassengerMap
          busStops={selectedRouteForMap.stops}
          routePolyline={selectedRouteForMap.stops.map(stop => ({
            latitude: stop.latitude,
            longitude: stop.longitude,
          }))}
          busLocation={driverLocation ? {
            busId: driverLocation.busId,
            latitude: driverLocation.latitude,
            longitude: driverLocation.longitude,
            heading: driverLocation.heading,
          } : null}
          showUserLocation={false}
        />

        {driverLocation && (
          <View style={styles.trackingInfo}>
            <View style={styles.trackingBadge}>
              <Ionicons name="location" size={16} color="#ef4444" />
              <Text style={styles.trackingText}>
                Speed: {Math.round(driverLocation.speed)} km/h
              </Text>
            </View>
            <Text style={styles.trackingTime}>
              Updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}

        {/* Floating Bus Info Button */}
        {busesList.length > 0 && (
          <FloatingBusButton
            busCount={busesList.length}
            onPress={() => setShowBusesPanel(!showBusesPanel)}
          />
        )}

        {/* Buses Panel */}
        {showBusesPanel && (
          <BusesPanelSheet
            buses={busesList}
            onClose={() => setShowBusesPanel(false)}
            onBusPress={handleBusPress}
          />
        )}

        {/* Bus Details Modal */}
        <BusDetailsModal
          visible={selectedBusModal}
          bus={selectedBusForModal}
          onClose={() => setSelectedBusModal(false)}
          onBookNow={handleBookBus}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route Map</Text>
        <Text style={styles.headerSubtitle}>Find routes near you</Text>
      </View>

      {/* Map Preview Area */}
      <View style={styles.mapArea}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color="#d1d5db" />
          <Text style={styles.mapPlaceholderText}>Select a route to view map</Text>
          <Text style={styles.mapPlaceholderSubtext}>
            Live bus tracking available
          </Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search routes or stops..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Routes List */}
      <ScrollView style={styles.routesContainer} showsVerticalScrollIndicator={false}>
        {filteredRoutes.length > 0 ? (
          <View style={styles.routesList}>
            {filteredRoutes.map(route => (
              <TouchableOpacity
                key={route.id}
                style={styles.routeCard}
                onPress={() => handleRoutePress(route)}
              >
                <View style={styles.routeCardLeft}>
                  <View style={styles.routeIconContainer}>
                    <Ionicons name="bus" size={24} color="#ffffff" />
                  </View>
                  <View style={styles.routeCardContent}>
                    <Text style={styles.routeCardName}>{route.name}</Text>
                    <View style={styles.routeCardDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons name="location" size={14} color="#6b7280" />
                        <Text style={styles.detailText}>{route.stops.length} stops</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="bus" size={14} color="#6b7280" />
                        <Text style={styles.detailText}>{route.busesCount} buses</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No routes found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Try a different search term' : 'No routes available'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1d5db',
  },
  mapArea: {
    height: screenHeight * 0.35,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  mapPlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  controlsContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1f2937',
    marginLeft: 8,
    paddingVertical: 0,
  },
  filterTabs: {
    flexDirection: 'row',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  filterTabActive: {
    backgroundColor: '#dbeafe',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 6,
  },
  filterTabTextActive: {
    color: '#1e40af',
  },
  routesContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  routesList: {
    marginBottom: 20,
  },
  routeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  routeCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeCardContent: {
    flex: 1,
  },
  routeCardName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  routeCardDetails: {
    flexDirection: 'row',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  detailText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  trackingInfo: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trackingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 6,
  },
  trackingTime: {
    fontSize: 10,
    color: '#6b7280',
  },
});

export default MapTab;