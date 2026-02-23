import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FloatingBusButtonProps {
  busCount: number;
  onPress: () => void;
}

const FloatingBusButton: React.FC<FloatingBusButtonProps> = ({ busCount, onPress }) => {
  return (
    <TouchableOpacity style={styles.floatingBusButton} onPress={onPress}>
      <Ionicons name="bus" size={24} color="#ffffff" />
      <View style={styles.busCountBadge}>
        <Text style={styles.busCountText}>{busCount}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingBusButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  busCountBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  busCountText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default FloatingBusButton;
