import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  error?: string | null;
  busNumber?: string;
  qrCodeDataUrl?: string | null;
  onRetry: () => void;
};

export default function BusQrModal({
  visible,
  onClose,
  loading,
  error,
  busNumber,
  qrCodeDataUrl,
  onRetry,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, shadow.card]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Bus Payment QR</Text>
              <Text style={styles.subtitle}>{busNumber ? `Bus ${busNumber}` : 'Assigned bus'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <Feather name="x" size={20} color={palette.text} />
            </Pressable>
          </View>

          <View style={styles.qrWrap}>
            {loading ? (
              <ActivityIndicator size="large" color={palette.primary} />
            ) : error ? (
              <View style={styles.stateWrap}>
                <Feather name="alert-circle" size={34} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={onRetry}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : qrCodeDataUrl ? (
              <Image source={{ uri: qrCodeDataUrl }} style={styles.qrImage} resizeMode="contain" />
            ) : (
              <Text style={styles.emptyText}>QR unavailable</Text>
            )}
          </View>

          <Text style={styles.note}>This permanent QR identifies this bus for in-bus digital payments.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: palette.muted,
    marginTop: 4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  qrWrap: {
    minHeight: 340,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
  },
  qrImage: {
    width: 320,
    height: 320,
  },
  stateWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    color: '#991B1B',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: palette.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    color: palette.muted,
  },
  note: {
    color: palette.muted,
    textAlign: 'center',
    fontSize: 12,
  },
});
