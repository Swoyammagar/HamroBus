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
  }

  if (adminSocket.connected) {
    adminSocket.emit('join-admin');
  }

  return adminSocket;
};

export const onNotificationReceived = (handler: (payload: any) => void) => {
  const socket = connectAdminSocket();
  socket.on('notification:new', handler);
  return () => {
    socket.off('notification:new', handler);
  };
};

export const disconnectAdminSocket = () => {
  if (!adminSocket) return;
  adminSocket.disconnect();
  adminSocket = null;
};
