import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { schedules } from '../data/mock';

type ScheduleItem = {
  id: number;
  route: string;
  startTime: string;
  endTime: string;
  startPoint: string;
  endPoint: string;
  status: string;
  passengers?: number;
  estimatedPassengers?: number;
  delay?: string;
};

const days = ['today', 'tomorrow', 'wed', 'thu', 'fri'];

export default function ScheduleScreen() {
  const [selected, setSelected] = useState('today');
  const current = (schedules[selected as keyof typeof schedules] || []) as ScheduleItem[];

  const statusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: '#DCFCE7', text: '#15803D' };
      case 'active':
        return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'upcoming':
      case 'scheduled':
        return { bg: '#FEF9C3', text: '#92400E' };
      default:
        return { bg: '#E2E8F0', text: '#0F172A' };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        <View style={styles.chipRow}>
          {days.map((day) => (
            <Pressable
              key={day}
              onPress={() => setSelected(day)}
              style={[styles.chip, selected === day && styles.chipActive]}
            >
              <Text style={[styles.chipText, selected === day && styles.chipTextActive]}>
                {day === 'today' ? 'Today' : day === 'tomorrow' ? 'Tomorrow' : day.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.summary, shadow.card]}>
        <View>
          <Text style={styles.summaryLabel}>Total Trips</Text>
          <Text style={styles.summaryValue}>{current.length}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.summaryLabel}>Working Hours</Text>
          <Text style={styles.summaryValue}>{selected === 'today' ? '12h' : '8h'}</Text>
        </View>
      </View>

      {current.map((trip) => {
        const style = statusStyle(trip.status);
        return (
          <View key={trip.id} style={[styles.card, shadow.card]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{trip.route}</Text>
                <View style={styles.metaRow}>
                  <Feather name="clock" size={14} color={palette.muted} />
                  <Text style={styles.metaText}>{trip.startTime} - {trip.endTime}</Text>
                </View>
              </View>
              <View style={[styles.statusPill, { backgroundColor: style.bg }]}> 
                <Text style={[styles.statusText, { color: style.text }]}>{trip.status}</Text>
              </View>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.routeDots}>
                <View style={[styles.dot, { backgroundColor: palette.primary }]} />
                <View style={styles.routeLine} />
                <View style={[styles.dot, { backgroundColor: palette.success }]} />
              </View>
              <View style={{ flex: 1, gap: spacing.sm }}>
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={14} color={palette.muted} />
                  <Text style={styles.metaText}>{trip.startPoint}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={14} color={palette.muted} />
                  <Text style={styles.metaText}>{trip.endPoint}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.metaText}>
                {trip.passengers ? `${trip.passengers} passengers` : `Est. ${trip.estimatedPassengers} passengers`}
              </Text>
              {trip.delay && (
                <View style={styles.delayRow}>
                  <Feather name="alert-triangle" size={14} color={palette.warning} />
                  <Text style={[styles.metaText, { color: palette.warning }]}>{trip.delay}</Text>
                </View>
              )}
              <Feather name="chevron-right" size={18} color={palette.muted} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipActive: { backgroundColor: palette.primary },
  chipText: { color: palette.text, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  summary: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryLabel: { color: palette.muted, fontSize: 12 },
  summaryValue: { color: palette.text, fontSize: 24, fontWeight: '700' },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardHeader: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  cardTitle: { color: palette.text, fontWeight: '700', fontSize: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: palette.muted },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  statusText: { fontWeight: '700', fontSize: 12 },
  routeRow: { flexDirection: 'row', gap: spacing.md },
  routeDots: { alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, height: 32, backgroundColor: palette.border },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  delayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
