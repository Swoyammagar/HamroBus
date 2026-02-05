import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePassenger, type Route } from '../context/PassengerContext';
import { mockRoutesData, mockBusesData } from '../utils/mockData';
import PassengerMap from '../components/PassengerMap';
import { useDriverTracking } from '../hooks/useDriverTracking';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Location {
  id: number;
  name: string;
  category: string;
}

const MapTab = () => {
  const router = useRouter();
  const { setSelectedRoute, routes, selectedBus } = usePassenger();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationModal, setLocationModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'nearby'>('nearby');
  const [selectedRouteForMap, setSelectedRouteForMap] = useState<Route | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Enable tracking when a bus is selected
  const { driverLocation, isConnected, error: trackingError } = useDriverTracking({
    busId: selectedBus?.id || null,
    enabled: !!selectedBus && showMap,
  });

  const commonLocations = [
    { id: 1, name: 'Kathmandu City Center', category: 'hub' },
    { id: 2, name: 'Thamel', category: 'area' },
    { id: 3, name: 'Boudhanath', category: 'landmark' },
    { id: 4, name: 'Patan Durbar Square', category: 'landmark' },
    { id: 5, name: 'Bhaktapur', category: 'city' },
    { id: 6, name: 'Kirtipur', category: 'area' },
  ];

  const filteredLocations = commonLocations.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setLocationModal(false);
  };

  const handleRoutePress = (route: Route) => {
    setSelectedRoute(route);
    setSelectedRouteForMap(route);
    setShowMap(true);
  };

  const handleBackToList = () => {
    setShowMap(false);
    setSelectedRouteForMap(null);
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

          {selectedLocation && (
            <View style={styles.selectedLocationInfo}>
              <Ionicons name="location" size={20} color="#3b82f6" />
              <Text style={styles.selectedLocationName}>{selectedLocation.name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.searchBox}
          onPress={() => setLocationModal(true)}
        >
          <Ionicons name="search" size={20} color="#9ca3af" />
          <Text style={styles.searchPlaceholder}>
            {selectedLocation?.name || 'Select a location...'}
          </Text>
        </TouchableOpacity>

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'nearby' && styles.filterTabActive]}
            onPress={() => setFilterType('nearby')}
          >
            <Ionicons name="radio-button-on" size={14} color={filterType === 'nearby' ? '#3b82f6' : '#d1d5db'} />
            <Text style={[styles.filterTabText, filterType === 'nearby' && styles.filterTabTextActive]}>
              Nearby
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
            onPress={() => setFilterType('all')}
          >
            <Ionicons name="radio-button-on" size={14} color={filterType === 'all' ? '#3b82f6' : '#d1d5db'} />
            <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
              All Routes
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Routes List */}
      <ScrollView style={styles.routesContainer} showsVerticalScrollIndicator={false}>
        {mockRoutesData.length > 0 ? (
          <View style={styles.routesList}>
            {mockRoutesData.map(route => (
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
            <Text style={styles.emptyStateTitle}>No routes available</Text>
            <Text style={styles.emptyStateText}>Select a location to see routes</Text>
          </View>
        )}
      </ScrollView>

      {/* Location Selection Modal */}
      <Modal visible={locationModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setLocationModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Location</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.modalSearchContainer}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search locations..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#d1d5db"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.locationsList} showsVerticalScrollIndicator={false}>
              {filteredLocations.map(location => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationItem,
                    selectedLocation?.id === location.id && styles.locationItemSelected,
                  ]}
                  onPress={() => handleLocationSelect(location)}
                >
                  <View style={styles.locationItemLeft}>
                    <View
                      style={[
                        styles.locationIcon,
                        {
                          backgroundColor:
                            location.category === 'hub'
                              ? '#eff6ff'
                              : location.category === 'landmark'
                              ? '#fef3c7'
                              : '#f3f4f6',
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          location.category === 'hub'
                            ? 'git-compare'
                            : location.category === 'landmark'
                            ? 'star'
                            : 'location'
                        }
                        size={18}
                        color={
                          location.category === 'hub'
                            ? '#3b82f6'
                            : location.category === 'landmark'
                            ? '#f59e0b'
                            : '#6b7280'
                        }
                      />
                    </View>
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationName}>{location.name}</Text>
                      <Text style={styles.locationCategory}>
                        {location.category.charAt(0).toUpperCase() + location.category.slice(1)}
                      </Text>
                    </View>
                  </View>
                  {selectedLocation?.id === location.id && (
                    <View style={styles.selectedCheck}>
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    </View>
                  )}
                </TouchableOpacity>
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
  selectedLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectedLocationName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    marginLeft: 8,
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
    marginBottom: 12,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: '#9ca3af',
    marginLeft: 8,
    flex: 1,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#1f2937',
  },
  locationsList: {
    paddingHorizontal: 16,
    maxHeight: screenHeight * 0.5,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  locationItemSelected: {
    backgroundColor: '#f3f4f6',
  },
  locationItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  locationCategory: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  selectedCheck: {
    marginLeft: 8,
  },
});

export default MapTab;