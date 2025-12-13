import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { historyTrips } from '../data/mock';

const filters = ['all', 'completed', 'in-progress'] as const;
type Filter = typeof filters[number];

type HistoryTrip = (typeof historyTrips)[number];

export default function HistoryScreen() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = historyTrips.filter(
    (t) => filter === 'all' || t.status === filter
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.summary, shadow.card]}>
        <View>
          <Text style={styles.summaryLabel}>Trips</Text>
          <Text style={styles.summaryValue}>3/5</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Passengers</Text>
          <Text style={styles.summaryValue}>83</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Distance</Text>
          <Text style={styles.summaryValue}>84 km</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        <View style={styles.chipRow}>
          {filters.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, filter === item && styles.chipActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>
                {item.replace('-', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {filtered.map((trip) => {
        const isExpanded = expanded === trip.id;
        return (
          <View key={trip.id} style={[styles.card, shadow.card]}>
            <Pressable style={styles.cardHeader} onPress={() => setExpanded(isExpanded ? null : trip.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{trip.route}</Text>
                <View style={styles.metaRow}>
                  <Feather name="clock" size={14} color={palette.muted} />
                  <Text style={styles.metaText}>{trip.startTime} - {trip.endTime}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                {trip.status === 'completed' ? (
                  <View style={[styles.statusPill, { backgroundColor: '#DCFCE7' }]}>
                    <Feather name="check-circle" size={14} color={palette.success} />
                    <Text style={[styles.statusText, { color: palette.success }]}>Completed</Text>
                  </View>
                ) : (
                  <View style={[styles.statusPill, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[styles.statusText, { color: palette.primary }]}>In Progress</Text>
                  </View>
                )}
                <Feather
                  name="chevron-down"
                  size={18}
                  color={palette.muted}
                  style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                />
              </View>
            </Pressable>

            <View style={styles.kpiRow}>
              <View style={styles.metaRow}>
                <Feather name="users" size={14} color={palette.muted} />
                <Text style={styles.metaText}>{trip.passengers}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="trending-up" size={14} color={palette.muted} />
                <Text style={styles.metaText}>{trip.distance}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="dollar-sign" size={14} color={palette.muted} />
                <Text style={styles.metaText}>{trip.earnings}</Text>
              </View>
            </View>

            {isExpanded && (
              <View style={styles.expanded}>
                <Text style={styles.sectionTitle}>Route Details</Text>
                <View style={styles.routeRow}>
                  <View style={styles.routeDots}>
                    <View style={[styles.dot, { backgroundColor: palette.primary }]} />
                    <View style={styles.routeLine} />
                    <View style={[styles.dot, { backgroundColor: palette.success }]} />
                  </View>
                  <View style={{ flex: 1, gap: spacing.sm }}>
                    <View>
                      <Text style={styles.metaText}>Start</Text>
                      <Text style={styles.routeText}>{trip.startPoint}</Text>
                    </View>
                    <View>
                      <Text style={styles.metaText}>End</Text>
                      <Text style={styles.routeText}>{trip.endPoint}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Stops</Text>
                <View style={styles.tags}>
                  {trip.stops.map((stop) => (
                    <View key={stop} style={styles.tag}>
                      <Text style={styles.tagText}>{stop}</Text>
                    </View>
                  ))}
                </View>

                {trip.issues?.length ? (
                  <View style={styles.issueBox}>
                    <Feather name="alert-circle" size={16} color={palette.warning} />
                    <Text style={[styles.metaText, { color: palette.warning }]}>{trip.issues[0]}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
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
  summaryValue: { color: palette.text, fontSize: 22, fontWeight: '700' },
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
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: palette.text, fontWeight: '700', fontSize: 16 },
  headerRight: { alignItems: 'flex-end', gap: spacing.sm },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusText: { fontWeight: '700', fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: palette.muted },
  kpiRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  expanded: { gap: spacing.md, marginTop: spacing.sm },
  sectionTitle: { color: palette.text, fontWeight: '700' },
  routeRow: { flexDirection: 'row', gap: spacing.md },
  routeDots: { alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, height: 32, backgroundColor: palette.border },
  routeText: { color: palette.text, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { backgroundColor: '#EEF2FF', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  tagText: { color: palette.primary, fontWeight: '600' },
  issueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
});
