import React, { useState } from 'react';
import { View } from 'react-native';
import AdminChatsDashboard from './AdminChatsDashboard';
import AdminChatModal from './AdminChatModal';
import { Chat } from '../services/adminChatService';

const AdminChats: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    // Refresh dashboard after modal closes
    setRefreshKey((prev) => prev + 1);
  };

  const handleChatUpdated = () => {
    // Refresh the dashboard
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <View className="flex-1">
      <AdminChatsDashboard key={refreshKey} onSelectChat={handleSelectChat} />
      <AdminChatModal
        visible={modalVisible}
        chat={selectedChat}
        onClose={handleCloseModal}
        onChatUpdated={handleChatUpdated}
      />
    </View>
  );
};

export default AdminChats;
