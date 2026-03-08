import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import RootNavigator from './navigation/RootNavigator';
import Header from './component/DriverHeader';
import SideMenu from './component/SideMenu';
import AnnouncementBanner from './component/AnnouncementBanner';
import EmergencySOSModal from './component/EmergencySOSModal';
import { palette } from './theme';
import { useAuth } from '../context/AuthContext';
import { AppProvider } from './context/AppContext';

export default function App() {
  const [isOnline, setIsOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const { getCurrentUser, isLoading, token } = useAuth();

  const [announcement, setAnnouncement] = useState({
    show: true,
    message: 'Route 42 - Minor delay expected on Main St due to traffic',
    type: 'warning' as 'info' | 'warning' | 'emergency',
  });

  // ✅ FETCH CURRENT USER DATA ONLY AFTER AUTH IS LOADED
  useEffect(() => {
    if (!isLoading && token) {
      const loadUserData = async () => {
        await getCurrentUser();
      };
      loadUserData();
    }
  }, [isLoading, token]);

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

            {/* Announcements */}
            {announcement.show && (
              <AnnouncementBanner
                message={announcement.message}
                type={announcement.type}
                onClose={() => setAnnouncement({ ...announcement, show: false })}
              />
            )}

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
});