type NotificationReadListener = () => void;
type NotificationIncomingListener = (payload: DriverIncomingNotificationPayload) => void;
type NotificationAllReadListener = () => void;

const listeners = new Set<NotificationReadListener>();
const incomingListeners = new Set<NotificationIncomingListener>();
const allReadListeners = new Set<NotificationAllReadListener>();

export type DriverIncomingNotificationPayload = {
  _id?: string;
  id?: string;
  title?: string;
  message?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: 'alert' | 'info' | 'maintenance' | 'announcement' | 'emergency';
  createdAt?: string;
};

export const subscribeNotificationReadChange = (listener: NotificationReadListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const notifyNotificationReadChange = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Notification read listener failed:', error);
    }
  });
};

export const subscribeNotificationAllRead = (listener: NotificationAllReadListener) => {
  allReadListeners.add(listener);
  return () => {
    allReadListeners.delete(listener);
  };
};

export const notifyNotificationAllRead = () => {
  allReadListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Notification all-read listener failed:', error);
    }
  });
};

export const subscribeIncomingNotification = (listener: NotificationIncomingListener) => {
  incomingListeners.add(listener);
  return () => {
    incomingListeners.delete(listener);
  };
};

export const notifyIncomingNotification = (payload: DriverIncomingNotificationPayload) => {
  incomingListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error('Incoming notification listener failed:', error);
    }
  });
};
