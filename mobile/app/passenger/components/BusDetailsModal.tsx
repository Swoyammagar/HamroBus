import React, { useEffect, useState } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { type Bus, usePassenger } from '../context/PassengerContext';
import { calculateCrowdPercentage, getCrowdColor } from '../utils/helpers';
import { type Schedule } from '../services/routeService';
import { busService, type DriverLatestReview } from '../services/busService';

interface BusDetailsModalProps {
  visible: boolean;
  bus: Bus | null;
  schedules?: Schedule[];
  onClose: () => void;
  onBookNow: () => void;
}

const BusDetailsModal: React.FC<BusDetailsModalProps> = ({
  visible,
  bus,
  schedules = [],
  onClose,
  onBookNow,
}) => {
  const { liveBusOccupancy, liveBusStops } = usePassenger();
  const [latestReviews, setLatestReviews] = useState<DriverLatestReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestReviews = async () => {
      const driverId = String(bus?.driverId || '').trim();
      if (!visible || !driverId) {
        setLatestReviews([]);
        setReviewsError(null);
        return;
      }

      try {
        setReviewsLoading(true);
        setReviewsError(null);
        const rows = await busService.getDriverLatestReviews(driverId);
        setLatestReviews(rows || []);
      } catch (error: any) {
        setReviewsError(error?.response?.data?.message || 'Could not load recent reviews');
        setLatestReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchLatestReviews();
  }, [visible, bus?.driverId]);

  useEffect(() => {
    if (!visible || !bus) {
      return;
    }
  }, [visible, bus?._id, bus?.id]);

  if (!bus) return null;

  const busId = String(bus._id || bus.id || '');
  const currentPassengers = liveBusOccupancy[busId] !== undefined ? liveBusOccupancy[busId] : (bus.currentPassengers ?? bus.currentOccupancy ?? 0);
  const currentStop = liveBusStops[busId]?.currentStop || null;
  const previousStop = liveBusStops[busId]?.previousStop || null;
  const totalCapacity = bus.totalCapacity ?? bus.capacity ?? 0;
  const driverName = bus.driverName || 'Unknown';
  const driverPhoto = bus.driverPhoto;
  const driverRatingAverage = Number(bus.driverRatingAverage || 0);
  const driverRatingCount = Number(bus.driverRatingCount || 0);

  const renderDriverStars = (rating: number) => {
    const safeRating = Math.max(0, Math.min(5, rating));
    const fullStars = Math.floor(safeRating);
    const hasHalf = safeRating - fullStars >= 0.5;

    return Array.from({ length: 5 }).map((_, index) => {
      if (index < fullStars) {
        return <Ionicons key={`star-${index}`} name="star" size={13} color="#f59e0b" />;
      }
      if (index === fullStars && hasHalf) {
        return <Ionicons key={`star-${index}`} name="star-half" size={13} color="#f59e0b" />;
      }
      return <Ionicons key={`star-${index}`} name="star-outline" size={13} color="#d1d5db" />;
    });
  };

  const formatRelativeTime = (value?: string) => {
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

  const formatPassengerName = (review: DriverLatestReview) => {
    const first = review.passenger?.firstName || '';
    const last = review.passenger?.lastName || '';
    const full = `${first} ${last}`.trim();
    return full || 'Passenger';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.modalTitle}>{bus.busNumber || 'Bus'}</Text>

            {(currentStop || previousStop) && (
              <View style={styles.stopProgressionSection}>
                <View style={styles.stopProgressionContainer}>
                  <View style={styles.stopProgression}>
                    <View style={styles.stopItem}>
                      <Text style={styles.stopLabel}>Last Stop</Text>
                      <Text style={styles.stopNamePrevious}>{previousStop || 'Starting'}</Text>
                    </View>
                    <View style={styles.stopArrow}>
                      <Feather name="arrow-right" size={16} color="#3b82f6" />
                    </View>
                    <View style={styles.stopItem}>
                      <Text style={styles.stopLabel}>Now At</Text>
                      <Text style={styles.stopNameCurrent}>{currentStop || 'En route'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Bus Information</Text>

              <View style={styles.detailRow}>
                <Ionicons name="person" size={20} color="#3b82f6" />
                {driverPhoto ? (
                  <Image source={{ uri: driverPhoto }} style={styles.driverAvatar} />
                ) : (
                  <View style={styles.driverAvatarPlaceholder}>
                    <Ionicons name="person" size={16} color="#6b7280" />
                  </View>
                )}
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Driver</Text>
                  <Text style={styles.detailValue}>{driverName}</Text>

                  {driverRatingCount > 0 ? (
                    <View style={styles.driverRatingRow}>
                      <View style={styles.driverStarsRow}>{renderDriverStars(driverRatingAverage)}</View>
                      <Text style={styles.driverRatingValue}>{driverRatingAverage.toFixed(1)}</Text>
                      <Text style={styles.driverRatingMeta}>
                        ({driverRatingCount} reviews)
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.driverRatingMeta}>No ratings yet</Text>
                  )}
                </View>
              </View>
            </View>

            {schedules.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>Schedule</Text>
                {schedules.map(schedule => (
                  <View key={schedule._id} style={styles.scheduleRow}>
                    <Text style={styles.scheduleDay}>{schedule.dayOfWeek || 'Day'}</Text>
                    <Text style={styles.scheduleTime}>
                      {schedule.startTime || schedule.departureTime || 'N/A'} - {schedule.endTime || schedule.arrivalTime || 'N/A'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.detailsSection}>
              <View style={styles.occupancyHeaderRow}>
                <Text style={styles.detailsTitle}>Occupancy</Text>
                {liveBusOccupancy[busId] !== undefined && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>Live</Text>
                  </View>
                )}
              </View>

              <View style={styles.crowdBar}>
                <View
                  style={[
                    styles.crowdFill,
                    {
                      width: `${calculateCrowdPercentage(bus)}%`,
                      backgroundColor: getCrowdColor(calculateCrowdPercentage(bus)),
                    },
                  ]}
                />
              </View>

              <View style={styles.occupancyDetails}>
                <View style={styles.occupancyItem}>
                  <Text style={styles.occupancyLabel}>Occupied</Text>
                  <Text style={styles.occupancyValue}>{currentPassengers}</Text>
                </View>
                <View style={styles.occupancyItem}>
                  <Text style={styles.occupancyLabel}>Available</Text>
                  <Text style={styles.occupancyValue}>
                    {Math.max(totalCapacity - currentPassengers, 0)}
                  </Text>
                </View>
                <View style={styles.occupancyItem}>
                  <Text style={styles.occupancyLabel}>Total</Text>
                  <Text style={styles.occupancyValue}>{totalCapacity}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Latest Reviews</Text>

              {reviewsLoading ? (
                <View style={styles.reviewsStateCard}>
                  <Text style={styles.reviewsStateText}>Loading reviews...</Text>
                </View>
              ) : reviewsError ? (
                <View style={styles.reviewsStateCard}>
                  <Text style={styles.reviewsErrorText}>{reviewsError}</Text>
                </View>
              ) : latestReviews.length === 0 ? (
                <View style={styles.reviewsStateCard}>
                  <Text style={styles.reviewsStateText}>No reviews yet.</Text>
                </View>
              ) : (
                latestReviews.map((review) => (
                  <View key={review._id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewHeaderLeft}>
                        <Text style={styles.reviewPassenger}>{formatPassengerName(review)}</Text>
                        <Text style={styles.reviewTime}>{formatRelativeTime(review.reviewedAt)}</Text>
                      </View>
                      <View style={styles.reviewRatingPill}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={styles.reviewRatingText}>{Number(review.rating || 0).toFixed(1)}</Text>
                      </View>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment?.trim() || 'No comment added.'}</Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>

          <View style={styles.stickyBookWrap}>
            <TouchableOpacity style={styles.bookButton} onPress={onBookNow}>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.bookButtonText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  closeButton: {
    padding: 8,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  detailsSection: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  driverAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    backgroundColor: '#e5e7eb',
  },
  driverAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  crowdBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  crowdFill: {
    height: '100%',
  },
  occupancyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  occupancyItem: {
    alignItems: 'center',
  },
  occupancyLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  occupancyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
    marginTop: 4,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduleDay: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  scheduleTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  bookButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  stickyBookWrap: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  driverRatingRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  driverRatingValue: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
  },
  driverRatingMeta: {
    marginLeft: 6,
    fontSize: 11,
    color: '#6b7280',
  },
  reviewsStateCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewsStateText: {
    color: '#6b7280',
    fontSize: 12,
  },
  reviewsErrorText: {
    color: '#b91c1c',
    fontSize: 12,
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  reviewHeaderLeft: {
    flex: 1,
  },
  reviewPassenger: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
  },
  reviewTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  reviewRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
  },
  reviewComment: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  stopProgressionSection: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  stopProgressionContainer: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  stopProgression: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stopItem: {
    flex: 1,
    alignItems: 'center',
  },
  stopLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  stopNameCurrent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b82f6',
    textAlign: 'center',
  },
  stopNamePrevious: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  stopArrow: {
    paddingHorizontal: 8,
  },
  occupancyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
});

export default BusDetailsModal;
