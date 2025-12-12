import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  onSOSPress: () => void;
  isOnline: boolean;
} 
export default function HomeScreen({ onSOSPress, isOnline }: Props) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}