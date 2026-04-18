import React from 'react';
import { Stack } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PassengerProvider, usePassenger } from './context/PassengerContext';

const PassengerShell = () => {
  const { currentToast, dismissToast } = usePassenger();

  const severityColor = (() => {
    switch (currentToast?.severity) {
      case 'critical':
        return '#991b1b';
      case 'high':
        return '#b45309';
      case 'medium':
        return '#1d4ed8';
      case 'low':
      default:
        return '#065f46';
    }
  })();

  return (
    <View style={styles.shell}>
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

      {currentToast ? (
        <View style={styles.toastWrap} pointerEvents="box-none">
          <Pressable
            onPress={dismissToast}
            style={[styles.toastCard, { borderLeftColor: severityColor }]}
          >
            <Text style={styles.toastTitle} numberOfLines={1}>
              {currentToast.title}
            </Text>
            <Text style={styles.toastMessage} numberOfLines={2}>
              {currentToast.message}
            </Text>
            <Text style={styles.toastHint}>Tap to dismiss</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

export default function PassengerLayout() {
  return (
    <PassengerProvider>
      <PassengerShell />
    </PassengerProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  toastWrap: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    zIndex: 999,
  },
  toastCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 12,
    color: '#374151',
  },
  toastHint: {
    marginTop: 6,
    fontSize: 11,
    color: '#6b7280',
  },
});
