import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { paymentService, type PassengerPaymentRecord } from '../services/paymentService';

const PAGE_SIZE = 10;

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusStyle = (status: string) => {
  if (status === 'paid') return { bg: '#d1fae5', text: '#047857', icon: 'checkmark-circle-outline' };
  if (status === 'failed') return { bg: '#fee2e2', text: '#dc2626', icon: 'close-circle-outline' };
  return { bg: '#fef3c7', text: '#d97706', icon: 'time-outline' };
};

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<PassengerPaymentRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async (nextPage = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);

    try {
      const result = await paymentService.getPaymentHistory(nextPage, PAGE_SIZE);
      setPayments((prev) => append ? [...prev, ...(result.data || [])] : result.data || []);
      setPage(result.pagination.page || nextPage);
      setHasMore(Boolean(result.pagination.hasNextPage));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load payment history');
      if (!append) setPayments([]);
    } finally {
      append ? setLoadingMore(false) : setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments(1, false);
  }, [loadPayments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadPayments(1, false);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Payment History</Text>
          <Text style={styles.headerSubtitle}>Your recent fares and receipts</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />}
      >
        {loading && payments.length === 0 ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.mutedText}>Loading payment history...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerCard}>
            <Ionicons name="alert-circle-outline" size={42} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => loadPayments(1, false)}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.centerCard}>
            <Ionicons name="receipt-outline" size={42} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.mutedText}>Completed payments will appear here.</Text>
          </View>
        ) : (
          <>
            {payments.map((payment) => {
              const cfg = statusStyle(payment.paymentStatus);
              return (
                <View key={payment.paymentId} style={styles.paymentCard}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.fareText}>Rs. {Number(payment.totalFare || 0).toFixed(0)}</Text>
                      <Text style={styles.dateText}>{formatDate(payment.paymentDate)}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={14} color={cfg.text} />
                      <Text style={[styles.statusText, { color: cfg.text }]}>
                        {payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.routeBlock}>
                    <View style={styles.routeDots}>
                      <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                      <View style={styles.routeLine} />
                      <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                    </View>
                    <View style={styles.routeTextBlock}>
                      <Text style={styles.locationText}>{payment.pickupLocation || 'Pickup unavailable'}</Text>
                      <Text style={styles.locationText}>{payment.dropoffLocation || 'Dropoff unavailable'}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="card-outline" size={15} color="#6b7280" />
                      <Text style={styles.metaText}>{payment.paymentType}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={15} color="#6b7280" />
                      <Text style={styles.metaText}>{payment.driverName || 'Driver unavailable'}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {hasMore ? (
              <Pressable
                style={[styles.loadMoreButton, loadingMore && { opacity: 0.65 }]}
                onPress={() => loadPayments(page + 1, true)}
                disabled={loadingMore}
              >
                <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load More'}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff' },
  headerSubtitle: { fontSize: 13, color: '#d1d5db', marginTop: 2 },
  content: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 32, gap: 12 },
  centerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  mutedText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  errorText: { fontSize: 14, color: '#ef4444', fontWeight: '600', textAlign: 'center' },
  emptyTitle: { fontSize: 16, color: '#1f2937', fontWeight: '700' },
  retryButton: { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: '#ffffff', fontWeight: '700' },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  fareText: { fontSize: 22, fontWeight: '800', color: '#1f2937' },
  dateText: { fontSize: 12, color: '#9ca3af', marginTop: 3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: '700' },
  routeBlock: { flexDirection: 'row', gap: 10 },
  routeDots: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 2, height: 26, backgroundColor: '#e5e7eb' },
  routeTextBlock: { flex: 1, justifyContent: 'space-between', gap: 14 },
  locationText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 7 },
  metaText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  loadMoreButton: { backgroundColor: '#3b82f6', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  loadMoreText: { color: '#ffffff', fontWeight: '700' },
});
