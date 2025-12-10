import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius } from '../theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  tripDetails: { route: string; time: string; duration: string };
  onStart: () => void;
}

export default function StartTripModal({ visible, onClose, tripDetails, onStart }: Props) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Start Trip</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={palette.muted} />
            </Pressable>
          </View>
          <View style={styles.row}>
            <Feather name="map" size={18} color={palette.primary} />
            <Text style={styles.label}>{tripDetails.route}</Text>
          </View>
          <View style={styles.row}>
            <Feather name="clock" size={18} color={palette.primary} />
            <Text style={styles.label}>{tripDetails.time} · {tripDetails.duration}</Text>
          </View>
          <Pressable style={styles.primary} onPress={onStart}>
            <Text style={styles.primaryText}>Go Online & Start</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: palette.text,
  },
  primary: {
    marginTop: spacing.sm,
    backgroundColor: palette.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
