/**
 * SPLASH SCREEN
 * 
 * This component is rendered FIRST on app launch.
 * It waits for auth state to be restored from AsyncStorage BEFORE
 * rendering the login screen or app navigation.
 * 
 * This prevents the race condition where login is shown before tokens are restored.
 */

import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';
import MainLogo from '../utils/MainLogo.png';

export default function SplashScreen() {
  const { isLoading, token, user, driver, passenger } = useAuth();

  useEffect(() => {
    // Once auth loading is complete, determine where to navigate
    if (!isLoading) {
      if (token && user) {
        // User has valid token and user data, navigate to app
        if (driver?.id) {
          // User is a driver
          router.replace('/driver/app');
        } else if (passenger?.id) {
          // User is a passenger
          router.replace('/passenger/(tabs)/home');
        } else {
          // User data exists but no driver/passenger profile, navigate to login
          router.replace('/pages/mobilelogin');
        }
      } else {
        // No auth data, navigate to login
        router.replace('/pages/mobilelogin');
      }
    }
  }, [isLoading, token, user, driver, passenger]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={MainLogo} resizeMode="contain" style={styles.logo} />
        <Text style={styles.appName}>HamroBus</Text>
        <Text style={styles.subtitle}>Loading your session...</Text>
      </View>

      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#27AE60" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 60,
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  loaderContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
});
