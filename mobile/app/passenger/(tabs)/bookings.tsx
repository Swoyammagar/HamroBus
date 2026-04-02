import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { usePassenger, type Booking } from '../context/PassengerContext';
import { bookingService, type BookingResponse } from '../services/bookingService';
import { formatDate } from '../utils/helpers';

const MyBookings = () => {
  const { bookings, updateBooking, setBookings } = usePassenger();
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [bookingDetailModal, setBookingDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

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
    if (typeof busRef === 'object') {
      const busRecord = busRef as { _id?: string; id?: string; busNumber?: string };
      if (busRecord.busNumber) return `Bus ${busRecord.busNumber}`;
      const objectId = String(busRecord._id || busRecord.id || '');
      return objectId ? `Bus #${objectId.substring(0, 8)}` : 'Bus';
    }
    const id = String(busRef);
    return id ? `Bus #${id.substring(0, 8)}` : 'Bus';
  };

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
      
      // Map API response to Booking type for context
      const mappedBookings: Booking[] = data.map((b: BookingResponse) => ({
        id: String(b.id),
        bookingId: b.bookingCode,
        passengerId: b.passengerId,
        busId: normalizeEntityId(b.busId),
        routeId: normalizeEntityId(b.routeId),
        token: b.bookingCode,
        seatNumber: (b.seatNumbers || []).join(', '),
        price: b.totalFare,
        paymentStatus: Boolean(b.paymentStatus || b.payment?.status === 'paid'),
        bookingDate: b.createdAt,
        travelDate: b.serviceDate,
        status: b.status as 'confirmed' | 'ongoing' | 'completed' | 'cancelled',
        boardingStop: b.boardingStop?.stopName || '',
        alightingStop: b.destinationStop?.stopName || '',
        tripStarted: b.status === 'in-progress' || b.status === 'completed',
        tripEnded: b.status === 'completed',
      }));

      if (setBookings) {
        setBookings(mappedBookings);
      }
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

  const getTabBookings = () => {
    const filtered = bookings.filter(b => {
      if (activeTab === 'upcoming') return b.status === 'confirmed';
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
      `Are you sure you want to cancel booking ${booking.bookingId}?\n\nYou will receive a refund shortly.`,
      [
        {
          text: 'Cancel Booking',
          onPress: async () => {
            setCancelling(true);
            try {
              await bookingService.cancelBooking(booking.id, 'Cancelled by passenger');
              updateBooking(booking.id, { status: 'cancelled' });
              setBookingDetailModal(false);
              Alert.alert('Success', 'Your booking has been cancelled. Refund will be processed soon.');
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

  const handleShareBooking = async (booking: Booking & { scheduleStartTime?: string; scheduleEndTime?: string }) => {
    try {
      const message = `🎫 My Bus Booking\n\nBooking ID: ${booking.bookingId}\nToken: ${booking.token}\n\nBus: ${booking.busId}\nFrom: ${booking.boardingStop}\nTo: ${booking.alightingStop}\nSeats: ${booking.seatNumber}\n\nDate: ${formatDate(booking.travelDate)}\nPrice: Rs. ${booking.price}\n\nShow this token to the driver while boarding.`;

      await Share.share({
        message,
        title: 'My Bus Booking Ticket',
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleShareBookingAPI = async (booking: BookingResponse) => {
    try {
      const busLabel = getBusLabel(booking.busId);
      const message = `🎫 My Bus Booking\n\nBooking ID: ${booking.bookingCode}\nToken: ${booking.bookingCode}\n\n${busLabel}\nFrom: ${booking.boardingStop.stopName}\nTo: ${booking.destinationStop.stopName}\nSeats: ${booking.seatNumbers.join(', ')}\n\nDate: ${formatDate(booking.serviceDate)}\nPrice: Rs. ${booking.totalFare}\n\nShow this token to the driver while boarding.`;

      await Share.share({
        message,
        title: 'My Bus Booking Ticket',
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const isUpcoming = booking.status === 'confirmed';
    const isCompleted = booking.status === 'completed';
    const isCancelled = booking.status === 'cancelled';

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => {
          setSelectedBooking({
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
            farePerSeat: Math.floor(booking.price / booking.seatNumber.split(', ').length),
            totalFare: booking.price,
            status: booking.status as any,
            createdAt: booking.bookingDate,
            updatedAt: booking.bookingDate,
          } as BookingResponse);
          setBookingDetailModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingBusNumber}>{getBusLabel(booking.busId)}</Text>
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
        </View>
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

      {/* Booking Detail Modal */}
      <Modal visible={bookingDetailModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setBookingDetailModal(false)}
            >
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>

            {selectedBooking && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.modalTitle}>Booking Details</Text>

                {/* Booking Header */}
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Booking ID</Text>
                    <Text style={styles.detailValue} selectable>
                      {selectedBooking.bookingCode}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            selectedBooking.status === 'confirmed'
                              ? '#dcfce7'
                              : selectedBooking.status === 'completed'
                              ? '#f3e8ff'
                              : '#fee2e2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              selectedBooking.status === 'confirmed'
                                ? '#166534'
                                : selectedBooking.status === 'completed'
                                ? '#6b21a8'
                                : '#991b1b',
                          },
                        ]}
                      >
                        {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Route Info */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Journey Details</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From</Text>
                    <Text style={styles.detailValue}>{selectedBooking.boardingStop.stopName}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To</Text>
                    <Text style={styles.detailValue}>{selectedBooking.destinationStop.stopName}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Travel Date</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedBooking.serviceDate)}</Text>
                  </View>
                </View>

                {/* Seat & Price Info */}
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Seats</Text>
                    <Text style={styles.detailValue}>{selectedBooking.seatNumbers.join(', ')}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Price per Seat</Text>
                    <Text style={styles.detailValue}>Rs. {selectedBooking.farePerSeat}</Text>
                  </View>

                  <View style={[styles.detailRow, styles.priceRow]}>
                    <Text style={styles.detailLabelBold}>Total Price</Text>
                    <Text style={styles.detailValueBold}>Rs. {selectedBooking.totalFare}</Text>
                  </View>
                </View>

                {/* Token Section */}
                <View style={styles.tokenSection}>
                  <Text style={styles.tokenSectionTitle}>Your Booking Token</Text>
                  <View style={styles.tokenBox}>
                    <Text style={styles.tokenValue} selectable>
                      {selectedBooking.bookingCode}
                    </Text>
                  </View>
                  <Text style={styles.tokenNote}>
                    Show this token to the driver when boarding the bus
                  </Text>
                </View>

                {/* Action Buttons */}
                {selectedBooking.status === 'confirmed' && (
                  <>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleShareBookingAPI(selectedBooking)}
                    >
                      <Ionicons name="share-social" size={18} color="#ffffff" />
                      <Text style={styles.actionButtonText}>Share Booking</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleCancelBooking({
                        id: selectedBooking.id,
                        bookingId: selectedBooking.bookingCode,
                        passengerId: selectedBooking.passengerId,
                        busId: selectedBooking.busId,
                        routeId: selectedBooking.routeId,
                        token: selectedBooking.bookingCode,
                        seatNumber: selectedBooking.seatNumbers.join(', '),
                        price: selectedBooking.totalFare,
                        bookingDate: selectedBooking.createdAt,
                        travelDate: selectedBooking.serviceDate,
                        status: 'confirmed',
                        boardingStop: selectedBooking.boardingStop.stopName,
                        alightingStop: selectedBooking.destinationStop.stopName,
                        tripStarted: false,
                        tripEnded: false,
                      })}
                      disabled={cancelling}
                    >
                      {cancelling ? (
                        <ActivityIndicator color="#ef4444" size="small" />
                      ) : (
                        <>
                          <Ionicons name="close-circle" size={18} color="#ef4444" />
                          <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {selectedBooking.status === 'completed' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleShareBookingAPI(selectedBooking)}
                  >
                    <Ionicons name="share-social" size={18} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Share Receipt</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
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
});

export default MyBookings;
