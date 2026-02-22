import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'http://10.0.2.2:3000';

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

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        // Get driver data from AsyncStorage
        const driverProfile = await AsyncStorage.getItem('driverProfile');
        const user = await AsyncStorage.getItem('user');
        
        if (driverProfile && user) {
          const driver = JSON.parse(driverProfile);
          const userData = JSON.parse(user);
          
          driverDataRef.current = {
            driverId: driver.id,
            busId: driver.assignedBus?._id || driver.assignedBus || '',
          };

          // Initialize socket connection
          const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
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
    try {
      if (!hasPermission) {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) return;
      }

      // Get initial location
      await getCurrentLocation();

      // Watch for location changes
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Or when moved 10 meters
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

          setLocation(coords);
          setError(null);

          // Emit location to server
          emitLocationToServer(coords);
        }
      );

      setWatchId(subscription);
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start tracking';
      setError(message);
      setLoading(false);
    }
  }, [hasPermission, requestPermission, getCurrentLocation, emitLocationToServer]);

  // Stop tracking location
  const stopTracking = useCallback(() => {
    if (watchId) {
      watchId.remove();
      setWatchId(null);
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