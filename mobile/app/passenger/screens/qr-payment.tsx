import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  qrPaymentService,
  type QrStop,
  type QrTripResponse,
} from '../services/qrPaymentService';

const resolveKhaltiReturnUrl = () => {
  const apiBase = String(process.env.EXPO_PUBLIC_API_BASE || '').trim().replace(/\/$/, '');
  if (apiBase.startsWith('https://')) {
    return `${apiBase}/passenger/payments/khalti-return`;
  }
  return undefined;
};

const decodeTripData = (value: string | string[] | undefined): QrTripResponse | null => {
  try {
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(raw));
  } catch (error) {
    return null;
  }
};

export default function QrPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const trip = useMemo(() => decodeTripData(params.tripData), [params.tripData]);
  const [selectedDestination, setSelectedDestination] = useState<QrStop | null>(null);
  const [fare, setFare] = useState<number | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const paymentInFlightRef = useRef(false);

  useEffect(() => {
    if (!trip) return;
    setSelectedDestination(trip.destinations?.[0] || null);
  }, [trip?.tripSessionId]);

  useEffect(() => {
    if (!trip || !selectedDestination) {
      setFare(null);
      return;
    }

    let active = true;
    setFareLoading(true);
    qrPaymentService
      .calculateFare({
        tripSessionId: trip.tripSessionId,
        boardingStopName: trip.boardingStop?.stopName,
        destinationStopName: selectedDestination.stopName,
      })
      .then((data) => {
        if (active) setFare(Number(data.fare || 0));
      })
      .catch((error: any) => {
        if (active) {
          setFare(null);
          Alert.alert('Fare Error', error?.response?.data?.message || 'Unable to calculate fare.');
        }
      })
      .finally(() => {
        if (active) setFareLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trip?.tripSessionId, trip?.boardingStop?.stopName, selectedDestination?.stopName]);

  const handlePay = async () => {
    if (!trip || !selectedDestination || fare == null || paymentInFlightRef.current) {
      return;
    }

    paymentInFlightRef.current = true;
    setPaymentLoading(true);

    try {
      const appRedirectUrl = Linking.createURL('khalti-return');
      const initiated = await qrPaymentService.initiateKhaltiPayment(
        {
          tripSessionId: trip.tripSessionId,
          boardingStopName: trip.boardingStop?.stopName,
          destinationStopName: selectedDestination.stopName,
        },
        { returnUrl: resolveKhaltiReturnUrl() }
      );

      if (!initiated?.paymentUrl || !initiated?.pidx) {
        Alert.alert('Payment Error', 'Could not initiate Khalti payment.');
        return;
      }

      const authResult = await WebBrowser.openAuthSessionAsync(initiated.paymentUrl, appRedirectUrl);
      const callbackPidx =
        authResult.type === 'success'
          ? String((Linking.parse(authResult.url).queryParams?.pidx as string) || '')
          : '';

      const verified = await qrPaymentService.verifyKhaltiPayment({
        tripSessionId: trip.tripSessionId,
        pidx: callbackPidx || initiated.pidx,
        boardingStopName: initiated.boardingStop?.stopName || trip.boardingStop?.stopName,
        destinationStopName: initiated.destinationStop?.stopName || selectedDestination.stopName,
        purchaseOrderId: initiated.purchaseOrderId,
      });

      if (verified.paymentStatus) {
        Alert.alert('Payment Successful', 'Your bus fare has been paid.', [
          {
            text: 'Done',
            onPress: () => router.replace('/passenger/(tabs)/home'),
          },
        ]);
      } else {
        Alert.alert('Payment Pending', verified.message || 'Payment is not completed yet.');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to complete payment.';
      Alert.alert('Payment Failed', message);
    } finally {
      paymentInFlightRef.current = false;
      setPaymentLoading(false);
    }
  };

  if (!trip) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={44} color="#dc2626" />
        <Text style={styles.errorTitle}>Trip details unavailable</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/passenger/(tabs)/home')}>
          <Text style={styles.primaryButtonText}>Go Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>QR Payment</Text>
          <Text style={styles.headerSubtitle}>Bus {trip.bus.busNumber}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip</Text>
          <InfoRow icon="bus-outline" label="Bus" value={`${trip.bus.busNumber}${trip.bus.model ? ` • ${trip.bus.model}` : ''}`} />
          <InfoRow icon="map-outline" label="Route" value={trip.route.routeName} />
          <InfoRow icon="navigate-outline" label="From" value={`${trip.route.source} to ${trip.route.destination}`} />
          <InfoRow icon="time-outline" label="Status" value={trip.status === 'on-break' ? 'On break' : 'In progress'} />
          {trip.schedule ? (
            <InfoRow icon="calendar-outline" label="Schedule" value={`${trip.schedule.startTime} - ${trip.schedule.endTime}`} />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stops</Text>
          <InfoRow
            icon="radio-button-on-outline"
            label="Boarding"
            value={trip.boardingStop?.stopName || trip.currentStop || 'Current bus stop'}
          />

          <Text style={styles.pickerLabel}>Destination</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={selectedDestination?.stopName || ''}
              onValueChange={(value) => {
                const next = trip.destinations.find((stop) => stop.stopName === value) || null;
                setSelectedDestination(next);
              }}
            >
              {trip.destinations.map((stop) => (
                <Picker.Item key={`${stop.sequence}-${stop.stopName}`} label={stop.stopName} value={stop.stopName} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fare</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Amount</Text>
            {fareLoading ? (
              <ActivityIndicator color="#3b82f6" />
            ) : (
              <Text style={styles.fareValue}>Rs. {fare ?? '-'}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.payButton, (paymentLoading || fareLoading || fare == null || !selectedDestination) && styles.buttonDisabled]}
          onPress={handlePay}
          disabled={paymentLoading || fareLoading || fare == null || !selectedDestination}
        >
          {paymentLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="wallet-outline" size={20} color="#ffffff" />
              <Text style={styles.payButtonText}>Pay with Khalti</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={19} color="#3b82f6" />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f9fafb',
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingTop: 42,
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#d1d5db',
    marginTop: 2,
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 12,
    paddingBottom: 18,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  infoValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareLabel: {
    color: '#6b7280',
    fontSize: 13,
  },
  fareValue: {
    color: '#3b82f6',
    fontSize: 22,
    fontWeight: '800',
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 12,
    paddingBottom: 24,
  },
  payButton: {
    backgroundColor: '#5b21b6',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  payButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 8,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
