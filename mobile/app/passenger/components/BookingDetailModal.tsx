import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bookingService, type BookingResponse } from '../services/bookingService';
import { formatDate } from '../utils/helpers';

type BookingDetailModalProps = {
  visible: boolean;
  booking: BookingResponse | null;
  cancelling: boolean;
  onClose: () => void;
  onShare: (booking: BookingResponse) => void;
  onCancel: (booking: BookingResponse) => void;
};

const BookingDetailModal = ({
  visible,
  booking,
  cancelling,
  onClose,
  onShare,
  onCancel,
}: BookingDetailModalProps) => {
  const [selectedBookingQr, setSelectedBookingQr] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    const loadQr = async () => {
      if (!visible || !booking?.id) return;
      setQrLoading(true);
      setQrError(null);
      setSelectedBookingQr(null);

      try {
        const qrData = await bookingService.getBookingQr(booking.id);
        setSelectedBookingQr(qrData.qrCodeDataUrl || null);
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to load QR code';
        setQrError(message);
      } finally {
        setQrLoading(false);
      }
    };

    loadQr();
  }, [visible, booking?.id]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>

          {booking && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.modalTitle}>Booking Details</Text>

              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Booking ID</Text>
                  <Text style={styles.detailValue} selectable>
                    {booking.bookingCode}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          booking.status === 'confirmed'
                            ? '#dcfce7'
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
                              : booking.status === 'completed'
                              ? '#6b21a8'
                              : '#991b1b',
                        },
                      ]}
                    >
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Journey Details</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>From</Text>
                  <Text style={styles.detailValue}>{booking.boardingStop.stopName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>To</Text>
                  <Text style={styles.detailValue}>{booking.destinationStop.stopName}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Travel Date</Text>
                  <Text style={styles.detailValue}>{formatDate(booking.serviceDate)}</Text>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Seats</Text>
                  <Text style={styles.detailValue}>{booking.seatNumbers.join(', ')}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price per Seat</Text>
                  <Text style={styles.detailValue}>Rs. {booking.farePerSeat}</Text>
                </View>

                <View style={[styles.detailRow, styles.priceRow]}>
                  <Text style={styles.detailLabelBold}>Total Price</Text>
                  <Text style={styles.detailValueBold}>Rs. {booking.totalFare}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Payment Status</Text>
                  <View
                    style={[
                      styles.paymentStatusBadge,
                      {
                        backgroundColor: booking.paymentStatus ? '#dcfce7' : '#fecaca',
                      },
                    ]}
                  >
                    <Ionicons
                      name={booking.paymentStatus ? 'checkmark-circle' : 'alert-circle'}
                      size={16}
                      color={booking.paymentStatus ? '#16a34a' : '#dc2626'}
                    />
                    <Text
                      style={[
                        styles.paymentStatusText,
                        {
                          color: booking.paymentStatus ? '#16a34a' : '#dc2626',
                        },
                      ]}
                    >
                      {booking.paymentStatus ? 'Paid' : 'Not Paid'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.tokenSection}>
                <Text style={styles.tokenSectionTitle}>Your Booking Token</Text>
                <View style={styles.tokenBox}>
                  <Text style={styles.tokenValue} selectable>
                    {booking.bookingCode}
                  </Text>
                </View>
                <Text style={styles.tokenNote}>Show this token to the driver when boarding the bus</Text>
              </View>

              <View style={styles.qrSection}>
                <Text style={styles.qrTitle}>Boarding QR</Text>

                {qrLoading ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : qrError ? (
                  <Text style={styles.qrError}>{qrError}</Text>
                ) : selectedBookingQr ? (
                  <Image source={{ uri: selectedBookingQr }} style={styles.qrImage} />
                ) : (
                  <Text style={styles.qrHint}>QR not available</Text>
                )}
              </View>

              {booking.status === 'confirmed' && (
                <>
                  <TouchableOpacity style={styles.actionButton} onPress={() => onShare(booking)}>
                    <Ionicons name="share-social" size={18} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Share Booking</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => onCancel(booking)}
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

              {booking.status === 'completed' && (
                <TouchableOpacity style={styles.actionButton} onPress={() => onShare(booking)}>
                  <Ionicons name="share-social" size={18} color="#ffffff" />
                  <Text style={styles.actionButtonText}>Share Receipt</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
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

export default BookingDetailModal;
