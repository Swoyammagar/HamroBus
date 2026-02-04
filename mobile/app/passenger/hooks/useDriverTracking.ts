import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'http://10.0.2.2:3000';

interface DriverLocation {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: string;
}

interface UseDriverTrackingProps {
  busId: string | null;
  enabled: boolean;
}

export const useDriverTracking = ({ busId, enabled }: UseDriverTrackingProps) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !busId) {
      // Cleanup if disabled or no busId
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected to socket server');
      setIsConnected(true);
      setError(null);
      
      // Join the bus tracking room
      socket.emit('passenger:track-bus', { busId });
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from socket server');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Failed to connect to tracking server');
      setIsConnected(false);
    });

    // Listen for driver location updates
    socket.on('driver:location-update', (data: DriverLocation) => {
      if (data.busId === busId) {
        console.log('📍 Received driver location:', data);
        setDriverLocation(data);
      }
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.emit('passenger:stop-tracking', { busId });
        socket.disconnect();
      }
    };
  }, [busId, enabled]);

  return {
    driverLocation,
    isConnected,
    error,
  };
};