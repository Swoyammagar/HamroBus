import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { palette } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import MapScreen from '../screens/MapScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type RootTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Map: undefined;
  History: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

interface RootNavigatorProps {
  isOnline: boolean;
  onSOS: () => void;
}

export default function RootNavigator({ isOnline, onSOS }: RootNavigatorProps) {
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
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Feather.glyphMap> = {
            Home: 'home',
            Schedule: 'calendar',
            Map: 'map',
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

      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
