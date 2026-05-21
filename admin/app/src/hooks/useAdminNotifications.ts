import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  connectAdminSocket,
  disconnectAdminSocket,
  onNotificationReceived,
} from '../services/notificationSocket';
import { onSosAlertReceived, onSosClearedReceived } from '../services/notificationSocket';
import { initSosSoundUnlock, playSosSound } from '../services/sosSound';

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
const READ_STORAGE_KEY = 'admin-notification-read-ids';

axios.defaults.withCredentials = true;

const canUseLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const loadReadIds = (): Set<string> => {
  if (!canUseLocalStorage()) return new Set();

  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((value) => String(value)));
  } catch {
    return new Set();
  }
};

const saveReadIds = (ids: Set<string>) => {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage errors
  }
};

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
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => loadReadIds());
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentToast, setCurrentToast] = useState<NotificationRecord | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    saveReadIds(readNotificationIds);
  }, [readNotificationIds]);

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

  const markNotificationAsRead = useCallback((notificationId: string) => {
    const safeId = String(notificationId || '').trim();
    if (!safeId) return;

    setReadNotificationIds((prev) => {
      if (prev.has(safeId)) return prev;
      const next = new Set(prev);
      next.add(safeId);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      notifications
        .filter((item) => item.sentBy !== 'admin')
        .forEach((item) => next.add(item._id));
      return next;
    });
  }, [notifications]);

  const unreadIncomingNotifications = useMemo(
    () => notifications.filter((item) => item.sentBy !== 'admin' && !readNotificationIds.has(item._id)),
    [notifications, readNotificationIds]
  );

  const unreadIncomingCount = unreadIncomingNotifications.length;

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setNotifications([]);
      setError(null);
        setReadNotificationIds(new Set());
      return;
    }

    fetchNotifications();
  }, [authLoading, token, fetchNotifications]);

  useEffect(() => {
    if (authLoading || !token) return;
    // Ensure socket connection is active (preferred real-time channel)
    initSosSoundUnlock();
    connectAdminSocket();
    const unsubscribe = onNotificationReceived((incoming: NotificationRecord) => {
      console.log('🔔 onNotificationReceived callback fired with:', incoming);
      const normalized = normalizeNotification(incoming);
      if (!normalized) {
        console.warn('Received invalid notification payload:', incoming);
        return;
      }
      setNotifications((prev) => {
        const exists = prev.some((item) => item._id === normalized._id);
        return exists ? prev : [normalized, ...prev];
      });
      setCurrentToast(normalized);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = setTimeout(() => {
        setCurrentToast((prev) => (prev?._id === normalized._id ? null : prev));
        toastTimerRef.current = null;
      }, 3500);
    });

    const unsubscribeSos = onSosAlertReceived((sosPayload: any) => {
      console.log('🔔 onSosAlertReceived callback fired with:', sosPayload);
      playSosSound();
      // Create a synthetic notification record for SOS to display in the same UI
      const id = String(sosPayload?.sosRecordId || sosPayload?.notificationId || `sos_${Date.now()}`);
      const toastRecord: NotificationRecord = {
        _id: id,
        notificationId: `sos_${id}`,
        title: `SOS: ${String(sosPayload?.category || 'Emergency').toUpperCase()}`,
        message: String(sosPayload?.details || sosPayload?.message || 'SOS reported'),
        type: 'emergency',
        severity: 'critical',
        sentBy: 'driver',
        targetAudience: 'admins',
        createdAt: sosPayload?.timestamp || new Date().toISOString(),
      };

      setNotifications((prev) => {
        const exists = prev.some((item) => item._id === toastRecord._id);
        return exists ? prev : [toastRecord, ...prev];
      });

      setCurrentToast(toastRecord);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = setTimeout(() => {
        setCurrentToast((prev) => (prev?._id === toastRecord._id ? null : prev));
        toastTimerRef.current = null;
      }, 3500);
    });

    const unsubscribeSosCleared = onSosClearedReceived((payload: any) => {
      console.log('🔔 onSosClearedReceived fired:', payload);
      // Update any matching notifications / state to reflect cleared status
      // We won't remove the record; just mark its status if present.
      setNotifications((prev) => prev.map((n) => (n._id === String(payload?.sosRecordId || '') ? { ...n, status: 'cleared' as any } : n)));
    });

    return () => {
      unsubscribe();
      unsubscribeSos();
      unsubscribeSosCleared();
      disconnectAdminSocket();
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [authLoading, token]);

  // No polling: rely on socket for real-time updates. Add debug logging to help trace events.
  useEffect(() => {
    // noop - left intentionally to indicate we rely on socket events only
  }, [authLoading, token]);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setCurrentToast(null);
  }, []);

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
      readNotificationIds,
      unreadIncomingNotifications,
      unreadIncomingCount,
      markNotificationAsRead,
      markAllAsRead,
      currentToast,
      dismissToast,
    }),
    [
      notifications,
      loading,
      sending,
      error,
      fetchNotifications,
      sendNotification,
      deleteNotification,
      clearError,
      readNotificationIds,
      unreadIncomingNotifications,
      unreadIncomingCount,
      markNotificationAsRead,
      markAllAsRead,
      currentToast,
      dismissToast,
    ]
  );
};

export type UseAdminNotificationsReturn = ReturnType<typeof useAdminNotifications>;
