import 'react-native-gesture-handler';
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import RootNavigator from './navigation/RootNavigator';
import Header from './component/DriverHeader';
import SideMenu from './component/SideMenu';
import EmergencySOSModal from './component/EmergencySOSModal';
import { palette } from './theme';
import { useAuth } from '../context/AuthContext';
import { AppProvider } from './context/AppContext';
import {
  notifyIncomingNotification,
  subscribeIncomingNotification,
  type DriverIncomingNotificationPayload,
} from './services/notificationEvents';
import driverNotificationSocket from './services/driverNotificationSocket';

export interface DriverToast {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export default function App() {
  const [isOnline, setIsOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const { getCurrentUser, isLoading, token, user, driver } = useAuth();
  const [toast, setToast] = useState<DriverToast | null>(null);
  const currentDriverId = useMemo(
    () => String(driver?.id || (user as any)?.id || user?._id || '').trim(),
    [driver?.id, user?._id, (user as any)?.id]
  );

  const severityColorMap: Record<'low' | 'medium' | 'high' | 'critical', string> = {
    low: '#059669',
    medium: '#2563eb',
    high: '#d97706',
    critical: '#dc2626',
  };


  // ✅ FETCH CURRENT USER DATA ONLY AFTER AUTH IS LOADED
  useEffect(() => {
    if (!isLoading && token) {
      const loadUserData = async () => {
        await getCurrentUser();
      };
      loadUserData();
    }
  }, [isLoading, token]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeIncomingNotification((payload: DriverIncomingNotificationPayload) => {
      const id = String(payload?._id || payload?.id || Date.now());
      const title = String(payload?.title || 'Notification');
      const message = String(payload?.message || '');
      const severity = (payload?.severity || 'medium') as 'low' | 'medium' | 'high' | 'critical';
      setToast({ id, title, message, severity });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3500);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!currentDriverId) return;

    let mounted = true;

    const setupSocket = async () => {
      await driverNotificationSocket.connect(currentDriverId);

      const onIncoming = (payload: DriverIncomingNotificationPayload) => {
        if (!mounted) return;
        notifyIncomingNotification(payload);
      };

      driverNotificationSocket.onNotification(onIncoming);

      return () => {
        driverNotificationSocket.offNotification(onIncoming);
      };
    };

    const teardownPromise = setupSocket();

    return () => {
      mounted = false;
      teardownPromise.then((teardown) => teardown && teardown());
      driverNotificationSocket.disconnect();
    };
  }, [currentDriverId]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
          <AppProvider>
            {/* EVERYTHING inside SafeAreaView */}
            <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

            {/* Header (always safe-area aware) */}
            <Header
              isOnline={isOnline}
              onToggleOnline={() => setIsOnline(prev => !prev)}
              onMenuPress={() => setMenuOpen(true)}
            />

            {/* Main App Navigation */}
            <View style={styles.content}>
              <RootNavigator
                isOnline={isOnline}
                onSOS={() => setShowSOS(true)}
              />
            </View>

            {/* SOS Modal */}
            <EmergencySOSModal
              visible={showSOS}
              onClose={() => setShowSOS(false)}
            />

            {/* Side Menu (overlay) */}
            <SideMenu
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              isOnline={isOnline}
            />
            {/* Toast Notification */}
            {toast ? (
              <View style={styles.toastWrap} pointerEvents='box-none'>
                <Pressable
                  onPress={() => setToast(null)}
                  style={[styles.toastCard, { borderLeftColor: severityColorMap[toast.severity] }]}
                >
                  <Text style={styles.toastTitle} numberOfLines={1}>{toast.title}</Text>
                  <Text style={styles.toastMessage} numberOfLines={2}>{toast.message}</Text>  
                </Pressable>
              </View>
            ) : null}


            <StatusBar style="dark" />

          </SafeAreaView>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flex: 1,
  },
  toastWrap: {
    position: 'absolute',
    top: 74,
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