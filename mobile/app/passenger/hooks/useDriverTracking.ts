import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'https://hamrobus-auos.onrender.com';

interface DriverLocation {
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
  timestamp: string;
  sosActive?: boolean;
  sosCategory?: string;
  isOffline?: boolean;
}

interface UseDriverTrackingProps {
  busIds: string[];
  enabled: boolean;
}

export const useDriverTracking = ({ busIds, enabled }: UseDriverTrackingProps) => {
  const [driverLocationsByDriverId, setDriverLocationsByDriverId] = useState<Record<string, DriverLocation>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const normalizedBusIds = busIds
    .map((id) => String(id || '').trim())
    .filter((id) => id.length > 0);

  const trackedBusIdsSet = new Set(normalizedBusIds);

  useEffect(() => {

    if (!enabled || normalizedBusIds.length === 0) {
      setDriverLocationsByDriverId({});
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }


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

      socket.emit('passenger:track-buses', { busIds: normalizedBusIds });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError('Failed to connect to tracking server');
      setIsConnected(false);
    });

    socket.on('driver:location-update', (data: DriverLocation) => {

      if (trackedBusIdsSet.has(data.busId)) {
        setDriverLocationsByDriverId((prev) => ({
          ...prev,
          [data.driverId]: {
            ...(prev[data.driverId] || {}),
            ...data,
            isOffline: false,
            tripStatus: data.tripStatus && data.tripStatus !== 'offline' ? data.tripStatus : 'in-progress',
          },
        }));
      } else {
      }
    });

    socket.on('driver:sos', (data: Partial<DriverLocation> & { driverId?: string; busId?: string; category?: string }) => {
      if (!data?.busId || !trackedBusIdsSet.has(String(data.busId))) return;

      setDriverLocationsByDriverId((prev) => {
        const next = { ...prev };
        const driverId = String(data.driverId || next[Object.keys(next).find((key) => String(next[key].busId) === String(data.busId)) || '']?.driverId || '');
        const existingKey = Object.keys(next).find((key) => String(next[key].busId) === String(data.busId)) || driverId;
        if (!existingKey) return prev;

        next[existingKey] = {
          ...next[existingKey],
          ...data,
          sosActive: true,
          sosCategory: data.category || next[existingKey]?.sosCategory,
          tripStatus: 'sos-active',
          isOffline: false,
        };
        return next;
      });
    });

    socket.on('driver:sos-cleared', (data: Partial<DriverLocation> & { driverId?: string; busId?: string }) => {
      if (!data?.busId || !trackedBusIdsSet.has(String(data.busId))) return;

      setDriverLocationsByDriverId((prev) => {
        const next = { ...prev };
        const existingKey = Object.keys(next).find((key) => String(next[key].busId) === String(data.busId));
        if (!existingKey) return prev;

        next[existingKey] = {
          ...next[existingKey],
          ...data,
          sosActive: false,
          sosCategory: undefined,
          tripStatus: 'in-progress',
          isOffline: false,
        };
        return next;
      });
    });

    socket.on('driver:status-update', (data: Partial<DriverLocation> & { driverId: string; busId?: string }) => {
      if (!data?.driverId) return;
      if (data.busId && !trackedBusIdsSet.has(String(data.busId))) return;

      setDriverLocationsByDriverId((prev) => {
        const existing = prev[data.driverId];
        if (!existing) return prev;
        return {
          ...prev,
          [data.driverId]: {
            ...existing,
            ...data,
            isOffline: data.tripStatus === 'offline' ? true : false,
          } as DriverLocation,
        };
      });
    });

    socket.on('driver:location-offline', (data: { driverId: string; busId?: string }) => {
      if (!data?.driverId) return;
      if (data.busId && !trackedBusIdsSet.has(data.busId)) return;

      setDriverLocationsByDriverId((prev) => {
        const existing = prev[data.driverId];
        if (!existing) return prev;

        const next = { ...prev };
        delete next[data.driverId];
        return next;
      });
    });

    return () => {
      if (socket) {
        socket.emit('passenger:stop-tracking-buses', { busIds: normalizedBusIds });
        socket.disconnect();
      }
    };
  }, [enabled, normalizedBusIds.join('|')]);

  return {
    driverLocations: Object.values(driverLocationsByDriverId),
    isConnected,
    error,
  };
};
