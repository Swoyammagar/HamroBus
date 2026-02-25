import { useState, useEffect, useCallback } from 'react';
import { routeService, Route } from '../services/routeService';

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await routeService.getAllRoutes();
      setRoutes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch routes');
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshRoutes = useCallback(async () => {
    setRefreshing(true);
    await fetchRoutes();
  }, [fetchRoutes]);

  const searchRoutes = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await routeService.searchRoutes(query);
      setRoutes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to search routes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  return {
    routes,
    loading,
    error,
    refreshing,
    refreshRoutes,
    searchRoutes,
  };
};