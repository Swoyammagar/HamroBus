import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { MessageCircle, MessageSquare, Clock, CheckCircle2 } from 'lucide-react-native';
import AdminChatService, { Chat, GetChatsResponse } from '../services/adminChatService';
import AdminChatSocketService from '../services/adminChatSocket';

interface ChatItemProps {
  chat: Chat;
  onPress: (chat: Chat) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, onPress }) => {
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

  const statusIcons = {
    open: <MessageCircle size={14} color="#b45309" />,
    'in-progress': <Clock size={14} color="#1e40af" />,
    resolved: <CheckCircle2 size={14} color="#166534" />,
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(chat)}
      className="mx-4 mb-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
    >
      {/* Header: Driver name and status badge */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 pr-4">
          <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
            {chat.driver?.name || 'Unknown Driver'}
          </Text>
          <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
            {chat.driver?.email || 'No email'}
          </Text>
        </View>

        {/* Status badge */}
        <View className={`px-3 py-1.5 rounded-full ${statusColors[chat.status]} flex-row items-center gap-1.5`}>
          {statusIcons[chat.status]}
          <Text className={`text-xs font-medium capitalize ${statusTextColors[chat.status]}`}>
            {chat.status === 'in-progress' ? 'In Progress' : chat.status}
          </Text>
        </View>
      </View>

      {/* Driver info: Phone and date */}
      <View className="flex-row justify-between mb-3 pb-3 border-b border-gray-100">
        <Text className="text-xs text-gray-600">
          📱 {chat.driver?.phone || 'No phone'}
        </Text>
        <Text className="text-xs text-gray-500">
          {new Date(chat.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {/* Subject and unread count */}
      <View className="flex-row justify-between items-start">
        <Text className="text-sm text-gray-700 flex-1" numberOfLines={1}>
          💬 {chat.subject}
        </Text>
        {(chat.unreadCount ?? 0) > 0 && (
          <View className="bg-red-500 rounded-full w-6 h-6 justify-center items-center ml-2">
            <Text className="text-white text-xs font-bold">
              {(chat.unreadCount ?? 0) > 9 ? '9+' : chat.unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Last message preview */}
      <Text className="text-xs text-gray-600 mt-2" numberOfLines={1}>
        Last: {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>
  );
};

interface AdminChatsDashboardProps {
  onSelectChat: (chat: Chat) => void;
}

const AdminChatsDashboard: React.FC<AdminChatsDashboardProps> = ({ onSelectChat }) => {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'open' | 'in-progress' | 'resolved' | 'all'>('all');
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load chats on mount
  useEffect(() => {
    loadChats();
    setupSocketListeners();

    return () => {
      cleanupSocketListeners();
    };
  }, []);

  // Reload when status filter changes
  useEffect(() => {
    setPage(1);
    loadChats();
  }, [selectedStatus]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const status =
        selectedStatus === 'all'
          ? undefined
          : (selectedStatus as 'open' | 'in-progress' | 'resolved');

      const response = await AdminChatService.getAllChats(status, 1, 50);

      setChats(response.chats);
      setStats({
        open: response.stats.open,
        inProgress: response.stats.inProgress,
        resolved: response.stats.resolved,
      });
      setHasMore(response.chats.length >= 50);
    } catch (error) {
      console.error('Error loading chats:', error);
      Alert.alert('Error', 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;

    try {
      const nextPage = page + 1;
      const status =
        selectedStatus === 'all'
          ? undefined
          : (selectedStatus as 'open' | 'in-progress' | 'resolved');

      const response = await AdminChatService.getAllChats(status, nextPage, 50);

      if (response.chats.length > 0) {
        setChats((prev) => [...prev, ...response.chats]);
        setPage(nextPage);
        setHasMore(response.chats.length >= 50);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more chats:', error);
    }
  };

  const setupSocketListeners = async () => {
    try {
      const adminId = await SecureStore.getItemAsync('adminId');
      const token = await SecureStore.getItemAsync('adminToken');

      if (adminId && token) {
        const socketService = AdminChatSocketService.getInstance();

        // Initialize socket if needed
        if (!socketService.isConnected()) {
          await socketService.initialize(adminId, token);
        }

        socketService.joinAdminRoom();

        // Listen for new chats
        socketService.onNewChat((data) => {
          console.log('🆕 New chat received:', data);
          loadChats(); // Reload to show new chat
        });

        // Listen for chat assignments
        socketService.onChatAssigned((data) => {
          console.log('📌 Chat assigned:', data);
          // Update the specific chat
          setChats((prev) =>
            prev.map((chat) =>
              chat._id === data.chatId ? { ...chat, status: 'in-progress' } : chat
            )
          );
        });
      }
    } catch (error) {
      console.error('Error setting up socket listeners:', error);
    }
  };

  const cleanupSocketListeners = () => {
    try {
      const socketService = AdminChatSocketService.getInstance();
      // Socket listeners will be cleaned up automatically
    } catch (error) {
      console.error('Error cleaning up socket listeners:', error);
    }
  };

  const handleChatPress = (chat: Chat) => {
    onSelectChat(chat);
  };

  const renderHeader = () => (
    <View className="px-4 py-6 bg-white border-b border-gray-100">
      {/* Title */}
      <View className="flex-row items-center gap-2 mb-6">
        <MessageSquare size={28} color="#2563eb" />
        <View>
          <Text className="text-2xl font-bold text-gray-900">Driver Chats</Text>
          <Text className="text-sm text-gray-600">Manage driver support requests</Text>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row gap-3 mb-6">
        <TouchableOpacity
          onPress={() => setSelectedStatus('open')}
          className={`flex-1 p-4 rounded-lg border ${
            selectedStatus === 'open' ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <Text className="text-xs text-gray-600 mb-1">Open</Text>
          <Text className={`text-2xl font-bold ${selectedStatus === 'open' ? 'text-orange-600' : 'text-gray-900'}`}>
            {stats.open}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedStatus('in-progress')}
          className={`flex-1 p-4 rounded-lg border ${
            selectedStatus === 'in-progress' ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <Text className="text-xs text-gray-600 mb-1">In Progress</Text>
          <Text className={`text-2xl font-bold ${selectedStatus === 'in-progress' ? 'text-blue-600' : 'text-gray-900'}`}>
            {stats.inProgress}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedStatus('resolved')}
          className={`flex-1 p-4 rounded-lg border ${
            selectedStatus === 'resolved' ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <Text className="text-xs text-gray-600 mb-1">Resolved</Text>
          <Text className={`text-2xl font-bold ${selectedStatus === 'resolved' ? 'text-green-600' : 'text-gray-900'}`}>
            {stats.resolved}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Show all filter */}
      <TouchableOpacity
        onPress={() => setSelectedStatus('all')}
        className={`py-2 px-4 rounded-lg border ${
          selectedStatus === 'all' ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
        }`}
      >
        <Text className={`text-center font-medium ${selectedStatus === 'all' ? 'text-white' : 'text-gray-700'}`}>
          All Chats
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!loading && chats.length === 0) {
      return (
        <View className="flex-1 justify-center items-center py-12">
          <MessageCircle size={48} color="#d1d5db" />
          <Text className="text-lg text-gray-500 mt-4 font-medium">No chats yet</Text>
          <Text className="text-sm text-gray-400 mt-2">
            {selectedStatus === 'all' ? 'Awaiting driver support requests' : `No ${selectedStatus} chats`}
          </Text>
        </View>
      );
    }

    if (loading && chats.length === 0) {
      return (
        <View className="flex-1 justify-center items-center py-12">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-600 mt-4">Loading chats...</Text>
        </View>
      );
    }

    if (hasMore) {
      return (
        <TouchableOpacity
          onPress={loadMore}
          className="mx-4 my-6 py-3 px-4 bg-blue-600 rounded-lg"
        >
          <Text className="text-white text-center font-semibold">Load More</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gray-50">
      {loading && chats.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="text-gray-600 mt-4">Loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <ChatItem chat={item} onPress={handleChatPress} />}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          scrollIndicatorInsets={{ right: 1 }}
        />
      )}
    </SafeAreaView>
  );
};

export default AdminChatsDashboard;
