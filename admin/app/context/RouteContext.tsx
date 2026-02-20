import axios from 'axios';
import React, { createContext, useContext, useState, useEffect } from 'react';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export type RouteStop = {
  stopName: string;
  latitude: number;
  longitude: number;
  sequence: number;
};

export type ScheduleRecord = {
  _id?: string;
  dayOfWeek: DayOfWeek;
  driverId: string | {
    _id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    licenseNo?: string;
  };
  busId: string | {
    _id?: string;
    busNumber?: string;
    model?: string;
  };
  startTime: string;
  endTime: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type RouteRecord = {
  _id?: string;
  routeName?: string;
  routeNumber?: string;
  source?: string;
  destination?: string;
  distance?: number;
  estimatedDuration?: number;
  stops?: RouteStop[];
  assignedBusIds?: Array<string | { _id?: string; busNumber?: string; model?: string }>;
  assignedDriverIds?: Array<string | { _id?: string; firstName?: string; lastName?: string; email?: string; licenseNo?: string }>;
  operatingDays?: DayOfWeek[];
  firstBusTiming?: string;
  lastBusTiming?: string;
  schedules?: ScheduleRecord[];
  fareInfo?: number;
  createdAt?: string;
  updatedAt?: string;
};

type CreateRouteInput = {
  routeNumber: string;
  routeName: string;
  source: string;
  destination: string;
  distance: number;
  estimatedDuration?: number;
  stops?: RouteStop[];
  assignedBusIds?: string[];
  assignedDriverIds?: string[];
  operatingDays: DayOfWeek[];
  firstBusTiming: string;
  lastBusTiming: string;
  fareInfo: number;
};

type UpdateRouteInput = Partial<CreateRouteInput>;

type ScheduleInput = {
  dayOfWeek: DayOfWeek;
  driverId: string;
  busId: string;
  startTime: string;
  endTime: string;
  notes?: string;
};

type UpdateScheduleInput = Partial<ScheduleInput>;

type ActionResult = { success: boolean; message: string };

type RouteContextValue = {
  routes: RouteRecord[];
  loading: boolean;
  error: string | null;
  fetchAllRoutes: () => Promise<void>;
  getRouteById: (routeId: string) => Promise<RouteRecord | null>;
  createRoute: (input: CreateRouteInput) => Promise<ActionResult>;
  updateRoute: (routeId: string, input: UpdateRouteInput) => Promise<ActionResult>;
  deleteRoute: (routeId: string) => Promise<ActionResult>;
  getRouteSchedules: (routeId: string) => Promise<ScheduleRecord[]>;
  addSchedule: (routeId: string, input: ScheduleInput) => Promise<ActionResult>;
  updateSchedule: (
    routeId: string,
    scheduleId: string,
    input: UpdateScheduleInput
  ) => Promise<ActionResult>;
  deleteSchedule: (routeId: string, scheduleId: string) => Promise<ActionResult>;
};

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000/api';

axios.defaults.withCredentials = true;

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [routes, setRoutes] = useState<RouteRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const upsertRoute = (route: RouteRecord) => {
    if (!route?._id) return;
    setRoutes((prev) => {
      const index = prev.findIndex((r) => r._id === route._id);
      if (index === -1) return [route, ...prev];
      const next = [...prev];
      next[index] = { ...prev[index], ...route };
      return next;
    });
  };

  const fetchAllRoutes = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ routes?: RouteRecord[] }>(
        `${API_BASE}/routes`
      );
      setRoutes(data?.routes || []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch routes';
      setError(message);
      console.error('Fetch routes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRouteById = async (routeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ route?: RouteRecord }>(
        `${API_BASE}/routes/${routeId}`
      );
      if (data?.route) {
        upsertRoute(data.route);
        return data.route;
      }
      return null;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch route';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createRoute = async (input: CreateRouteInput): Promise<ActionResult> => {
    try {
      const { data } = await axios.post<{ message?: string; route?: RouteRecord }>(
        `${API_BASE}/routes`,
        input
      );
      if (data?.route) {
        setRoutes((prev) => [data.route as RouteRecord, ...prev]);
      }
      return { success: true, message: data?.message || 'Route created successfully' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to create route';
      setError(message);
      return { success: false, message };
    }
  };

  const updateRoute = async (
    routeId: string,
    input: UpdateRouteInput
  ): Promise<ActionResult> => {
    try {
      const { data } = await axios.put<{ message?: string; route?: RouteRecord }>(
        `${API_BASE}/routes/${routeId}`,
        input
      );
      if (data?.route) {
        upsertRoute(data.route);
      }
      return { success: true, message: data?.message || 'Route updated successfully' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to update route';
      setError(message);
      return { success: false, message };
    }
  };

  const deleteRoute = async (routeId: string): Promise<ActionResult> => {
    try {
      const { data } = await axios.delete<{ message?: string }>(
        `${API_BASE}/routes/${routeId}`
      );
      setRoutes((prev) => prev.filter((r) => r._id !== routeId));
      return { success: true, message: data?.message || 'Route deleted successfully' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to delete route';
      setError(message);
      return { success: false, message };
    }
  };

  const getRouteSchedules = async (routeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ schedules?: ScheduleRecord[] }>(
        `${API_BASE}/routes/${routeId}/schedules`
      );
      const schedules = data?.schedules || [];
      setRoutes((prev) =>
        prev.map((route) =>
          route._id === routeId ? { ...route, schedules } : route
        )
      );
      return schedules;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch schedules';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const addSchedule = async (
    routeId: string,
    input: ScheduleInput
  ): Promise<ActionResult> => {
    try {
      const { data } = await axios.post<{ message?: string; schedules?: ScheduleRecord[] }>(
        `${API_BASE}/routes/${routeId}/schedules`,
        input
      );
      if (data?.schedules) {
        setRoutes((prev) =>
          prev.map((route) =>
            route._id === routeId ? { ...route, schedules: data.schedules } : route
          )
        );
      }
      return { success: true, message: data?.message || 'Schedule added successfully' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to add schedule';
      setError(message);
      return { success: false, message };
    }
  };

  const updateSchedule = async (
    routeId: string,
    scheduleId: string,
    input: UpdateScheduleInput
  ): Promise<ActionResult> => {
    try {
      const { data } = await axios.put<{ message?: string; schedule?: ScheduleRecord }>(
        `${API_BASE}/routes/${routeId}/schedules/${scheduleId}`,
        input
      );
      if (data?.schedule) {
        setRoutes((prev) =>
          prev.map((route) => {
            if (route._id !== routeId) return route;
            const nextSchedules = (route.schedules || []).map((s) =>
              s._id === scheduleId ? { ...s, ...data.schedule } : s
            );
            return { ...route, schedules: nextSchedules };
          })
        );
      }
      return { success: true, message: data?.message || 'Schedule updated successfully' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to update schedule';
      setError(message);
      return { success: false, message };
    }
  };

  const deleteSchedule = async (
    routeId: string,
    scheduleId: string
  ): Promise<ActionResult> => {
    try {
      const { data } = await axios.delete<{ message?: string }>(
        `${API_BASE}/routes/${routeId}/schedules/${scheduleId}`
      );
      setRoutes((prev) =>
        prev.map((route) => {
          if (route._id !== routeId) return route;
          const nextSchedules = (route.schedules || []).filter(
            (s) => s._id !== scheduleId
          );
          return { ...route, schedules: nextSchedules };
        })
      );
      return { success: true, message: data?.message || 'Schedule deleted successfully' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to delete schedule';
      setError(message);
      return { success: false, message };
    }
  };

  // Fetch routes on mount
  useEffect(() => {
    fetchAllRoutes();
  }, []);

  const value: RouteContextValue = {
    routes,
    loading,
    error,
    fetchAllRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    getRouteSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
  };

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
};

export const useRoute = () => {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within RouteProvider');
  return ctx;
};

export default RouteContext;