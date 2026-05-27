import { io, type Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'https://hamrobus-auos.onrender.com';

class PassengerNotificationSocket {
  private socket: Socket | null = null;

  getSocket() {
    return this.socket;
  }

  async connect(passengerId: string) {
    if (!passengerId) return;
    if (this.socket?.connected) return;

    const token = await AsyncStorage.getItem('authToken');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.socket?.emit('passenger:join-notifications', { passengerId });
    });
  }

  onNotification(handler: (payload: any) => void) {
    this.socket?.on('notification:new', handler);
  }

  offNotification(handler: (payload: any) => void) {
    this.socket?.off('notification:new', handler);
  }

  onBookingStatusUpdated(handler: (payload: any) => void) {
    this.socket?.on('booking:status-updated', handler);
  }

  offBookingStatusUpdated(handler: (payload: any) => void) {
    this.socket?.off('booking:status-updated', handler);
  }

  onBookingCompleted(handler: (payload: any) => void) {
    this.socket?.on('booking:completed', handler);
  }

  offBookingCompleted(handler: (payload: any) => void) {
    this.socket?.off('booking:completed', handler);
  }

  onSeatBooked(handler: (payload: any) => void) {
    this.socket?.on('seat:booked', handler);
  }

  offSeatBooked(handler: (payload: any) => void) {
    this.socket?.off('seat:booked', handler);
  }

  onTripReminder(handler: (payload: any) => void) {
    this.socket?.on('trip:reminder', handler);
  }

  offTripReminder(handler: (payload: any) => void) {
    this.socket?.off('trip:reminder', handler);
  }

  onCurrentStopUpdate(handler: (payload: any) => void) {
    this.socket?.on('driver:current-stop', handler);
  }

  offCurrentStopUpdate(handler: (payload: any) => void) {
    this.socket?.off('driver:current-stop', handler);
  }

  onOccupancyUpdated(handler: (payload: any) => void) {
    this.socket?.on('trip:occupancy-updated', handler);
  }

  offOccupancyUpdated(handler: (payload: any) => void) {
    this.socket?.off('trip:occupancy-updated', handler);
  }

  joinBusRoom(busId: string) {
    if (!busId || !this.socket) return;
    this.socket.emit('passenger:join-bus-room', { busId });
  }

  leaveBusRoom(busId: string) {
    if (!busId || !this.socket) return;
    this.socket.emit('passenger:leave-bus-room', { busId });
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
  }
}

export default new PassengerNotificationSocket();
