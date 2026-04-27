import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  connectAdminSocket,
  disconnectAdminSocket,
  onNotificationReceived,
} from '../services/notificationSocket';

export type NotificationAudience =
  | 'all'
  | 'drivers'
  | 'passengers'
  | 'admins'
  | 'specific_user'
  | 'specific_route'
  | 'specific_bus';
export type NotificationType = 'alert' | 'info' | 'maintenance' | 'announcement' | 'emergency';
export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type NotificationRecord = {
  _id: string;
  notificationId: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  sentBy: 'admin' | 'driver' | 'system';
  targetAudience: NotificationAudience;
  createdAt: string;
  status?: 'pending' | 'sent' | 'failed';
};

export type ActionResult = {
  success: boolean;
  message: string;
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';

axios.defaults.withCredentials = true;

const normalizeNotification = (raw: any): NotificationRecord | null => {
  const id = String(raw?._id || raw?.id || '').trim();
  if (!id) return null;

  return {
    _id: id,
    notificationId: String(raw?.notificationId || `notif_${id}`),
    title: String(raw?.title || ''),
    message: String(raw?.message || ''),
    type: (raw?.type || 'info') as NotificationType,
    severity: (raw?.severity || 'medium') as NotificationSeverity,
    sentBy: (raw?.sentBy || 'admin') as 'admin' | 'driver' | 'system',
    targetAudience: (raw?.targetAudience || 'all') as NotificationAudience,
    createdAt: raw?.createdAt || new Date().toISOString(),
    status: raw?.status,
  };
};

export const useAdminNotifications = (auth: { token: string | null; loading: boolean }) => {
  const { token, loading: authLoading } = auth;

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{
        success?: boolean;
        data?: NotificationRecord[];
      }>(`${API_BASE}/notifications`);

      if (data?.success) {
        const normalized = (data.data || [])
          .map((item) => normalizeNotification(item))
          .filter(Boolean) as NotificationRecord[];
        setNotifications(normalized);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch notifications';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendNotification = useCallback(
    async (payload: {
      title: string;
      message: string;
      targetAudience: NotificationAudience;
      type?: NotificationType;
      severity?: NotificationSeverity;
    }): Promise<ActionResult> => {
      setSending(true);
      setError(null);
      try {
        const { data } = await axios.post<{
          success?: boolean;
          message?: string;
          notification?: NotificationRecord;
        }>(`${API_BASE}/notifications/send`, payload);

        if (data?.success && data.notification) {
          const normalized = normalizeNotification(data.notification);
          if (!normalized) {
            return { success: false, message: 'Invalid notification response from server' };
          }
          setNotifications((prev) => {
            const exists = prev.some((item) => item._id === normalized._id);
            return exists ? prev : [normalized, ...prev];
          });
          return { success: true, message: data.message || 'Notification sent successfully' };
        }

        return { success: false, message: data?.message || 'Unable to send notification' };
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Unable to send notification';
        setError(message);
        return { success: false, message };
      } finally {
        setSending(false);
      }
    },
    []
  );

  const deleteNotification = useCallback(async (notificationId: string): Promise<ActionResult> => {
    setError(null);
    try {
      const safeId = String(notificationId || '').trim();
      if (!safeId) {
        return { success: false, message: 'Notification id is required' };
      }

      const { data } = await axios.delete<{ success?: boolean; message?: string }>(
        `${API_BASE}/notifications/${encodeURIComponent(safeId)}`
      );

      if (data?.success) {
        setNotifications((prev) => prev.filter((item) => item._id !== safeId));
        return { success: true, message: data.message || 'Notification deleted successfully' };
      }

      return { success: false, message: data?.message || 'Unable to delete notification' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to delete notification';
      setError(message);
      return { success: false, message };
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setNotifications([]);
      setError(null);
      return;
    }

    fetchNotifications();
  }, [authLoading, token, fetchNotifications]);

  useEffect(() => {
    if (authLoading || !token) return;

    connectAdminSocket();
    const unsubscribe = onNotificationReceived((incoming: NotificationRecord) => {
      const normalized = normalizeNotification(incoming);
      if (!normalized) return;
      setNotifications((prev) => {
        const exists = prev.some((item) => item._id === normalized._id);
        return exists ? prev : [normalized, ...prev];
      });
    });

    return () => {
      unsubscribe();
      disconnectAdminSocket();
    };
  }, [authLoading, token]);

  return useMemo(
    () => ({
      notifications,
      loading,
      sending,
      error,
      fetchNotifications,
      sendNotification,
      deleteNotification,
      clearError,
    }),
    [notifications, loading, sending, error, fetchNotifications, sendNotification, deleteNotification, clearError]
  );
};

export type UseAdminNotificationsReturn = ReturnType<typeof useAdminNotifications>;
