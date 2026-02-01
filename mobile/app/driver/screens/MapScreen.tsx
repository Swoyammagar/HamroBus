import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { busStops, routePolyline } from '../data/mock';
import { useLocation } from '../hooks/useLocation';
import RouteStopsPanel from '../component/RouteStopsPanel';
import PassengerLogModal from '../component/PassengerLogModal';
import OpenStreetMap from '../component/RealTimeMap';

interface Props {
  isOnline: boolean;
  onStatusChange?: (status: boolean) => void;
}

export default function MapScreen({ isOnline, onStatusChange }: Props) {
  const [passengerCount, setPassengerCount] = useState(23);
  const [showStopsPanel, setShowStopsPanel] = useState(false);
  const [showPassengerLog, setShowPassengerLog] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);

  const { location, loading, error, startTracking, stopTracking, requestPermission } = useLocation();

  // Handle online/offline status change
  useEffect(() => {
    if (isOnline && !isLocationEnabled) {
      requestLocationPermission();
    } else if (!isOnline && isLocationEnabled) {
      stopTracking();
      setIsLocationEnabled(false);
    }
  }, [isOnline]);

  // Request location permission and start tracking
  const requestLocationPermission = async () => {
    try {
      const granted = await requestPermission();
      if (granted) {
        setIsLocationEnabled(true);
        await startTracking();
      } else {
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
      Alert.alert('Error', 'Failed to request location permission');
      onStatusChange?.(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Real-time Map */}
      <OpenStreetMap
        currentLocation={location}
        busStops={busStops}
        routePolyline={routePolyline}
        loading={loading}
        onStopPress={(stop) => {
          console.log('Stop pressed:', stop.name);
        }}
      />

      {/* Floating Action Button - Show Stops */}
      <Pressable
        style={[styles.fab, shadow.card]}
        onPress={() => setShowStopsPanel(true)}
      >
        <Feather name="list" size={24} color="#FFFFFF" />
      </Pressable>

      {/* Online Status Badge */}
      {isOnline && (
        <View style={[styles.statusBadge, shadow.card]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Live Location On</Text>
        </View>
      )}

      {/* Error Alert */}
      {error && isOnline && (
        <View style={[styles.errorBanner, shadow.card]}>
          <Feather name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Route Stops Panel */}
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

      {/* Passenger Log Modal */}
      <PassengerLogModal
        visible={showPassengerLog}
        passengerCount={passengerCount}
        onCountChange={setPassengerCount}
        onClose={() => setShowPassengerLog(false)}
        capacity={45}
      />
    </View>
  );
}

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