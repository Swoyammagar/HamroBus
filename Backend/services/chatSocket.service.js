const Chat = require('../models/chat.model');
const ChatMessage = require('../models/chatMessage.model');
const Driver = require('../models/driver.model');
const Admin = require('../models/admin.model');

class ChatSocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> socketId mapping
  }

  // Register socket connection
  registerUser(userId, socketId, userType) {
    this.userSockets.set(`${userType}:${userId}`, socketId);
    console.log(`${userType} ${userId} connected with socket ${socketId}`);
  }

  // Unregister socket disconnection
  unregisterUser(userId, userType) {
    this.userSockets.delete(`${userType}:${userId}`);
    console.log(`${userType} ${userId} disconnected`);
  }

  // Get socket ID for a user
  getUserSocket(userId, userType) {
    return this.userSockets.get(`${userType}:${userId}`);
  }

  // Handle driver sending message
  async handleDriverSendMessage(data, driverId) {
    try {
      const { chatId, message } = data;

      // Validate chat and access
      const chat = await Chat.findById(chatId);
      if (!chat || chat.driverId.toString() !== driverId.toString()) {
        return { error: 'Unauthorized access to chat' };
      }

      // Create message
      const chatMessage = new ChatMessage({
        chatId,
        senderId: driverId,
        senderType: 'driver',
        message,
      });

      await chatMessage.save();

      // Update chat lastMessageAt
      chat.lastMessageAt = new Date();
      await chat.save();

      // Get chat with driver info for admin notification
      const populatedChat = await Chat.findById(chatId).populate('driverId', 'firstName lastName email phoneNumber');

      // If admin is assigned, notify admin
      if (chat.adminId) {
        const adminSocketId = this.getUserSocket(chat.adminId, 'admin');
        if (adminSocketId) {
          this.io.to(adminSocketId).emit('driver:new_message', {
            chatId,
            message: chatMessage,
            chat: populatedChat,
          });
        }
      } else {
        // Notify all admins if no admin assigned
        const admins = await Admin.find({});
        admins.forEach(admin => {
          const adminSocketId = this.getUserSocket(admin._id, 'admin');
          if (adminSocketId) {
            this.io.to(adminSocketId).emit('driver:new_message', {
              chatId,
              message: chatMessage,
              chat: populatedChat,
            });
          }
        });
      }

      return { success: true, message: chatMessage };
    } catch (error) {
      console.error('Error handling driver message:', error);
      return { error: error.message };
    }
  }

  // Handle admin sending message
  async handleAdminSendMessage(data, adminId) {
    try {
      const { chatId, message } = data;

      // Validate chat and access
      const chat = await Chat.findById(chatId);
      if (!chat || (chat.adminId && chat.adminId.toString() !== adminId.toString())) {
        return { error: 'Unauthorized access to chat' };
      }

      // Assign admin if not already assigned
      if (!chat.adminId) {
        chat.adminId = adminId;
        chat.status = 'in-progress';
      }

      // Create message
      const chatMessage = new ChatMessage({
        chatId,
        senderId: adminId,
        senderType: 'admin',
        message,
      });

      await chatMessage.save();

      // Update chat lastMessageAt
      chat.lastMessageAt = new Date();
      await chat.save();

      // Notify driver
      const driverSocketId = this.getUserSocket(chat.driverId, 'driver');
      if (driverSocketId) {
        this.io.to(driverSocketId).emit('admin:new_message', {
          chatId,
          message: chatMessage,
          chat,
        });
      }

      return { success: true, message: chatMessage };
    } catch (error) {
      console.error('Error handling admin message:', error);
      return { error: error.message };
    }
  }

  // Handle driver initiating new chat
  async handleDriverInitiateChat(driverId) {
    try {
      // Check if driver has open chat
      let chat = await Chat.findOne({
        driverId,
        status: { $in: ['open', 'in-progress'] },
      });

      // If no open chat, create new one
      if (!chat) {
        chat = new Chat({
          driverId,
          status: 'open',
          subject: 'Help Request',
        });
        await chat.save();
      }

      // Update driver lastChatId
      await Driver.findByIdAndUpdate(driverId, {
        lastChatId: chat._id,
      });

      // Notify all admins about new chat
      const admins = await Admin.find({});
      admins.forEach(admin => {
        const adminSocketId = this.getUserSocket(admin._id, 'admin');
        if (adminSocketId) {
          this.io.to(adminSocketId).emit('driver:new_chat', {
            chat,
          });
        }
      });

      return { success: true, chat };
    } catch (error) {
      console.error('Error initiating chat:', error);
      return { error: error.message };
    }
  }

  // Handle admin assigning chat to self
  async handleAdminAssignChat(chatId, adminId) {
    try {
      const chat = await Chat.findByIdAndUpdate(
        chatId,
        {
          adminId,
          status: 'in-progress',
        },
        { new: true }
      );

      if (!chat) {
        return { error: 'Chat not found' };
      }

      // Update admin assignedChats
      await Admin.findByIdAndUpdate(adminId, {
        $addToSet: { assignedChats: chatId },
      });

      // Notify driver
      const driverSocketId = this.getUserSocket(chat.driverId, 'driver');
      if (driverSocketId) {
        this.io.to(driverSocketId).emit('admin:chat_assigned', {
          chatId,
          adminId,
        });
      }

      return { success: true, chat };
    } catch (error) {
      console.error('Error assigning chat:', error);
      return { error: error.message };
    }
  }

  // Handle resolving chat
  async handleResolveChat(chatId, adminId) {
    try {
      const chat = await Chat.findByIdAndUpdate(
        chatId,
        {
          status: 'resolved',
        },
        { new: true }
      );

      if (!chat) {
        return { error: 'Chat not found' };
      }

      // Notify driver
      const driverSocketId = this.getUserSocket(chat.driverId, 'driver');
      if (driverSocketId) {
        this.io.to(driverSocketId).emit('admin:chat_resolved', {
          chatId,
        });
      }

      return { success: true, chat };
    } catch (error) {
      console.error('Error resolving chat:', error);
      return { error: error.message };
    }
  }

  // Mark messages as read
  async markMessagesAsRead(chatId, userId, userType) {
    try {
      await ChatMessage.updateMany(
        {
          chatId,
          senderType: userType === 'driver' ? 'admin' : 'driver',
          readAt: null,
        },
        {
          readAt: new Date(),
        }
      );

      // Update read status in chat
      const chat = await Chat.findById(chatId);
      
      const existingRead = chat.readBy.find(
        r => r.userId.toString() === userId.toString()
      );

      if (existingRead) {
        existingRead.readAt = new Date();
      } else {
        chat.readBy.push({
          userId,
          userType,
          readAt: new Date(),
        });
      }

      await chat.save();

      return { success: true };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return { error: error.message };
    }
  }
}

module.exports = ChatSocketService;
