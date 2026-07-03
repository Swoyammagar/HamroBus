import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { usePassenger, type Bus, type Route, type Stop, type Booking } from '../context/PassengerContext';
import { routeService, type Schedule } from '../services/routeService';
import { bookingService, type BookingResponse, type SeatAvailabilityResponse } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { RewardService } from '../services/rewardService';
import passengerNotificationSocket from '../services/passengerNotificationSocket';
import StopSelectionModal from '@/app/passenger/components/StopSelectionModal';
import BookingSuccessTicket from '@/app/passenger/components/BookingSuccessTicket';
import { buildSeatLayout } from '@/app/utils/seatLayout';

const resolveKhaltiReturnUrl = () => {
  const apiBase = String(process.env.EXPO_PUBLIC_API_BASE || '').trim().replace(/\/$/, '');
  if (apiBase.startsWith('https://')) {
    return `${apiBase}/passenger/payments/khalti-return`;
  }
  return undefined;
};

const BusBooking = () => {
  const router = useRouter();
  const { busId, routeId } = useLocalSearchParams();
  const { routes, selectedRoute, selectedBus, buses, addBooking } = usePassenger();

  const busIdValue = Array.isArray(busId) ? busId[0] : busId;
  const routeIdValue = Array.isArray(routeId) ? routeId[0] : routeId;
  const selectedBusId = String(selectedBus?._id || selectedBus?.id || '');
  const selectedRouteId = String(selectedRoute?._id || selectedRoute?.id || '');
  const busesSignature = buses.map((candidate) => String(candidate?._id || candidate?.id || '')).join('|');
  const routesSignature = routes.map((candidate) => String(candidate?._id || candidate?.id || '')).join('|');

  const [bus, setBus] = useState<Bus | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [selectedBoardingStop, setSelectedBoardingStop] = useState<Stop | null>(null);
  const [selectedAlightingStop, setSelectedAlightingStop] = useState<Stop | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [boardingModalOpen, setBoardingModalOpen] = useState(false);
  const [alightingModalOpen, setAlightingModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [generatedBooking, setGeneratedBooking] = useState<Booking | null>(null);
  const [resolutionAttempted, setResolutionAttempted] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [serviceDate, setServiceDate] = useState<string>('');
  const [rewardPoints, setRewardPoints] = useState<number>(0);
  const [useRewardPoints, setUseRewardPoints] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [availabilityData, setAvailabilityData] = useState<SeatAvailabilityResponse | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const paymentInFlightRef = useRef(false);
  const [currentStop, setCurrentStop] = useState<string | null>(null);

  useEffect(() => {
    const busFromContext = [selectedBus, ...buses].find(candidate => {
      if (!candidate) return false;
      const candidateId = candidate._id || candidate.id;
      return busIdValue ? String(candidateId) === String(busIdValue) : true;
    });

    const resolvedBus = busFromContext || null;

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

    const resolvedRoute = routeFromContext || routeByResolvedBus || null;

    setBus(resolvedBus);
    setRoute(resolvedRoute);
    if (resolvedRoute?.stops?.length) {
      setSelectedBoardingStop(resolvedRoute.stops[0]);
    }
    setResolutionAttempted(true);
  }, [busIdValue, routeIdValue, selectedBusId, selectedRouteId, busesSignature, routesSignature]);

  useEffect(() => {
    const fetchRewardPoints = async () => {
      try {
        const rewardInfo = await RewardService.getRewardPoints();
        if (rewardInfo.success) {
          setRewardPoints(rewardInfo.data.rewardPoints);
        }
      } catch (error) {
        console.error('Error fetching reward points:', error);
      }
    };

    fetchRewardPoints();
  }, []);

  const getNextOccurrenceOfDay = (dayName: string, scheduleEndTime?: string): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = days.indexOf(dayName);
    if (targetDay < 0) return new Date().toISOString().split('T')[0];

    const today = new Date();
    const todayDay = today.getDay();

    if (todayDay === targetDay) {
      if (scheduleEndTime) {
        const [endHours, endMinutes] = scheduleEndTime.split(':').map(Number);
        const endTimeMinutes = endHours * 60 + endMinutes;
        const nowMinutes = today.getHours() * 60 + today.getMinutes();

        if (nowMinutes < endTimeMinutes) {
          return today.toISOString().split('T')[0];
        }
      }

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }

    const daysUntil = (targetDay - todayDay + 7) % 7;
    const result = new Date(today);
    result.setDate(result.getDate() + daysUntil);
    return result.toISOString().split('T')[0];
  };

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
          const refreshed = filtered.find((sched) => sched._id === prev._id);
          return refreshed || null;
        });
      })
      .catch(() => setSchedules([]))
      .finally(() => setSchedulesLoading(false));
  }, [route?._id, route?.id, bus?._id, bus?.id]);

  useEffect(() => {
    if (!selectedSchedule) return;
    setServiceDate(selectedSchedule.nextServiceDate || getNextOccurrenceOfDay(selectedSchedule.dayOfWeek, selectedSchedule.endTime));
    setSelectedSeats([]);
    setAvailabilityData(null);
  }, [selectedSchedule?._id]);

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
  }, [selectedSchedule?._id, route?._id, route?.id, bus?._id, bus?.id, serviceDate]);

  useEffect(() => {
    if (!selectedSchedule || !route || !bus) {
      return;
    }

    const handleSeatBooked = (data: any) => {

      if (String(data.scheduleId) === String(selectedSchedule._id) && String(data.busId) === String(bus._id)) {

        if (route && serviceDate) {
          const rid = String(route._id || route.id || '');
          const bid = String(bus._id || bus.id || '');
          const sid = String(selectedSchedule._id || '');

          bookingService
            .checkSeatAvailability({ routeId: rid, busId: bid, scheduleId: sid, serviceDate })
            .then((data) => setAvailabilityData(data))
            .catch((err) => console.warn('Error refreshing seat availability:', err));
        }

        Alert.alert('Seat Update', `Seats ${data.seatNumbers.join(', ')} just got booked!`);
      }
    };

    const handleTripReminder = (data: any) => {

      const delayText = data.actualDelay > 0 ? `\n\nNote: Trip started ${data.actualDelay} minute(s) late.` : '';
      const message = `Your trip to ${data.destinationStop} is now running. Expected arrival: ${data.eta}.${delayText}\n\nBooking: ${data.bookingCode}`;

      Alert.alert('Trip Started', message);
    };

    passengerNotificationSocket.onSeatBooked(handleSeatBooked);
    passengerNotificationSocket.onTripReminder(handleTripReminder);

    return () => {
      passengerNotificationSocket.offSeatBooked(handleSeatBooked);
      passengerNotificationSocket.offTripReminder(handleTripReminder);
    };
  }, [selectedSchedule?._id, bus?._id, route?._id, route?.id, serviceDate]);

  useEffect(() => {
    if (!bus) {
      setCurrentStop(null);
      return;
    }

    const busId = String(bus._id || bus.id || '');
    if (!busId) return;

    passengerNotificationSocket.joinBusRoom(busId);

    const handleCurrentStopUpdate = (data: any) => {
      if (String(data.busId) === busId && data.currentStop) {
        setCurrentStop(data.currentStop);
        if (selectedSchedule && route && serviceDate) {
          const rid = String(route._id || route.id || '');
          const bid = String(bus._id || bus.id || '');
          const sid = String(selectedSchedule._id || '');
          bookingService
            .checkSeatAvailability({ routeId: rid, busId: bid, scheduleId: sid, serviceDate })
            .then((data) => setAvailabilityData(data))
            .catch((err) => console.warn('Error refreshing availability on stop update:', err));
        }
      }
    };

    passengerNotificationSocket.onCurrentStopUpdate(handleCurrentStopUpdate);

    return () => {
      passengerNotificationSocket.offCurrentStopUpdate(handleCurrentStopUpdate);
      passengerNotificationSocket.leaveBusRoom(busId);
    };
  }, [bus?._id, bus?.id, route?._id, route?.id, selectedSchedule?._id, serviceDate]);

  const bookingPrice = route?.fareInfo ?? 150;

  const generateSeatsGrid = () => {
    const totalSeats = availabilityData?.totalSeats || bus?.totalCapacity || bus?.capacity || 50;
    return buildSeatLayout(totalSeats).map((row) => ({
      ...row,
      seats: row.seats.map((seat) => ({
        ...seat,
        available: availabilityData ? !availabilityData.takenSeats.includes(seat.id) : true,
      })),
    }));
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

  const validateBookingInput = () => {
    if (!selectedSchedule) {
      Alert.alert('Missing Schedule', 'Please select a schedule before booking');
      return false;
    }
    if (!selectedBoardingStop || !selectedAlightingStop || selectedSeats.length === 0) {
      Alert.alert('Incomplete', 'Please select boarding stop, alighting stop, and seats');
      return false;
    }
    if ((selectedBoardingStop.order ?? 0) >= (selectedAlightingStop.order ?? 0)) {
      Alert.alert('Invalid Route', 'Alighting stop must be after boarding stop');
      return false;
    }

    if (currentStop && route?.stops) {
      const boardingStopNormalized = String(selectedBoardingStop.name || '').trim().toLowerCase();
      const currentStopNormalized = String(currentStop).trim().toLowerCase();

      const boardingStopObj = route.stops.find(
        (s) => String(s.name || '').trim().toLowerCase() === boardingStopNormalized
      );
      const currentStopObj = route.stops.find(
        (s) => String(s.name || '').trim().toLowerCase() === currentStopNormalized
      );

      if (boardingStopObj && currentStopObj) {
        const boardingSequence = boardingStopObj.order ?? 0;
        const currentSequence = currentStopObj.order ?? 0;

        if (currentSequence > boardingSequence) {
          Alert.alert(
            'Stop Already Passed',
            `The bus has already passed ${selectedBoardingStop.name}. You cannot book for this stop.`
          );
          return false;
        }
      }
    }

    return true;
  };

  const mapToPassengerBooking = (result: BookingResponse): Booking => ({
    id: String(result.id),
    bookingId: result.bookingCode,
    passengerId: String(result.passengerId),
    busId: String(result.busId),
    busNumber: String(result.busNumber ?? ''),
    routeId: String(result.routeId),
    token: result.bookingCode,
    seatNumber: (result.seatNumbers || []).join(', '),
    price: result.finalFare || result.totalFare,
    totalFare: result.totalFare,
    rewardPointsRedeemed: result.rewardPointsRedeemed,
    discountPercentage: result.discountPercentage,
    discountAmount: result.discountAmount,
    finalFare: result.finalFare || result.totalFare,
    paymentStatus: Boolean(result.paymentStatus || result.payment?.status === 'paid'),
    bookingDate: result.createdAt,
    travelDate: result.serviceDate,
    status: 'confirmed',
    boardingStop: result.boardingStop?.stopName || selectedBoardingStop?.name || '',
    alightingStop: result.destinationStop?.stopName || selectedAlightingStop?.name || '',
    tripStarted: false,
    tripEnded: false,
  });

  const createBookingRecord = async () => {
    const result = await bookingService.createBooking({
      routeId: String(route!._id || route!.id || ''),
      busId: String(bus!._id || bus!.id || ''),
      scheduleId: String(selectedSchedule!._id || ''),
      serviceDate,
      boardingStopName: selectedBoardingStop!.name,
      destinationStopName: selectedAlightingStop!.name,
      seatCount: selectedSeats.length,
      preferredSeatNumbers: selectedSeats,
      redeemRewardPoints: useRewardPoints,
    });

    const newBooking = mapToPassengerBooking(result);
    addBooking(newBooking);
    setGeneratedBooking(newBooking);
    setBookingComplete(true);

    return { apiBooking: result, bookingForContext: newBooking };
  };

  const handleCompleteBooking = async () => {
    if (!validateBookingInput()) {
      return;
    }

    setLoading(true);

    try {
      await createBookingRecord();
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to complete booking. Please try again.';
      Alert.alert('Booking Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithKhalti = async () => {
    if (paymentInFlightRef.current) {
      return;
    }

    if (!validateBookingInput()) {
      return;
    }

    paymentInFlightRef.current = true;
    setPaymentLoading(true);

    try {
      let bookingId = generatedBooking?.id;

      if (!bookingId || generatedBooking?.paymentStatus) {
        const { apiBooking } = await createBookingRecord();
        bookingId = String(apiBooking.id);
      }

      const appRedirectUrl = Linking.createURL('khalti-return');
      const backendReturnUrl = resolveKhaltiReturnUrl();

      const initiated = await paymentService.initiateKhaltiPayment(String(bookingId), {
        returnUrl: backendReturnUrl,
      });

      if (!initiated?.paymentUrl || !initiated?.pidx) {
        Alert.alert('Payment Error', 'Could not initiate Khalti payment. Booking has been created as unpaid.');
        return;
      }

      const authResult = await WebBrowser.openAuthSessionAsync(initiated.paymentUrl, appRedirectUrl);
      const callbackPidx =
        authResult.type === 'success'
          ? String((Linking.parse(authResult.url).queryParams?.pidx as string) || '')
          : '';

      const verified = await paymentService.verifyKhaltiPayment(
        String(bookingId),
        callbackPidx || initiated.pidx
      );

      if (verified.paymentStatus) {
        setGeneratedBooking((prev) => (prev ? { ...prev, paymentStatus: true } : prev));
        Alert.alert('Payment Successful', 'Khalti payment completed for this booking.');
      } else {
        Alert.alert('Payment Pending', 'Booking is created, but payment is not completed yet.');
      }
    } catch (error: any) {
      const pidx = error?.response?.data?.pidx;
      const paymentUrl = error?.response?.data?.paymentUrl;
      const existingBookingId = generatedBooking?.id;

      if (pidx && existingBookingId) {
        try {
          if (paymentUrl) {
            const appRedirectUrl = Linking.createURL('khalti-return');
            await WebBrowser.openAuthSessionAsync(String(paymentUrl), appRedirectUrl);
          }

          const verified = await paymentService.verifyKhaltiPayment(String(existingBookingId), String(pidx));
          if (verified.paymentStatus) {
            setGeneratedBooking((prev) => (prev ? { ...prev, paymentStatus: true } : prev));
            Alert.alert('Payment Successful', 'Khalti payment completed for this booking.');
          } else {
            Alert.alert('Payment Processing', 'Your payment session is active but not completed yet. Finish payment in Khalti and try again.');
          }
          return;
        } catch (verifyError: any) {
          const verifyMessage =
            verifyError?.response?.data?.message ||
            verifyError?.message ||
            'Payment is still being processed. Please try again shortly.';
          Alert.alert('Payment Processing', verifyMessage);
          return;
        }
      }

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to complete Khalti payment. Booking may still be created as unpaid.';
      Alert.alert('Payment Failed', message);
    } finally {
      paymentInFlightRef.current = false;
      setPaymentLoading(false);
    }
  };

  const handleDownloadTicket = async () => {
  };

  const handleViewTicket = () => {
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
      <BookingSuccessTicket
        bus={bus}
        route={route}
        booking={generatedBooking}
        onBackToBookings={() => router.push('../(tabs)/bookings')}
        onDownloadTicket={handleDownloadTicket}
        onShareTicket={handleViewTicket}
      />
    );
  }

  const seatRows = generateSeatsGrid();

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
              {seatRows.map((row) => {
                if (row.rowType === 'back') {
                  return (
                    <View key={row.rowLabel} style={styles.busLastRow}>
                      {row.seats.map((seat) => (
                        <TouchableOpacity
                          key={seat.id}
                          style={[
                            styles.seat,
                            styles.lastRowSeat,
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
                  );
                }

                const leftSeats = row.seats.filter((seat) => seat.position <= 2);
                const rightSeats = row.seats.filter((seat) => seat.position >= 3);

                return (
                  <View key={row.rowLabel} style={styles.busRegularRow}>
                    <View style={styles.busSeatGroup}>
                      {[0, 1].map((index) => {
                        const seat = leftSeats[index];
                        if (!seat) {
                          return <View key={`${row.rowLabel}-left-empty-${index}`} style={styles.emptySeatSlot} />;
                        }
                        return (
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
                        );
                      })}
                    </View>

                    <View style={styles.aisleGap} />

                    <View style={styles.busSeatGroup}>
                      {[0, 1].map((index) => {
                        const seat = rightSeats[index];
                        if (!seat) {
                          return <View key={`${row.rowLabel}-right-empty-${index}`} style={styles.emptySeatSlot} />;
                        }
                        return (
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
                        );
                      })}
                    </View>
                  </View>
                );
              })}
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

            {rewardPoints >= 500 && (
              <View>
                <View style={styles.priceDivider} />
                <View style={styles.rewardPointsCard}>
                  <View style={styles.rewardPointsHeader}>
                    <Ionicons name="star" size={18} color="#f59e0b" />
                    <Text style={styles.rewardPointsTitle}>You have {rewardPoints} points</Text>
                  </View>
                  <Text style={styles.rewardPointsDesc}>Redeem 500 points for 10% discount</Text>
                  <TouchableOpacity
                    style={[
                      styles.redeemToggle,
                      useRewardPoints && styles.redeemToggleActive,
                    ]}
                    onPress={() => {
                      if (useRewardPoints) {
                        setUseRewardPoints(false);
                        setDiscountAmount(0);
                      } else {
                        const calculatedDiscount = Math.round(
                          ((bookingPrice * selectedSeats.length) * 10) / 100 * 100
                        ) / 100;
                        setUseRewardPoints(true);
                        setDiscountAmount(calculatedDiscount);
                      }
                    }}
                  >
                    <Ionicons
                      name={useRewardPoints ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={useRewardPoints ? '#10b981' : '#d1d5db'}
                    />
                    <Text style={styles.redeemToggleText}>
                      {useRewardPoints ? 'Redeem for 10% discount' : 'Tap to redeem points'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.priceDivider} />
            {useRewardPoints && discountAmount > 0 && (
              <View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Discount (10%)</Text>
                  <Text style={[styles.priceValue, { color: '#10b981' }]}>-Rs. {discountAmount}</Text>
                </View>
                <View style={styles.priceDivider} />
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabelBold}>Total</Text>
              <Text style={styles.priceValueBold}>
                Rs. {useRewardPoints ? Math.round(((bookingPrice * selectedSeats.length) - discountAmount) * 100) / 100 : bookingPrice * selectedSeats.length}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bookingFooter}>
        <TouchableOpacity
          style={[styles.bookingButton, loading && styles.bookingButtonDisabled]}
          onPress={handleCompleteBooking}
          disabled={loading || paymentLoading}
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

        <TouchableOpacity
          style={[styles.khaltiButton, paymentLoading && styles.bookingButtonDisabled]}
          onPress={handlePayWithKhalti}
          disabled={loading || paymentLoading}
        >
          {paymentLoading ? (
            <ActivityIndicator color="#5b21b6" />
          ) : (
            <>
              <Ionicons name="wallet" size={20} color="#5b21b6" />
              <Text style={styles.khaltiButtonText}>Pay Now with Khalti</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <StopSelectionModal
        visible={boardingModalOpen}
        title="Select Boarding Stop"
        stops={route.stops}
        selectedStopId={String(selectedBoardingStop?._id || selectedBoardingStop?.id || '')}
        onClose={() => setBoardingModalOpen(false)}
        onSelect={(stop) => {
          setSelectedBoardingStop(stop);
          if (selectedAlightingStop && (selectedAlightingStop.order ?? 0) <= (stop.order ?? 0)) {
            setSelectedAlightingStop(null);
          }
          setBoardingModalOpen(false);
        }}
      />

      <StopSelectionModal
        visible={alightingModalOpen}
        title="Select Alighting Stop"
        stops={route.stops}
        selectedStopId={String(selectedAlightingStop?._id || selectedAlightingStop?.id || '')}
        onClose={() => setAlightingModalOpen(false)}
        isStopDisabled={(stop) =>
          Boolean(selectedBoardingStop && (stop.order ?? 0) <= (selectedBoardingStop.order ?? 0))
        }
        onSelect={(stop) => {
          if (!selectedBoardingStop || (stop.order ?? 0) > (selectedBoardingStop.order ?? 0)) {
            setSelectedAlightingStop(stop);
            setAlightingModalOpen(false);
          }
        }}
      />
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
  busRegularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  busSeatGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  aisleGap: {
    width: 26,
  },
  busLastRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  emptySeatSlot: {
    width: 56,
    aspectRatio: 1,
  },
  seat: {
    width: 56,
    aspectRatio: 1,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  lastRowSeat: {
    width: 48,
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
  rewardPointsCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  rewardPointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rewardPointsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 6,
  },
  rewardPointsDesc: {
    fontSize: 12,
    color: '#b45309',
    marginBottom: 10,
  },
  redeemToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  redeemToggleActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#10b981',
  },
  redeemToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
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
  khaltiButton: {
    marginTop: 10,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  khaltiButtonText: {
    color: '#5b21b6',
    fontSize: 14,
    fontWeight: '700',
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
  paidText: {
    color: '#16a34a',
  },
  unpaidText: {
    color: '#dc2626',
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
