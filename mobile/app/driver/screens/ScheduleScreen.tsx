import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { useAppContext } from '../context/AppContext';

type ScheduleItem = {
  _id: string;
  dayOfWeek?: string;
  startTime: string;
  endTime: string;
  busId?: {
    busNumber: string;
  };
  status?: string;
  notes?: string;
};

// Generate days dynamically for the week
const generateWeekDays = () => {
  const days = [];
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    let label = '';
    if (i === 0) {
      label = 'Today';
    } else if (i === 1) {
      label = 'Tomorrow';
    } else {
      label = dayNames[date.getDay()];
    }

    days.push({
      label,
      id: i.toString(),
      date: date,
      dateString: `${date.getDate()} ${monthNames[date.getMonth()]}`
    });
  }

  return days;
};

const weekDays = generateWeekDays();

const fullDayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const shortDayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const getDayIndexFromValue = (value?: string) => {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();
  const asNumber = Number(normalized);

  // Support day values like "0".."6" if backend ever returns numeric strings.
  if (Number.isInteger(asNumber) && asNumber >= 0 && asNumber <= 6) {
    return asNumber;
  }

  const fullIndex = fullDayNames.indexOf(normalized);
  if (fullIndex !== -1) {
    return fullIndex;
  }

  const shortIndex = shortDayNames.indexOf(normalized.slice(0, 3));
  return shortIndex !== -1 ? shortIndex : null;
};

const toMinutes = (timeValue: string) => {
  if (!timeValue) return 0;
  const [hour, minute] = timeValue.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  return hour * 60 + minute;
};

export default function ScheduleScreen() {
  const [selected, setSelected] = useState('0'); // Start with today
  
  // ✅ Use shared context instead of individual hooks
  const { 
    schedules, 
    routeLoading, 
    currentTrip, 
    assignedRoute,
    refreshRoute 
  } = useAppContext();

  const [refreshing, setRefreshing] = useState(false);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshRoute();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const selectedDayIndex = useMemo(() => {
    const parsed = Number(selected);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
      return 0;
    }
    return parsed;
  }, [selected]);

  const selectedDayName = weekDays[selectedDayIndex]?.date
    ? fullDayNames[weekDays[selectedDayIndex].date.getDay()]
    : fullDayNames[new Date().getDay()];

  const currentSchedules = useMemo(() => {
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return [];
    }

    const matchesForDay = schedules.filter((schedule: ScheduleItem) => {
      const scheduleDayIndex = getDayIndexFromValue(schedule.dayOfWeek);
      return scheduleDayIndex === fullDayNames.indexOf(selectedDayName);
    });

    return [...matchesForDay].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [schedules, selectedDayName]);

  const calculateWorkingHours = () => {
    if (currentSchedules.length === 0) return '0h';
    
    let totalMinutes = 0;
    currentSchedules.forEach(schedule => {
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const startTotalMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;
      totalMinutes += endTotalMin - startTotalMin;
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (routeLoading) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: spacing.md, color: palette.text }}>Loading schedules...</Text>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        <View style={styles.chipRow}>
          {weekDays.map((day) => (
            <Pressable
              key={day.id}
              onPress={() => setSelected(day.id)}
              style={[styles.chip, selected === day.id && styles.chipActive]}
            >
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.chipText, selected === day.id && styles.chipTextActive]}>
                  {day.label}
                </Text>
                <Text style={[styles.chipDate, selected === day.id && styles.chipDateActive]}>
                  {day.dateString}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.summary, shadow.card]}>
        <View>
          <Text style={styles.summaryLabel}>Total Trips</Text>
          <Text style={styles.summaryValue}>{currentSchedules.length}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.summaryLabel}>Working Hours</Text>
          <Text style={styles.summaryValue}>{calculateWorkingHours()}</Text>
        </View>
      </View>

      {currentSchedules.length > 0 ? (
        currentSchedules.map((schedule, index) => {
          return (
            <View key={schedule._id || index} style={[styles.card, shadow.card]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Schedule {index + 1}</Text>
                  <View style={styles.metaRow}>
                    <Feather name="clock" size={14} color={palette.muted} />
                    <Text style={styles.metaText}>{schedule.startTime} - {schedule.endTime}</Text>
                  </View>
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
                    <Text style={styles.metaText}>{assignedRoute?.source || 'Start Point'}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Feather name="map-pin" size={14} color={palette.muted} />
                    <Text style={styles.metaText}>{assignedRoute?.destination || 'End Point'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardFooter}>
                {schedule.busId && (
                  <Text style={styles.metaText}>
                    Bus: {schedule.busId.busNumber}
                  </Text>
                )}
                {schedule.notes && (
                  <View style={styles.notesRow}>
                    <Feather name="info" size={14} color={palette.muted} />
                    <Text style={[styles.metaText, { flex: 1 }]} numberOfLines={1}>{schedule.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={48} color={palette.muted} />
          <Text style={styles.emptyTitle}>No schedules for this day</Text>
          <Text style={styles.emptyText}>Try another day or pull to refresh</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  chipText: { color: palette.text, fontWeight: '600', fontSize: 14 },
  chipTextActive: { color: '#FFFFFF' },
  chipDate: { color: palette.muted, fontSize: 11, marginTop: 2 },
  chipDateActive: { color: 'rgba(255,255,255,0.8)' },
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
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  notesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: palette.muted,
    marginTop: spacing.sm,
  },
});
