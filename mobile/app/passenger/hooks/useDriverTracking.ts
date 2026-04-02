import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'https://hamrobus-auos.onrender.com';

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
    console.log('🔍 [PASSENGER] useDriverTracking effect called with:', {
      enabled,
      busIds: normalizedBusIds,
      shouldConnect: enabled && normalizedBusIds.length > 0
    });
    
    if (!enabled || normalizedBusIds.length === 0) {
      console.log('⚠️ [PASSENGER] Tracking not enabled or no busIds, skipping socket connection');
      setDriverLocationsByDriverId({});
      // Cleanup if disabled or no busId
      if (socketRef.current) {
        console.log('🧹 [PASSENGER] Cleaning up existing socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    console.log('🚀 [PASSENGER] Initializing socket connection to:', SOCKET_URL);
    
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
      console.log('✅ [PASSENGER] Connected to socket server, socket ID:', socket.id);
      console.log('📍 [PASSENGER] Tracking buses:', normalizedBusIds);
      setIsConnected(true);
      setError(null);
      
      // Join all bus tracking rooms for selected route
      socket.emit('passenger:track-buses', { busIds: normalizedBusIds });
      console.log('✅ [PASSENGER] Emitted passenger:track-buses for busIds:', normalizedBusIds);
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
      console.log('📍 [PASSENGER] Received driver:location-update event:', {
        receivedBusId: data.busId,
        trackedBusIds: normalizedBusIds,
        matches: trackedBusIdsSet.has(data.busId),
        driverId: data.driverId,
        lat: data.latitude,
        lng: data.longitude,
        speed: data.speed
      });
      
      if (trackedBusIdsSet.has(data.busId)) {
        console.log('✅ [PASSENGER] Bus ID matches tracked route! Updating driver location');
        setDriverLocationsByDriverId((prev) => ({
          ...prev,
          [data.driverId]: data,
        }));
      } else {
        console.log('⚠️ [PASSENGER] Bus ID mismatch, ignoring update');
      }
    });

    socket.on('driver:location-offline', (data: { driverId: string; busId?: string }) => {
      if (!data?.driverId) return;
      if (data.busId && !trackedBusIdsSet.has(data.busId)) return;

      console.log('🛑 [PASSENGER] Driver offline received:', data);
      setDriverLocationsByDriverId((prev) => {
        const updated = { ...prev };
        delete updated[data.driverId];
        return updated;
      });
    });

    // Cleanup on unmount
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