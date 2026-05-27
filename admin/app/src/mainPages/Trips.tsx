import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getAllTrips, getTripById, type TripListItem, type TripDetails } from '../services/tripService';
import Pagination from '@/app/components/ui/Pagination';

const PAGE_SIZE = 10;


const formatDate = (dateString: string | undefined) => {
  if (!dateString || dateString === 'N/A') return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatTime = (timeString: string | undefined) => {
  if (!timeString || timeString === 'N/A') return null;
  if (/^\d{2}:\d{2}$/.test(timeString)) return timeString;
  const d = new Date(timeString);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const formatDisplayDate = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getInitials = (name: string) =>
  (name || '').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

type StatusVariant = 'success' | 'warning' | 'danger' | 'info';

const STATUS_CONFIG: Record<string, { variant: StatusVariant; color: string; bg: string; label: string; icon: string }> = {
  'in-progress': { variant: 'info',    color: '#2563eb', bg: '#eff6ff', label: 'In Progress', icon: 'play-circle' },
  'completed':   { variant: 'success', color: '#16a34a', bg: '#f0fdf4', label: 'Completed',   icon: 'check-circle' },
  'missed':      { variant: 'danger',  color: '#dc2626', bg: '#fef2f2', label: 'Missed',       icon: 'x-circle' },
};

const getStatusCfg = (s: string) =>
  STATUS_CONFIG[s] ?? { variant: 'warning' as StatusVariant, color: '#d97706', bg: '#fffbeb', label: s, icon: 'alert-circle' };



const Avatar: React.FC<{ uri?: string | null; name: string; size: number; color?: string }> = ({
  uri, name, size, color = '#3b82f6',
}) => {
  const radius = size / 2;
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.34, fontWeight: '700', color }}>{getInitials(name)}</Text>
    </View>
  );
};


const WebDateInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  max?: string;
  min?: string;
}> = ({ value, onChange, placeholder, max, min }) => {
  if (Platform.OS === 'web') {
    return React.createElement('input', {
      type: 'date',
      value,
      min,
      max,
      placeholder,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
      style: styles.webDateInput as any,
      'aria-label': placeholder,
    });
  }

  return (
    <TextInput
      style={[styles.dateInput, !value && { color: '#9ca3af' }]}
      value={value}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      onChangeText={onChange}
    />
  );
};


const DateRangeBar: React.FC<{
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onClear: () => void;
}> = ({ startDate, endDate, onStartChange, onEndChange, onClear }) => (
  <View style={styles.dateBar}>
    <Feather name="calendar" size={14} color="#6b7280" />
    <View style={styles.dateField}>
      <Text style={styles.dateFieldLabel}>From</Text>
      <WebDateInput value={startDate} onChange={onStartChange} placeholder="Start date" max={endDate || todayISO()} />
    </View>
    <View style={styles.dateSep} />
    <View style={styles.dateField}>
      <Text style={styles.dateFieldLabel}>To</Text>
      <WebDateInput value={endDate} onChange={onEndChange} placeholder="End date" min={startDate} max={todayISO()} />
    </View>
    {(startDate || endDate) && (
      <Pressable onPress={onClear} style={styles.dateClear} hitSlop={8}>
        <Feather name="x" size={14} color="#6b7280" />
      </Pressable>
    )}
  </View>
);


const TripCard: React.FC<{ trip: TripListItem; onPress: () => void }> = ({ trip, onPress }) => {
  const cfg = getStatusCfg(trip.status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardWrap, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.card}>
        <View style={[styles.cardStripe, { backgroundColor: cfg.color }]} />
        <View style={styles.cardInner}>
          <View style={styles.cardTop}>
            <Avatar uri={trip.driverProfileImgUrl} name={trip.driverName} size={44} color={cfg.color} />
            <View style={styles.cardTopCenter}>
              <Text style={styles.cardRoute} numberOfLines={1}>{trip.routeName}</Text>
              <Text style={styles.cardMeta}>{trip.driverName} · {trip.busNumber}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
              <Feather name={cfg.icon as any} size={11} color={cfg.color} />
              <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <View style={styles.cardStats}>
            {[
              { val: String(trip.passengerCount), lbl: 'Passengers', red: false },
              { val: String(trip.bookingCount),   lbl: 'Bookings',   red: false },
              { val: String(trip.totalSeats),     lbl: 'Seats',      red: false },
              { val: trip.delayMinutes > 0 ? `+${trip.delayMinutes}m` : '—', lbl: 'Delay', red: trip.delayMinutes > 0 },
            ].map((s, i, arr) => (
              <React.Fragment key={i}>
                <View style={styles.statItem}>
                  <Text style={[styles.statVal, s.red && { color: '#dc2626' }]}>{s.val}</Text>
                  <Text style={styles.statLabel}>{s.lbl}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.cardTime}>
              <Feather name="clock" size={12} color="#9ca3af" />
              <Text style={styles.cardTimeText}>{formatDate(trip.startTime) ?? '—'}</Text>
            </View>
            <Text style={[styles.viewMore, { color: cfg.color }]}>View details →</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};



const TimelineRow: React.FC<{ label: string; value: string | null; color: string; isLast?: boolean }> = ({
  label, value, color, isLast,
}) => (
  <View style={styles.tlRow}>
    <View style={styles.tlLeft}>
      <View style={[styles.tlDot, { borderColor: value ? color : '#e5e7eb', backgroundColor: value ? color : '#fff' }]} />
      {!isLast && <View style={[styles.tlLine, { backgroundColor: value ? color + '40' : '#e5e7eb' }]} />}
    </View>
    <View style={styles.tlContent}>
      <Text style={styles.tlLabel}>{label}</Text>
      {value ? <Text style={styles.tlValue}>{value}</Text> : <Text style={styles.tlEmpty}>—</Text>}
    </View>
  </View>
);



const OccupancyHistoryRow: React.FC<{ record: any; index: number; total: number }> = ({ record, index, total }) => {
  const isLastRow = index === total - 1;
  const isBoarding = record.eventType === 'boarding' || record.passengersBoarded > 0;
  const isAlighting = record.eventType === 'alighting' || record.passengersAlighted > 0;
  const color = isAlighting ? '#ef4444' : isBoarding ? '#10b981' : '#6b7280';
  const bgColor = isAlighting ? '#fef2f2' : isBoarding ? '#f0fdf4' : '#f3f4f6';

  const timestamp = new Date(record.timestamp);
  const time = timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.occHistRow}>
      <View style={styles.occHistLeft}>
        <View style={[styles.occHistDot, { borderColor: color, backgroundColor: color }]} />
        {!isLastRow && <View style={[styles.occHistLine, { backgroundColor: color + '40' }]} />}
      </View>
      <View style={styles.occHistContent}>
        <View style={styles.occHistHeader}>
          <Text style={styles.occHistStop} numberOfLines={1}>{record.stopName}</Text>
          <View style={[styles.occHistBadge, { backgroundColor: bgColor }]}>
            <Feather name={isAlighting ? 'arrow-down-left' : isBoarding ? 'arrow-up-right' : 'minus'} size={12} color={color} />
            <Text style={[styles.occHistBadgeText, { color }]}>
              {isAlighting && record.passengersAlighted > 0 ? `↓ ${record.passengersAlighted}` :
               isBoarding && record.passengersBoarded > 0 ? `↑ ${record.passengersBoarded}` :
               'Updated'}
            </Text>
          </View>
        </View>
        <View style={styles.occHistMeta}>
          <Text style={styles.occHistTime}>{time}</Text>
          <View style={styles.occHistOccupancy}>
            <Feather name="users" size={12} color="#6b7280" />
            <Text style={styles.occHistOccupancyText}>
              Current: <Text style={{ fontWeight: '700', color: '#111827' }}>{record.currentOccupancy}</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};



const BookingRow: React.FC<{ booking: any; index: number }> = ({ booking, index }) => {
  const payPaid = booking.paymentStatus === 'paid';
  const statusCompleted = booking.bookingStatus === 'completed';
  const statusCancelled = booking.bookingStatus === 'cancelled';

  return (
    <View style={[styles.bookRow, index % 2 === 0 && styles.bookRowAlt]}>
      <View style={styles.bookPassenger}>
        <Avatar uri={booking.passengerProfileImgUrl} name={booking.passengerName} size={32} color="#6366f1" />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={styles.bookName} numberOfLines={1}>{booking.passengerName}</Text>
          <Text style={styles.bookCode}>{booking.bookingCode}</Text>
        </View>
      </View>
      <View style={styles.bookRoute}>
        <Text style={styles.bookStop} numberOfLines={1}>{booking.boardingStop}</Text>
        <Text style={styles.bookArrow}>↓</Text>
        <Text style={styles.bookStop} numberOfLines={1}>{booking.alightingStop}</Text>
      </View>
      <View style={styles.bookRight}>
        <Text style={styles.bookSeats}>{booking.seatCount ?? booking.seats} seat{(booking.seatCount ?? 1) !== 1 ? 's' : ''}</Text>
        <Text style={styles.bookFare}>₹{booking.fare}</Text>
        <View style={[styles.bookBadge, { backgroundColor: payPaid ? '#f0fdf4' : '#fffbeb' }]}>
          <Text style={[styles.bookBadgeText, { color: payPaid ? '#16a34a' : '#d97706' }]}>
            {payPaid ? 'Paid' : 'Pending'}
          </Text>
        </View>
        <View style={[styles.bookBadge, {
          backgroundColor: statusCompleted ? '#f0fdf4' : statusCancelled ? '#fef2f2' : '#eff6ff',
          marginTop: 2,
        }]}>
          <Text style={[styles.bookBadgeText, { color: statusCompleted ? '#16a34a' : statusCancelled ? '#dc2626' : '#2563eb' }]}>
            {booking.bookingStatus}
          </Text>
        </View>
      </View>
    </View>
  );
};



const TripDetailsModal: React.FC<{
  trip: TripDetails | null;
  loading: boolean;
  onClose: () => void;
}> = ({ trip, loading, onClose }) => {
  const slideAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const visible = trip !== null || loading;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 10 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(80);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const cfg = trip ? getStatusCfg(trip.status) : getStatusCfg('');
  const isMissed = trip?.status === 'missed';
  const isCompleted = trip?.status === 'completed';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handleBar} />
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Feather name="x" size={20} color="#6b7280" />
          </Pressable>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading trip details…</Text>
            </View>
          ) : trip ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>

              {/* Hero */}
              <View style={[styles.hero, { backgroundColor: cfg.color }]}>
                <View style={styles.heroInner}>
                  <View style={styles.heroRoute}>
                    <Text style={styles.heroStop}>{trip.route.startingStop}</Text>
                    <Text style={styles.heroStop}>{trip.route.endingStop}</Text>
                  </View>
                  <View style={styles.heroDriver}>
                    <Avatar uri={trip.driver.profileImgUrl} name={trip.driver.name} size={64} color="#fff" />
                    <Text style={styles.heroDriverName}>{trip.driver.name}</Text>
                    <Text style={styles.heroBusNum}>{trip.bus.busNumber}</Text>
                    <View style={styles.heroBadge}>
                      <Feather name={cfg.icon as any} size={11} color={cfg.color} />
                      <Text style={[styles.heroBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quick info */}
              <View style={styles.quickRow}>
                <View style={styles.quickCard}>
                  <Feather name="phone" size={16} color="#6366f1" />
                  <Text style={styles.quickLabel}>Phone</Text>
                  <Text style={styles.quickVal}>{trip.driver.phone}</Text>
                </View>
                <View style={styles.quickCard}>
                  <Feather name="users" size={16} color="#0891b2" />
                  <Text style={styles.quickLabel}>Capacity</Text>
                  <Text style={styles.quickVal}>{trip.bus.capacity} seats</Text>
                </View>
                <View style={styles.quickCard}>
                  <Feather name="clock" size={16} color="#7c3aed" />
                  <Text style={styles.quickLabel}>Rest Time</Text>
                  <Text style={styles.quickVal}>{trip.times.restTimeMinutes}m</Text>
                </View>
              </View>

              {/* Metrics */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trip Summary</Text>
                <View style={styles.metricsGrid}>
                  <View style={[styles.metricCard, { borderLeftColor: '#3b82f6' }]}>
                    <Text style={styles.metricNum}>{trip.metrics.passengerCount}</Text>
                    <Text style={styles.metricLbl}>Passengers</Text>
                  </View>
                  <View style={[styles.metricCard, { borderLeftColor: '#8b5cf6' }]}>
                    <Text style={styles.metricNum}>{trip.metrics.totalSeats}</Text>
                    <Text style={styles.metricLbl}>Total Seats</Text>
                  </View>
                  <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
                    <Text style={styles.metricNum}>₹{trip.metrics.totalFare.toFixed(0)}</Text>
                    <Text style={styles.metricLbl}>Total Fare</Text>
                  </View>
                  {trip.times.delayMinutes > 0 && (
                    <View style={[styles.metricCard, { borderLeftColor: '#ef4444' }]}>
                      <Text style={[styles.metricNum, { color: '#ef4444' }]}>+{trip.times.delayMinutes}m</Text>
                      <Text style={styles.metricLbl}>Delay</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Timeline — only shows values appropriate to status */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Timeline</Text>
                <View style={styles.timeline}>
                  <TimelineRow
                    label="Scheduled Start"
                    value={formatTime(trip.times.scheduledStart)}
                    color={cfg.color}
                  />
                  <TimelineRow
                    label="Actual Start"
                    value={isMissed ? null : formatDate(trip.times.actualStart)}
                    color={cfg.color}
                  />
                  <TimelineRow
                    label="Scheduled End"
                    value={formatTime(trip.times.scheduledEnd)}
                    color={cfg.color}
                  />
                  <TimelineRow
                    label="Actual End"
                    value={isCompleted ? formatDate(trip.times.actualEnd) : null}
                    color={cfg.color}
                    isLast
                  />
                </View>
              </View>

              {/* Occupancy History */}
              {trip.occupancyHistory && trip.occupancyHistory.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.occHistHeader2}>
                    <Text style={styles.sectionTitle}>Occupancy History</Text>
                    <View style={styles.occHistCurrentBadge}>
                      <Text style={styles.occHistCurrentLabel}>Current</Text>
                      <Text style={styles.occHistCurrentValue}>{trip.metrics.currentOccupancy}/{trip.bus.capacity}</Text>
                    </View>
                  </View>
                  <View style={styles.occHistTimeline}>
                    {trip.occupancyHistory.map((record, idx) => (
                      <OccupancyHistoryRow
                        key={idx}
                        record={record}
                        index={idx}
                        total={trip.occupancyHistory!.length}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Passengers */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Passengers{trip.bookings.length > 0 ? ` (${trip.bookings.length})` : ''}
                </Text>
                {trip.bookings.length === 0 ? (
                  <View style={styles.emptyBookings}>
                    <Feather name="users" size={28} color="#d1d5db" />
                    <Text style={styles.emptyBookingsText}>No bookings for this trip</Text>
                  </View>
                ) : (
                  <View style={styles.bookingsWrap}>
                    {trip.bookings.map((b, i) => (
                      <BookingRow key={i} booking={b} index={i} />
                    ))}
                  </View>
                )}
              </View>

              <View style={{ height: 32 }} />
            </ScrollView>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};


export default function Trips() {
  const [allTrips, setAllTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTrip, setSelectedTrip] = useState<TripDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchTrips = async () => {
    setLoading(true);
    const data = await getAllTrips({
      status: statusFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    setAllTrips(data);
    setCurrentPage(1);
    setLoading(false);
  };

  useEffect(() => { fetchTrips(); }, [statusFilter, startDate, endDate]);

  // ── Client-side search ──
  const filtered = allTrips.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.routeName.toLowerCase().includes(q) ||
      t.busNumber.toLowerCase().includes(q) ||
      t.driverName.toLowerCase().includes(q)
    );
  });

  // ── Client-side pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearch = (q: string) => { setSearchQuery(q); setCurrentPage(1); };
  const handleFilterChange = (f: string) => { setStatusFilter(f); setSearchQuery(''); setCurrentPage(1); };
  const handleDateClear = () => { setStartDate(''); setEndDate(''); setCurrentPage(1); };
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (endDate && value && endDate < value) {
      setEndDate('');
    }
    setCurrentPage(1);
  };
  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (startDate && value && value < startDate) {
      setStartDate('');
    }
    setCurrentPage(1);
  };

  const handleViewDetails = async (trip: TripListItem) => {
    setSelectedTrip(null);
    setDetailsLoading(true);
    const details = await getTripById(trip.tripId);
    setDetailsLoading(false);
    if (details) setSelectedTrip(details);
  };

  const FILTERS = [
    { key: '', label: 'All' },
    { key: 'in-progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'missed', label: 'Missed' },
  ];

  const hasDateFilter = !!(startDate || endDate);
  const hasAnyFilter = !!(statusFilter || hasDateFilter);

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Route, bus, driver…"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearch('')} hitSlop={8}>
              <Feather name="x" size={15} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* Date range — web uses browser native date picker */}
        <DateRangeBar
          startDate={startDate}
          endDate={endDate}
          onStartChange={handleStartDateChange}
          onEndChange={handleEndDateChange}
          onClear={handleDateClear}
        />

        {/* Status chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          {FILTERS.map((f) => {
            const active = statusFilter === f.key;
            const cfg = f.key ? getStatusCfg(f.key) : null;
            return (
              <Pressable
                key={f.key}
                onPress={() => handleFilterChange(f.key)}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: cfg?.color ?? '#111827', borderColor: cfg?.color ?? '#111827' },
                ]}
              >
                {f.key && cfg && (
                  <Feather name={cfg.icon as any} size={12} color={active ? '#fff' : cfg.color} />
                )}
                <Text style={[styles.filterChipText, active && { color: '#fff' }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active filter summary pill */}
        {hasAnyFilter && (
          <View style={styles.activeFilters}>
            <Feather name="filter" size={12} color="#6366f1" />
            <Text style={styles.activeFiltersText} numberOfLines={1}>
              {[
                statusFilter && getStatusCfg(statusFilter).label,
                startDate && `From ${formatDisplayDate(startDate)}`,
                endDate && `To ${formatDisplayDate(endDate)}`,
              ].filter(Boolean).join(' · ')}
            </Text>
            <Pressable onPress={() => { setStatusFilter(''); handleDateClear(); }} hitSlop={8}>
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Trip List ── */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading trips…</Text>
          </View>
        ) : paginated.length === 0 ? (
          <View style={styles.centerWrap}>
            <Feather name="inbox" size={36} color="#d1d5db" />
            <Text style={styles.emptyText}>No trips found</Text>
            {(searchQuery || hasAnyFilter) && (
              <Text style={styles.emptySubText}>Try adjusting your filters</Text>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.resultCount}>
              {filtered.length} trip{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== allTrips.length ? ` of ${allTrips.length}` : ''}
            </Text>

            {paginated.map((trip) => (
              <TripCard key={trip.tripId} trip={trip} onPress={() => handleViewDetails(trip)} />
            ))}

            {totalPages > 1 && (
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* ── Details Modal ── */}
      <TripDetailsModal
        trip={selectedTrip}
        loading={detailsLoading}
        onClose={() => { setSelectedTrip(null); setDetailsLoading(false); }}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingTop: 12 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },

  dateBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  dateField: { flex: 1 },
  dateFieldLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  dateInput: { fontSize: 13, color: '#111827', paddingVertical: 2 },
  webDateInput: {
    width: '100%',
    minWidth: 132,
    height: 30,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: '#111827',
    fontSize: 13,
    fontFamily: 'inherit',
    outlineWidth: 0,
  },
  dateSep: { width: 1, height: 30, backgroundColor: '#e5e7eb' },
  dateClear: { padding: 4 },

  filterRow: { marginBottom: 10 },
  filterRowContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 14,
    borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },

  activeFilters: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#eef2ff', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  activeFiltersText: { flex: 1, fontSize: 12, color: '#4338ca', fontWeight: '500' },
  clearAll: { fontSize: 12, fontWeight: '700', color: '#6366f1' },

  list: { flex: 1 },
  listContent: { padding: 16, gap: 12 },
  centerWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  loadingText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  emptyText: { fontSize: 15, color: '#9ca3af', fontWeight: '500' },
  emptySubText: { fontSize: 13, color: '#c4c9d4' },
  resultCount: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginBottom: 4 },

  cardWrap: {},
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden',
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardStripe: { width: 4 },
  cardInner: { flex: 1, padding: 14, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTopCenter: { flex: 1 },
  cardRoute: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardMeta: { fontSize: 12, color: '#9ca3af' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  cardStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, paddingVertical: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 24, backgroundColor: '#e5e7eb' },
  statVal: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  occRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  occLabel: { fontSize: 11, color: '#9ca3af', width: 64, fontWeight: '500' },
  occTrack: { flex: 1, height: 5, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden' },
  occFill: { height: '100%', borderRadius: 999 },
  occPct: { fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTime: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTimeText: { fontSize: 12, color: '#9ca3af' },
  viewMore: { fontSize: 12, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', minHeight: 300 },
  handleBar: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 999, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  closeBtn: { position: 'absolute', top: 14, right: 16, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 12 },
  modalScroll: { paddingBottom: 0 },

  hero: { paddingTop: 24, paddingBottom: 20, paddingHorizontal: 20 },
  heroInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroRoute: { flex: 1, paddingRight: 12 },
  heroStop: { fontSize: 17, fontWeight: '800', color: '#fff', lineHeight: 24 },
  heroDivider: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 },
  heroDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroDriver: { alignItems: 'center', gap: 4 },
  heroDriverName: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 6 },
  heroBusNum: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, marginTop: 4 },
  heroBadgeText: { fontSize: 11, fontWeight: '700' },

  quickRow: { flexDirection: 'row', gap: 10, padding: 16 },
  quickCard: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  quickLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  quickVal: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center' },

  section: { paddingHorizontal: 16, marginBottom: 20, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.6 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', borderLeftWidth: 4 },
  metricNum: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2 },
  metricLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },

  timeline: { paddingLeft: 4 },
  tlRow: { flexDirection: 'row', minHeight: 52 },
  tlLeft: { width: 28, alignItems: 'center' },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 4 },
  tlLine: { width: 2, flex: 1, marginTop: 2, borderRadius: 1 },
  tlContent: { flex: 1, paddingLeft: 12, paddingBottom: 12 },
  tlLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  tlValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  tlEmpty: { fontSize: 14, color: '#d1d5db' },

  occHistHeader2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  occHistCurrentBadge: { backgroundColor: '#eff6ff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, gap: 3 },
  occHistCurrentLabel: { fontSize: 10, color: '#2563eb', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  occHistCurrentValue: { fontSize: 13, color: '#2563eb', fontWeight: '700' },
  occHistTimeline: { paddingLeft: 4 },
  occHistRow: { flexDirection: 'row', minHeight: 60 },
  occHistLeft: { width: 28, alignItems: 'center' },
  occHistDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 6 },
  occHistLine: { width: 2, flex: 1, marginTop: 2, borderRadius: 1 },
  occHistContent: { flex: 1, paddingLeft: 12, paddingBottom: 12, gap: 6 },
  occHistHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  occHistStop: { fontSize: 13, color: '#111827', fontWeight: '600', flex: 1 },
  occHistBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 4 },
  occHistBadgeText: { fontSize: 11, fontWeight: '700' },
  occHistMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  occHistTime: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  occHistOccupancy: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  occHistOccupancyText: { fontSize: 11, color: '#6b7280', fontWeight: '500' },

  bookingsWrap: { borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  bookRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: '#fff' },
  bookRowAlt: { backgroundColor: '#fafafa' },
  bookPassenger: { flex: 2, flexDirection: 'row', alignItems: 'center' },
  bookName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  bookCode: { fontSize: 10, color: '#9ca3af', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  bookRoute: { flex: 1.5, alignItems: 'center', gap: 1 },
  bookStop: { fontSize: 11, color: '#374151', fontWeight: '500', textAlign: 'center' },
  bookArrow: { fontSize: 10, color: '#d1d5db' },
  bookRight: { flex: 1.5, alignItems: 'flex-end', gap: 2 },
  bookSeats: { fontSize: 11, color: '#6b7280' },
  bookFare: { fontSize: 13, fontWeight: '700', color: '#111827' },
  bookBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  bookBadgeText: { fontSize: 10, fontWeight: '700' },
  emptyBookings: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyBookingsText: { fontSize: 14, color: '#9ca3af' },
});
