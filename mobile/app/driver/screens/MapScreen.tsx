import React from 'react';
import { View, Text } from 'react-native';
export default function MapScreen({isOnline}: {isOnline: boolean}) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Map Screen</Text>
    </View>
  );
}