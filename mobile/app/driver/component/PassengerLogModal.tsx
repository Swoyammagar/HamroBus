import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';

interface PassengerLogModalProps {
  visible: boolean;
  passengerCount: number;
  onCountChange: (count: number) => void;
  onClose: () => void;
  capacity?: number;
}

export default function PassengerLogModal({
  visible,
  passengerCount,
  onCountChange,
  onClose,
  capacity = 45,
}: PassengerLogModalProps) {
  const handleIncrement = () => {
    if (passengerCount < capacity) {
      onCountChange(passengerCount + 1);
    }
  };

  const handleDecrement = () => {
    if (passengerCount > 0) {
      onCountChange(passengerCount - 1);
    }
  };

  const handleQuickAdd = (num: number) => {
    const newCount = Math.min(capacity, passengerCount + num);
    onCountChange(newCount);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, shadow.card]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Log Passengers</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={palette.text} />
            </Pressable>
          </View>

          {/* Counter Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Current Count</Text>
            <View style={styles.counterRow}>
              <Pressable
                style={[styles.counterButton, !passengerCount && styles.counterButtonDisabled]}
                onPress={handleDecrement}
                disabled={passengerCount === 0}
              >
                <Feather name="minus" size={20} color={passengerCount ? palette.text : palette.border} />
              </Pressable>
              <Text style={styles.counterValue}>{passengerCount}</Text>
              <Pressable
                style={[styles.counterButton, styles.counterAdd, passengerCount >= capacity && styles.counterButtonDisabled]}
                onPress={handleIncrement}
                disabled={passengerCount >= capacity}
              >
                <Feather name="plus" size={20} color={passengerCount < capacity ? '#FFFFFF' : palette.border} />
              </Pressable>
            </View>
          </View>

          {/* Capacity Info */}
          <View style={styles.capacityInfo}>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityLabel}>Capacity</Text>
              <Text style={styles.capacityValue}>{capacity} seats</Text>
            </View>
            <View style={styles.capacityBar}>
              <View style={[styles.capacityFill, { width: `${(passengerCount / capacity) * 100}%` }]} />
            </View>
            <Text style={styles.capacityText}>
              {Math.round((passengerCount / capacity) * 100)}% filled • {capacity - passengerCount} seats available
            </Text>
          </View>

          {/* Quick Add Buttons */}
          <View style={styles.section}>
            <Text style={styles.label}>Quick Add</Text>
            <View style={styles.quickAddRow}>
              {[5, 10, 15].map((num) => (
                <Pressable
                  key={num}
                  style={[
                    styles.quickAdd,
                    passengerCount >= capacity && styles.quickAddDisabled,
                  ]}
                  onPress={() => handleQuickAdd(num)}
                  disabled={passengerCount >= capacity}
                >
                  <Text style={[styles.quickAddText, passengerCount >= capacity && styles.quickAddTextDisabled]}>
                    +{num}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={onClose}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  section: {
    gap: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  counterButton: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonDisabled: {
    opacity: 0.5,
  },
  counterAdd: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  counterValue: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
  },
  capacityInfo: {
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.background,
    borderRadius: radius.md,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.muted,
  },
  capacityValue: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.text,
  },
  capacityBar: {
    height: 6,
    backgroundColor: palette.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    backgroundColor: palette.primary,
  },
  capacityText: {
    fontSize: 11,
    color: palette.muted,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAdd: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  quickAddDisabled: {
    opacity: 0.5,
  },
  quickAddText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },
  quickAddTextDisabled: {
    color: palette.muted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});