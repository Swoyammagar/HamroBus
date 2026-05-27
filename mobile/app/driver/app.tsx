import 'react-native-gesture-handler';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Image,
} from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import RootNavigator from './navigation/RootNavigator';
import Header from './component/DriverHeader';
import SideMenu from './component/SideMenu';
import EmergencySOSModal from './component/EmergencySOSModal';

import { palette } from './theme';
import { useAuth } from '../context/AuthContext';
import { AppProvider } from './context/AppContext';

import {
  startDriverTrackingNow,
  forceStopDriverTracking,
} from '../services/driverTrackingControl';

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

  const sosOpenRef = React.useRef(false);

  const { getCurrentUser, isLoading, token, user, driver } =
    useAuth();

  const [toast, setToast] = useState<DriverToast | null>(
    null
  );

  const currentDriverId = useMemo(
    () =>
      String(
        driver?.id || (user as any)?.id || user?._id || ''
      ).trim(),
    [driver?.id, user?._id, (user as any)?.id]
  );

  const severityConfig = {
    critical: {
      color: '#dc2626',
      bg: '#fef2f2',
      icon: 'warning',
    },
    high: {
      color: '#d97706',
      bg: '#fffbeb',
      icon: 'alert-circle',
    },
    medium: {
      color: '#2563eb',
      bg: '#eff6ff',
      icon: 'information-circle',
    },
    low: {
      color: '#059669',
      bg: '#ecfdf5',
      icon: 'checkmark-circle',
    },
  };

  /**
   * AUTH GUARD
   */
  useEffect(() => {
    if (isLoading) return;

    if (!token) {
      console.warn(
        ' No auth token found - redirecting to login'
      );

      router.replace('/pages/mobilelogin');
      return;
    }

    if (!driver?.id) {
      console.warn(
        ' No driver data found - redirecting to login'
      );

      router.replace('/pages/mobilelogin');
      return;
    }

    const loadUserData = async () => {
      try {
        await getCurrentUser();
      } catch (err) {
        console.error('Failed to load current user:', err);
      }
    };

    loadUserData();
  }, [isLoading, token, driver?.id]);

  /**
   * TOAST LISTENER
   */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeIncomingNotification(
      (payload: DriverIncomingNotificationPayload) => {
        const id = String(
          payload?._id || payload?.id || Date.now()
        );

        const title = String(
          payload?.title || 'Notification'
        );

        const message = String(payload?.message || '');

        const severity = (
          payload?.severity || 'medium'
        ) as 'low' | 'medium' | 'high' | 'critical';

        setToast({
          id,
          title,
          message,
          severity,
        });

        if (timer) clearTimeout(timer);

        timer = setTimeout(() => {
          setToast(null);
        }, 3500);
      }
    );

    return () => {
      unsubscribe();

      if (timer) clearTimeout(timer);
    };
  }, []);

  /**
   * SOCKET SETUP
   */
  useEffect(() => {
    if (!currentDriverId) return;

    let mounted = true;

    const setupSocket = async () => {
      await driverNotificationSocket.connect(
        currentDriverId
      );

      const onIncoming = (
        payload: DriverIncomingNotificationPayload
      ) => {
        if (!mounted) return;

        notifyIncomingNotification(payload);
      };

      const onSosAlert = (payload: any) => {
        if (!mounted) return;


        if (!sosOpenRef.current) {
          sosOpenRef.current = true;
          setShowSOS(true);
        }

        const id = String(
          payload?._id ||
            payload?.notificationId ||
            Date.now()
        );

        const title = String(
          payload?.category || 'SOS Alert'
        );

        const message = `Emergency reported: ${
          payload?.details || 'Unknown emergency'
        }`;

        setToast({
          id,
          title,
          message,
          severity: 'critical',
        });
      };

      driverNotificationSocket.onNotification(
        onIncoming
      );

      driverNotificationSocket.onSosAlert(onSosAlert);

      return () => {
        driverNotificationSocket.offNotification(
          onIncoming
        );

        driverNotificationSocket.offSosAlert(
          onSosAlert
        );
      };
    };

    const teardownPromise = setupSocket();

    return () => {
      mounted = false;

      teardownPromise.then(
        (teardown) => teardown && teardown()
      );

      driverNotificationSocket.disconnect();
    };
  }, [currentDriverId]);

  /**
   * KEEP REF IN SYNC
   */
  useEffect(() => {
    sosOpenRef.current = !!showSOS;
  }, [showSOS]);

  const toastConfig = toast
    ? severityConfig[toast.severity]
    : severityConfig.medium;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <SafeAreaView
            style={styles.container}
            edges={['top', 'left', 'right']}
          >
            <Header
              isOnline={isOnline}
              onToggleOnline={async () => {
                const next = !isOnline;

                setIsOnline(next);

                if (next) {
                  try {
                    await startDriverTrackingNow();
                  } catch (err) {
                    console.error(
                      'Failed to start tracking:',
                      err
                    );
                  }
                } else {
                  try {
                    forceStopDriverTracking();
                  } catch (err) {
                    console.error(
                      'Failed to stop tracking:',
                      err
                    );
                  }
                }
              }}
              onMenuPress={() => setMenuOpen(true)}
            />

            <View style={styles.content}>
              <RootNavigator
                isOnline={isOnline}
                onSOS={() => setShowSOS(true)}
              />
            </View>

            <EmergencySOSModal
              visible={showSOS}
              onClose={() => setShowSOS(false)}
            />

            <SideMenu
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              isOnline={isOnline}
            />

            {toast ? (
              <View
                style={styles.toastWrap}
                pointerEvents="box-none"
              >
                <View
                  style={[
                    styles.toastCard,
                    {
                      backgroundColor: toastConfig.bg,
                      borderLeftColor: toastConfig.color,
                    },
                  ]}
                >
                  <View style={styles.leftSection}>
                    <Image
                      source={require('../utils/MainLogo.png')}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.contentSection}>
                    <View style={styles.headerRow}>
                      <View style={styles.titleWrap}>
                        <Ionicons
                          name={toastConfig.icon as any}
                          size={18}
                          color={toastConfig.color}
                        />

                        <Text
                          style={styles.toastTitle}
                          numberOfLines={1}
                        >
                          {toast.title}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => setToast(null)}
                        style={styles.closeButton}
                      >
                        <Ionicons
                          name="close"
                          size={18}
                          color="#6b7280"
                        />
                      </Pressable>
                    </View>

                    <Text
                      style={styles.toastMessage}
                      numberOfLines={2}
                    >
                      {toast.message}
                    </Text>
                  </View>
                </View>
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
    top: 78,
    left: 16,
    right: 16,
    zIndex: 9999,
  },

  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 18,
    borderLeftWidth: 5,

    paddingVertical: 14,
    paddingHorizontal: 14,

    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,

    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 8,
  },

  leftSection: {
    marginRight: 12,
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 14,
  },

  contentSection: {
    flex: 1,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },

  toastTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 6,
    flexShrink: 1,
  },

  toastMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4b5563',
    marginTop: 2,
    paddingRight: 8,
  },

  closeButton: {
    padding: 2,
  },
});
