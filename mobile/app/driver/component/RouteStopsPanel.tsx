import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';

interface BusStop {
  id: number;
  name: string;
  status: 'completed' | 'active' | 'upcoming';
  passengers: number;
  time: string;
  latitude?: number;
  longitude?: number;
}

interface RouteStopsPanelProps {
  visible: boolean;
  busStops: BusStop[];
  passengerCount: number;
  isPaused: boolean;
  onClose: () => void;
  onStatusToggle: (paused: boolean) => void;
  onOpenPassengerLog: () => void;
}

export default function RouteStopsPanel({
  visible,
  busStops,
  passengerCount,
  isPaused,
  onClose,
  onStatusToggle,
  onOpenPassengerLog,
}: RouteStopsPanelProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.panel, shadow.card]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Route Stops</Text>
              <Text style={styles.subtitle}>{busStops.length} stops</Text>
            </View>
            <Pressable
              style={[styles.statusButton, isPaused && styles.statusPaused]}
              onPress={() => onStatusToggle(!isPaused)}
            >
              <Feather
                name={isPaused ? 'play' : 'pause'}
                size={14}
                color={isPaused ? palette.warning : palette.success}
              />
              <Text style={[styles.statusText, { color: isPaused ? palette.warning : palette.success }]}>
                {isPaused ? 'On Break' : 'Active'}
              </Text>
            </Pressable>
          </View>

          {/* Passenger Card */}
          <Pressable style={[styles.passengerCard, shadow.card]} onPress={onOpenPassengerLog}>
            <View style={styles.passengerRow}>
              <View>
                <Text style={styles.passengerLabel}>Passengers Onboard</Text>
                <Text style={styles.passengerCount}>{passengerCount}</Text>
              </View>
              <View style={styles.capacityInfo}>
                <Text style={styles.capacityLabel}>Capacity</Text>
                <Text style={styles.capacityValue}>45 seats</Text>
              </View>
              <View style={styles.editButton}>
                <Feather name="edit-2" size={16} color={palette.primary} />
              </View>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${(passengerCount / 45) * 100}%` }]} />
            </View>
          </Pressable>

          {/* Stops List */}
          <Text style={styles.stopsTitle}>Upcoming Stops</Text>
          <ScrollView style={styles.stopsList} showsVerticalScrollIndicator={false}>
            {busStops.map((stop) => (
              <View
                key={stop.id}
                style={[
                  styles.stopRow,
                  stop.status === 'active' && styles.activeStop,
                  stop.status === 'completed' && styles.completedStop,
                ]}
              >
                <View
                  style={[
                    styles.stopIndex,
                    stop.status === 'active' && styles.stopIndexActive,
                    stop.status === 'completed' && styles.stopIndexCompleted,
                  ]}
                >
                  <Text style={styles.stopIndexText}>
                    {stop.status === 'completed' ? '✓' : stop.id}
                  </Text>
                </View>

                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <Text style={styles.stopTime}>{stop.time}</Text>
                </View>

                {stop.passengers > 0 && (
                  <View style={styles.passengerBadge}>
                    <Feather name="users" size={12} color={palette.muted} />
                    <Text style={styles.passengerBadgeText}>+{stop.passengers}</Text>
                  </View>
                )}

                {stop.status === 'active' && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Current</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Close Button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  panel: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    paddingBottom: spacing.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: palette.border,
    borderRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  subtitle: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 4,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#ECFDF3',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusPaused: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
  },
  passengerCard: {
    backgroundColor: palette.background,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  passengerLabel: {
    color: palette.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  passengerCount: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
  },
  capacityInfo: {
    alignItems: 'center',
  },
  capacityLabel: {
    color: palette.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  capacityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  editButton: {
    padding: spacing.sm,
  },
  progressBg: {
    height: 8,
    backgroundColor: palette.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  stopsList: {
    maxHeight: 280,
    paddingHorizontal: spacing.lg,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  activeStop: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    marginVertical: -spacing.md,
    paddingVertical: spacing.md,
  },
  completedStop: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    marginVertical: -spacing.md,
    paddingVertical: spacing.md,
  },
  stopIndex: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.border,
  },
  stopIndexActive: {
    backgroundColor: palette.primary,
  },
  stopIndexCompleted: {
    backgroundColor: palette.success,
  },
  stopIndexText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    color: palette.text,
    fontWeight: '600',
    fontSize: 14,
  },
  stopTime: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 2,
  },
  passengerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  passengerBadgeText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  activePill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  activePillText: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  closeButton: {
    backgroundColor: palette.primary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});