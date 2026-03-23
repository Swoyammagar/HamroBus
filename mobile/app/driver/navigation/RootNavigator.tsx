import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { palette } from '../theme';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../services/notificationService';
import driverNotificationSocket from '../services/driverNotificationSocket';
import {
  notifyIncomingNotification,
  subscribeNotificationAllRead,
  subscribeNotificationReadChange,
} from '../services/notificationEvents';

import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import MapScreen from '../screens/MapScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

export type RootTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Map: undefined;
  Notifications: undefined;
  History: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

interface RootNavigatorProps {
  isOnline: boolean;
  onSOS: () => void;
}

export default function RootNavigator({ isOnline, onSOS }: RootNavigatorProps) {
  const { user, driver } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const currentDriverId = useMemo(
    () => String(driver?.id || user?._id || '').trim(),
    [driver?.id, user?._id]
  );

  const refreshUnreadCount = useCallback(async () => {
    if (!currentDriverId) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await notificationService.getDriverNotifications();
      const unread = data.filter((item) => {
        const isRead = (item.readBy || []).some((entry) => {
          const readUserId = String(entry?.userId || '').trim();
          return readUserId === currentDriverId;
        });
        return !isRead;
      }).length;

      setUnreadCount(unread);
    } catch (error) {
      // Avoid noisy runtime logs when backend is temporarily unavailable.
      // Badge will still update from socket events and on next successful refresh.
    }
  }, [currentDriverId]);

  useEffect(() => {
    if (!currentDriverId) return;

    let mounted = true;

    const setupSocket = async () => {
      await driverNotificationSocket.connect(currentDriverId);

      const onIncoming = (payload: any) => {
        if (!mounted) return;
        notifyIncomingNotification(payload);
        setUnreadCount((prev) => prev + 1);
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

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const unsubscribe = subscribeNotificationReadChange(() => {
      // Keep badge responsive even when the backend call fails.
      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));

      // Best-effort sync with backend; if offline, keep local state and retry on focus.
      refreshUnreadCount().catch(() => {
        // no-op
      });
    });

    return unsubscribe;
  }, [refreshUnreadCount]);

  useEffect(() => {
    const unsubscribe = subscribeNotificationAllRead(() => {
      setUnreadCount(0);
    });

    return unsubscribe;
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: palette.border,
          paddingVertical: 8,
          height: 70,
        },
        tabBarBadge:
          route.name === 'Notifications' && unreadCount > 0 ? unreadCount : undefined,
        tabBarBadgeStyle: {
          backgroundColor: '#dc2626',
          color: '#fff',
          fontSize: 10,
          minWidth: 18,
          height: 18,
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Feather.glyphMap> = {
            Home: 'home',
            Schedule: 'calendar',
            Map: 'map',
            Notifications: 'bell',
            History: 'clock',
            Profile: 'user',
          };

          return <Feather name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home">
        {() => <HomeScreen isOnline={isOnline} onSOSPress={onSOS} />}
      </Tab.Screen>

      <Tab.Screen name="Schedule" component={ScheduleScreen} />

      <Tab.Screen name="Map">
        {() => <MapScreen isOnline={isOnline} />}
      </Tab.Screen>

      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        listeners={{
          focus: () => {
            refreshUnreadCount();
          },
        }}
      />

      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
