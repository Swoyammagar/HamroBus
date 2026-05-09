import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export interface SocketChatEvent {
  _id: string;
  chatId: string;
  senderId: string;
  senderType: 'driver' | 'admin';
  message: string;
  createdAt: string;
}

export interface ChatAssignedEvent {
  chatId: string;
  adminId: string;
  adminName: string;
  status: 'in-progress';
}

export interface ChatResolvedEvent {
  chatId: string;
  status: 'resolved';
}

export interface NewChatEvent {
  chatId: string;
  driverId: string;
  driverName: string;
  message: string;
  createdAt: string;
}

type ChatSocketEventCallback = (data: any) => void;

class AdminChatSocketService {
  private static instance: AdminChatSocketService;
  private socket: Socket | null = null;
  private adminId: string | null = null;
  private messageListeners: Map<string, ChatSocketEventCallback[]> = new Map();
  private newChatListeners: ChatSocketEventCallback[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private chatAssignedListeners: ChatSocketEventCallback[] = [];
  private chatResolvedListeners: ChatSocketEventCallback[] = [];

  private constructor() {}

  static getInstance(): AdminChatSocketService {
    if (!AdminChatSocketService.instance) {
      AdminChatSocketService.instance = new AdminChatSocketService();
    }
    return AdminChatSocketService.instance;
  }

  /**
   * Initialize Socket.io connection
   */
  async initialize(adminId: string, token: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('✅ Socket.io already connected');
      return;
    }

    try {
      this.adminId = adminId;

      this.socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket'],
      });

      // Set up event listeners
      this.setupEventListeners();

      console.log('🔌 Socket.io initializing...');
    } catch (error) {
      console.error('❌ Socket.io initialization failed:', error);
      throw error;
    }
  }

  /**
   * Set up all Socket.io event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Admin connected to Socket.io');
      this.connectionListeners.forEach((listener) => listener(true));
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Admin disconnected from Socket.io');
      this.connectionListeners.forEach((listener) => listener(false));
    });

    // Chat events
    this.socket.on('driver:new_message', (data: SocketChatEvent) => {
      console.log('📨 New message from driver:', data);
      const callbacks = this.messageListeners.get(data.chatId) || [];
      callbacks.forEach((cb) => cb(data));
    });

    this.socket.on('driver:new_chat', (data: NewChatEvent) => {
      console.log('🆕 New chat from driver:', data);
      this.newChatListeners.forEach((cb) => cb(data));
    });

    this.socket.on('admin:chat_assigned', (data: ChatAssignedEvent) => {
      console.log('📌 Chat assigned:', data);
      this.chatAssignedListeners.forEach((cb) => cb(data));
    });

    // Error handling
    this.socket.on('error', (error: any) => {
      console.error('❌ Socket.io error:', error);
    });
  }

  /**
   * Join admin notification room to receive new chat alerts
   */
  joinAdminRoom(): void {
    if (this.socket?.connected) {
      this.socket.emit('admin:join-room', { adminId: this.adminId });
      console.log('👥 Admin joined notification room');
    }
  }

  /**
   * Join specific chat room
   */
  joinChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('admin:join-chat', { chatId });
      console.log(`📍 Admin joined chat room: ${chatId}`);
    }
  }

  /**
   * Leave specific chat room
   */
  leaveChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave', { room: `chat:${chatId}` });
      console.log(`👋 Admin left chat room: ${chatId}`);
    }
  }

  /**
   * Send message to driver via Socket.io
   */
  sendMessage(chatId: string, message: string): void {
    if (this.socket?.connected) {
      this.socket.emit('admin:send_message', { chatId, message });
      console.log('💬 Message sent via Socket.io');
    }
  }

  /**
   * Assign chat to current admin
   */
  assignChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('admin:assign_chat', { chatId });
      console.log('📌 Assign chat event emitted');
    }
  }

  /**
   * Resolve chat (mark as completed)
   */
  resolveChat(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('admin:resolve_chat', { chatId });
      console.log('✅ Resolve chat event emitted');
    }
  }

  /**
   * Mark messages as read for specific chat
   */
  markAsRead(chatId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:mark_read', { chatId, userType: 'admin' });
      console.log('👁️ Mark as read emitted');
    }
  }

  /**
   * Subscribe to messages for specific chat
   */
  onMessage(chatId: string, callback: ChatSocketEventCallback): void {
    if (!this.messageListeners.has(chatId)) {
      this.messageListeners.set(chatId, []);
    }
    this.messageListeners.get(chatId)!.push(callback);
    console.log(`📝 Message listener added for chat: ${chatId}`);
  }

  /**
   * Unsubscribe from messages for specific chat
   */
  offMessage(chatId: string, callback: ChatSocketEventCallback): void {
    const callbacks = this.messageListeners.get(chatId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      console.log(`🗑️ Message listener removed for chat: ${chatId}`);
    }
  }

  /**
   * Subscribe to new chat alerts
   */
  onNewChat(callback: ChatSocketEventCallback): void {
    this.newChatListeners.push(callback);
    console.log('🎧 New chat listener added');
  }

  /**
   * Unsubscribe from new chat alerts
   */
  offNewChat(callback: ChatSocketEventCallback): void {
    const index = this.newChatListeners.indexOf(callback);
    if (index > -1) {
      this.newChatListeners.splice(index, 1);
    }
    console.log('🗑️ New chat listener removed');
  }

  /**
   * Subscribe to chat assigned events
   */
  onChatAssigned(callback: ChatSocketEventCallback): void {
    this.chatAssignedListeners.push(callback);
    console.log('🎧 Chat assigned listener added');
  }

  /**
   * Unsubscribe from chat assigned events
   */
  offChatAssigned(callback: ChatSocketEventCallback): void {
    const index = this.chatAssignedListeners.indexOf(callback);
    if (index > -1) {
      this.chatAssignedListeners.splice(index, 1);
    }
    console.log('🗑️ Chat assigned listener removed');
  }

  /**
   * Subscribe to chat resolved events
   */
  onChatResolved(callback: ChatSocketEventCallback): void {
    this.chatResolvedListeners.push(callback);
    console.log('🎧 Chat resolved listener added');
  }

  /**
   * Unsubscribe from chat resolved events
   */
  offChatResolved(callback: ChatSocketEventCallback): void {
    const index = this.chatResolvedListeners.indexOf(callback);
    if (index > -1) {
      this.chatResolvedListeners.splice(index, 1);
    }
    console.log('🗑️ Chat resolved listener removed');
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionListeners.push(callback);
  }

  /**
   * Unsubscribe from connection status changes
   */
  offConnectionChange(callback: (connected: boolean) => void): void {
    const index = this.connectionListeners.indexOf(callback);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔌 Socket.io disconnected');
    }
  }
}

export default AdminChatSocketService;
