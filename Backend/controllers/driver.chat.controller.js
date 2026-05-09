const Chat = require('../models/chat.model');
const ChatMessage = require('../models/chatMessage.model');
const Driver = require('../models/driver.model');

class DriverChatController {
  // Get or create chat for driver
  static async getOrCreateChat(req, res) {
    try {
      const driverId = req.user.userId;

      // Try to find open or in-progress chat
      let chat = await Chat.findOne({
        driverId,
        status: { $in: ['open', 'in-progress'] },
      }).populate('adminId', 'fullname email');

      // If no chat exists, create new one
      if (!chat) {
        chat = new Chat({
          driverId,
          status: 'open',
          subject: 'Help Request',
        });
        await chat.save();

        // Update driver lastChatId
        await Driver.findByIdAndUpdate(driverId, {
          lastChatId: chat._id,
        });
      }

      return res.status(200).json({ success: true, chat });
    } catch (error) {
      console.error('Error in getOrCreateChat:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get chat messages
  static async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const driverId = req.user.userId;
      const { page = 1, limit = 50 } = req.query;

      // Verify driver access
      const chat = await Chat.findById(chatId);
      if (!chat || chat.driverId.toString() !== driverId.toString()) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }

      // Get messages with pagination
      const skip = (page - 1) * limit;
      const messages = await ChatMessage.find({ chatId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await ChatMessage.countDocuments({ chatId });

      // Mark messages as read
      await ChatMessage.updateMany(
        {
          chatId,
          senderType: 'admin',
          readAt: null,
        },
        {
          readAt: new Date(),
        }
      );

      // Update chat readBy
      const existingRead = chat.readBy.find(
        r => r.userId.toString() === driverId.toString()
      );
      if (existingRead) {
        existingRead.readAt = new Date();
      } else {
        chat.readBy.push({
          userId: driverId,
          userType: 'driver',
          readAt: new Date(),
        });
      }

      // Reset unread count for driver
      await Driver.findByIdAndUpdate(driverId, {
        unreadMessageCount: 0,
        hasUnreadMessages: false,
        lastChatId: chatId,
      });

      await chat.save();

      return res.status(200).json({
        success: true,
        messages: messages.reverse(),
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error) {
      console.error('Error in getChatMessages:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Send message
  static async sendMessage(req, res) {
    try {
      const { chatId, message } = req.body;
      const driverId = req.user.userId;

      // Validate input
      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message cannot be empty' });
      }

      // Verify driver access
      const chat = await Chat.findById(chatId);
      if (!chat || chat.driverId.toString() !== driverId.toString()) {
        return res.status(403).json({ message: 'Unauthorized access' });
      }

      // Create message
      const chatMessage = new ChatMessage({
        chatId,
        senderId: driverId,
        senderType: 'driver',
        message: message.trim(),
      });

      await chatMessage.save();

      // Update chat lastMessageAt
      chat.lastMessageAt = new Date();
      await chat.save();

      return res.status(201).json({
        success: true,
        message: chatMessage,
      });
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get chat history for driver
  static async getChatHistory(req, res) {
    try {
      const driverId = req.user.userId;
      const { page = 1, limit = 10 } = req.query;

      const skip = (page - 1) * limit;
      const chats = await Chat.find({ driverId })
        .populate('adminId', 'fullname email')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Chat.countDocuments({ driverId });

      // Get unread count
      const unreadCount = await Chat.countDocuments({
        driverId,
        'readBy': {
          $not: {
            $elemMatch: {
              userId: driverId,
              userType: 'driver',
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        chats,
        total,
        unreadCount,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error) {
      console.error('Error in getChatHistory:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = DriverChatController;
