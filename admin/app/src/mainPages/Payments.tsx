import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Pagination from '@/app/components/ui/Pagination';
import { Table, type TableColumn } from '@/app/components/ui/Table';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { getAdminPayments, type AdminPaymentRecord } from '../services/paymentService';

const PAGE_SIZE = 10;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toFixed(0)}`;

const statusVariant = (status: string) => {
  if (status === 'paid') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'warning';
  return 'neutral';
};

const WebDateInput = ({
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  min?: string;
  max?: string;
}) => {
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
      style={styles.dateInput}
      value={value}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      onChangeText={onChange}
    />
  );
};

export default function Payments() {
  const [records, setRecords] = useState<AdminPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAdminPayments({
        page: currentPage,
        limit: PAGE_SIZE,
        search,
        startDate,
        endDate,
        paymentType,
        paymentStatus,
      });
      setRecords(result.records);
      setTotalPages(result.pagination.totalPages || 1);
      setTotalRecords(result.pagination.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load payments');
      setRecords([]);
      setTotalPages(1);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [currentPage, startDate, endDate, paymentType, paymentStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadPayments();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const columns = useMemo<TableColumn<AdminPaymentRecord>[]>(() => [
    { key: 'paymentId', header: 'Payment ID', width: 180, render: (item) => String(item.paymentId).slice(-10) },
    { key: 'passenger', header: 'Passenger', flex: 1.1, render: (item) => item.passenger?.name || 'N/A' },
    { key: 'driver', header: 'Driver', flex: 1.1, render: (item) => item.driver?.name || 'N/A' },
    { key: 'booking', header: 'Booking', width: 140, render: (item) => item.booking?.code || '-' },
    { key: 'totalFare', header: 'Total Fare', width: 120, render: (item) => formatCurrency(item.totalFare) },
    { key: 'paymentType', header: 'Type', width: 110, render: (item) => item.paymentType },
    {
      key: 'paymentStatus',
      header: 'Status',
      width: 120,
      render: (item) => (
        <StatusBadge
          label={item.paymentStatus.charAt(0).toUpperCase() + item.paymentStatus.slice(1)}
          variant={statusVariant(item.paymentStatus) as any}
        />
      ),
    },
    { key: 'paymentDate', header: 'Payment Date', width: 180, render: (item) => formatDate(item.paymentDate) },
  ], []);

  const setQuickDate = (mode: 'today' | 'yesterday') => {
    const d = new Date();
    if (mode === 'yesterday') d.setDate(d.getDate() - 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setStartDate(value);
    setEndDate(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPaymentType('');
    setPaymentStatus('');
    setCurrentPage(1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Passenger or driver name..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9ca3af"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Feather name="x" size={15} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.dateBar}>
          <Feather name="calendar" size={14} color="#6b7280" />
          <Pressable style={styles.quickDate} onPress={() => setQuickDate('today')}>
            <Text style={styles.quickDateText}>Today</Text>
          </Pressable>
          <Pressable style={styles.quickDate} onPress={() => setQuickDate('yesterday')}>
            <Text style={styles.quickDateText}>Yesterday</Text>
          </Pressable>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>From</Text>
            <WebDateInput value={startDate} onChange={(v) => { setStartDate(v); setCurrentPage(1); }} placeholder="Start date" max={endDate || todayISO()} />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.dateLabel}>To</Text>
            <WebDateInput value={endDate} onChange={(v) => { setEndDate(v); setCurrentPage(1); }} placeholder="End date" min={startDate} max={todayISO()} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {[
            ['paymentType', '', 'All Types'],
            ['paymentType', 'cash', 'Cash'],
            ['paymentType', 'online', 'Online'],
            ['paymentType', 'wallet', 'Wallet'],
            ['paymentStatus', '', 'All Status'],
            ['paymentStatus', 'pending', 'Pending'],
            ['paymentStatus', 'paid', 'Paid'],
            ['paymentStatus', 'failed', 'Failed'],
          ].map(([kind, value, label]) => {
            const active = kind === 'paymentType' ? paymentType === value : paymentStatus === value;
            return (
              <Pressable
                key={`${kind}-${value}`}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => {
                  if (kind === 'paymentType') setPaymentType(value);
                  else setPaymentStatus(value);
                  setCurrentPage(1);
                }}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.clearChip} onPress={clearFilters}>
            <Text style={styles.clearChipText}>Clear</Text>
          </Pressable>
        </ScrollView>
      </View>

      <View style={styles.content}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color="#0d9488" />
            <Text style={styles.mutedText}>Loading payments...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultCount}>{totalRecords} payment{totalRecords === 1 ? '' : 's'}</Text>
            <Table
              data={records}
              columns={columns}
              keyExtractor={(item) => item.paymentId}
              emptyMessage="No payments found"
            />
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingTop: 12, paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexWrap: 'wrap',
  },
  quickDate: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  quickDateText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  dateField: { minWidth: 150, flex: 1 },
  dateLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  dateInput: { fontSize: 13, color: '#111827', paddingVertical: 2 },
  webDateInput: {
    width: '100%',
    height: 30,
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: '#111827',
    fontSize: 13,
    fontFamily: 'inherit',
    outlineWidth: 0,
  },
  chipRow: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterChipTextActive: { color: '#fff' },
  clearChip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  clearChipText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  content: { flex: 1, padding: 16, gap: 10 },
  resultCount: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  centerWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  mutedText: { color: '#9ca3af', fontSize: 14 },
  errorText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
});
