import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';

export type SeatReservation = {
  seatNumber: string;
  bookingCode?: string;
  status?: string;
  passengerName: string;
  passengerPhone: string;
  paymentStatus?: boolean;
  boarded?: boolean;
  boardedAt?: string | null;
  payment?: {
    status?: 'pending' | 'paid' | 'failed';
    method?: string;
    amount?: number;
  };
};

type Props = {
  visible: boolean;
  loading: boolean;
  error?: string | null;
  scheduleLabel: string;
  totalSeats: number;
  reservedSeats: SeatReservation[];
  onClose: () => void;
  onScanQrPress: () => void;
  currentStop?: string | null;
  previousStop?: string | null;
};

export default function NextTripSeatModal({
  visible,
  loading,
  error,
  scheduleLabel,
  totalSeats,
  reservedSeats,
  onClose,
  onScanQrPress,
  currentStop,
  previousStop
}: Props) {
  const [selectedSeat, setSelectedSeat] = useState<SeatReservation | null>(null);

  const reservedMap = useMemo(() => {
    const map = new Map<string, SeatReservation>();
    reservedSeats.forEach((seat) => {
      if (seat?.seatNumber) {
        map.set(String(seat.seatNumber).trim().toUpperCase(), seat);
      }
    });
    return map;
  }, [reservedSeats]);

  const seats = useMemo(() => {
    const count = totalSeats > 0 ? totalSeats : 45;
    const lastRowCount = count >= 5 ? 5 : count;
    const regularSeatCount = count - lastRowCount;
    const regularRowsCount = Math.ceil(regularSeatCount / 4);
    const generated = [] as Array<{ id: string; rowType: 'regular' | 'last'; rowIndex: number; position: number }>;

    for (let rowIndex = 0; rowIndex < regularRowsCount; rowIndex += 1) {
      for (let position = 1; position <= 4; position += 1) {
        const seatNumber = rowIndex * 4 + position;
        if (seatNumber > regularSeatCount) {
          continue;
        }
        const label = `${String.fromCharCode(65 + rowIndex)}${position}`;
        generated.push({
          id: label,
          rowType: 'regular',
          rowIndex,
          position,
        });
      }
    }

    if (lastRowCount > 0) {
      const rowIndex = regularRowsCount;
      for (let position = 1; position <= lastRowCount; position += 1) {
        const label = `${String.fromCharCode(65 + rowIndex)}${position}`;
        generated.push({
          id: label,
          rowType: 'last',
          rowIndex,
          position,
        });
      }
    }
    return generated;
  }, [totalSeats]);

  const regularRows = useMemo(() => {
    const grouped = seats
      .filter((seat) => seat.rowType === 'regular')
      .reduce<Record<number, typeof seats>>((acc, seat) => {
        if (!acc[seat.rowIndex]) {
          acc[seat.rowIndex] = [];
        }
        acc[seat.rowIndex].push(seat);
        return acc;
      }, {});

    return Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)
      .map((rowIndex) => grouped[rowIndex]);
  }, [seats]);

  const lastRowSeats = useMemo(
    () => seats.filter((seat) => seat.rowType === 'last').sort((a, b) => a.position - b.position),
    [seats]
  );

  const handleSeatPress = (seatLabel: string) => {
    const reservation = reservedMap.get(seatLabel);
    if (!reservation) {
      setSelectedSeat(null);
      return;
    }
    setSelectedSeat(reservation);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, shadow.card]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Next Trip Seat Map</Text>
              <Text style={styles.subtitle}>{scheduleLabel}</Text>
              {(previousStop || currentStop) && (
                <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.subtitle, { fontSize: 12, color: '#666' }]}>
                    {previousStop ? `Last: ${previousStop}` : 'Starting trip'}
                  </Text>
                  <Feather name="arrow-right" size={12} color="#999" />
                  <Text style={[styles.subtitle, { fontSize: 12, color: palette.primary, fontWeight: '600' }]}>
                    {currentStop || 'Next stop...'}
                  </Text>
                </View>
              )}
            </View>
            <Pressable onPress={onScanQrPress} style={styles.scanBtn}>
              <Feather name="camera" size={16} color={palette.primary} />
              <Text style={styles.scanBtnText}>Scan QR</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color={palette.text} />
            </Pressable>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E5E7EB' }]} />
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>Reserved</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
              <Text style={styles.legendText}>Boarded</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.stateWrap}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text style={styles.stateText}>Loading seat reservations...</Text>
            </View>
          ) : error ? (
            <View style={styles.stateWrap}>
              <Text style={[styles.stateText, { color: '#DC2626' }]}>{error}</Text>
            </View>
          ) : (
            <>
              <ScrollView style={styles.gridWrap} contentContainerStyle={styles.gridContent}>
                <View style={styles.grid}>
                  {regularRows.map((rowSeats, rowIndex) => {
                    const leftSeats = rowSeats.filter((seat) => seat.position <= 2);
                    const rightSeats = rowSeats.filter((seat) => seat.position >= 3);

                    return (
                      <View key={`regular-${rowIndex}`} style={styles.busRegularRow}>
                        <View style={styles.busSeatGroup}>
                          {[0, 1].map((index) => {
                            const seat = leftSeats[index];
                            if (!seat) {
                              return <View key={`regular-left-empty-${rowIndex}-${index}`} style={styles.emptySeatSlot} />;
                            }
                            const isReserved = reservedMap.has(seat.id);
                            const reservation = reservedMap.get(seat.id);
                            const isBoarded = Boolean(reservation?.boarded);
                            const isSelected = selectedSeat?.seatNumber?.trim().toUpperCase() === seat.id;
                            return (
                              <Pressable
                                key={seat.id}
                                style={[
                                  styles.seat,
                                  isBoarded && styles.seatBoarded,
                                  !isBoarded && isReserved && styles.seatReserved,
                                  isSelected && styles.seatSelected,
                                ]}
                                onPress={() => handleSeatPress(seat.id)}
                              >
                                <Text style={[styles.seatText, isSelected && styles.seatTextSelected]}>{seat.id}</Text>
                              </Pressable>
                            );
                          })}
                        </View>

                        <View style={styles.aisleGap} />

                        <View style={styles.busSeatGroup}>
                          {[0, 1].map((index) => {
                            const seat = rightSeats[index];
                            if (!seat) {
                              return <View key={`regular-right-empty-${rowIndex}-${index}`} style={styles.emptySeatSlot} />;
                            }
                            const isReserved = reservedMap.has(seat.id);
                            const reservation = reservedMap.get(seat.id);
                            const isBoarded = Boolean(reservation?.boarded);
                            const isSelected = selectedSeat?.seatNumber?.trim().toUpperCase() === seat.id;
                            return (
                              <Pressable
                                key={seat.id}
                                style={[
                                  styles.seat,
                                  isBoarded && styles.seatBoarded,
                                  !isBoarded && isReserved && styles.seatReserved,
                                  isSelected && styles.seatSelected,
                                ]}
                                onPress={() => handleSeatPress(seat.id)}
                              >
                                <Text style={[styles.seatText, isSelected && styles.seatTextSelected]}>{seat.id}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}

                  {lastRowSeats.length > 0 && (
                    <View style={styles.busLastRow}>
                      {lastRowSeats.map((seat) => {
                        const isReserved = reservedMap.has(seat.id);
                        const reservation = reservedMap.get(seat.id);
                        const isBoarded = Boolean(reservation?.boarded);
                        const isSelected = selectedSeat?.seatNumber?.trim().toUpperCase() === seat.id;
                        return (
                          <Pressable
                            key={seat.id}
                            style={[
                              styles.seat,
                              styles.lastRowSeat,
                              isBoarded && styles.seatBoarded,
                              !isBoarded && isReserved && styles.seatReserved,
                              isSelected && styles.seatSelected,
                            ]}
                            onPress={() => handleSeatPress(seat.id)}
                          >
                            <Text style={[styles.seatText, isSelected && styles.seatTextSelected]}>{seat.id}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </ScrollView>

              <View style={styles.detailCard}>
                {selectedSeat ? (
                  <>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailTitle}>Seat {selectedSeat.seatNumber}</Text>
                      <View
                        style={[
                          styles.paymentBadge,
                          {
                              backgroundColor: selectedSeat.boarded
                                ? '#dcfce7'
                                : selectedSeat.paymentStatus
                                ? '#dcfce7'
                                : '#fee2e2',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.paymentBadgeText,
                            {
                                color: selectedSeat.boarded
                                  ? '#166534'
                                  : selectedSeat.paymentStatus
                                  ? '#166534'
                                  : '#991b1b',
                            },
                          ]}
                        >
                            {selectedSeat.boarded
                              ? '✓ Boarded'
                              : selectedSeat.paymentStatus
                              ? '✓ Paid'
                              : '○ Unpaid'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.detailLine}>Passenger: {selectedSeat.passengerName}</Text>
                    <Text style={styles.detailLine}>Phone: {selectedSeat.passengerPhone || 'N/A'}</Text>
                    {selectedSeat.payment?.amount && (
                      <Text style={styles.detailLine}>Amount: Rs. {selectedSeat.payment.amount / 100}</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.detailHint}>Tap a reserved seat to view passenger details.</Text>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '88%',
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  subtitle: {
    marginTop: 2,
    color: palette.muted,
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    marginRight: 8,
  },
  scanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  paymentBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: palette.muted,
  },
  gridWrap: {
    maxHeight: 360,
  },
  gridContent: {
    paddingBottom: spacing.md,
  },
  grid: {
    gap: 10,
  },
  busRegularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  emptySeatSlot: {
    width: 56,
    aspectRatio: 1,
  },
  seat: {
    width: 56,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastRowSeat: {
    width: 48,
  },
  seatReserved: {
    backgroundColor: '#FECACA',
    borderColor: '#DC2626',
  },
  seatBoarded: {
    backgroundColor: '#BBF7D0',
    borderColor: '#16A34A',
  },
  seatSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  seatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  seatTextSelected: {
    color: '#FFFFFF',
  },
  detailCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: '#F9FAFB',
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
  },
  detailLine: {
    fontSize: 13,
    color: palette.text,
    marginTop: 2,
  },
  detailHint: {
    fontSize: 12,
    color: palette.muted,
  },
  stateWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  stateText: {
    color: palette.muted,
    textAlign: 'center',
  },
});
