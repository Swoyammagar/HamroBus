import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Booking, type Bus, type Route } from '../context/PassengerContext';
import { bookingService } from '../services/bookingService';
import { formatDate } from '../utils/helpers';

type BookingSuccessTicketProps = {
  bus: Bus;
  route: Route;
  booking: Booking;
  onBackToBookings: () => void;
  onDownloadTicket: () => void;
  onShareTicket: () => void;
};

const BookingSuccessTicket = ({
  bus,
  route,
  booking,
  onBackToBookings,
  onDownloadTicket,
  onShareTicket,
}: BookingSuccessTicketProps) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    const loadQr = async () => {
      if (!booking?.id) return;
      setQrLoading(true);
      setQrError(null);
      setQrCodeDataUrl(null);

      try {
        const qrData = await bookingService.getBookingQr(String(booking.id));
        setQrCodeDataUrl(qrData.qrCodeDataUrl || null);
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to load booking QR';
        setQrError(message);
      } finally {
        setQrLoading(false);
      }
    };

    loadQr();
  }, [booking?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackToBookings} style={styles.backButton}>
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
                <Text style={styles.ticketValue}>{booking.bookingId}</Text>
              </View>

              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>Token</Text>
                <Text style={[styles.ticketValue, { fontFamily: 'monospace', fontSize: 18 }]}>
                  {booking.token}
                </Text>
              </View>

              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>From</Text>
                <Text style={styles.ticketValue}>{booking.boardingStop}</Text>
              </View>

              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>To</Text>
                <Text style={styles.ticketValue}>{booking.alightingStop}</Text>
              </View>

              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>Seats</Text>
                <Text style={styles.ticketValue}>{booking.seatNumber}</Text>
              </View>

              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>Travel Date</Text>
                <Text style={styles.ticketValue}>{formatDate(booking.travelDate)}</Text>
              </View>

              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabel}>Payment</Text>
                <Text
                  style={[
                    styles.ticketValue,
                    booking.paymentStatus ? styles.paidText : styles.unpaidText,
                  ]}
                >
                  {booking.paymentStatus ? 'Paid with Khalti' : 'Unpaid'}
                </Text>
              </View>

              <View style={styles.ticketDivider} />

              <View style={styles.ticketRow}>
                <Text style={styles.ticketLabelBold}>Total Price</Text>
                <Text style={[styles.ticketValue, styles.priceText]}>Rs. {booking.price}</Text>
              </View>
            </View>

            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>Booking Token</Text>
              <Text style={styles.tokenValue}>{booking.token}</Text>
              <Text style={styles.tokenNote}>Present this code to the driver</Text>
            </View>

            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>Boarding QR</Text>
              {qrLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : qrError ? (
                <Text style={styles.qrError}>{qrError}</Text>
              ) : qrCodeDataUrl ? (
                <Image source={{ uri: qrCodeDataUrl }} style={styles.qrImage} />
              ) : (
                <Text style={styles.qrHint}>QR not available</Text>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.downloadButton} onPress={onDownloadTicket}>
            <Ionicons name="download" size={20} color="#ffffff" />
            <Text style={styles.downloadButtonText}>Download Ticket (PDF)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={onShareTicket}>
            <Ionicons name="share-social" size={20} color="#3b82f6" />
            <Text style={styles.shareButtonText}>Share Ticket</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
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
  qrSection: {
    marginTop: 4,
    marginBottom: 20,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginHorizontal: 12,
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
});

export default BookingSuccessTicket;
