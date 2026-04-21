import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { useRouter } from 'expo-router';
import reviewService, {
  type DriverReviewItem,
  type DriverReviewSummaryResponse,
} from '../services/reviewService';

export default function ReviewsSection() {
  const router = useRouter();
  const [summary, setSummary] = useState<DriverReviewSummaryResponse | null>(null);
  const [reviews, setReviews] = useState<DriverReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, reviewsData] = await Promise.all([
        reviewService.getDriverReviewSummary(),
        reviewService.getDriverReviews(10, 0),
      ]);

      setSummary(summaryData);
      setReviews(reviewsData.reviews || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load driver reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const formatName = (review: DriverReviewItem) => {
    const firstName = review.passengerId?.firstName || '';
    const lastName = review.passengerId?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => {
      const filled = index < Math.round(rating);
      return (
        <Feather
          key={index}
          name="star"
          size={14}
          color={filled ? '#F59E0B' : '#D1D5DB'}
        />
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Passenger Reviews</Text>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={palette.primary} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Passenger Reviews</Text>
        <View style={styles.errorBox}>
          <Feather name="alert-circle" size={18} color={palette.warning} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <Pressable style={styles.retryButton} onPress={loadReviews}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Passenger Reviews</Text>
        <Pressable onPress={() => router.push('/driver/screens/AllReviewsScreen')}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      </View>

      <View style={[styles.summaryCard, shadow.card]}>
        <View style={styles.summaryTopRow}>
          <View>
            <Text style={styles.summaryRating}>
              {(summary?.ratingAverage || 0).toFixed(1)}
            </Text>
            <Text style={styles.summaryLabel}>
              Based on {summary?.ratingCount || 0} review{(summary?.ratingCount || 0) === 1 ? '' : 's'}
            </Text>
          </View>

          <View style={styles.starRow}>
            {renderStars(summary?.ratingAverage || 0)}
          </View>
        </View>

        <View style={styles.distributionRow}>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = summary?.distribution?.[String(rating)] || 0;
            const total = summary?.ratingCount || 0;
            const percent = total > 0 ? (count / total) * 100 : 0;

            return (
              <View key={rating} style={styles.distItem}>
                <Text style={styles.distLabel}>{rating}</Text>
                <View style={styles.distBarTrack}>
                  <View style={[styles.distBarFill, { width: `${percent}%` }]} />
                </View>
                <Text style={styles.distCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.list}>
        {reviews.length === 0 ? (
          <View style={styles.emptyBox}>
            <Feather name="message-square" size={18} color={palette.muted} />
            <Text style={styles.emptyText}>No passenger reviews yet.</Text>
          </View>
        ) : (
          reviews.map((review) => (
            <View key={review._id} style={[styles.card, shadow.card]}>
              <View style={styles.header}>
                <View style={styles.nameBlock}>
                  <Text style={styles.name}>{formatName(review)}</Text>
                  <Text style={styles.date}>{formatDate(review.reviewedAt || review.createdAt)}</Text>
                  {review.bookingId?.bookingCode ? (
                    <Text style={styles.bookingCode}>
                      Booking: {review.bookingId.bookingCode}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.ratingPill}>
                  <Feather name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{review.rating.toFixed(1)}</Text>
                </View>
              </View>

              {review.comment ? (
                <Text style={styles.comment}>{review.comment}</Text>
              ) : (
                <Text style={styles.noComment}>No comment added.</Text>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    marginBottom: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllText: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.md,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryRating: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: palette.muted,
    marginTop: 2,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  distributionRow: {
    gap: 8,
  },
  distItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distLabel: {
    width: 14,
    fontSize: 12,
    color: palette.text,
    fontWeight: '600',
  },
  distBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.primary,
  },
  distCount: {
    width: 24,
    textAlign: 'right',
    fontSize: 12,
    color: palette.muted,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontWeight: '700',
    color: palette.text,
  },
  date: {
    color: palette.muted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  bookingCode: {
    color: palette.primary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
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
  ratingText: {
    fontWeight: '700',
    color: palette.text,
    fontSize: 14,
  },
  comment: {
    color: palette.muted,
    lineHeight: 20,
  },
  noComment: {
    color: palette.muted,
    fontStyle: 'italic',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.md,
  },
  loadingText: {
    color: palette.muted,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
  },
  errorText: {
    color: palette.warning,
    flex: 1,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  retryText: {
    color: 'white',
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: 8,
  },
  emptyText: {
    color: palette.muted,
  },
});