import { useState, useEffect } from 'react';
import { routeService, type Schedule } from '../services/routeService';

export const useRouteSchedules = (routeId?: string | null) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    if (!routeId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await routeService.getSchedulesByRoute(routeId);
      setSchedules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch schedules');
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [routeId]);

  return {
    schedules,
    loading,
    error,
    refreshSchedules: fetchSchedules,
  };
};
