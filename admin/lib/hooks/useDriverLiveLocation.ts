import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DriverLocation {
  busId: string;
  busNumber?: string;
  driverId: string;
  driverName?: string;
  driverProfileImgUrl?: string;
  tripStatus?: string;
  isOnBreak?: boolean;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy?: number;
  timestamp: string;
  isOffline?: boolean;
}

interface UseDriverLiveLocationReturn {
  locations: Map<string, DriverLocation>;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  joinAdminRoom: () => void;
  leaveAdminRoom: () => void;
}

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://hamrobus-auos.onrender.com';

export const useDriverLiveLocation = (): UseDriverLiveLocationReturn => {
  const [locations, setLocations] = useState<Map<string, DriverLocation>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const initSocket = () => {
      try {
        const socket = io(SOCKET_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setIsConnected(true);
          setError(null);
          socket.emit('join-admin');
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.error(' Socket connection error:', err);
          setIsConnected(false);
          setError('Connection error');
        });

        socket.on('driver:location-update', (data: DriverLocation) => {
          setLocations((prev) => {
            const newLocations = new Map(prev);
            newLocations.set(data.driverId, {
              ...(newLocations.get(data.driverId) || {}),
              ...data,
              isOffline: false,
              tripStatus: data.tripStatus && data.tripStatus !== 'offline' ? data.tripStatus : 'in-progress',
            });
            return newLocations;
          });
        });

        socket.on('driver:status-update', (data: Partial<DriverLocation> & { driverId: string }) => {
          if (!data?.driverId) return;

          setLocations((prev) => {
            const newLocations = new Map(prev);
            const existing = newLocations.get(data.driverId);
            if (!existing) return newLocations;

            newLocations.set(data.driverId, {
              ...existing,
              ...data,
              isOffline: data.tripStatus === 'offline',
            });
            return newLocations;
          });
        });

        socket.on('driver:location-offline', (data: { driverId: string }) => {
          if (!data?.driverId) return;

          setLocations((prev) => {
            const newLocations = new Map(prev);
            const existing = newLocations.get(data.driverId);
            if (!existing) return newLocations;

            newLocations.set(data.driverId, {
              ...existing,
              isOffline: true,
              tripStatus: 'offline',
            });
            return newLocations;
          });
        });
      } catch (err) {
        console.error('Error initializing socket:', err);
        setError('Failed to initialize socket');
      }
    };

    initSocket();

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
    }
  }, []);

  const leaveAdminRoom = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave-admin');
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
