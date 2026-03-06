import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DriverLocation {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy?: number;
  timestamp: string;
}

interface UseDriverLocationReturn {
  location: DriverLocation | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  startTracking: (busId: string) => void;
  stopTracking: (busId: string) => void;
}

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000';

export const useDriverLocation = (): UseDriverLocationReturn => {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const trackedBusRef = useRef<string | null>(null);

  useEffect(() => {
    const initSocket = () => {
      try {
        // Initialize socket connection
        const socket = io(SOCKET_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ Passenger socket connected:', socket.id);
          setIsConnected(true);
          setError(null);
        });

        socket.on('disconnect', () => {
          console.log('❌ Passenger socket disconnected');
          setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.error('❌ Socket connection error:', err);
          setIsConnected(false);
          setError('Connection error');
        });

        // Listen to driver location updates for the tracked bus
        socket.on('driver:location-update', (data: DriverLocation) => {
          if (trackedBusRef.current && data.busId === trackedBusRef.current) {
            console.log('📍 Received driver location for tracked bus:', data);
            setLocation(data);
          }
        });
      } catch (err) {
        console.error('Error initializing socket:', err);
        setError('Failed to initialize socket');
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

  const startTracking = useCallback((busId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      trackedBusRef.current = busId;
      socketRef.current.emit('passenger:track-bus', { busId });
      console.log(`📡 Started tracking bus ${busId}`);
      setLoading(true);
    }
  }, []);

  const stopTracking = useCallback((busId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('passenger:stop-tracking', { busId });
      setLocation(null);
      trackedBusRef.current = null;
      console.log(`🛑 Stopped tracking bus ${busId}`);
    }
  }, []);

  return {
    location,
    loading,
    error,
    isConnected,
    startTracking,
    stopTracking,
  };
};
