import React from 'react';
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing } from '../theme';

interface HeaderProps {
  isOnline: boolean;
  onToggleOnline: () => void;
  onMenuPress: () => void;
}

export default function Header({ isOnline, onToggleOnline, onMenuPress }: HeaderProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onMenuPress} style={styles.iconButton} accessibilityLabel="Open menu">
        <Feather name="menu" size={24} color={palette.text} />
      </Pressable>
      <View style={styles.statusRow}>
        <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        <Switch
          value={isOnline}
          onValueChange={onToggleOnline}
          thumbColor="#FFFFFF"
          trackColor={{ false: palette.border, true: palette.success }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    padding: spacing.sm,
    borderRadius: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    color: palette.text,
    fontWeight: '600',
  },
});
