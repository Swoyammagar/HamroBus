import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';

interface BusStop {
  id: number;
  name: string;
  status: 'completed' | 'active' | 'upcoming';
  passengers: number;
  time: string;
  latitude?: number;
  longitude?: number;
  arrivalTime?: string; // From backend stopArrivals
}

interface StopDetailModalProps {
  visible: boolean;
  stop: BusStop | null;
  isLoading?: boolean;
  onClose: () => void;
  onMarkAsArrived?: () => Promise<void>;
  onMarkAsCompleted?: () => Promise<void>;
}

export default function StopDetailModal({
  visible,
  stop,
  isLoading = false,
  onClose,
  onMarkAsArrived,
  onMarkAsCompleted,
}: StopDetailModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!stop) return null;

  const handleMarkArrived = async () => {
    try {
      setIsProcessing(true);
      await onMarkAsArrived?.();
      Alert.alert('Success', `Arrived at ${stop.name}`);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark arrival');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkCompleted = async () => {
    try {
      setIsProcessing(true);
      await onMarkAsCompleted?.();
      Alert.alert('Success', `Completed ${stop.name}`);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark as completed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (stop.status) {
      case 'completed':
        return 'check-circle';
      case 'active':
        return 'map-pin';
      default:
        return 'clock';
    }
  };

  const getStatusColor = () => {
    switch (stop.status) {
      case 'completed':
        return palette.success;
      case 'active':
        return palette.primary;
      default:
        return palette.muted;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
        <View style={[styles.panel, shadow.card]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={[styles.statusIcon, { backgroundColor: getStatusColor() + '20' }]}>
                <Feather
                  name={getStatusIcon()}
                  size={24}
                  color={getStatusColor()}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLabel} numberOfLines={1}>
                  {stop.status.charAt(0).toUpperCase() + stop.status.slice(1)}
                </Text>
                <Text style={styles.stopName} numberOfLines={2}>
                  {stop.name}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeIcon}>
                <Feather name="x" size={24} color={palette.text} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Scheduled Arrival Time */}
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Feather name="clock" size={16} color={palette.primary} />
                <Text style={styles.infoLabel}>Scheduled Arrival Time</Text>
              </View>
              <Text style={styles.infoValue}>
                {stop.arrivalTime || stop.time || 'No timing available'}
              </Text>
            </View>

            {/* Location Coordinates */}
            {(stop.latitude || stop.longitude) && (
              <View style={styles.infoSection}>
                <View style={styles.infoHeader}>
                  <Feather name="map-pin" size={16} color={palette.primary} />
                  <Text style={styles.infoLabel}>Location</Text>
                </View>
                <Text style={styles.infoValue}>
                  {stop.latitude?.toFixed(4)}, {stop.longitude?.toFixed(4)}
                </Text>
              </View>
            )}

            {/* Expected Passengers */}
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Feather name="users" size={16} color={palette.primary} />
                <Text style={styles.infoLabel}>Expected Passengers</Text>
              </View>
              <Text style={styles.infoValue}>{stop.passengers} passengers</Text>
            </View>

            {/* Stop Sequence/Order */}
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Feather name="list" size={16} color={palette.primary} />
                <Text style={styles.infoLabel}>Stop Number</Text>
              </View>
              <Text style={styles.infoValue}>Stop #{stop.id}</Text>
            </View>

            {/* Status-based Actions */}
            <View style={styles.actionSection}>
              {stop.status === 'upcoming' && (
                <Pressable
                  style={[styles.actionButton, styles.arriveBtnprimary]}
                  onPress={handleMarkArrived}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="map-pin" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Mark as Arrived</Text>
                    </>
                  )}
                </Pressable>
              )}

              {stop.status === 'active' && (
                <Pressable
                  style={[styles.actionButton, styles.completeBtnSuccess]}
                  onPress={handleMarkCompleted}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Mark as Completed</Text>
                    </>
                  )}
                </Pressable>
              )}

              {stop.status === 'completed' && (
                <View style={[styles.actionButton, styles.completedBtn]}>
                  <Feather name="check-circle" size={18} color={palette.success} />
                  <Text style={[styles.actionButtonText, { color: palette.success }]}>
                    Stop Completed
                  </Text>
                </View>
              )}
            </View>

            {/* Helpful Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipLabel}>💡 Helpful Tips:</Text>
              <Text style={styles.tipText}>
                • The system auto-marks stops as complete when you're within 500m of the stop location.
              </Text>
              <Text style={styles.tipText}>
                • You can manually mark stops if auto-detection is unavailable.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject, 
  },
  panel: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',           // slightly tighter cap
    paddingBottom: spacing.xl,  // more room for home indicator
    ...shadow.card,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: palette.muted,
    fontWeight: '600',
    marginBottom: 2,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  closeIcon: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoSection: {
    marginBottom: spacing.lg,
    backgroundColor: palette.background,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: palette.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
  },
  coordSubtext: {
    fontSize: 12,
    color: palette.muted,
    fontStyle: 'italic',
  },
  actionSection: {
    marginVertical: spacing.md,
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  arriveBtnprimary: {
    backgroundColor: palette.primary,
  },
  completeBtnSuccess: {
    backgroundColor: palette.success,
  },
  completedBtn: {
    backgroundColor: '#ECFDF3',
    borderWidth: 2,
    borderColor: palette.success,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  tipsSection: {
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: spacing.sm,
  },
  tipText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
});
