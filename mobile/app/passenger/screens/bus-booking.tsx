import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePassenger, type Bus, type Route, type Stop, type Booking } from '../context/PassengerContext';
import { mockBusesData, mockRoutesData } from '../utils/mockData';
import { routeService, type Schedule } from '../services/routeService';
import { bookingService, type SeatAvailabilityResponse } from '../services/bookingService';
import {
  formatTime,
  formatDate,
} from '../utils/helpers';

const BusBooking = () => {
  const router = useRouter();
  const { busId, routeId } = useLocalSearchParams();
  const { routes, selectedRoute, selectedBus, buses, addBooking } = usePassenger();

  const [bus, setBus] = useState<Bus | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [selectedBoardingStop, setSelectedBoardingStop] = useState<Stop | null>(null);
  const [selectedAlightingStop, setSelectedAlightingStop] = useState<Stop | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [boardingModalOpen, setBoardingModalOpen] = useState(false);
  const [alightingModalOpen, setAlightingModalOpen] = useState(false);
  const [seatsModalOpen, setSeatsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [generatedBooking, setGeneratedBooking] = useState<Booking | null>(null);
  const [resolutionAttempted, setResolutionAttempted] = useState(false);
  // Schedule & availability state
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [serviceDate, setServiceDate] = useState<string>('');
  const [availabilityData, setAvailabilityData] = useState<SeatAvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  useEffect(() => {
    const busIdValue = Array.isArray(busId) ? busId[0] : busId;
    const routeIdValue = Array.isArray(routeId) ? routeId[0] : routeId;

    const busFromContext = [selectedBus, ...buses].find(candidate => {
      if (!candidate) return false;
      const candidateId = candidate._id || candidate.id;
      return busIdValue ? String(candidateId) === String(busIdValue) : true;
    });

    const busFromMock = mockBusesData.find(candidate => {
      const candidateId = candidate._id || candidate.id;
      return busIdValue ? String(candidateId) === String(busIdValue) : false;
    });

    const resolvedBus = busFromContext || busFromMock || null;

    const routeFromContext = [selectedRoute, ...routes].find(candidate => {
      if (!candidate) return false;
      const candidateId = candidate._id || candidate.id;
      return routeIdValue ? String(candidateId) === String(routeIdValue) : true;
    });

    const routeByResolvedBus = resolvedBus
      ? [selectedRoute, ...routes].find(candidate => {
          if (!candidate) return false;
          const candidateId = candidate._id || candidate.id;
          return String(candidateId) === String(resolvedBus.routeId);
        })
      : null;

    const routeFromMock = mockRoutesData.find(candidate => {
      const candidateId = candidate._id || candidate.id;
      if (routeIdValue) {
        return String(candidateId) === String(routeIdValue);
      }
      return resolvedBus ? String(candidateId) === String(resolvedBus.routeId) : false;
    });

    const resolvedRoute = routeFromContext || routeByResolvedBus || routeFromMock || null;

    setBus(resolvedBus);
    setRoute(resolvedRoute);
    if (resolvedRoute?.stops?.length) {
      setSelectedBoardingStop(resolvedRoute.stops[0]);
    }
    setResolutionAttempted(true);
  }, [busId, routeId, selectedBus, buses, selectedRoute, routes]);

  // Helper: get next occurrence of a weekday as "YYYY-MM-DD"
  const getNextOccurrenceOfDay = (dayName: string): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(dayName);
    if (targetDay < 0) return new Date().toISOString().split('T')[0];
    const today = new Date();
    const todayDay = today.getDay();
    const daysUntil = (targetDay - todayDay + 7) % 7;
    const result = new Date(today);
    result.setDate(result.getDate() + daysUntil);
    return result.toISOString().split('T')[0];
  };

  // Load schedules for the resolved route, filtered to the current bus
  useEffect(() => {
    if (!route) return;
    const rid = String(route._id || route.id || '');
    if (!rid) return;
    setSchedulesLoading(true);
    routeService
      .getSchedulesByRoute(rid)
      .then((data) => {
        const busIdVal = String(bus?._id || bus?.id || '');
        const filtered = data.filter((s) => {
          const sBusId = String(
            s.busId && typeof s.busId === 'object' ? (s.busId._id || '') : (s.busId || '')
          );
          return !busIdVal || sBusId === busIdVal;
        });
        setSchedules(filtered);
        setSelectedSchedule((prev) => {
          if (!prev) return null;
          const stillExists = filtered.some((sched) => sched._id === prev._id);
          return stillExists ? prev : null;
        });
      })
      .catch(() => setSchedules([]))
      .finally(() => setSchedulesLoading(false));
  }, [route, bus]);

  // Derive service date when schedule is selected
  useEffect(() => {
    if (!selectedSchedule) return;
    setServiceDate(getNextOccurrenceOfDay(selectedSchedule.dayOfWeek));
    // Clear seats when schedule changes so stale selections are removed
    setSelectedSeats([]);
    setAvailabilityData(null);
  }, [selectedSchedule]);

  // Fetch real seat availability whenever schedule + bus + route + serviceDate are ready
  useEffect(() => {
    if (!selectedSchedule || !route || !bus || !serviceDate) return;
    const rid = String(route._id || route.id || '');
    const bid = String(bus._id || bus.id || '');
    const sid = String(selectedSchedule._id || '');
    if (!rid || !bid || !sid) return;

    setAvailabilityLoading(true);
    bookingService
      .checkSeatAvailability({ routeId: rid, busId: bid, scheduleId: sid, serviceDate })
      .then((data) => setAvailabilityData(data))
      .catch(() => setAvailabilityData(null))
      .finally(() => setAvailabilityLoading(false));
  }, [selectedSchedule, route, bus, serviceDate]);

  const bookingPrice = route?.fareInfo ?? 150;

  const generateSeatsGrid = () => {
    const totalSeats = availabilityData?.totalSeats || bus?.totalCapacity || bus?.capacity || 50;
    const seatsPerRow = 4;
    const seats = [];

    for (let i = 1; i <= totalSeats; i++) {
      const label = `${String.fromCharCode(65 + Math.floor((i - 1) / seatsPerRow))}${
        ((i - 1) % seatsPerRow) + 1
      }`;
      const isTaken = availabilityData
        ? availabilityData.takenSeats.includes(label)
        : false;
      seats.push({
        id: label,
        number: label,
        available: !isTaken,
      });
    }

    return seats;
  };

  const handleSeatToggle = (seatLabel: string) => {
    if (selectedSeats.includes(seatLabel)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatLabel));
    } else {
      if (selectedSeats.length < 4) {
        setSelectedSeats([...selectedSeats, seatLabel]);
      } else {
        Alert.alert('Limit Reached', 'You can book maximum 4 seats per booking');
      }
    }
  };

  const handleCompleteBooking = async () => {
    if (!selectedSchedule) {
      Alert.alert('Missing Schedule', 'Please select a schedule before booking');
      return;
    }
    if (!selectedBoardingStop || !selectedAlightingStop || selectedSeats.length === 0) {
      Alert.alert('Incomplete', 'Please select boarding stop, alighting stop, and seats');
      return;
    }
    if ((selectedBoardingStop.order ?? 0) >= (selectedAlightingStop.order ?? 0)) {
      Alert.alert('Invalid Route', 'Alighting stop must be after boarding stop');
      return;
    }

    setLoading(true);

    try {
      const result = await bookingService.createBooking({
        routeId: String(route!._id || route!.id || ''),
        busId: String(bus!._id || bus!.id || ''),
        scheduleId: String(selectedSchedule._id || ''),
        serviceDate,
        boardingStopName: selectedBoardingStop.name,
        destinationStopName: selectedAlightingStop.name,
        seatCount: selectedSeats.length,
        preferredSeatNumbers: selectedSeats,
      });

      const newBooking: Booking = {
        id: String(result.id),
        bookingId: result.bookingCode,
        passengerId: String(result.passengerId),
        busId: String(result.busId),
        routeId: String(result.routeId),
        token: result.bookingCode,
        seatNumber: (result.seatNumbers || []).join(', '),
        price: result.totalFare,
        bookingDate: result.createdAt,
        travelDate: result.serviceDate,
        status: 'confirmed',
        boardingStop: result.boardingStop?.stopName || selectedBoardingStop.name,
        alightingStop: result.destinationStop?.stopName || selectedAlightingStop.name,
        tripStarted: false,
        tripEnded: false,
      };

      addBooking(newBooking);
      setGeneratedBooking(newBooking);
      setBookingComplete(true);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to complete booking. Please try again.';
      Alert.alert('Booking Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTicket = async () => {
    Alert.alert('Success', 'Ticket will be downloaded as PDF');
    // In a real app, you would generate a PDF here
  };

  const handleViewTicket = () => {
    Alert.alert('Ticket', generatedBooking?.token, [
      {
        text: 'Download',
        onPress: handleDownloadTicket,
      },
      { text: 'Close', style: 'cancel' },
    ]);
  };

  if (!bus || !route) {
    return (
      <View style={styles.centerContainer}>
        {resolutionAttempted ? (
          <>
            <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
            <Text style={styles.errorTitle}>Unable to load booking details</Text>
            <Text style={styles.errorText}>Please go back and select the bus again.</Text>
            <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color="#3b82f6" />
        )}
      </View>
    );
  }

  if (bookingComplete && generatedBooking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('../(tabs)/bookings')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Confirmed!</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            </View>

            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSubtitle}>Your seats have been reserved</Text>

            <View style={styles.ticketBox}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketBusNumber}>{bus.busNumber}</Text>
                <Text style={styles.ticketRoute}>{route.name}</Text>
              </View>

              <View style={styles.ticketDivider} />

              <View style={styles.ticketDetails}>
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Booking ID</Text>
                  <Text style={styles.ticketValue}>{generatedBooking.bookingId}</Text>
                </View>

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Token</Text>
                  <Text style={[styles.ticketValue, { fontFamily: 'monospace', fontSize: 18 }]}>
                    {generatedBooking.token}
                  </Text>
                </View>

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>From</Text>
                  <Text style={styles.ticketValue}>
                    {generatedBooking.boardingStop || selectedBoardingStop?.name}
                  </Text>
                </View>

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>To</Text>
                  <Text style={styles.ticketValue}>
                    {generatedBooking.alightingStop || selectedAlightingStop?.name}
                  </Text>
                </View>

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Seats</Text>
                  <Text style={styles.ticketValue}>{generatedBooking.seatNumber}</Text>
                </View>

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabel}>Travel Date</Text>
                  <Text style={styles.ticketValue}>{formatDate(generatedBooking.travelDate)}</Text>
                </View>

                <View style={styles.ticketDivider} />

                <View style={styles.ticketRow}>
                  <Text style={styles.ticketLabelBold}>Total Price</Text>
                  <Text style={[styles.ticketValue, styles.priceText]}>
                    Rs. {generatedBooking.price}
                  </Text>
                </View>
              </View>

              <View style={styles.tokenBox}>
                <Text style={styles.tokenLabel}>Booking Token</Text>
                <Text style={styles.tokenValue}>{generatedBooking.token}</Text>
                <Text style={styles.tokenNote}>Present this code to the driver</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadTicket}>
              <Ionicons name="download" size={20} color="#ffffff" />
              <Text style={styles.downloadButtonText}>Download Ticket (PDF)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={handleViewTicket}>
              <Ionicons name="share-social" size={20} color="#3b82f6" />
              <Text style={styles.shareButtonText}>Share Ticket</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const seats = generateSeatsGrid();
  const seatsPerRow = 4;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Book a Ticket</Text>
          <Text style={styles.headerSubtitle}>{bus.busNumber} • {route.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Schedule Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Schedule</Text>

          {schedulesLoading ? (
            <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 8 }} />
          ) : schedules.length === 0 ? (
            <Text style={styles.noScheduleText}>No schedules found for this bus.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scheduleList}
            >
              {schedules.map((sched) => {
                const isSelected = selectedSchedule?._id === sched._id;
                return (
                  <TouchableOpacity
                    key={sched._id}
                    style={[styles.scheduleChip, isSelected && styles.scheduleChipSelected]}
                    onPress={() => setSelectedSchedule(sched)}
                  >
                    <Text style={[styles.scheduleChipDay, isSelected && styles.scheduleChipTextSelected]}>
                      {sched.dayOfWeek}
                    </Text>
                    <Text style={[styles.scheduleChipTime, isSelected && styles.scheduleChipTextSelected]}>
                      {sched.startTime} – {sched.endTime}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {selectedSchedule && (
            <View style={styles.selectedScheduleInfo}>
              <Ionicons name="calendar-outline" size={14} color="#3b82f6" />
              <Text style={styles.selectedScheduleText}>
                Travel date: {serviceDate}
              </Text>
            </View>
          )}
        </View>

        {/* Route Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Information</Text>

          <TouchableOpacity
            style={styles.stopSelector}
            onPress={() => setBoardingModalOpen(true)}
          >
            <View style={styles.stopSelectorLeft}>
              <Ionicons name="location" size={24} color="#3b82f6" />
              <View style={styles.stopSelectorContent}>
                <Text style={styles.stopSelectorLabel}>Boarding Stop</Text>
                <Text style={styles.stopSelectorValue}>
                  {selectedBoardingStop?.name || 'Select stop'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
          </TouchableOpacity>

          <View style={styles.routeArrow}>
            <Ionicons name="arrow-down" size={24} color="#9ca3af" />
          </View>

          <TouchableOpacity
            style={styles.stopSelector}
            onPress={() => setAlightingModalOpen(true)}
          >
            <View style={styles.stopSelectorLeft}>
              <Ionicons name="location" size={24} color="#ef4444" />
              <View style={styles.stopSelectorContent}>
                <Text style={styles.stopSelectorLabel}>Alighting Stop</Text>
                <Text style={styles.stopSelectorValue}>
                  {selectedAlightingStop?.name || 'Select stop'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Seat Selection */}
        <View style={styles.section}>
          <View style={styles.seatsHeader}>
            <Text style={styles.sectionTitle}>Select Seats</Text>
            <Text style={styles.seatsCount}>
              {selectedSeats.length}/4 Selected •{' '}
              {availabilityData ? availabilityData.availableSeatCount : '—'} Available
            </Text>
          </View>

          {!selectedSchedule ? (
            <Text style={styles.noScheduleText}>Select a schedule above to see seat availability.</Text>
          ) : availabilityLoading ? (
            <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.seatsGrid}>
              {Array.from({ length: Math.ceil(seats.length / seatsPerRow) }).map((_, rowIndex) => (
                <View key={rowIndex} style={styles.seatsRow}>
                  {seats.slice(rowIndex * seatsPerRow, (rowIndex + 1) * seatsPerRow).map(seat => (
                    <TouchableOpacity
                      key={seat.id}
                      style={[
                        styles.seat,
                        !seat.available && styles.seatUnavailable,
                        selectedSeats.includes(seat.id) && styles.seatSelected,
                      ]}
                      onPress={() => seat.available && handleSeatToggle(seat.id)}
                      disabled={!seat.available}
                    >
                      <Text
                        style={[
                          styles.seatText,
                          selectedSeats.includes(seat.id) && styles.seatTextSelected,
                        ]}
                      >
                        {seat.number}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}

          <View style={styles.seatsLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#e5e7eb' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
              <Text style={styles.legendText}>Booked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Summary</Text>

          <View style={styles.priceSummary}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {selectedSeats.length} Seat{selectedSeats.length !== 1 ? 's' : ''} × Rs.{' '}
                {bookingPrice}
              </Text>
              <Text style={styles.priceValue}>Rs. {bookingPrice * selectedSeats.length}</Text>
            </View>
            {selectedSeats.length > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Seats</Text>
                <Text style={styles.priceValue}>{selectedSeats.join(', ')}</Text>
              </View>
            )}
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceLabelBold}>Total</Text>
              <Text style={styles.priceValueBold}>Rs. {bookingPrice * selectedSeats.length}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={styles.bookingFooter}>
        <TouchableOpacity
          style={[styles.bookingButton, loading && styles.bookingButtonDisabled]}
          onPress={handleCompleteBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.bookingButtonText}>Complete Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Boarding Stop Modal */}
      <Modal visible={boardingModalOpen} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setBoardingModalOpen(false)}
            >
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Select Boarding Stop</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {route.stops.map((stop, index) => (
                <TouchableOpacity
                  key={stop._id || stop.id || String(index)}
                  style={[
                    styles.stopOption,
                    (selectedBoardingStop?.id || selectedBoardingStop?._id) === (stop.id || stop._id) && styles.stopOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedBoardingStop(stop);
                    if (
                      selectedAlightingStop &&
                      (selectedAlightingStop.order ?? 0) <= (stop.order ?? 0)
                    ) {
                      setSelectedAlightingStop(null);
                    }
                    setBoardingModalOpen(false);
                  }}
                >
                  <View
                    style={[
                      styles.stopOptionDot,
                      (selectedBoardingStop?.id || selectedBoardingStop?._id) === (stop.id || stop._id) && styles.stopOptionDotSelected,
                    ]}
                  />
                  <View style={styles.stopOptionContent}>
                    <Text style={styles.stopOptionName}>{stop.name}</Text>
                    <Text style={styles.stopOptionTime}>{formatTime(stop.estimatedArrival || new Date().toISOString())}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Alighting Stop Modal */}
      <Modal visible={alightingModalOpen} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAlightingModalOpen(false)}
            >
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Select Alighting Stop</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {route.stops.map((stop, index) => (
                <TouchableOpacity
                  key={stop._id || stop.id || String(index)}
                  style={[
                    styles.stopOption,
                    (selectedAlightingStop?.id || selectedAlightingStop?._id) === (stop.id || stop._id) && styles.stopOptionSelected,
                    selectedBoardingStop &&
                      (stop.order ?? 0) <= (selectedBoardingStop.order ?? 0) &&
                      styles.stopOptionDisabled,
                  ]}
                  onPress={() => {
                    if (!selectedBoardingStop || (stop.order ?? 0) > (selectedBoardingStop.order ?? 0)) {
                      setSelectedAlightingStop(stop);
                      setAlightingModalOpen(false);
                    }
                  }}
                  disabled={!!selectedBoardingStop && (stop.order ?? 0) <= (selectedBoardingStop.order ?? 0)}
                >
                  <View
                    style={[
                      styles.stopOptionDot,
                      (selectedAlightingStop?.id || selectedAlightingStop?._id) === (stop.id || stop._id) && styles.stopOptionDotSelected,
                    ]}
                  />
                  <View style={styles.stopOptionContent}>
                    <Text style={styles.stopOptionName}>{stop.name}</Text>
                    <Text style={styles.stopOptionTime}>{formatTime(stop.estimatedArrival || new Date().toISOString())}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    paddingHorizontal: 24,
  },
  errorTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  errorText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 13,
  },
  errorButton: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  errorButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#d1d5db',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  stopSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
  },
  stopSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stopSelectorContent: {
    marginLeft: 12,
    flex: 1,
  },
  stopSelectorLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  stopSelectorValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  routeArrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  seatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seatsCount: {
    fontSize: 11,
    color: '#6b7280',
  },
  seatsGrid: {
    marginBottom: 16,
  },
  seatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seat: {
    flex: 0.22,
    aspectRatio: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  seatUnavailable: {
    backgroundColor: '#fecaca',
    borderColor: '#dc2626',
    opacity: 0.6,
  },
  seatSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#1d4ed8',
  },
  seatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  seatTextSelected: {
    color: '#ffffff',
  },
  seatsLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6b7280',
  },
  priceSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  priceLabelBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  priceValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#d1d5db',
    marginVertical: 8,
  },
  bookingFooter: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bookingButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  bookingButtonDisabled: {
    opacity: 0.6,
  },
  bookingButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginVertical: 8,
    marginBottom: 12,
  },
  stopOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stopOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  stopOptionDisabled: {
    opacity: 0.5,
  },
  stopOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d1d5db',
    marginRight: 12,
  },
  stopOptionDotSelected: {
    backgroundColor: '#3b82f6',
  },
  stopOptionContent: {
    flex: 1,
  },
  stopOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  stopOptionTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  successContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  ticketBox: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  ticketHeader: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ticketBusNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  ticketRoute: {
    fontSize: 12,
    color: '#d1d5db',
    marginTop: 4,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  ticketDetails: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ticketLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  ticketLabelBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
  },
  ticketValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
    flex: 0.6,
  },
  priceText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '700',
  },
  tokenBox: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  tokenLabel: {
    fontSize: 11,
    color: '#1e40af',
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: 4,
  },
  tokenNote: {
    fontSize: 10,
    color: '#6b7280',
  },
  downloadButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 24,
  },
  shareButtonText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Schedule selection styles
  scheduleList: {
    paddingBottom: 4,
    gap: 8,
    flexDirection: 'row',
  },
  scheduleChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    minWidth: 110,
  },
  scheduleChipSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  scheduleChipDay: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  scheduleChipTime: {
    fontSize: 11,
    color: '#6b7280',
  },
  scheduleChipTextSelected: {
    color: '#1d4ed8',
  },
  selectedScheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  selectedScheduleText: {
    fontSize: 12,
    color: '#3b82f6',
    marginLeft: 4,
  },
  noScheduleText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

export default BusBooking;
