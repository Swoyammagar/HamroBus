import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing } from '../theme';

interface Props {
  message: string;
  type: 'info' | 'warning' | 'emergency';
  onClose: () => void;
}

const typeColor: Record<Props['type'], string> = {
  info: palette.primary,
  warning: '#D97706',
  emergency: palette.danger,
};

export default function AnnouncementBanner({ message, type, onClose }: Props) {
  return (
    <View style={[styles.container, { borderLeftColor: typeColor[type] }]}> 
      <Feather name="alert-circle" size={18} color={typeColor[type]} />
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <Feather name="x" size={18} color={palette.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFF9ED',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    borderLeftWidth: 4,
  },
  text: {
    flex: 1,
    color: palette.text,
  },
});
