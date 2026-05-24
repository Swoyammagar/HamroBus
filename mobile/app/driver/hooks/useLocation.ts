import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerDriverTrackingPauser,
  registerDriverTrackingStopper,
  unregisterDriverTrackingPauser,
  unregisterDriverTrackingStopper,
  registerDriverTrackingStarter,
  unregisterDriverTrackingStarter
} from '../../services/driverTrackingControl';

const SOCKET_URL = (process.env.EXPO_PUBLIC_API_BASE?.trim().replace('/api', '') || 'https://hamrobus-auos.onrender.com').trim();

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

interface UseLocationReturn {
  location: LocationCoords | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  pauseTrackingForBreak: () => void;
  hasPermission: boolean;
  isSocketConnected: boolean;
}

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [watchId, setWatchId] = useState<Location.LocationSubscription | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const driverDataRef = useRef<{ driverId: string; busId: string } | null>(null);
  const trackingStartedRef = useRef(false); // ✅ Prevent duplicate watch listeners
  const trackingActiveRef = useRef(false);

  // Helper function to initialize socket connection
  const ensureSocketConnection = useCallback(async () => {
    // If socket already exists and is connected, reuse it
    if (socketRef.current?.connected) {
      console.log('✅ Socket already connected, reusing:', socketRef.current.id);
      return;
    }

    try {
      // Get driver data from AsyncStorage
      const driverProfile = await AsyncStorage.getItem('driverProfile');
      const user = await AsyncStorage.getItem('user');
      
      if (!driverProfile || !user) {
        console.warn('⚠️ Driver profile or user not found in AsyncStorage');
        return;
      }

      const driver = JSON.parse(driverProfile);
      
      driverDataRef.current = {
        driverId: driver.id,
        busId: driver.assignedBus?._id || driver.assignedBus || '',
      };

      // Initialize socket connection
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        randomizationFactor: 0.5,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Driver socket connected:', socket.id);
        setIsSocketConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('❌ Driver socket disconnected');
        setIsSocketConnected(false);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setIsSocketConnected(false);
      });

      socket.on('reconnect_attempt', (attempt) => {
        console.warn(`🔄 Driver socket reconnect attempt #${attempt}`);
      });

      socket.on('reconnect_failed', () => {
        console.error('❌ Driver socket reconnect failed (will keep retrying with current settings)');
        setIsSocketConnected(false);
      });
    } catch (err) {
      console.error('Error initializing socket:', err);
    }
  }, []);

  // Initialize socket connection on mount
  useEffect(() => {
    ensureSocketConnection();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [ensureSocketConnection]);

  // Emit location to server via socket
  const emitLocationToServer = useCallback((locationData: LocationCoords) => {
    if (!trackingActiveRef.current) {
      return;
    }

    if (socketRef.current && socketRef.current.connected && driverDataRef.current) {
      const { driverId, busId } = driverDataRef.current;
      
      if (!busId) {
        console.warn('⚠️ No bus assigned to driver, skipping location broadcast');
        return;
      }

      const locationPayload = {
        busId,
        driverId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        heading: locationData.heading || 0,
        speed: locationData.speed ? Math.abs(locationData.speed * 3.6) : 0, // Convert m/s to km/h
        accuracy: locationData.accuracy,
        timestamp: new Date().toISOString(),
      };

      socketRef.current.emit('driver:share-location', locationPayload);
      console.log('📍 Location broadcast:', locationPayload);
    }
  }, []);

  // Request location permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setHasPermission(true);
        setError(null);
        return true;
      } else {
        setError('Location permission denied');
        setHasPermission(false);
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request permission';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const locationData: LocationCoords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
        altitude: currentLocation.coords.altitude,
        heading: currentLocation.coords.heading,
        speed: currentLocation.coords.speed,
      };

      setLocation(locationData);
      setError(null);

      // Emit location to server
      emitLocationToServer(locationData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get location';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [emitLocationToServer]);

  // Start tracking location
  const startTracking = useCallback(async (): Promise<void> => {
    // ✅ Prevent multiple concurrent tracking starts
    if (trackingStartedRef.current) {
      console.log('⏳ [startTracking] Already in progress, skipping duplicate');
      return;
    }

    if (trackingActiveRef.current && watchRef.current) {
      console.log('[startTracking] Tracking already active, skipping duplicate watch');
      return;
    }

    trackingStartedRef.current = true;

    try {
      setLoading(true);
      setError(null);
      console.log('📍 [startTracking] Starting...');

      // Ensure socket is connected before starting location tracking
      await ensureSocketConnection();

      // Check/request permission first
      let hasPermissionGranted = hasPermission;
      if (!hasPermissionGranted) {
        console.log('📍 [startTracking] No permission, requesting...');
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          console.log('❌ [startTracking] Permission denied');
          setLoading(false);
          trackingStartedRef.current = false;
          return;
        }
        hasPermissionGranted = true;
      }

      console.log('📍 [startTracking] Getting initial location...');
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      trackingActiveRef.current = true;

      const initialCoords: LocationCoords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
        altitude: currentLocation.coords.altitude,
        heading: currentLocation.coords.heading,
        speed: currentLocation.coords.speed,
      };

      console.log('📍 [startTracking] Initial location:', initialCoords);
      setLocation(initialCoords);
      emitLocationToServer(initialCoords);

      console.log('📍 [startTracking] Starting watch...');
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2000,
          distanceInterval: 0,
        },
        (locationData) => {
          const coords: LocationCoords = {
            latitude: locationData.coords.latitude,
            longitude: locationData.coords.longitude,
            accuracy: locationData.coords.accuracy || undefined,
            altitude: locationData.coords.altitude,
            heading: locationData.coords.heading,
            speed: locationData.coords.speed,
          };

          console.log('📍 [watch] Location updated:', coords);
          setLocation(coords);
          setError(null);
          emitLocationToServer(coords);
        }
      );

      watchRef.current = subscription;
      setWatchId(subscription);
      console.log('✅ [startTracking] Watch setup complete');
      setLoading(false);
      trackingStartedRef.current = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start tracking';
      console.error('❌ [startTracking] Error:', message, err);
      setError(message);
      setLoading(false);
      trackingActiveRef.current = false;
      trackingStartedRef.current = false;
    }
  }, [hasPermission, requestPermission, emitLocationToServer, ensureSocketConnection]);

  // Pause live GPS sharing during a trip break without marking the driver offline.
  const pauseTrackingForBreak = useCallback(() => {
    trackingActiveRef.current = false;

    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
      setWatchId(null);
    }

    trackingStartedRef.current = false;
    setLoading(false);
    console.log('[break] Location tracking paused; socket remains connected');
  }, []);

  // Stop tracking location
  const stopTracking = useCallback(() => {
    trackingActiveRef.current = false;

    // Emit offline event BEFORE stopping location tracking
    if (socketRef.current && socketRef.current.connected && driverDataRef.current) {
      const { driverId, busId } = driverDataRef.current;
      socketRef.current.emit('driver:go-offline', { driverId, busId });
      console.log('🛑 Driver offline emitted:', { driverId, busId });
    }

    // Stop watching location but KEEP socket connected so we can reconnect quickly
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
      setWatchId(null);
      trackingStartedRef.current = false;
      console.log('🛑 Location tracking stopped, but socket remains connected');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  useEffect(() => {
    registerDriverTrackingStopper(stopTracking);
    registerDriverTrackingStarter(startTracking);
    registerDriverTrackingPauser(pauseTrackingForBreak);

    return () => {
      unregisterDriverTrackingStopper(stopTracking);
      unregisterDriverTrackingStarter(startTracking);
      unregisterDriverTrackingPauser(pauseTrackingForBreak);
    };
  }, [stopTracking, startTracking, pauseTrackingForBreak]);

  return {
    location,
    loading,
    error,
    requestPermission,
    startTracking,
    stopTracking,
    pauseTrackingForBreak,
    hasPermission,
    isSocketConnected,
  };
};
