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
import PassengerMap from '../components/PassengerMap';
import FloatingBusButton from '../components/FloatingBusButton';
import BusesPanelSheet from '../components/BusesPanelSheet';
import BusDetailsModal from '../components/BusDetailsModal';
import { useRoutes } from '../hooks/useRoutes';
import { useBuses } from '../hooks/useBuses';
import { useRouteSchedules } from '../hooks/useRouteSchedules';
import { useDriverTracking } from '../hooks/useDriverTracking';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MapTab = () => {
  const router = useRouter();
  const { routeId } = useLocalSearchParams();
  const { setSelectedRoute, routes, selectedBus, setBuses, setRoutes, setSelectedBus } = usePassenger();
  const { routes: fetchedRoutes, searchRoutes } = useRoutes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteForMap, setSelectedRouteForMap] = useState<Route | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [busesList, setBusesList] = useState<Bus[]>([]);
  const [selectedBusModal, setSelectedBusModal] = useState(false);
  const [selectedBusForModal, setSelectedBusForModal] = useState<Bus | null>(null);
  const [showBusesPanel, setShowBusesPanel] = useState(false);
  const routeIdValue = Array.isArray(routeId) ? routeId[0] : routeId;
  const routeList = Array.isArray(routes) && routes.length > 0
    ? routes
    : Array.isArray(fetchedRoutes)
    ? fetchedRoutes
    : [];
  const selectedRouteId = selectedRouteForMap?._id || selectedRouteForMap?.id;
  const { buses: fetchedBuses } = useBuses(selectedRouteId);
  const { schedules } = useRouteSchedules(selectedRouteId);

  // Track all buses for the selected route so passenger can see multiple drivers.
  const trackingBusIds = fetchedBuses
    .map((bus) => String(bus._id || bus.id || '').trim())
    .filter((id) => id.length > 0);
  const trackingEnabled = showMap && trackingBusIds.length > 0;
  
  console.log('🔍 [MAP TAB] Driver tracking config:', {
    selectedBus: selectedBus ? `${selectedBus._id || selectedBus.id}` : 'null',
    showMap,
    trackingBusIds,
    trackingEnabled
  });
  
  const { driverLocations, isConnected, error: trackingError } = useDriverTracking({
    busIds: trackingBusIds,
    enabled: trackingEnabled,
  });

  useEffect(() => {
    if (driverLocations.length > 0) {
      console.log('📍 [MAP TAB] Driver locations updated:',
        driverLocations.map((driverLocation) => ({
          busId: driverLocation.busId,
          driverId: driverLocation.driverId,
          lat: driverLocation.latitude,
          lng: driverLocation.longitude,
          speed: driverLocation.speed
        }))
      );
    }
  }, [driverLocations]);

  useEffect(() => {
    console.log('🔌 [MAP TAB] Socket connection status:', isConnected);
  }, [isConnected]);

  useEffect(() => {
    if (trackingError) {
      console.error('❌ [MAP TAB] Tracking error:', trackingError);
    }
  }, [trackingError]);

  useEffect(() => {
    if (fetchedRoutes.length > 0 && routes.length === 0) {
      setRoutes(fetchedRoutes);
    }
  }, [fetchedRoutes, routes.length, setRoutes]);

  useEffect(() => {
    const query = searchQuery.trim();
    const debounceId = setTimeout(() => {
      if (query.length > 0) {
        searchRoutes(query);
      } else {
        setRoutes(fetchedRoutes);
      }
    }, 350);

    return () => clearTimeout(debounceId);
  }, [searchQuery, searchRoutes, fetchedRoutes, setRoutes]);

  // Handle routeId from navigation (coming from home screen)
  useEffect(() => {
    if (!routeIdValue) return;

    const route = routeList.find((r) => String(r._id || r.id) === String(routeIdValue));
    if (!route) return;

    const currentRouteId = String(selectedRouteForMap?._id || selectedRouteForMap?.id || '');
    const incomingRouteId = String(routeIdValue);
    if (showMap && currentRouteId === incomingRouteId) return;

    setSelectedRoute(route);
    setSelectedRouteForMap(route);
    setShowMap(true);
    setShowBusesPanel(false);
  }, [routeIdValue, routeList, showMap, selectedRouteForMap, setSelectedRoute]);

  // Fetch buses for selected route
  useEffect(() => {
    if (selectedRouteForMap) {
      setBusesList(fetchedBuses);
      setBuses(fetchedBuses);
    }
  }, [selectedRouteForMap, fetchedBuses, setBuses]);

  // Keep selection route-specific: clear stale bus when changing routes.
  useEffect(() => {
    if (!selectedRouteForMap) return;
    const selectedBusId = selectedBus?._id || selectedBus?.id;
    if (!selectedBusId) return;

    const stillInCurrentRoute = fetchedBuses.some((bus) => {
      const id = bus._id || bus.id;
      return String(id) === String(selectedBusId);
    });

    if (!stillInCurrentRoute) {
      console.log('🧹 [MAP TAB] Clearing stale selected bus for new route');
      setSelectedBus(null);
    }
  }, [selectedRouteForMap, fetchedBuses, selectedBus, setSelectedBus]);

  // Auto-select a bus so tracking starts without requiring manual bus tap.
  useEffect(() => {
    if (!showMap || !selectedRouteForMap) return;
    if (!fetchedBuses.length) return;

    const selectedBusId = selectedBus?._id || selectedBus?.id;
    if (selectedBusId) {
      const existsInRoute = fetchedBuses.some((bus) => {
        const id = bus._id || bus.id;
        return String(id) === String(selectedBusId);
      });
      if (existsInRoute) return;
    }

    const activeBus = fetchedBuses.find(
      (bus: any) => String(bus.status || '').toLowerCase() === 'active'
    );
    const busToTrack = activeBus || fetchedBuses[0];

    if (busToTrack) {
      console.log('✅ [MAP TAB] Auto-selected bus for tracking:', busToTrack._id || busToTrack.id);
      setSelectedBus(busToTrack);
    }
  }, [showMap, selectedRouteForMap, fetchedBuses, selectedBus, setSelectedBus]);

  // Filter routes based on search query
  const filteredRoutes = routeList.filter(route =>
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
    setSelectedBus(null);
    // Clear the routeId param to prevent the useEffect from re-triggering
    router.setParams({ routeId: undefined });
  };

  const handleBusPress = (bus: Bus) => {
    setSelectedBus(bus);
    setSelectedBusForModal(bus);
    setSelectedBusModal(true);
  };

  const selectedBusSchedules = React.useMemo(() => {
    if (!selectedBusForModal) return [];
    const busIdValue = selectedBusForModal._id || selectedBusForModal.id;
    return schedules.filter(schedule => {
      const scheduleBusId = schedule.busId?._id || schedule.busId;
      return busIdValue && scheduleBusId && String(scheduleBusId) === String(busIdValue);
    });
  }, [schedules, selectedBusForModal]);

  const handleBookBus = () => {
    setSelectedBusModal(false);
    if (selectedBusForModal) {
      router.push({
        pathname: '../screens/bus-booking',
        params: {
          busId: selectedBusForModal._id || selectedBusForModal.id,
          routeId: selectedRouteForMap?._id || selectedRouteForMap?.id,
        },
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
          driverLocations={driverLocations}
          showUserLocation={false}
        />

        {driverLocations.length > 0 && (
          <View style={styles.trackingInfo}>
            <View style={styles.trackingBadge}>
              <Ionicons name="location" size={16} color="#ef4444" />
              <Text style={styles.trackingText}>
                Live drivers: {driverLocations.length}
              </Text>
            </View>
            <Text style={styles.trackingTime}>
              Updated: {new Date(Math.max(...driverLocations.map((d) => new Date(d.timestamp).getTime()))).toLocaleTimeString()}
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
          schedules={selectedBusSchedules}
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
                key={route._id || route.id}
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
                        <Text style={styles.detailText}>{route.busesCount ?? 0} buses</Text>
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