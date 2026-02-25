import { useState, useEffect } from 'react';
import { busService, Bus, Driver } from '../services/busService';

export const useBuses = (routeId?: string) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBuses = async () => {
    if (!routeId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await busService.getBusesByRoute(routeId);
      setBuses(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch buses');
      console.error('Error fetching buses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeId) {
      fetchBuses();
    }
  }, [routeId]);

  return {
    buses,
    loading,
    error,
    refreshBuses: fetchBuses,
  };
};

export const useDriverInfo = (driverId?: string) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDriver = async () => {
    if (!driverId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await busService.getDriverById(driverId);
      setDriver(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch driver info');
      console.error('Error fetching driver:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId) {
      fetchDriver();
    }
  }, [driverId]);

  return {
    driver,
    loading,
    error,
  };
};