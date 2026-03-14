import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { usePassenger, type Booking } from '../context/PassengerContext';
import { mockBusesData, mockRoutesData } from '../utils/mockData';
import {
  formatTime,
  formatDate,
  calculateCrowdPercentage,
  getCrowdLevel,
} from '../utils/helpers';

const MyBookings = () => {
  const router = useRouter();
  const { bookings, updateBooking } = usePassenger();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingDetailModal, setBookingDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const [loading, setLoading] = useState(false);

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && !b.tripEnded);
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');

  const handleStartTrip = (booking: Booking) => {
    Alert.alert(
      'Start Trip',
      `Start your journey on ${mockBusesData.find(b => b.id === booking.busId)?.busNumber}?`,
      [
        {
          text: 'Start',
          onPress: async () => {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            updateBooking(booking.id, { tripStarted: true, status: 'ongoing' });
            setLoading(false);
            setBookingDetailModal(false);
            Alert.alert('Success', 'Your trip has started. Have a safe journey!');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleEndTrip = (booking: Booking) => {
    Alert.alert('End Trip', 'Mark your trip as complete?', [
      {
        text: 'Yes, Complete',
        onPress: async () => {
          setLoading(true);
          await new Promise(resolve => setTimeout(resolve, 500));
          updateBooking(booking.id, { tripEnded: true, status: 'completed' });
          setLoading(false);
          setBookingDetailModal(false);
          Alert.alert('Trip Complete', 'Would you like to leave a review?', [
            {
              text: 'Leave Review',
              onPress: () => {
                router.push({
                  pathname: '../screens/review',
                  params: { bookingId: booking.id },
                });
              },
            },
            { text: 'Later', style: 'cancel' },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleCancelBooking = (booking: Booking) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel booking ${booking.bookingId}?`,
      [
        {
          text: 'Cancel Booking',
          onPress: async () => {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));
            updateBooking(booking.id, { status: 'cancelled' });
            setLoading(false);
            setBookingDetailModal(false);
            Alert.alert('Success', 'Your booking has been cancelled');
          },
          style: 'destructive',
        },
        { text: 'Keep Booking', style: 'cancel' },
      ]
    );
  };

  const BookingCard = ({ booking, onPress }: { booking: Booking; onPress: () => void }) => {
    const bus = mockBusesData.find(b => b.id === booking.busId);
    const route = mockRoutesData.find(r => r.id === booking.routeId);
    const boardingStop = route?.stops.find(s => s.id === booking.boardingStop);
    const alightingStop = route?.stops.find(s => s.id === booking.alightingStop);

    return (
      <TouchableOpacity style={styles.bookingCard} onPress={onPress}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.bookingBusNumber}>{bus?.busNumber}</Text>
            <Text style={styles.bookingRoute}>{route?.name}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  booking.status === 'confirmed'
                    ? '#dcfce7'
                    : booking.status === 'ongoing'
                    ? '#dbeafe'
                    : booking.status === 'completed'
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
                    booking.status === 'confirmed'
                      ? '#166534'
                      : booking.status === 'ongoing'
                      ? '#1e40af'
                      : booking.status === 'completed'
                      ? '#6b21a8'
                      : '#991b1b',
                },
              ]}
            >
              {booking.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardRoute}>
          <View style={styles.routePoint}>
            <View style={styles.routeDot} />
            <Text style={styles.routeStop}>{boardingStop?.name}</Text>
          </View>
          <View style={styles.routeArrow}>
            <Ionicons name="arrow-forward" size={16} color="#d1d5db" />
          </View>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.routeStop}>{alightingStop?.name}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="ticket" size={14} color="#3b82f6" />
            <Text style={styles.footerText}>{booking.seatNumber}</Text>
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

  const getTabBookings = () => {
    switch (activeTab) {
      case 'upcoming':
        return upcomingBookings;
      case 'completed':
        return completedBookings;
      case 'cancelled':
        return cancelledBookings;
      default:
        return [];
    }
  };

  const tabBookings = getTabBookings();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>Manage your bus bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['upcoming', 'completed', 'cancelled'] as const).map(tab => (
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
            {(activeTab === tab) && (
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {tabBookings.length > 0 ? (
          <View style={styles.bookingsList}>
            {tabBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onPress={() => {
                  setSelectedBooking(booking);
                  setBookingDetailModal(true);
                }}
              />
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
            <Text style={styles.emptyStateTitle}>
              No {activeTab} bookings
            </Text>
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
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Booking Details</Text>

                {/* Booking Header */}
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Booking ID</Text>
                    <Text style={styles.detailValue}>{selectedBooking.bookingId}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Token</Text>
                    <Text style={[styles.detailValue, { fontFamily: 'monospace', fontSize: 16 }]}>
                      {selectedBooking.token}
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
                              : selectedBooking.status === 'ongoing'
                              ? '#dbeafe'
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
                                : selectedBooking.status === 'ongoing'
                                ? '#1e40af'
                                : selectedBooking.status === 'completed'
                                ? '#6b21a8'
                                : '#991b1b',
                          },
                        ]}
                      >
                        {selectedBooking.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Bus & Route Info */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Bus Information</Text>

                  {mockBusesData
                    .filter(b => b.id === selectedBooking.busId)
                    .map(bus => (
                      <View key={bus.id}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Bus Number</Text>
                          <Text style={styles.detailValue}>{bus.busNumber}</Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Driver</Text>
                          <Text style={styles.detailValue}>{bus.driverName}</Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Occupancy</Text>
                          <Text style={styles.detailValue}>
                            {bus.currentPassengers}/{bus.totalCapacity} ({calculateCrowdPercentage(bus)}%)
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>

                {/* Route Info */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Route Information</Text>

                  {mockRoutesData
                    .filter(r => r.id === selectedBooking.routeId)
                    .flatMap(r =>
                      r.stops
                        .filter(
                          s =>
                            s.id === selectedBooking.boardingStop ||
                            s.id === selectedBooking.alightingStop
                        )
                        .map(s => (
                          <View key={s.id}>
                            {s.id === selectedBooking.boardingStop && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Boarding Stop</Text>
                                <View>
                                  <Text style={styles.detailValue}>{s.name}</Text>
                                  <Text style={styles.detailTime}>
                                    {formatTime(s.estimatedArrival || new Date().toISOString())}
                                  </Text>
                                </View>
                              </View>
                            )}

                            {s.id === selectedBooking.alightingStop && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Alighting Stop</Text>
                                <View>
                                  <Text style={styles.detailValue}>{s.name}</Text>
                                  <Text style={styles.detailTime}>
                                    {formatTime(s.estimatedArrival || new Date().toISOString())}
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        ))
                    )}
                </View>

                {/* Seat & Price Info */}
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Seat Number</Text>
                    <Text style={styles.detailValue}>{selectedBooking.seatNumber}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Travel Date</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedBooking.travelDate)}</Text>
                  </View>

                  <View style={[styles.detailRow, styles.priceRow]}>
                    <Text style={styles.detailLabelBold}>Total Price</Text>
                    <Text style={styles.detailValueBold}>Rs. {selectedBooking.price}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                {selectedBooking.status === 'confirmed' && (
                  <>
                    {!selectedBooking.tripStarted && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleStartTrip(selectedBooking)}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="play-circle" size={18} color="#ffffff" />
                            <Text style={styles.actionButtonText}>Start Trip</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {selectedBooking.status === 'ongoing' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEndTrip(selectedBooking)}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="stop-circle" size={18} color="#ffffff" />
                        <Text style={styles.actionButtonText}>End Trip</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {selectedBooking.status === 'completed' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setBookingDetailModal(false);
                      router.push({
                        pathname: '../screens/review',
                        params: { bookingId: selectedBooking.id },
                      });
                    }}
                  >
                    <Ionicons name="star" size={18} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Leave Review</Text>
                  </TouchableOpacity>
                )}

                {selectedBooking.status === 'confirmed' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleCancelBooking(selectedBooking)}
                    disabled={loading}
                  >
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                    <Text style={styles.cancelButtonText}>Cancel Booking</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.tokenSection}>
                  <Text style={styles.tokenSectionTitle}>Your Booking Token</Text>
                  <View style={styles.tokenBox}>
                    <Text style={styles.tokenValue}>{selectedBooking.token}</Text>
                  </View>
                  <Text style={styles.tokenNote}>
                    Show this token to the driver when boarding the bus
                  </Text>
                </View>
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
    fontSize: 14,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#1f2937',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bookingsList: {
    marginBottom: 20,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingBusNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  bookingRoute: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  routeStop: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  routeArrow: {
    marginHorizontal: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
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
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginVertical: 8,
    marginBottom: 16,
  },
  detailsSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailLabelBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  detailValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  detailTime: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  priceRow: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
    borderWidth: 1,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  tokenSection: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  tokenSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  tokenBox: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  tokenValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'monospace',
    letterSpacing: 2,
    textAlign: 'center',
  },
  tokenNote: {
    fontSize: 11,
    color: '#9ca3af',
  },
});

export default MyBookings;
