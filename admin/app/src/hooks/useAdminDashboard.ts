import { useCallback, useState } from 'react';
import {
  getAdminDashboardData,
  type DashboardSummary,
} from '../services/authService';

export const emptyDashboardSummary: DashboardSummary = {
  totalBuses: 0,
  totalDrivers: 0,
  totalRoutes: 0,
  totalSchedules: 0,
};

export const useAdminDashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary>(emptyDashboardSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAdminDashboardData();

      if (!result.success || !result.data) {
        const message = result.message || 'Unable to load dashboard data';
        setError(message);
        return { success: false, message };
      }

      setSummary(result.data);
      return { success: true, message: 'Dashboard data loaded' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    summary,
    loading,
    error,
    fetchDashboardData,
  };
};

export type UseAdminDashboardReturn = ReturnType<typeof useAdminDashboard>;
