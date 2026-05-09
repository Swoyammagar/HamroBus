import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  X,
  Send,
  CheckCircle2,
  Clock,
  MessageCircle,
  Flag,
  Copy,
} from 'lucide-react-native';
import AdminChatService, { Chat, ChatMessage } from '../services/adminChatService';
import { useAdminChatSocket } from '../hooks/useAdminChatSocket';

interface AdminChatModalProps {
  visible: boolean;
  chat: Chat | null;
  onClose: () => void;
  onChatUpdated?: () => void;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isAdmin: boolean;
  adminId?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isAdmin, adminId }) => {
  const isAdminMessage = message.senderType === 'admin';

  return (
    <View
      className={`mx-4 mb-3 flex-row ${isAdminMessage ? 'justify-end' : 'justify-start'}`}
    >
      <View
        className={`max-w-xs px-4 py-3 rounded-2xl ${
          isAdminMessage
            ? 'bg-blue-600 rounded-br-none'
            : 'bg-gray-300 rounded-bl-none'
        }`}
      >
        {/* Sender name if needed */}
        {isAdminMessage && (
          <Text className="text-xs text-blue-100 mb-1">Admin</Text>
        )}
        {!isAdminMessage && (
          <Text className="text-xs text-gray-600 mb-1">Driver</Text>
        )}

        {/* Message content */}
        <Text
          className={`text-base ${
            isAdminMessage ? 'text-white' : 'text-gray-900'
          }`}
          selectable
        >
          {message.message}
        </Text>

        {/* Timestamp and read status */}
        <View className="flex-row items-center justify-end gap-1 mt-1">
          <Text
            className={`text-xs ${
              isAdminMessage ? 'text-blue-100' : 'text-gray-600'
            }`}
          >
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {message.readAt && (
            <CheckCircle2
              size={12}
              color={isAdminMessage ? '#dbeafe' : '#6b7280'}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const AdminChatModal: React.FC<AdminChatModalProps> = ({
  visible,
  chat,
  onClose,
  onChatUpdated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatStatus, setChatStatus] = useState<string>(chat?.status || 'open');
  const [adminId, setAdminId] = useState<string>('');
  const [isAssigned, setIsAssigned] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { isConnected, messages: socketMessages, sendMessage, markAsRead } = useAdminChatSocket(
    chat?._id || ''
  );

  // Load messages when chat opens
  useEffect(() => {
    if (visible && chat) {
      loadChat();
      getAdminId();
    }
  }, [visible, chat?._id]);

  // Update messages when socket messages arrive
  useEffect(() => {
    if (socketMessages.length > 0) {
      const lastSocketMessage = socketMessages[socketMessages.length - 1];
      setMessages((prev) => {
        const exists = prev.some((msg) => msg._id === lastSocketMessage._id);
        if (exists) return prev;
        return [...prev, lastSocketMessage as ChatMessage];
      });
      scrollToBottom();
    }
  }, [socketMessages]);

  const getAdminId = async () => {
    const id = await SecureStore.getItemAsync('adminId');
    if (id) {
      setAdminId(id);
      setIsAssigned(chat?.adminId === id);
    }
  };

  const loadChat = async () => {
    if (!chat) return;

    try {
      setLoading(true);
      const chatData = await AdminChatService.getChat(chat._id);
      setMessages(chatData.messages || []);
      setChatStatus(chatData.status);

      // Mark messages as read
      await markAsRead(chat._id);

      scrollToBottom();
    } catch (error) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', 'Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleAssignChat = async () => {
    if (!chat) return;

    try {
      setSending(true);
      await AdminChatService.assignChat(chat._id);
      setIsAssigned(true);
      setChatStatus('in-progress');
      Alert.alert('Success', 'Chat assigned to you');
      onChatUpdated?.();
    } catch (error) {
      console.error('Error assigning chat:', error);
      Alert.alert('Error', 'Failed to assign chat');
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async () => {
    if (!chat || !replyText.trim()) return;

    try {
      setSending(true);

      // First, assign if not assigned
      if (!isAssigned) {
        await handleAssignChat();
      }

      // Send via REST API for persistence
      const newMessage = await AdminChatService.sendReply(chat._id, replyText);

      // Send via Socket.io for real-time
      await sendMessage(chat._id, replyText);

      // Add to local messages
      setMessages((prev) => [...prev, newMessage]);
      setReplyText('');
      scrollToBottom();
      onChatUpdated?.();
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleResolveChat = async () => {
    if (!chat) return;

    Alert.alert('Resolve Chat', 'Mark this chat as resolved?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Resolve',
        onPress: async () => {
          try {
            setSending(true);
            await AdminChatService.updateChatStatus(chat._id, 'resolved');
            setChatStatus('resolved');
            Alert.alert('Success', 'Chat marked as resolved');
            onChatUpdated?.();
          } catch (error) {
            console.error('Error resolving chat:', error);
            Alert.alert('Error', 'Failed to resolve chat');
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  };

  if (!chat) return null;

  const statusColors = {
    open: 'bg-orange-100',
    'in-progress': 'bg-blue-100',
    resolved: 'bg-green-100',
  };

  const statusTextColors = {
    open: 'text-orange-700',
    'in-progress': 'text-blue-700',
    resolved: 'text-green-700',
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-bold text-gray-900">
                  {chat.driver?.name || 'Driver Chat'}
                </Text>
                <View
                  className={`px-2.5 py-1 rounded-full ${statusColors[chatStatus as keyof typeof statusColors]}`}
                >
                  <Text
                    className={`text-xs font-semibold capitalize ${statusTextColors[chatStatus as keyof typeof statusTextColors]}`}
                  >
                    {chatStatus === 'in-progress' ? 'In Progress' : chatStatus}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-600 mt-1">
                📱 {chat.driver?.phone || 'No phone'}
              </Text>
            </View>

            {/* Connection indicator */}
            <View
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />

            {/* Close button */}
            <TouchableOpacity onPress={onClose} className="ml-4 p-2">
              <X size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-600 mt-4">Loading messages...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  isAdmin={item.senderType === 'admin'}
                  adminId={adminId}
                />
              )}
              ListEmptyComponent={
                <View className="flex-1 justify-center items-center">
                  <MessageCircle size={48} color="#d1d5db" />
                  <Text className="text-gray-500 mt-4">No messages yet</Text>
                </View>
              }
              onEndReached={scrollToBottom}
              onContentSizeChange={scrollToBottom}
            />
          )}

          {/* Action buttons */}
          {chatStatus !== 'resolved' && (
            <View className="px-4 py-3 border-t border-gray-200 flex-row gap-2">
              {!isAssigned && (
                <TouchableOpacity
                  onPress={handleAssignChat}
                  disabled={sending}
                  className="flex-1 py-2.5 px-3 bg-orange-600 rounded-lg"
                >
                  <Text className="text-white text-center font-semibold text-sm">
                    Assign to Me
                  </Text>
                </TouchableOpacity>
              )}

              {chatStatus === 'in-progress' && (
                <TouchableOpacity
                  onPress={handleResolveChat}
                  disabled={sending}
                  className="flex-1 py-2.5 px-3 bg-green-600 rounded-lg"
                >
                  <Text className="text-white text-center font-semibold text-sm">
                    Resolve
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Resolved indicator */}
          {chatStatus === 'resolved' && (
            <View className="px-4 py-4 bg-green-50 border-t border-green-200">
              <Text className="text-center text-green-700 font-semibold">
                ✅ This chat has been resolved
              </Text>
            </View>
          )}

          {/* Input area */}
          {chatStatus !== 'resolved' && (
            <View className="px-4 py-4 border-t border-gray-200 flex-row gap-2 items-center">
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Type your reply..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={1000}
                editable={!sending}
                className="flex-1 p-3 bg-gray-100 rounded-lg text-gray-900 max-h-24"
              />
              <TouchableOpacity
                onPress={handleSendReply}
                disabled={sending || !replyText.trim()}
                className={`p-3 rounded-lg ${
                  sending || !replyText.trim()
                    ? 'bg-gray-300'
                    : 'bg-blue-600'
                }`}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default AdminChatModal;
