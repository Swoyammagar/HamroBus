import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing, radius, shadow } from '../theme';
import { currentTrip, upcomingTrip, stats } from '../data/mock';
import StartTripModal from '../component/StartTripModal';

interface Props {
  onSOSPress: () => void;
  isOnline: boolean;
}

export default function HomeScreen({ onSOSPress, isOnline }: Props) {
  const [showStartTrip, setShowStartTrip] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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

      {isOnline && (
        <LinearGradient colors={[palette.primary, '#1E3A8A']} style={styles.tripCard}>
          <View style={styles.tripHeader}>
            <View>
              <Text style={styles.tripSubtitle}>Current Trip</Text>
              <Text style={styles.tripTitle}>{currentTrip.route}</Text>
            </View>
            <View style={styles.tripBadge}>
              <Text style={styles.tripBadgeText}>Active</Text>
            </View>
          </View>

          <View style={styles.tripMeta}>
            <View style={styles.metaRow}>
              <Feather name="clock" size={16} color="#E0ECFF" />
              <Text style={styles.metaText}>{currentTrip.startTime} - {currentTrip.endTime}</Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={16} color="#E0ECFF" />
              <Text style={styles.metaText}>Next: {currentTrip.nextStop}</Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="users" size={16} color="#E0ECFF" />
              <Text style={styles.metaText}>{currentTrip.passengersOnboard}/{currentTrip.expectedPassengers} passengers</Text>
            </View>
          </View>

          <View>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Trip Progress</Text>
              <Text style={styles.progressLabel}>{currentTrip.progress}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${currentTrip.progress}%` }]} />
            </View>
          </View>
        </LinearGradient>
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

      <View style={[styles.panel, shadow.card]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Next Assignment</Text>
          <Text style={styles.panelSub}>{upcomingTrip.time}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>{upcomingTrip.route}</Text>
            <Text style={styles.panelSub}>Duration: {upcomingTrip.duration}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={palette.muted} />
        </View>
        <Pressable style={styles.primaryButton} onPress={() => setShowStartTrip(true)}>
          <Feather name="activity" size={18} color="#FFFFFF" />
          <Text style={styles.primaryText}>Start Trip</Text>
        </Pressable>
      </View>

      <View style={styles.quickGrid}>
        <Pressable style={[styles.quickCard, shadow.card]}>
          <View style={[styles.quickIcon, { backgroundColor: '#DBEAFE' }]}>
            <Feather name="clock" size={18} color={palette.primary} />
          </View>
          <Text style={styles.quickTitle}>Take Break</Text>
          <Text style={styles.quickSub}>Pause location</Text>
        </Pressable>
        <Pressable style={[styles.quickCard, shadow.card]}>
          <View style={[styles.quickIcon, { backgroundColor: '#DCFCE7' }]}>
            <Feather name="users" size={18} color={palette.success} />
          </View>
          <Text style={styles.quickTitle}>Log Passengers</Text>
          <Text style={styles.quickSub}>Update count</Text>
        </Pressable>
      </View>

      <StartTripModal
        visible={showStartTrip}
        onClose={() => setShowStartTrip(false)}
        tripDetails={upcomingTrip}
        onStart={() => {
          setShowStartTrip(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
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
});
