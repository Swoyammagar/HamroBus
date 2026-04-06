import { io, type Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'https://hamrobus-auos.onrender.com';

class DriverNotificationSocket {
  private socket: Socket | null = null;

  async connect(driverId: string) {
    if (!driverId) return;
    if (this.socket?.connected) return;

    const token = await AsyncStorage.getItem('authToken');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.socket?.emit('driver:join-notifications', { driverId });
    });
  }

  onNotification(handler: (payload: any) => void) {
    this.socket?.on('notification:new', handler);
  }

  offNotification(handler: (payload: any) => void) {
    this.socket?.off('notification:new', handler);
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }
}

export default new DriverNotificationSocket();
