import { useState, useEffect } from 'react';
import { routeService, Route } from '../services/routeService';

export const useRoutes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoutes = async () => {
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
  };

  const refreshRoutes = async () => {
    setRefreshing(true);
    await fetchRoutes();
  };

  const searchRoutes = async (query: string) => {
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
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  return {
    routes,
    loading,
    error,
    refreshing,
    refreshRoutes,
    searchRoutes,
  };
};