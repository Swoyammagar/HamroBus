import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { useTripHistory } from '../hooks/useDriver';
import { TripSession } from '../services/driverService';

const statusFilters = ['all', 'completed', 'cancelled', 'in-progress', 'on-break'] as const;
type StatusFilter = typeof statusFilters[number];

const getTripDate = (trip: TripSession) => {
  const value = trip.endTime || trip.startTime || trip.createdAt;
  return value ? new Date(value) : null;
};

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDate = (value?: Date | string | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const formatTime = (value?: Date | string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getDurationHours = (start?: Date | string, end?: Date | string) => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return hours > 0 ? hours : 0;
};

const statusToLabel: Record<string, string> = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  'on-break': 'On Break',
  scheduled: 'Scheduled',
  cancelled: 'Missed',
};

const statusToPillStyle: Record<string, { bg: string; text: string; icon: any }> = {
  completed: { bg: '#DCFCE7', text: palette.success, icon: 'check-circle' },
  'in-progress': { bg: '#DBEAFE', text: palette.primary, icon: 'activity' },
  'on-break': { bg: '#FEF3C7', text: palette.warning, icon: 'pause-circle' },
  scheduled: { bg: '#E2E8F0', text: '#334155', icon: 'calendar' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626', icon: 'x-circle' },
};

export default function HistoryScreen() {
  const { trips, loading, error, hasMore, loadMore, refetch } = useTripHistory();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : null;

  const filteredTrips = useMemo(() => {
    return trips.filter((trip: TripSession) => {
      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
      if (!matchesStatus) return false;

      if (!selectedDateKey) return true;
      const tripDate = getTripDate(trip);
      return tripDate ? toDateKey(tripDate) === selectedDateKey : false;
    });
  }, [trips, statusFilter, selectedDateKey]);

  const summary = useMemo(() => {
    const passengers = filteredTrips.reduce(
      (sum: number, trip: TripSession) => sum + (trip.passengerCount || 0),
      0
    );

    const hours = filteredTrips.reduce(
      (sum: number, trip: TripSession) => sum + getDurationHours(trip.startTime, trip.endTime),
      0
    );

    return {
      totalTrips: filteredTrips.length,
      totalPassengers: passengers,
      totalHours: hours,
    };
  }, [filteredTrips]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch(20, 0);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePickDate = async (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowDatePicker(false);

    if (event.type === 'dismissed') {
      return;
    }

    if (pickedDate) {
      setSelectedDate(pickedDate);
      await refetch(20, 0);
    }
  };

  if (loading && trips.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Loading trip history...</Text>
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
      <View style={[styles.summary, shadow.card]}>
        <View>
          <Text style={styles.summaryLabel}>Trips</Text>
          <Text style={styles.summaryValue}>{summary.totalTrips}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Passengers</Text>
          <Text style={styles.summaryValue}>{summary.totalPassengers}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Hours</Text>
          <Text style={styles.summaryValue}>{summary.totalHours.toFixed(1)}h</Text>
        </View>
      </View>

      <View style={[styles.filterPanel, shadow.card]}>
        <View style={styles.filterHeaderRow}>
          <Text style={styles.filterTitle}>Filters</Text>
          <View style={styles.activeDatePill}>
            <Feather name="calendar" size={13} color={palette.primary} />
            <Text style={styles.activeDateText}>{selectedDate ? formatDate(selectedDate) : 'Any date'}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {statusFilters.map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, statusFilter === item && styles.chipActive]}
                onPress={() => setStatusFilter(item)}
              >
                <Text style={[styles.chipText, statusFilter === item && styles.chipTextActive]}>
                  {item === 'cancelled' ? 'missed' : item.replace('-', ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.dateActionRow}>
          <Pressable style={styles.chooseDateButton} onPress={() => setShowDatePicker(true)}>
            <Feather name="calendar" size={16} color="#FFFFFF" />
            <Text style={styles.chooseDateText}>Choose Date</Text>
          </Pressable>

          {selectedDate ? (
            <Pressable style={styles.clearDateButton} onPress={() => setSelectedDate(null)}>
              <Feather name="x-circle" size={16} color={palette.primary} />
              <Text style={styles.clearDateText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="default"
            onChange={handlePickDate}
          />
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {filteredTrips.map((trip: TripSession) => {
        const isExpanded = expanded === trip._id;
        const routeName = trip.routeId?.routeName || 'Route';
        const source = trip.routeId?.source || 'Unknown';
        const destination = trip.routeId?.destination || 'Unknown';
        const statusStyle = statusToPillStyle[trip.status] || statusToPillStyle.scheduled;
        const completedStops = trip.completedStops || [];

        return (
          <View key={trip._id} style={[styles.card, shadow.card]}>
            <Pressable style={styles.cardHeader} onPress={() => setExpanded(isExpanded ? null : trip._id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{routeName}</Text>
                <View style={styles.metaRow}>
                  <Feather name="calendar" size={14} color={palette.muted} />
                  <Text style={styles.metaText}>{formatDate(getTripDate(trip))}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Feather name="clock" size={14} color={palette.muted} />
                  <Text style={styles.metaText}>{formatTime(trip.startTime)} - {formatTime(trip.endTime)}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}> 
                  <Feather name={statusStyle.icon} size={14} color={statusStyle.text} />
                  <Text style={[styles.statusText, { color: statusStyle.text }]}> 
                    {statusToLabel[trip.status] || trip.status}
                  </Text>
                </View>
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
                <Text style={styles.metaText}>{trip.passengerCount || 0}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={14} color={palette.muted} />
                <Text style={styles.metaText}>{completedStops.length} stops</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="clock" size={14} color={palette.muted} />
                <Text style={styles.metaText}>{getDurationHours(trip.startTime, trip.endTime).toFixed(1)}h</Text>
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
                      <Text style={styles.routeText}>{source}</Text>
                    </View>
                    <View>
                      <Text style={styles.metaText}>End</Text>
                      <Text style={styles.routeText}>{destination}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Trip Info</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.metaText}>Bus</Text>
                    <Text style={styles.routeText}>{trip.busId?.busNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.metaText}>Start Date</Text>
                    <Text style={styles.routeText}>{formatDate(trip.startTime)}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.metaText}>End Date</Text>
                    <Text style={styles.routeText}>{formatDate(trip.endTime)}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.metaText}>Break Time</Text>
                    <Text style={styles.routeText}>{trip.totalBreakTime || 0} min</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      })}

      {filteredTrips.length === 0 && !loading ? (
        <View style={[styles.emptyCard, shadow.card]}>
          <Feather name="calendar" size={32} color={palette.muted} />
          <Text style={styles.emptyTitle}>No trips found</Text>
          <Text style={styles.emptySub}>Try another status or pick a different date.</Text>
        </View>
      ) : null}

      {hasMore ? (
        <Pressable
          style={[styles.loadMoreButton, loading && { opacity: 0.6 }]}
          onPress={loadMore}
          disabled={loading}
        >
          <Text style={styles.loadMoreText}>{loading ? 'Loading...' : 'Load More'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: palette.text },
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
  filterPanel: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 15,
  },
  activeDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#EFF6FF',
  },
  activeDateText: {
    color: palette.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipText: { color: palette.text, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  dateActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chooseDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chooseDateText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  clearDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearDateText: {
    color: palette.primary,
    fontWeight: '700',
  },
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
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  infoItem: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  routeDots: { alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, height: 32, backgroundColor: palette.border },
  routeText: { color: palette.text, fontWeight: '600' },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 16,
  },
  emptySub: {
    color: palette.muted,
    fontSize: 13,
  },
  loadMoreButton: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  loadMoreText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
