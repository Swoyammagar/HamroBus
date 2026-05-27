import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useReviews } from '../hooks/useReviews';

const MyReviewsPage = () => {
  const router = useRouter();
  const { reviews, stats, loading, error, currentPage, totalPages, totalReviews, fetchReviews, fetchStats, goToPage } = useReviews();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    await fetchReviews(1);
    await fetchStats();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReviews();
    setRefreshing(false);
  };

  const renderStarRating = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={star <= rating ? '#f59e0b' : '#d1d5db'}
            style={styles.star}
          />
        ))}
      </View>
    );
  };

  const renderReviewCard = ({ item }: any) => {
    const routeName = item.booking?.route?.name || 'Unknown Route';
    const busNumber = item.booking?.bus?.busNumber || 'N/A';
    const reviewDate = new Date(item.reviewedAt).toLocaleDateString();

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.driverInfo}>
            {item.driverImage ? (
              <Image source={{ uri: item.driverImage }} style={styles.driverImage} />
            ) : (
              <View style={styles.driverImagePlaceholder}>
                <Ionicons name="person-circle" size={40} color="#bfdbfe" />
              </View>
            )}
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{item.driverName}</Text>
              <View style={styles.driverRatingContainer}>
                {renderStarRating(item.driverRating)}
                <Text style={styles.driverRatingText}>{item.driverRating.toFixed(1)}</Text>
                <Text style={styles.driverRatingCount}>({item.driverRatingCount})</Text>
              </View>
            </View>
          </View>
          <View style={[styles.ratingBadge, { backgroundColor: `rgba(245, 158, 11, ${item.rating * 0.15})` }]}>
            <Ionicons name="star" size={16} color="#f59e0b" />
            <Text style={styles.ratingValue}>{item.rating}</Text>
          </View>
        </View>

        {item.comment && (
          <View style={styles.commentSection}>
            <Text style={styles.comment}>{item.comment}</Text>
          </View>
        )}

        <View style={styles.tripDetails}>
          <View style={styles.tripDetailRow}>
            <Ionicons name="calendar" size={14} color="#3b82f6" />
            <Text style={styles.tripDetailText}>{reviewDate}</Text>
          </View>
        </View>

        {item.isEdited && (
          <View style={styles.editedBadge}>
            <Text style={styles.editedText}>Edited</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Reviews</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  if (error && reviews.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Reviews</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadReviews}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 28 }} />
      </View>

      {stats && (
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Reviews</Text>
            <Text style={styles.statValue}>{stats.totalReviews}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Average Rating</Text>
            <View style={styles.ratingDisplay}>
              <Text style={styles.statValue}>{stats.averageRating.toFixed(1)}</Text>
              <Ionicons name="star" size={18} color="#f59e0b" style={{ marginLeft: 4 }} />
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>5-Star</Text>
            <Text style={styles.statValue}>{stats.ratingDistribution[5]}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={reviews}
        renderItem={renderReviewCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="comment-quote-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Reviews Yet</Text>
            <Text style={styles.emptySubtitle}>Your reviews will appear here</Text>
          </View>
        }
      />

      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
            onPress={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? '#d1d5db' : '#3b82f6'} />
          </TouchableOpacity>

          <Text style={styles.paginationText}>
            Page {currentPage} of {totalPages}
          </Text>

          <TouchableOpacity
            style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
            onPress={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? '#d1d5db' : '#3b82f6'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 35,
    backgroundColor: '#e5e7eb',
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  reviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  driverImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  driverRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  star: {
    marginRight: 2,
  },
  driverRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 4,
  },
  driverRatingCount: {
    fontSize: 10,
    color: '#9ca3af',
    marginLeft: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
    marginLeft: 4,
  },
  commentSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  comment: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 18,
  },
  tripDetails: {
    gap: 8,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDetailText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  editedBadge: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  editedText: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  paginationButtonDisabled: {
    backgroundColor: '#f9fafb',
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
});

export default MyReviewsPage;
