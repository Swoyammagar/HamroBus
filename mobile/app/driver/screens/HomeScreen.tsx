import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing, radius, shadow } from '../theme';
import { useAppContext } from '../context/AppContext';
import { useTripActions } from '../hooks/useDriver';
import StartTripModal from '../component/StartTripModal';
import PassengerLogModal from '../component/PassengerLogModal';

interface Props {
  onSOSPress: () => void;
  isOnline: boolean;
}

export default function HomeScreen({ onSOSPress, isOnline }: Props) {
  // ✅ Use shared context instead of individual hooks
  const { 
    assignedRoute: route, 
    schedules, 
    routeLoading, 
    currentTrip, 
    tripLoading,
    refreshAll 
  } = useAppContext();
  
  const { startTrip, endTrip, updatePassengers, isLoading: tripActionLoading, error: tripActionError } = useTripActions();
  const [showStartTrip, setShowStartTrip] = useState(false);
  const [showPassengerLog, setShowPassengerLog] = useState(false);
  const [tempPassengerCount, setTempPassengerCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Handle pull-to-refresh - now refreshes shared data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle online/offline status
  useEffect(() => {
    if (isOnline && currentTrip) {
      // Refresh when coming back online
      refreshAll();
    }
  }, [isOnline]);

  const handleStartTrip = async () => {
    try {
      if (!route) {
        Alert.alert('Error', 'No assigned route found');
        return;
      }

      if (tripActionLoading) return;

      await startTrip(route._id);
      // Context will auto-update via WebSocket
      setShowStartTrip(false);
      Alert.alert('Success', 'Trip started successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start trip');
    }
  };

  const handleEndTrip = async () => {
    try {
      if (!currentTrip) {
        Alert.alert('Error', 'No active trip found');
        return;
      }

      if (tripActionLoading) return;

      Alert.alert(
        'Stop Trip',
        'Are you sure you want to stop this trip?',
        [
          {
            text: 'Cancel',
            onPress: () => {},
            style: 'cancel'
          },
          {
            text: 'Stop Trip',
            onPress: async () => {
              await endTrip(currentTrip._id);
              // Context will auto-update via WebSocket
              Alert.alert('Success', 'Trip ended successfully');
            },
            style: 'destructive'
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to end trip');
    }
  };

  const handleOpenPassengerLog = () => {
    if (currentTrip) {
      setTempPassengerCount(currentTrip.passengerCount || 0);
      setShowPassengerLog(true);
    } else {
      Alert.alert('Error', 'No active trip found');
    }
  };

  const handleConfirmPassengers = async (count: number) => {
    try {
      if (!currentTrip) {
        Alert.alert('Error', 'No active trip found');
        return;
      }

      // Calculate difference
      const difference = count - (currentTrip.passengerCount || 0);
      const passengersBoarded = difference > 0 ? difference : 0;
      const passengersAlighted = difference < 0 ? Math.abs(difference) : 0;

      await updatePassengers(
        currentTrip._id,
        currentTrip.currentStop || 'current',
        passengersBoarded,
        passengersAlighted
      );

      // Context will auto-update via WebSocket
      Alert.alert('Success', 'Passenger count updated');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update passenger count');
    }
  };

  // Get next upcoming schedule
  const nextSchedule = schedules && schedules.length > 0 ? schedules[0] : null;

  // Calculate stats from current trip
  const stats = [
    {
      label: "Today's Trips",
      value: schedules?.length?.toString() || '0',
      icon: 'activity',
      color: '#2563EB'
    },
    {
      label: 'Active Hours',
      value: currentTrip ? '6.5h' : '0h',
      icon: 'clock',
      color: '#22C55E'
    },
    {
      label: 'Passengers',
      value: currentTrip?.passengerCount?.toString() || '0',
      icon: 'users',
      color: '#7C3AED'
    },
  ];

  if (routeLoading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: spacing.md, color: palette.text }}>Loading route data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={handleRefresh}
          tintColor={palette.primary}
        />
      }
    >
      <Pressable style={styles.sosButton} onPress={onSOSPress}>
        <Feather name="alert-circle" size={22} color="#FFFFFF" />
        <Text style={styles.sosText}>EMERGENCY SOS</Text>
      </Pressable>

      {!isOnline && (
        <View style={styles.offlineCard}>
          <Feather name="alert-circle" size={18} color={palette.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.offlineTitle}>You're currently offline</Text>
            <Text style={styles.offlineSub}>Turn online to start receiving trip assignments</Text>
          </View>
        </View>
      )}

      {isOnline && currentTrip ? (
        // Active Trip Card
        <LinearGradient colors={[palette.primary, '#1E3A8A']} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <View>
              <Text style={styles.tripSubtitle}>Current Trip</Text>
              <Text style={styles.tripTitle}>{currentTrip.routeId?.routeName || 'Route'}</Text>
            </View>
            <View style={styles.tripBadge}>
              <Text style={styles.tripBadgeText}>Active</Text>
            </View>
          </View>

          <View style={styles.tripMeta}>
            <View style={styles.metaRow}>
              <Feather name="clock" size={16} color="#E0ECFF" />
              <Text style={styles.metaText}>
                {currentTrip.startTime ? new Date(currentTrip.startTime).toLocaleTimeString() : 'Starting...'} onwards
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={16} color="#E0ECFF" />
              <Text style={styles.metaText}>
                {currentTrip.routeId?.source} → {currentTrip.routeId?.destination}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="users" size={16} color="#E0ECFF" />
              <Text style={styles.metaText}>
                {currentTrip.passengerCount} passengers on board
              </Text>
            </View>
          </View>

          <View>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Stops Completed</Text>
              <Text style={styles.progressLabel}>
                {currentTrip.completedStops?.length || 0}/{route?.stops?.length || 0}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${
                      route?.stops && currentTrip.completedStops
                        ? (currentTrip.completedStops.length / route.stops.length) * 100
                        : 0
                    }%`
                  }
                ]}
              />
            </View>
          </View>

          {/* Action Buttons for Active Trip */}
          <View style={styles.tripActionRow}>
            <Pressable 
              style={[styles.tripButton, styles.tripButtonSecondary, tripActionLoading && { opacity: 0.6 }]}
              onPress={() => {}} // Take break functionality
              disabled={tripActionLoading}
            >
              <Feather name="pause-circle" size={18} color={palette.primary} />
              <Text style={styles.tripButtonSecondaryText}>Break</Text>
            </Pressable>
            <Pressable 
              style={[styles.tripButton, styles.tripButtonDanger, tripActionLoading && { opacity: 0.6 }]}
              onPress={handleEndTrip}
              disabled={tripActionLoading}
            >
              <Feather name="stop-circle" size={18} color="#FFFFFF" />
              <Text style={styles.tripButtonText}>
                {tripActionLoading ? 'Stopping...' : 'Stop Trip'}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>
      ) : (
        // No Active Trip - Show assigned route info
        route && (
          <LinearGradient colors={['#f3f4f6', '#e5e7eb']} style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <View>
                <Text style={styles.tripSubtitle}>Assigned Route</Text>
                <Text style={[styles.tripTitle, { color: '#1f2937' }]}>{route.routeName}</Text>
              </View>
              <View style={[styles.tripBadge, { backgroundColor: '#dbeafe' }]}>
                <Text style={[styles.tripBadgeText, { color: '#1d4ed8' }]}>Ready</Text>
              </View>
            </View>

            <View style={[styles.tripMeta, { opacity: 0.8 }]}>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={16} color="#1f2937" />
                <Text style={[styles.metaText, { color: '#1f2937' }]}>
                  {route.source} → {route.destination}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="layers" size={16} color="#1f2937" />
                <Text style={[styles.metaText, { color: '#1f2937' }]}>
                  {route.stops?.length || 0} stops • {route.distance} km
                </Text>
              </View>
            </View>
          </LinearGradient>
        )
      )}

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={[styles.statCard, shadow.card]}>
            <Feather name={stat.icon as any} size={18} color={stat.color} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {nextSchedule && !currentTrip && (
        <View style={[styles.panel, shadow.card]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Next Assignment</Text>
            <Text style={styles.panelSub}>{nextSchedule.startTime}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>{route?.routeName || 'Route'}</Text>
              <Text style={styles.panelSub}>
                {nextSchedule.startTime} - {nextSchedule.endTime}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={palette.muted} />
          </View>
          {isOnline && (
            <Pressable
              style={[styles.primaryButton, tripActionLoading && { opacity: 0.6 }]}
              onPress={() => setShowStartTrip(true)}
              disabled={tripActionLoading}
            >
              <Feather name="activity" size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>
                {tripActionLoading ? 'Starting...' : 'Start Trip'}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.quickGrid}>
        <Pressable style={[styles.quickCard, shadow.card]}>
          <View style={[styles.quickIcon, { backgroundColor: '#DBEAFE' }]}>
            <Feather name="clock" size={18} color={palette.primary} />
          </View>
          <Text style={styles.quickTitle}>Take Break</Text>
          <Text style={styles.quickSub}>Pause location</Text>
        </Pressable>
        <Pressable 
          style={[styles.quickCard, shadow.card]}
          onPress={handleOpenPassengerLog}
          disabled={!currentTrip}
        >
          <View style={[styles.quickIcon, { backgroundColor: '#DCFCE7' }]}>
            <Feather name="users" size={18} color={palette.success} />
          </View>
          <Text style={styles.quickTitle}>Log Passengers</Text>
          <Text style={styles.quickSub}>Update count</Text>
        </Pressable>
      </View>

      {tripActionError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{tripActionError}</Text>
        </View>
      )}

      <StartTripModal
        visible={showStartTrip}
        onClose={() => setShowStartTrip(false)}
        tripDetails={{
          route: route?.routeName || 'Route',
          time: nextSchedule?.startTime || '00:00',
          duration: route?.estimatedDuration ? `${Math.round(route.estimatedDuration / 60)}h` : '0h'
        }}
        onStart={handleStartTrip}
      />

      <PassengerLogModal
        visible={showPassengerLog}
        passengerCount={tempPassengerCount}
        onCountChange={setTempPassengerCount}
        onConfirm={handleConfirmPassengers}
        onClose={() => setShowPassengerLog(false)}
        capacity={45}
        isLoading={tripActionLoading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 120,
  },
  sosButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  offlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  offlineTitle: {
    color: '#92400E',
    fontWeight: '700',
  },
  offlineSub: {
    color: '#B45309',
    marginTop: 2,
  },
  tripCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripSubtitle: {
    color: '#BFDBFE',
    fontSize: 13,
  },
  tripTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  tripBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  tripBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tripMeta: {
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    color: '#E0ECFF',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    color: '#E0ECFF',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 12,
  },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 16,
  },
  panelSub: {
    color: palette.muted,
  },
  primaryButton: {
    marginTop: spacing.sm,
    backgroundColor: palette.success,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.xs,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  quickTitle: {
    color: palette.text,
    fontWeight: '700',
  },
  quickSub: {
    color: palette.muted,
    fontSize: 12,
  },
  errorCard: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  tripActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  tripButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  tripButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  tripButtonSecondaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tripButtonDanger: {
    backgroundColor: '#EF4444',
  },
  tripButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
