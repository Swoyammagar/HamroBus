import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PassengerProvider } from './context/PassengerContext';

export default function PassengerLayout() {
  return (
    <PassengerProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'default',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="screens/bus-booking"
          options={{
            animation: 'default',
          }}
        />
        <Stack.Screen
          name="screens/review"
          options={{
            animation: 'default',
          }}
        />
      </Stack>
    </PassengerProvider>
  );
}
