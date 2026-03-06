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

interface UseDriverLiveLocationReturn {
  locations: Map<string, DriverLocation>;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  joinAdminRoom: () => void;
  leaveAdminRoom: () => void;
}

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000';

export const useDriverLiveLocation = (): UseDriverLiveLocationReturn => {
  const [locations, setLocations] = useState<Map<string, DriverLocation>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

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
          console.log('✅ Admin socket connected:', socket.id);
          setIsConnected(true);
          setError(null);
          // Join admin room to receive all driver location updates
          socket.emit('join-admin');
        });

        socket.on('disconnect', () => {
          console.log('❌ Admin socket disconnected');
          setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.error('❌ Socket connection error:', err);
          setIsConnected(false);
          setError('Connection error');
        });

        // Listen to driver location updates
        socket.on('driver:location-update', (data: DriverLocation) => {
          console.log('📍 Received driver location:', data);
          setLocations((prev) => {
            const newLocations = new Map(prev);
            newLocations.set(data.driverId, data);
            return newLocations;
          });
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

  const joinAdminRoom = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join-admin');
      console.log('📡 Joined admin room');
    }
  }, []);

  const leaveAdminRoom = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave-admin');
      console.log('🛑 Left admin room');
    }
  }, []);

  return {
    locations,
    loading,
    error,
    isConnected,
    joinAdminRoom,
    leaveAdminRoom,
  };
};
