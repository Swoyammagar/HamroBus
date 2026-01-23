import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PassengerProvider } from './context/PassengerContext';

export default function PassengerLayout() {
  return (
    <PassengerProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="screens/route-map"
          options={{
            animationEnabled: true,
          }}
        />
        <Stack.Screen
          name="screens/bus-booking"
          options={{
            animationEnabled: true,
          }}
        />
        <Stack.Screen
          name="screens/review"
          options={{
            animationEnabled: true,
          }}
        />
      </Stack>
    </PassengerProvider>
  );
}
