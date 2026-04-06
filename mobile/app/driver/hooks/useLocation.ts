import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const driverDataRef = useRef<{ driverId: string; busId: string } | null>(null);
  const trackingStartedRef = useRef(false); // ✅ Prevent duplicate watch listeners

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        // Get driver data from AsyncStorage
        const driverProfile = await AsyncStorage.getItem('driverProfile');
        const user = await AsyncStorage.getItem('user');
        
        if (driverProfile && user) {
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
        }
      } catch (err) {
        console.error('Error initializing socket:', err);
      }
    };

    initSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Emit location to server via socket
  const emitLocationToServer = useCallback((locationData: LocationCoords) => {
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

    trackingStartedRef.current = true;

    try {
      setLoading(true);
      setError(null);
      console.log('📍 [startTracking] Starting...');
      
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
      // Get initial location immediately
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
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
      // Start watching for changes (don't wait for this)
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 0, // Fire even if stationary so backend gets regular heartbeats
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

      setWatchId(subscription);
      console.log('✅ [startTracking] Watch setup complete');
      setLoading(false); // Stop loading immediately after watch is set up
      trackingStartedRef.current = false; // ✅ Reset flag after successful setup
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start tracking';
      console.error('❌ [startTracking] Error:', message, err);
      setError(message);
      setLoading(false);
      trackingStartedRef.current = false; // ✅ Reset flag on error
    }
  }, [hasPermission, requestPermission, emitLocationToServer]);

  // Stop tracking location
  const stopTracking = useCallback(() => {
    if (socketRef.current && socketRef.current.connected && driverDataRef.current) {
      const { driverId, busId } = driverDataRef.current;
      socketRef.current.emit('driver:go-offline', { driverId, busId });
      console.log('🛑 Driver offline emitted:', { driverId, busId });
    }

    if (watchId) {
      watchId.remove();
      setWatchId(null);
      trackingStartedRef.current = false; // ✅ Reset ref when stopping
      console.log('🛑 Location tracking stopped');
    }
  }, [watchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    location,
    loading,
    error,
    requestPermission,
    startTracking,
    stopTracking,
    hasPermission,
    isSocketConnected,
  };
};