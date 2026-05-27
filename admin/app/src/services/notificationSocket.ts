import { io, type Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'https://hamrobus-auos.onrender.com';

let adminSocket: Socket | null = null;

export const connectAdminSocket = (): Socket => {
  if (adminSocket?.connected) {
    return adminSocket;
  }

  if (!adminSocket) {
    adminSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    adminSocket.on('connect', () => {
      adminSocket?.emit('join-admin');
    });

    adminSocket.on('connect_error', (err) => {
      console.error(' notificationSocket connect_error:', err);
    });
    adminSocket.on('disconnect', (reason) => {
      console.warn(' notificationSocket disconnected:', reason);
    });
  }

  if (adminSocket.connected) {
    adminSocket.emit('join-admin');
  }

  return adminSocket;
};

export const onNotificationReceived = (handler: (payload: any) => void) => {
  const socket = connectAdminSocket();
  const wrapped = (payload: any) => {
    try {
      handler(payload);
    } catch (err) {
      console.error('Error in notification handler:', err);
    }
  };
  socket.on('notification:new', wrapped);
  return () => {
    socket.off('notification:new', wrapped);
  };
};

export const onSosAlertReceived = (handler: (payload: any) => void) => {
  const socket = connectAdminSocket();
  const wrapped = (payload: any) => {
    try {
      handler(payload);
    } catch (err) {
      console.error('Error in sos handler:', err);
    }
  };
  socket.on('sos:alert', wrapped);
  return () => {
    socket.off('sos:alert', wrapped);
  };
};

export const onSosClearedReceived = (handler: (payload: any) => void) => {
  const socket = connectAdminSocket();
  const wrapped = (payload: any) => {
    try {
      handler(payload);
    } catch (err) {
      console.error('Error in sos cleared handler:', err);
    }
  };
  socket.on('sos:cleared', wrapped);
  return () => {
    socket.off('sos:cleared', wrapped);
  };
};

export const disconnectAdminSocket = () => {
  if (!adminSocket) return;
  adminSocket.disconnect();
  adminSocket = null;
};
