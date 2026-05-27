import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'https://hamrobus-auos.onrender.com';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  async connect(driverId: string) {
    if (this.socket?.connected) {
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');

      this.socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        transports: ['websocket', 'polling'],
      });

      this.setupEventListeners(driverId);
    } catch (error) {
      console.error(' Socket connection error:', error);
    }
  }

  private setupEventListeners(driverId: string) {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;

      this.socket?.emit('driver:join', { driverId });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(' Socket connection error:', error.message);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('route:updated', (data) => {
      this.emit('route:updated', data);
    });

    this.socket.on('trip:updated', (data) => {
      this.emit('trip:updated', data);
    });

    this.socket.on('schedule:assigned', (data) => {
      this.emit('schedule:assigned', data);
    });

    this.socket.on('trip:started', (data) => {
      this.emit('trip:started', data);
    });

    this.socket.on('trip:ended', (data) => {
      this.emit('trip:ended', data);
    });

    this.socket.on('seat:booked', (data) => {
      this.emit('seat:booked', data);
    });

    this.socket.on('booking:created', (data) => {
      this.emit('booking:created', data);
    });

    this.socket.on('driver:current-stop', (data) => {
      this.emit('driver:current-stop', data);
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error(`Error in socket callback for ${event}:`, error);
      }
    });
  }

  shareLocation(data: { busId: string; driverId: string; latitude: number; longitude: number; heading?: number; speed?: number }) {
    if (this.socket?.connected) {
      this.socket.emit('driver:share-location', data);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

export default new SocketService();
