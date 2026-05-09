import React from "react";
import { Stack } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import "./global.css";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";
import { useAdmin } from "./context/AdminContext";

const GlobalAdminToast = () => {
  const { notification } = useAdmin();
  const toast = notification.currentToast;

  if (!toast) return null;

  const severityColor =
    toast.severity === 'critical'
      ? '#991b1b'
      : toast.severity === 'high'
        ? '#b45309'
        : toast.severity === 'medium'
          ? '#1d4ed8'
          : '#065f46';

  return (
    <View style={styles.toastWrap} pointerEvents="box-none">
      <Pressable onPress={notification.dismissToast} style={[styles.toastCard, { borderLeftColor: severityColor }]}> 
        <Text style={styles.toastTitle} numberOfLines={1}>
          {toast.title}
        </Text>
        <Text style={styles.toastMessage} numberOfLines={2}>
          {toast.message}
        </Text>
      </Pressable>
    </View>
  );
};


// Wrap the app with auth and shared admin domain provider
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminProvider>
        <View style={{ flex: 1 }}>
          <Stack>{children}</Stack>
          <GlobalAdminToast />
        </View>
      </AdminProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
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
});