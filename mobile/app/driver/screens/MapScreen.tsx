import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { useLocation } from '../hooks/useLocation';
import { useAppContext } from '../context/AppContext';
import { useTripActions } from '../hooks/useDriver';
import RouteStopsPanel from '../component/RouteStopsPanel';
import PassengerLogModal from '../component/PassengerLogModal';
import OpenStreetMap from '../component/RealTimeMap';

interface Props {
  isOnline: boolean;
  onStatusChange?: (status: boolean) => void;
}

export default function MapScreen({ isOnline, onStatusChange }: Props) {
  // ✅ Use shared context instead of individual hooks
  const { 
    assignedRoute, 
    routeLoading, 
    currentTrip, 
    tripLoading 
  } = useAppContext();
  
  const { updatePassengers, error: tripError } = useTripActions();
  
  const [passengerCount, setPassengerCount] = useState(0);
  const [showStopsPanel, setShowStopsPanel] = useState(false);
  const [showPassengerLog, setShowPassengerLog] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  const { location, loading, error, startTracking, stopTracking, requestPermission } = useLocation();

  // Update passenger count from current trip
  useEffect(() => {
    if (currentTrip?.passengerCount) {
      setPassengerCount(currentTrip.passengerCount);
    }
  }, [currentTrip]);

  // Log route updates for debugging
  useEffect(() => {
    if (assignedRoute) {
      console.log('🗺️ Route updated:', {
        id: assignedRoute._id,
        name: assignedRoute.routeName,
        stopsCount: assignedRoute.stops?.length || 0
      });
    }
  }, [assignedRoute]);

  // Request location permission and start tracking
  const requestLocationPermission = useCallback(async () => {
    try {
      console.log('� [Step 1] Requesting location permission...');
      const granted = await requestPermission();
      console.log('🔵 [Step 2] Permission result:', granted);
      
      if (granted) {
        console.log('🔵 [Step 3] Starting location tracking...');
        await startTracking(); // Wait for tracking to actually start
        console.log('🔵 [Step 4] Setting isLocationEnabled = true');
        setIsLocationEnabled(true);
        console.log('✅ [Step 5] Location tracking fully enabled');
      } else {
        console.log('🔴 [Error] Permission denied');
        Alert.alert(
          'Permission Denied',
          'Location permission is required to share your live location with passengers.',
          [
            { text: 'Cancel', onPress: () => onStatusChange?.(false) },
            { text: 'Retry', onPress: requestLocationPermission },
          ]
        );
      }
    } catch (err) {
      console.error('🔴 [Error] Exception in requestLocationPermission:', err);
      Alert.alert('Error', 'Failed to start location tracking');
      onStatusChange?.(false);
    }
  }, [requestPermission, startTracking, onStatusChange]);

  // Handle online/offline status change
  useEffect(() => {
    if (isOnline && !isLocationEnabled) {
      console.log('🟢 User went online - starting location tracking');
      requestLocationPermission();
    } else if (!isOnline && isLocationEnabled) {
      console.log('🔴 User went offline - stopping location tracking');
      stopTracking();
      setIsLocationEnabled(false);
    }
  }, [isOnline, isLocationEnabled, requestLocationPermission, stopTracking]);

  // Convert stops to bus stops format
  const busStops = assignedRoute?.stops
    ? assignedRoute.stops.map((stop, index) => ({
        id: index + 1,
        name: stop.stopName,
        status: currentTrip?.completedStops?.some((s: { stopId: string }) => s.stopId === stop.stopName) ? 'completed' : 'upcoming' as any,
        passengers: currentTrip?.completedStops?.[index]?.passengersBoarded || 0,
        time: `${String(8 + Math.floor(index / 4)).padStart(2, '0')}:${String((index * 15) % 60).padStart(2, '0')} AM`,
        latitude: stop.latitude,
        longitude: stop.longitude
      }))
    : [];

  // Create route polyline from stops
  const routePolyline = assignedRoute?.stops.map(stop => ({
    latitude: stop.latitude,
    longitude: stop.longitude
  })) || [];

  const handlePassengerUpdate = async (newCount: number) => {
    if (!currentTrip?._id || !assignedRoute) {
      Alert.alert('Error', 'Trip or route data not available');
      return;
    }
    
    try {
      // Get current stop - prefer the currentStop field, fallback to calculated index
      let stopName: string | undefined;
      
      if (currentTrip.currentStop) {
        stopName = currentTrip.currentStop;
      } else {
        const currentStopIndex = currentTrip.completedStops?.length || 0;
        // Check bounds before accessing
        if (currentStopIndex < assignedRoute.stops.length) {
          stopName = assignedRoute.stops[currentStopIndex].stopName;
        }
      }
      
      if (!stopName) {
        Alert.alert('Error', 'Could not find current stop');
        return;
      }
      
      // Calculate the difference from current count
      const oldCount = passengerCount;
      const boarded = Math.max(0, newCount - oldCount); // Passengers getting on
      const alighted = Math.max(0, oldCount - newCount); // Passengers getting off
      
      await updatePassengers(currentTrip._id, stopName, boarded, alighted);
      setPassengerCount(newCount);
      // Context will auto-update via WebSocket
    } catch (err) {
      Alert.alert('Error', 'Failed to update passenger count');
    }
  };

  if (routeLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: spacing.md, color: palette.text }}>Loading route...</Text>
      </View>
    );
  }

  // Show loading while location is being tracked
  if (isOnline && loading && !location) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: spacing.md, color: palette.text }}>🗺️ Starting location tracking...</Text>
      </View>
    );
  }

  if (!assignedRoute && !routeLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: palette.text, fontSize: 16 }}>❌ No assigned route found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Real-time Map */}
      <OpenStreetMap
        key={`${assignedRoute?._id}-${assignedRoute?.stops?.length}`}
        currentLocation={location}
        busStops={busStops.length > 0 ? busStops : []}
        routePolyline={routePolyline.length > 0 ? routePolyline : []}
        loading={loading}
        onStopPress={(stop) => {
          console.log('Stop pressed:', stop.name);
        }}
      />

      {/* Floating Action Button - Show Stops */}
      {currentTrip && (
        <Pressable
          style={[styles.fab, shadow.card]}
          onPress={() => setShowStopsPanel(true)}
        >
          <Feather name="list" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Online Status Badge */}
      {isOnline && isLocationEnabled && (
        <View style={[styles.statusBadge, shadow.card]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Live Location On</Text>
        </View>
      )}

      {/* Route Info Badge */}
      {currentTrip && assignedRoute && (
        <View style={[styles.routeInfo, shadow.card]}>
          <View>
            <Text style={styles.routeInfoTitle}>{assignedRoute.routeName}</Text>
            <Text style={styles.routeInfoText}>
              {currentTrip.completedStops?.length || 0}/{busStops.length} stops completed
            </Text>
          </View>
        </View>
      )}

      {/* Error Alert */}
      {(error || tripError) && isOnline && (
        <View style={[styles.errorBanner, shadow.card]}>
          <Feather name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error || tripError}</Text>
        </View>
      )}

      {/* Route Stops Panel */}
      {currentTrip && (
        <RouteStopsPanel
          visible={showStopsPanel}
          busStops={busStops}
          passengerCount={passengerCount}
          isPaused={isPaused}
          onClose={() => setShowStopsPanel(false)}
          onStatusToggle={setIsPaused}
          onOpenPassengerLog={() => {
            setShowPassengerLog(true);
            setShowStopsPanel(false);
          }}
        />
      )}

      {/* Passenger Log Modal */}
      {currentTrip && assignedRoute && (
        <PassengerLogModal
          visible={showPassengerLog}
          passengerCount={passengerCount}
          onCountChange={setPassengerCount}
          onConfirm={handlePassengerUpdate}
          onClose={() => setShowPassengerLog(false)}
          capacity={35} // Typical bus capacity
        />
      )}
    </View>
  );
}

// ...existing code...

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  routeInfo: {
    position: 'absolute',
    top: 12,
    left: 16,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    minWidth: 200,
  },
  routeInfoTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },
  routeInfoText: {
    color: palette.muted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '500',
    fontSize: 12,
    flex: 1,
  },
});