import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  style,
}) => {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text`]]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Variants
  success: {
    backgroundColor: '#d1fae5',
  },
  successText: {
    color: '#065f46',
  },
  
  warning: {
    backgroundColor: '#fef3c7',
  },
  warningText: {
    color: '#92400e',
  },
  
  danger: {
    backgroundColor: '#fee2e2',
  },
  dangerText: {
    color: '#991b1b',
  },
  
  info: {
    backgroundColor: '#dbeafe',
  },
  infoText: {
    color: '#1e40af',
  },
  
  neutral: {
    backgroundColor: '#f3f4f6',
  },
  neutralText: {
    color: '#374151',
  },
});
