import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { palette } from '../theme';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../services/notificationService';
import {
  subscribeIncomingNotification,
  subscribeNotificationAllRead,
  subscribeNotificationReadChange,
} from '../services/notificationEvents';

import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import MapScreen from '../screens/MapScreen';
import HistoryScreen from '../screens/HistoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

export type RootTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Map: undefined;
  Notifications: undefined;
  History: undefined;
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
    () => String(driver?.id || (user as any)?.id || user?._id || '').trim(),
    [driver?.id, user?._id, (user as any)?.id]
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
    }
  }, [currentDriverId]);

  useEffect(() => {
    const unsubscribe = subscribeIncomingNotification(() => {
      setUnreadCount((prev) => prev + 1);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const unsubscribe = subscribeNotificationReadChange(() => {
      setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));

      refreshUnreadCount().catch(() => {
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
    </Tab.Navigator>
  );
}
