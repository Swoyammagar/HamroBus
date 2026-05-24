import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { usePassenger, type Booking } from '../context/PassengerContext';
import {
  bookingService,
  type BookingResponse,
  type ReviewableBookingResponse,
} from '../services/bookingService';
import { RewardService } from '../services/rewardService';
import { formatDate } from '../utils/helpers';
import BookingDetailModal from '@/app/passenger/components/BookingDetailModal';

const MyBookings = () => {
  const { bookings, updateBooking, setBookings } = usePassenger();
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [bookingDetailModal, setBookingDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewTargetBooking, setReviewTargetBooking] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewableBookingIds, setReviewableBookingIds] = useState<Set<string>>(new Set());
  const [rewardNotification, setRewardNotification] = useState<{ visible: boolean; type: 'banned' | 'cancelled' | 'completed'; message: string; details?: any } | null>(null);

  const previousBookingStatusRef = useRef<Record<string, Booking['status']>>({});

  const normalizeEntityId = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      const record = value as { _id?: string; id?: string };
      return String(record._id || record.id || '');
    }
    return '';
  };

  const getBusLabel = (busRef: unknown): string => {
  if (busRef == null) return 'Bus';
  // It's already been resolved to a busNumber string by mapApiBookingToContext
  if (typeof busRef === 'string') {
    // Could be a bus number like "BA KHA 0512" or a raw ID fallback
    return busRef.length > 0 ? `Bus ${busRef}` : 'Bus';
  }
  // Fallback for raw API objects (e.g. in mapContextBookingToResponse path)
  if (typeof busRef === 'object') {
    const rec = busRef as { busNumber?: string; _id?: string; id?: string };
    if (rec.busNumber) return `Bus ${rec.busNumber}`;
    const id = String(rec._id || rec.id || '');
    return id ? `Bus #${id.substring(0, 8)}` : 'Bus';
  }
  return 'Bus';
};

 const mapApiBookingToContext = (b: BookingResponse): Booking => {
  // Extract busNumber before normalizing busId to a string
  const busNumberResolved =
    b.busNumber ||
    (typeof b.busId === 'object' && b.busId !== null
      ? (b.busId as any).busNumber
      : undefined);

  return {
    id: String(b.id),
    bookingId: b.bookingCode,
    passengerId: b.passengerId,
    busId: normalizeEntityId(b.busId),
    routeId: normalizeEntityId(b.routeId),
    busNumber: busNumberResolved || '',   // ← now correctly set
    token: b.bookingCode,
    seatNumber: (b.seatNumbers || []).join(', '),
    price: b.finalFare || b.totalFare,
    paymentStatus: Boolean(b.paymentStatus || b.payment?.status === 'paid'),
    bookingDate: b.createdAt,
    travelDate: b.serviceDate,
    status:
      b.status === 'in-progress'
        ? 'ongoing'
        : (b.status as 'confirmed' | 'ongoing' | 'completed' | 'cancelled'),
    boardingStop: b.boardingStop?.stopName || '',
    alightingStop: b.destinationStop?.stopName || '',
    tripStarted: b.status === 'in-progress' || b.status === 'completed',
    tripEnded: b.status === 'completed',
  };
};

  const mapContextBookingToResponse = (booking: Booking): BookingResponse => ({
    id: booking.id,
    bookingCode: booking.bookingId,
    passengerId: booking.passengerId,
    routeId: booking.routeId,
    busId: booking.busId,
    scheduleId: '',
    tripSessionId: '',
    serviceDate: booking.travelDate,
    dayOfWeek: '',
    scheduleStartTime: '',
    scheduleEndTime: '',
    boardingStop: { stopName: booking.boardingStop, sequence: 0 },
    destinationStop: { stopName: booking.alightingStop, sequence: 0 },
    seatNumbers: booking.seatNumber.split(', '),
    seatCount: booking.seatNumber.split(', ').length,
    farePerSeat: Math.floor(booking.price / Math.max(booking.seatNumber.split(', ').length, 1)),
    totalFare: booking.price,
    paymentStatus: booking.paymentStatus,
    payment: undefined,
    status: booking.status === 'ongoing' ? 'in-progress' : (booking.status as 'confirmed' | 'completed' | 'cancelled'),
    createdAt: booking.bookingDate,
    updatedAt: booking.bookingDate,
    busNumber: booking.busNumber,
  });

  // Fetch bookings on tab focus
  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, [])
  );

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getMyBookings();

      const mappedBookings: Booking[] = data.map((b: BookingResponse) => mapApiBookingToContext(b));

      if (setBookings) {
        setBookings(mappedBookings);
      }

      const reviewable = await bookingService.getReviewableBookings();
      const reviewableIds = new Set(reviewable.map((row: ReviewableBookingResponse) => String(row.bookingId)));
      setReviewableBookingIds(reviewableIds);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load bookings';
      setError(message);
      console.error('Fetch bookings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const openReviewModalForBooking = (booking: Booking) => {
    setReviewTargetBooking(booking);
    setReviewRating(0);
    setReviewComment('');
    setReviewModalVisible(true);
  };

  const closeReviewModal = () => {
    setReviewModalVisible(false);
    setReviewTargetBooking(null);
    setReviewRating(0);
    setReviewComment('');
  };

  const loadReviewableBookings = async (): Promise<Set<string>> => {
    const reviewable = await bookingService.getReviewableBookings();
    const ids = new Set(reviewable.map((row: ReviewableBookingResponse) => String(row.bookingId)));
    setReviewableBookingIds(ids);
    return ids;
  };

  const submitReview = async () => {
    if (!reviewTargetBooking) return;

    if (!reviewRating) {
      Alert.alert('Rating required', 'Please give a star rating before submitting.');
      return;
    }

    setReviewSubmitting(true);
    try {
      await bookingService.submitBookingReview(reviewTargetBooking.id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      setReviewableBookingIds((prev) => {
        const next = new Set(prev);
        next.delete(reviewTargetBooking.id);
        return next;
      });

      closeReviewModal();
      Alert.alert('Thanks!', 'Your review was submitted.');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to submit review';
      Alert.alert('Review Error', message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  useEffect(() => {
    const previous = previousBookingStatusRef.current;
    const current: Record<string, Booking['status']> = {};

    const transitionedToCompletedIds: string[] = [];

    bookings.forEach((booking) => {
      current[booking.id] = booking.status;
      const before = previous[booking.id];
      if (before && before !== 'completed' && booking.status === 'completed') {
        transitionedToCompletedIds.push(booking.id);
      }
    });

    previousBookingStatusRef.current = current;

    if (!transitionedToCompletedIds.length || reviewModalVisible) return;

    let active = true;

    (async () => {
      try {
        const ids = await loadReviewableBookings();
        if (!active) return;

        const target = bookings.find(
          (booking) => transitionedToCompletedIds.includes(booking.id) && ids.has(booking.id)
        );

        if (target && !reviewModalVisible) {
          openReviewModalForBooking(target);
        }
      } catch (error) {
        console.error('Failed to load reviewable bookings on status transition:', error);
      }
    })();

    return () => {
      active = false;
    };
  }, [bookings, reviewModalVisible]);

  const getTabBookings = () => {
    const filtered = bookings.filter(b => {
      if (activeTab === 'upcoming') return b.status === 'confirmed'|| b.status === 'ongoing';
      if (activeTab === 'completed') return b.status === 'completed';
      if (activeTab === 'cancelled') return b.status === 'cancelled';
      return false;
    });
    return filtered;
  };

  const tabBookings = getTabBookings();

  const handleCancelBooking = (booking: Booking) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel booking ${booking.bookingId}?\n\nYou will receive a refund shortly, and reward points will be deducted.`,
      [
        {
          text: 'Cancel Booking',
          onPress: async () => {
            setCancelling(true);
            try {
              const response = await bookingService.cancelBooking(booking.id, 'Cancelled by passenger');
              
              // Check for ban status from response
              if (response.isBanned && response.banUntil) {
                setRewardNotification({
                  visible: true,
                  type: 'banned',
                  message: `You are temporarily banned from cancelling bookings for ${Math.ceil((new Date(response.banUntil).getTime() - Date.now()) / 60000)} minutes due to consecutive cancellations.`,
                  details: response,
                });
              } else if (response.rewardPoints !== undefined) {
                // Show reward deduction message
                setRewardNotification({
                  visible: true,
                  type: 'cancelled',
                  message: `Booking cancelled. ${response.pointsDeducted || '25 points deducted'}. Remaining points: ${response.rewardPoints}`,
                  details: response,
                });
              }

              updateBooking(booking.id, { status: 'cancelled' });
              setBookingDetailModal(false);
              
              // Show success alert
              Alert.alert(
                'Success',
                response.warning 
                  ? `Your booking has been cancelled.\n\n⚠️ ${response.warning}`
                  : 'Your booking has been cancelled. Refund will be processed soon.'
              );
              
              await fetchBookings(); // Refresh the list
            } catch (err: any) {
              const message = err?.response?.data?.message || 'Failed to cancel booking';
              Alert.alert('Error', message);
            } finally {
              setCancelling(false);
            }
          },
          style: 'destructive',
        },
        { text: 'Keep Booking', style: 'cancel' },
      ]
    );
  };

  const formatTicketLine = (label: string, value?: string | number | boolean | null) => {
    const safeValue = value === undefined || value === null || value === '' ? 'N/A' : String(value);
    return `${label.padEnd(16, ' ')}: ${safeValue}`;
  };

  const getPaymentLabel = (booking: BookingResponse) => {
    if (booking.paymentStatus || booking.payment?.status === 'paid') {
      const method = booking.payment?.method ? ` via ${booking.payment.method}` : '';
      return `PAID${method}`;
    }

    return 'UNPAID';
  };

  const getBookingFare = (booking: BookingResponse) => booking.finalFare || booking.totalFare;

  const buildShareTicketMessage = (
    booking: BookingResponse,
    qrToken?: string,
    qrAttached?: boolean
  ) => {
    const busLabel = booking.busNumber ? `Bus ${booking.busNumber}` : getBusLabel(booking.busId);
    const routeLabel = `${booking.boardingStop.stopName} -> ${booking.destinationStop.stopName}`;
    const generatedAt = new Date().toLocaleString();

    return [
      'HAMRO BUS E-TICKET',
      'Official Boarding Pass',
      '================================',
      formatTicketLine('Booking ID', booking.bookingCode),
      formatTicketLine('Status', booking.status.toUpperCase()),
      formatTicketLine('Bus', busLabel),
      formatTicketLine('Route', routeLabel),
      formatTicketLine('From', booking.boardingStop.stopName),
      formatTicketLine('To', booking.destinationStop.stopName),
      formatTicketLine('Seats', booking.seatNumbers.join(', ')),
      formatTicketLine('Seat Count', booking.seatCount),
      formatTicketLine('Travel Date', formatDate(booking.serviceDate)),
      formatTicketLine('Departure', booking.scheduleStartTime || 'As per schedule'),
      formatTicketLine('Fare', `Rs. ${getBookingFare(booking)}`),
      formatTicketLine('Payment', getPaymentLabel(booking)),
      '--------------------------------',
      'BOARDING VERIFICATION',
      formatTicketLine('Token', booking.bookingCode),
      formatTicketLine('QR Token', qrToken || 'Open ticket in Hamro Bus app'),
      formatTicketLine('QR Image', qrAttached ? 'Included where supported' : 'Available inside Hamro Bus app'),
      '--------------------------------',
      'Show this ticket or scan the QR at boarding.',
      'Valid only for the passenger, route, seats, and travel date shown above.',
      `Generated: ${generatedAt}`,
      '================================',
      'Hamro Bus - Smart bus booking for Nepal',
    ].join('\n');
  };

  const handleShareBookingAPI = async (booking: BookingResponse) => {
    try {
      let qrCodeDataUrl: string | undefined;
      let qrToken: string | undefined;

      // Reuse the existing QR endpoint so shared tickets match the in-app boarding QR.
      try {
        const qrData = await bookingService.getBookingQr(booking.id);
        qrCodeDataUrl = qrData.qrCodeDataUrl || undefined;
        qrToken = qrData.qrToken || undefined;
      } catch (qrErr) {
        console.warn('Share ticket QR unavailable:', qrErr);
      }

      const message = buildShareTicketMessage(booking, qrToken, Boolean(qrCodeDataUrl));

      await Share.share({
        message,
        title: `Hamro Bus Ticket ${booking.bookingCode}`,
        ...(qrCodeDataUrl ? { url: qrCodeDataUrl } : {}),
      });
    } catch (err) {
      console.error('Share error:', err);
      Alert.alert('Share Error', 'Unable to share this booking ticket right now.');
    }
  };

  const handleCancelBookingAPI = (booking: BookingResponse) => {
    handleCancelBooking(mapApiBookingToContext(booking));
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const isUpcoming = booking.status === 'confirmed';
    const isOngoing = booking.status === 'ongoing';
    const isCompleted = booking.status === 'completed';
    const isCancelled = booking.status === 'cancelled';

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => {
          setSelectedBooking(mapContextBookingToResponse(booking));
          setBookingDetailModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingBusNumber}>{getBusLabel(booking.busNumber)}</Text>
            <Text style={styles.bookingRoute} numberOfLines={1}>
              {booking.boardingStop} → {booking.alightingStop}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isUpcoming
                  ? '#dcfce7'
                  : isOngoing
                  ? '#dbeafe'
                  : isCompleted
                  ? '#f3e8ff'
                  : '#fee2e2',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isUpcoming
                    ? '#166534'
                    : isOngoing
                    ? '#1d4ed8'
                    : isCompleted
                    ? '#6b21a8'
                    : '#991b1b',
                },
              ]}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.cardRoute}>
          <View style={styles.routePoint}>
            <View style={styles.routeDot} />
            <Text style={styles.routeStop} numberOfLines={1}>
              {booking.boardingStop}
            </Text>
          </View>
          <View style={styles.routeArrow}>
            <Ionicons name="arrow-forward" size={16} color="#d1d5db" />
          </View>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.routeStop} numberOfLines={1}>
              {booking.alightingStop}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="ticket" size={14} color="#3b82f6" />
            <Text style={styles.footerText} numberOfLines={1}>
              {booking.seatNumber}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="calendar" size={14} color="#3b82f6" />
            <Text style={styles.footerText}>{formatDate(booking.travelDate)}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="pricetag" size={14} color="#3b82f6" />
            <Text style={styles.footerText}>Rs. {booking.price}</Text>
          </View>
          <View
            style={[
              styles.paymentBadge,
              {
                backgroundColor: booking.paymentStatus ? '#dcfce7' : '#fecaca',
              },
            ]}
          >
            <Ionicons
              name={booking.paymentStatus ? 'checkmark-circle' : 'alert-circle'}
              size={14}
              color={booking.paymentStatus ? '#16a34a' : '#dc2626'}
            />
            <Text
              style={[
                styles.paymentBadgeText,
                {
                  color: booking.paymentStatus ? '#16a34a' : '#dc2626',
                },
              ]}
            >
              {booking.paymentStatus ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>

        {isCompleted && reviewableBookingIds.has(booking.id) && (
          <TouchableOpacity
            style={styles.reviewActionButton}
            onPress={() => openReviewModalForBooking(booking)}
          >
            <Ionicons name="star" size={16} color="#ffffff" />
            <Text style={styles.reviewActionButtonText}>Rate Driver</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>Manage your bus bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['upcoming', 'completed', 'cancelled'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
                {
                  color:
                    tab === 'upcoming'
                      ? '#3b82f6'
                      : tab === 'completed'
                      ? '#10b981'
                      : '#ef4444',
                },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {activeTab === tab && (
              <View
                style={[
                  styles.tabIndicator,
                  {
                    backgroundColor:
                      tab === 'upcoming'
                        ? '#3b82f6'
                        : tab === 'completed'
                        ? '#10b981'
                        : '#ef4444',
                  },
                ]}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Bookings List */}
      {loading && bookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : error && bookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {tabBookings.length > 0 ? (
            <View style={styles.bookingsList}>
              {tabBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={
                  activeTab === 'upcoming'
                    ? 'calendar-outline'
                    : activeTab === 'completed'
                    ? 'checkmark-circle-outline'
                    : 'close-circle-outline'
                }
                size={48}
                color="#d1d5db"
              />
              <Text style={styles.emptyStateTitle}>No {activeTab} bookings</Text>
              <Text style={styles.emptyStateText}>
                {activeTab === 'upcoming'
                  ? 'Book your first bus ticket now!'
                  : activeTab === 'completed'
                  ? 'Your completed trips will appear here'
                  : 'No cancelled bookings'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={reviewModalVisible} transparent animationType="slide" onRequestClose={closeReviewModal}>
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalCard}>
            <Text style={styles.reviewModalTitle}>Trip Completed</Text>
            <Text style={styles.reviewModalSubtitle}>
              Rate your driver now or skip and review later from completed bookings.
            </Text>

            {reviewTargetBooking && (
              <View style={styles.reviewTripMeta}>
                <Text style={styles.reviewTripMetaText}>
                  {reviewTargetBooking.boardingStop} to {reviewTargetBooking.alightingStop}
                </Text>
                <Text style={styles.reviewTripMetaSubText}>Booking {reviewTargetBooking.bookingId}</Text>
              </View>
            )}

            <View style={styles.reviewStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  style={styles.reviewStarButton}
                >
                  <Ionicons
                    name={star <= reviewRating ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= reviewRating ? '#f59e0b' : '#d1d5db'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              style={styles.reviewCommentInput}
              placeholder="Optional comment"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />

            <View style={styles.reviewModalActions}>
              <TouchableOpacity
                style={styles.reviewSkipButton}
                onPress={closeReviewModal}
                disabled={reviewSubmitting}
              >
                <Text style={styles.reviewSkipButtonText}>Skip for now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reviewSubmitButton}
                onPress={submitReview}
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.reviewSubmitButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BookingDetailModal
        visible={bookingDetailModal}
        booking={selectedBooking}
        cancelling={cancelling}
        onClose={() => setBookingDetailModal(false)}
        onShare={handleShareBookingAPI}
        onCancel={handleCancelBookingAPI}
      />

      {/* Reward Notification Modal */}
      <Modal
        visible={rewardNotification?.visible || false}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRewardNotification(null)}
      >
        <TouchableOpacity
          style={styles.rewardNotificationOverlay}
          activeOpacity={1}
          onPress={() => setRewardNotification(null)}
        >
          <View style={[
            styles.rewardNotificationCard,
            {
              borderTopColor: rewardNotification?.type === 'banned' ? '#ef4444' : rewardNotification?.type === 'cancelled' ? '#f59e0b' : '#10b981'
            }
          ]}>
            <View style={styles.rewardNotificationHeader}>
              <Ionicons
                name={rewardNotification?.type === 'banned' ? 'alert-circle' : rewardNotification?.type === 'cancelled' ? 'alert' : 'checkmark-circle'}
                size={32}
                color={rewardNotification?.type === 'banned' ? '#ef4444' : rewardNotification?.type === 'cancelled' ? '#f59e0b' : '#10b981'}
              />
              <Text style={[
                styles.rewardNotificationTitle,
                {
                  color: rewardNotification?.type === 'banned' ? '#dc2626' : rewardNotification?.type === 'cancelled' ? '#d97706' : '#059669'
                }
              ]}>
                {rewardNotification?.type === 'banned' ? 'Booking Banned' : rewardNotification?.type === 'cancelled' ? 'Reward Points Deducted' : 'Reward Earned'}
              </Text>
            </View>
            <Text style={styles.rewardNotificationMessage}>{rewardNotification?.message}</Text>
            {rewardNotification?.details?.rewardPoints !== undefined && (
              <View style={styles.rewardNotificationDetails}>
                <Text style={styles.rewardNotificationDetailLabel}>Remaining Points:</Text>
                <Text style={styles.rewardNotificationDetailValue}>{rewardNotification.details.rewardPoints}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.rewardNotificationButton}
              onPress={() => setRewardNotification(null)}
            >
              <Text style={styles.rewardNotificationButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#d1d5db',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  tabIndicator: {
    height: 2,
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  bookingsList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bookingBusNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  bookingRoute: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 85,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  routeStop: {
    fontSize: 12,
    color: '#4b5563',
    flex: 1,
  },
  routeArrow: {
    marginHorizontal: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: '#6b7280',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  detailsSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailRow_last: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  detailLabelBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
    flex: 1.5,
  },
  detailValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
    textAlign: 'right',
    flex: 1.5,
  },
  priceRow: {
    borderBottomWidth: 0,
    paddingVertical: 10,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tokenSection: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  tokenSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  tokenBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 8,
    alignItems: 'center',
  },
  tokenValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  tokenNote: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  qrSection: {
    marginTop: 4,
    marginBottom: 20,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
},
qrTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: '#1f2937',
  marginBottom: 8,
},
qrImage: {
  width: 220,
  height: 220,
  borderRadius: 8,
  backgroundColor: '#ffffff',
},
qrError: {
  color: '#b91c1c',
  fontSize: 13,
  textAlign: 'center',
  paddingHorizontal: 12,
},
qrHint: {
  color: '#6b7280',
  fontSize: 13,
},
  reviewActionButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  reviewActionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  reviewModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  reviewModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  reviewModalSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },
  reviewTripMeta: {
    marginTop: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 10,
  },
  reviewTripMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  reviewTripMetaSubText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  reviewStarsRow: {
    marginTop: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  reviewStarButton: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 100,
    color: '#111827',
    fontSize: 13,
    marginTop: 8,
  },
  reviewModalActions: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  reviewSkipButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  reviewSkipButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13,
  },
  reviewSubmitButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#2563eb',
  },
  reviewSubmitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  // Reward Notification Styles
  rewardNotificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  rewardNotificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderTopWidth: 4,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  rewardNotificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardNotificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  rewardNotificationMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  rewardNotificationDetails: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardNotificationDetailLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  rewardNotificationDetailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  rewardNotificationButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardNotificationButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default MyBookings;
