import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { palette, spacing, radius, shadow } from '../theme';
import reviewService, { type DriverReviewItem } from '../services/reviewService';
import { SafeAreaView } from 'react-native-safe-area-context';

const PAGE_SIZE = 20;

export default function AllReviewsScreen() {
  const router = useRouter();
  const [reviews, setReviews] = useState<DriverReviewItem[]>([]);
  const [ratingAverage, setRatingAverage] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatName = (review: DriverReviewItem) => {
    const first = review.passengerId?.firstName || '';
    const last = review.passengerId?.lastName || '';
    const fullName = `${first} ${last}`.trim();
    return fullName || 'Passenger';
  };

  const formatDate = (value?: string) => {
    if (!value) return 'Recently';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const loadInitial = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summary, list] = await Promise.all([
        reviewService.getDriverReviewSummary(),
        reviewService.getDriverReviews(PAGE_SIZE, 0),
      ]);

      setRatingAverage(Number(summary?.ratingAverage || 0));
      setRatingCount(Number(summary?.ratingCount || 0));
      setReviews(list?.reviews || []);
      setHasMore(Boolean(list?.hasMore));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const list = await reviewService.getDriverReviews(PAGE_SIZE, reviews.length);
      const incoming = list?.reviews || [];
      setReviews((prev) => [...prev, ...incoming]);
      setHasMore(Boolean(list?.hasMore));
    } catch {
      // Keep current list if pagination fails.
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadInitial();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const renderItem = ({ item }: { item: DriverReviewItem }) => (
    <View style={[styles.reviewCard, shadow.card]}>
      <View style={styles.cardHeader}>
        <View style={styles.leftCol}>
          <Text style={styles.name}>{formatName(item)}</Text>
          <Text style={styles.time}>{formatDate(item.reviewedAt || item.createdAt)}</Text>
          {item.bookingId?.bookingCode ? (
            <Text style={styles.bookingCode}>Booking: {item.bookingId.bookingCode}</Text>
          ) : null}
        </View>

        <View style={styles.ratingPill}>
          <Feather name="star" size={14} color="#F59E0B" />
          <Text style={styles.ratingPillText}>{Number(item.rating || 0).toFixed(1)}</Text>
        </View>
      </View>

      <Text style={styles.comment}>{item.comment?.trim() || 'No comment added.'}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Loading all reviews...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerWrap}>
        <Feather name="alert-circle" size={20} color={palette.warning} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadInitial}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[ 'top' ]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={palette.text} />
        </Pressable>
        <Text style={styles.topTitle}>All Reviews</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={[styles.summaryCard, shadow.card]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryInline}>
            <Feather name="star" size={18} color="#F59E0B" />
            <Text style={styles.summaryRating}>{ratingAverage.toFixed(1)}</Text>
          </View>
          <Text style={styles.summaryCount}>{ratingCount} total reviews</Text>
        </View>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No passenger reviews yet.</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={palette.primary} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  centerWrap: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    color: palette.muted,
  },
  errorText: {
    color: palette.warning,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.xs,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topBar: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: palette.text,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryRating: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.text,
  },
  summaryCount: {
    color: palette.muted,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  reviewCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  leftCol: {
    flex: 1,
  },
  name: {
    color: palette.text,
    fontWeight: '700',
  },
  time: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 2,
  },
  bookingCode: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  ratingPillText: {
    fontWeight: '700',
    color: palette.text,
  },
  comment: {
    color: palette.muted,
    lineHeight: 20,
  },
  emptyWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: palette.muted,
  },
  footerLoading: {
    paddingVertical: spacing.md,
  },
});
