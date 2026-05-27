import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, Text, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { useLocation } from '../hooks/useLocation';
import { useAppContext } from '../context/AppContext';
import { useTripActions } from '../hooks/useDriver';
import driverService from '../services/driverService';
import RouteStopsPanel from '../component/RouteStopsPanel';
import PassengerLogModal from '../component/PassengerLogModal';
import StopDetailModal from '../component/StopDetailModal';
import OpenStreetMap from '../component/RealTimeMap';

const AUTO_COMPLETE_STOP_RADIUS_METERS = 100;

interface Props {
  isOnline: boolean;
  onStatusChange?: (status: boolean) => void;
}

export default function MapScreen({ isOnline, onStatusChange }: Props) {
  const {
    assignedRoute,
    routeLoading,
    currentTrip,
    tripLoading,
    schedules,
    stopArrivals
  } = useAppContext();

  const { updatePassengers, error: tripError } = useTripActions();

  const [passengerCount, setPassengerCount] = useState(0);
  const [tempPassengerCount, setTempPassengerCount] = useState(0);
  const [showStopsPanel, setShowStopsPanel] = useState(false);
  const [showPassengerLog, setShowPassengerLog] = useState(false);
  const [showStopDetail, setShowStopDetail] = useState(false);
  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [isMarkingStop, setIsMarkingStop] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [expectedPassengersByStop, setExpectedPassengersByStop] = useState<Record<string, number>>({});
  const pendingAutoStopRef = useRef<Set<string>>(new Set());
  const autoCompletedStopsRef = useRef<Set<string>>(new Set());
  const trackingInProgressRef = useRef(false);

  const { location, loading, error, startTracking, stopTracking, pauseTrackingForBreak, requestPermission } = useLocation();

  useEffect(() => {
    const count = currentTrip?.passengerCount || 0;
    setPassengerCount(count);
    setTempPassengerCount(count);
  }, [currentTrip]);

  useEffect(() => {
    pendingAutoStopRef.current.clear();
    autoCompletedStopsRef.current.clear();
  }, [currentTrip?._id]);

  const completedStopSet = useMemo(() => {
    const set = new Set<string>();
    (currentTrip?.completedStops || []).forEach((stop: { stopId?: string }) => {
      if (stop?.stopId) {
        set.add(stop.stopId);
      }
    });
    return set;
  }, [currentTrip?.completedStops]);

  const getCurrentStopName = useCallback(() => {
    if (!assignedRoute?.stops?.length || !currentTrip) return undefined;

    if (currentTrip.currentStop) {
      return currentTrip.currentStop;
    }

    const nextStop = assignedRoute.stops.find(stop => !completedStopSet.has(stop.stopName));
    return nextStop?.stopName;
  }, [assignedRoute, currentTrip, completedStopSet]);

  useEffect(() => {
    if (assignedRoute) {
    }
  }, [assignedRoute]);

  const requestLocationPermission = useCallback(async () => {
    if (trackingInProgressRef.current) {
      return;
    }

    trackingInProgressRef.current = true;

    try {
      const granted = await requestPermission();

      if (granted) {
        await startTracking();
        setIsLocationEnabled(true);
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
      console.error('[Error] Exception in requestLocationPermission:', err);
      Alert.alert('Error', 'Failed to start location tracking');
      onStatusChange?.(false);
    } finally {
      trackingInProgressRef.current = false;
    }
  }, [requestPermission, startTracking, onStatusChange]);

  useEffect(() => {
    if (isOnline && currentTrip?.status !== 'on-break' && !isLocationEnabled) {
      requestLocationPermission();
    }
  }, [isOnline, currentTrip?.status, isLocationEnabled, requestLocationPermission]);

  useEffect(() => {
    if (isOnline && currentTrip?.status === 'on-break' && isLocationEnabled) {
      pauseTrackingForBreak();
      setIsLocationEnabled(false);
    }
  }, [isOnline, currentTrip?.status, isLocationEnabled, pauseTrackingForBreak]);

  useEffect(() => {
    if (!isOnline && isLocationEnabled) {
      stopTracking();
      setIsLocationEnabled(false);
    }
  }, [isOnline, isLocationEnabled, stopTracking]);

  const activeStopIndex = assignedRoute?.stops
    ? assignedRoute.stops.findIndex(stop => !completedStopSet.has(stop.stopName))
    : -1;

  const resolvedStopArrivals = useMemo(() => {
    const scheduleId = currentTrip?.scheduleId;
    const fromAssignedSchedule = scheduleId
      ? schedules?.find((schedule: any) => String(schedule?._id) === String(scheduleId))?.stopArrivals
      : null;

    return fromAssignedSchedule || currentTrip?.stopArrivals || stopArrivals || [];
  }, [currentTrip?.scheduleId, currentTrip?.stopArrivals, schedules, stopArrivals]);

  const getStopArrivalTime = useCallback(
    (stopName: string) => {
      const normalized = stopName.trim().toLowerCase();
      return (
        resolvedStopArrivals.find(
          (arrival: { stopName?: string; arrivalTime?: string }) =>
            arrival?.stopName?.trim?.().toLowerCase?.() === normalized
        )?.arrivalTime || 'No schedule'
      );
    },
    [resolvedStopArrivals]
  );

  const normalizeStopName = useCallback((value?: string) => {
    return String(value || '').trim().toLowerCase();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadExpectedPassengers = async () => {
      if (!currentTrip?.scheduleId || !currentTrip?.startTime) {
        setExpectedPassengersByStop({});
        return;
      }

      const serviceDate = new Date(currentTrip.startTime).toISOString().split('T')[0];

      try {
        const data = await driverService.getScheduleSeatMap(String(currentTrip.scheduleId), serviceDate);
        if (cancelled) return;

        const grouped: Record<string, number> = {};
        (data?.reservedSeats || []).forEach((seat: any) => {
          const status = String(seat?.status || '').toLowerCase();
          const isActiveBooking = status === 'confirmed' || status === 'in-progress';
          const isWaitingToBoard = !seat?.boarded;
          const stopKey = normalizeStopName(seat?.boardingStop?.stopName);

          if (isActiveBooking && isWaitingToBoard && stopKey) {
            grouped[stopKey] = (grouped[stopKey] || 0) + 1;
          }
        });

        setExpectedPassengersByStop(grouped);
      } catch (error) {
        if (!cancelled) {
          setExpectedPassengersByStop({});
          console.error('Failed to load expected passengers by stop:', error);
        }
      }
    };

    loadExpectedPassengers();

    return () => {
      cancelled = true;
    };
  }, [currentTrip?.scheduleId, currentTrip?.startTime, currentTrip?.updatedAt, normalizeStopName]);

  const busStops = assignedRoute?.stops
    ? assignedRoute.stops.map((stop, index) => ({
        id: index + 1,
        name: stop.stopName,
        status: completedStopSet.has(stop.stopName)
          ? 'completed'
          : index === activeStopIndex
            ? 'active'
            : 'upcoming' as any,
        passengers: expectedPassengersByStop[normalizeStopName(stop.stopName)] || 0,
        time: getStopArrivalTime(stop.stopName),
        latitude: stop.latitude,
        longitude: stop.longitude
      }))
    : [];

  const routePolyline = assignedRoute?.stops.map(stop => ({
    latitude: stop.latitude,
    longitude: stop.longitude
  })) || [];

  const calculateDistanceMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    const autoCompleteStops = async () => {
      if (!isOnline || !currentTrip?._id || !assignedRoute?.stops?.length || !location) {
        return;
      }

      let nearestIndex = -1;
      let nearestDistance = Number.MAX_SAFE_INTEGER;

      assignedRoute.stops.forEach((stop, index) => {
        const distance = calculateDistanceMeters(
          location.latitude,
          location.longitude,
          stop.latitude,
          stop.longitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      if (nearestIndex < 0 || nearestDistance > AUTO_COMPLETE_STOP_RADIUS_METERS) {
        return;
      }

      let lastContiguousCompletedIndex = -1;
      for (let i = 0; i < assignedRoute.stops.length; i += 1) {
        if (completedStopSet.has(assignedRoute.stops[i].stopName)) {
          lastContiguousCompletedIndex = i;
        } else {
          break;
        }
      }

      if (nearestIndex <= lastContiguousCompletedIndex) {
        return;
      }

      for (let i = lastContiguousCompletedIndex + 1; i <= nearestIndex; i += 1) {
        const stopName = assignedRoute.stops[i].stopName;
        if (
          completedStopSet.has(stopName) ||
          autoCompletedStopsRef.current.has(stopName) ||
          pendingAutoStopRef.current.has(stopName)
        ) {
          continue;
        }

        try {
          pendingAutoStopRef.current.add(stopName);
          await updatePassengers(currentTrip._id, stopName, 0, 0);
          autoCompletedStopsRef.current.add(stopName);
        } catch (autoCompleteError) {
          console.error('Failed to auto-complete stop:', stopName, autoCompleteError);
          break;
        } finally {
          pendingAutoStopRef.current.delete(stopName);
        }
      }
    };

    autoCompleteStops();
  }, [isOnline, location, currentTrip?._id, assignedRoute?.stops, completedStopSet, updatePassengers]);

  const handlePassengerUpdate = async (newCount: number) => {
    if (!currentTrip?._id || !assignedRoute) {
      Alert.alert('Error', 'Trip or route data not available');
      return;
    }

    try {
      const stopName = getCurrentStopName();

      if (!stopName) {
        Alert.alert('Error', 'Could not find current stop');
        return;
      }

      const oldCount = passengerCount;
      const boarded = Math.max(0, newCount - oldCount); // Passengers getting on
      const alighted = Math.max(0, oldCount - newCount); // Passengers getting off

      if (boarded === 0 && alighted === 0) {
        return;
      }

      await updatePassengers(currentTrip._id, stopName, boarded, alighted);
      setPassengerCount(newCount);
      setTempPassengerCount(newCount);
    } catch (err) {
      Alert.alert('Error', 'Failed to update passenger count');
      throw err;
    }
  };

  const handleStopPress = useCallback((stop: any) => {
    setSelectedStop(stop);
    setShowStopDetail(true);
  }, []);

  const handleMarkAsArrived = useCallback(async () => {
    if (!currentTrip?._id || !selectedStop?.name) {
      Alert.alert('Error', 'Trip or stop data not available');
      return;
    }

    try {
      setIsMarkingStop(true);
      await updatePassengers(currentTrip._id, selectedStop.name, 0, 0);
    } catch (err: any) {
      throw err;
    } finally {
      setIsMarkingStop(false);
    }
  }, [currentTrip?._id, selectedStop?.name, updatePassengers]);

  const handleMarkAsCompleted = useCallback(async () => {
    if (!currentTrip?._id || !selectedStop?.name) {
      Alert.alert('Error', 'Trip or stop data not available');
      return;
    }

    try {
      setIsMarkingStop(true);
      await updatePassengers(
        currentTrip._id,
        selectedStop.name,
        0,
        0
      );
    } catch (err: any) {
      throw err;
    } finally {
      setIsMarkingStop(false);
    }
  }, [currentTrip?._id, selectedStop?.name, updatePassengers]);

  if (routeLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: spacing.md, color: palette.text }}>Loading route...</Text>
      </View>
    );
  }

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
      <OpenStreetMap
        key={`${assignedRoute?._id}-${assignedRoute?.stops?.length}`}
        currentLocation={location}
        busStops={busStops.length > 0 ? busStops : []}
        routePolyline={routePolyline.length > 0 ? routePolyline : []}
        loading={loading}
        onStopPress={handleStopPress}
      />

      {currentTrip && (
        <Pressable
          style={[styles.fab, shadow.card]}
          onPress={() => setShowStopsPanel(true)}
        >
          <Feather name="list" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      {isOnline && isLocationEnabled && (
        <View style={[styles.statusBadge, shadow.card]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Live Location On</Text>
        </View>
      )}

      {(error || tripError) && isOnline && (
        <View style={[styles.errorBanner, shadow.card]}>
          <Feather name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorText}>{error || tripError}</Text>
        </View>
      )}

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

      {currentTrip && assignedRoute && (
        <PassengerLogModal
          visible={showPassengerLog}
          passengerCount={tempPassengerCount}
          onCountChange={setTempPassengerCount}
          onConfirm={handlePassengerUpdate}
          onClose={() => {
            setTempPassengerCount(passengerCount);
            setShowPassengerLog(false);
          }}
          capacity={35} // Typical bus capacity
        />
      )}

      {currentTrip &&
      <StopDetailModal
        visible={showStopDetail}
        stop={selectedStop ? busStops.find((stop) => stop.name === selectedStop.name) || selectedStop : null}
        isLoading={isMarkingStop}
        onClose={() => {
          setShowStopDetail(false);
          setSelectedStop(null);
        }}
        onMarkAsArrived={handleMarkAsArrived}
        onMarkAsCompleted={handleMarkAsCompleted}
      />
}
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
