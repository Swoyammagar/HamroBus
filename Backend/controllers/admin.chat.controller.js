const Chat = require('../models/chat.model');
const ChatMessage = require('../models/chatMessage.model');
const Admin = require('../models/admin.model');
const Driver = require('../models/driver.model');

class AdminChatController {
  // Get all chats (with filtering)
  static async getAllChats(req, res) {
    try {
      const adminId = req.user.userId;
      const { status = 'open', page = 1, limit = 20 } = req.query;

      const skip = (page - 1) * limit;

      // Build filter
      const filter = {};
      if (status && status !== 'all') {
        filter.status = status;
      }

      const chats = await Chat.find(filter)
        .populate('driverId', 'firstName lastName email phoneNumber')
        .populate('adminId', 'fullname email')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Chat.countDocuments(filter);

      // Get counts by status
      const stats = {
        open: await Chat.countDocuments({ status: 'open' }),
        inProgress: await Chat.countDocuments({ status: 'in-progress' }),
        resolved: await Chat.countDocuments({ status: 'resolved' }),
      };

      return res.status(200).json({
        success: true,
        chats,
        stats,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error) {
      console.error('Error in getAllChats:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get specific chat with messages
  static async getChat(req, res) {
    try {
      const { chatId } = req.params;

      const chat = await Chat.findById(chatId)
        .populate('driverId', 'firstName lastName email phoneNumber profileImgUrl')
        .populate('adminId', 'fullname email');

      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      // Get messages
      const messages = await ChatMessage.find({ chatId }).sort({ createdAt: 1 });

      // Mark admin messages as read
      const adminId = req.user.userId;
      await ChatMessage.updateMany(
        {
          chatId,
          senderType: 'driver',
          readAt: null,
        },
        {
          readAt: new Date(),
        }
      );

      // Update chat readBy for admin
      const existingRead = chat.readBy.find(
        r => r.userId.toString() === adminId.toString()
      );
      if (existingRead) {
        existingRead.readAt = new Date();
      } else {
        chat.readBy.push({
          userId: adminId,
          userType: 'admin',
          readAt: new Date(),
        });
      }

      // Reset admin unread count
      await Admin.findByIdAndUpdate(adminId, {
        unreadMessageCount: 0,
        hasUnreadMessages: false,
      });

      await chat.save();

      return res.status(200).json({
        success: true,
        chat,
        messages,
      });
    } catch (error) {
      console.error('Error in getChat:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Assign chat to admin
  static async assignChat(req, res) {
    try {
      const { chatId } = req.params;
      const adminId = req.user.userId;

      const chat = await Chat.findByIdAndUpdate(
        chatId,
        {
          adminId,
          status: 'in-progress',
        },
        { new: true }
      ).populate('driverId', 'firstName lastName email phoneNumber');

      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      // Add to admin's assigned chats
      await Admin.findByIdAndUpdate(adminId, {
        $addToSet: { assignedChats: chatId },
      });

      return res.status(200).json({
        success: true,
        message: 'Chat assigned successfully',
        chat,
      });
    } catch (error) {
      console.error('Error in assignChat:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Send message reply
  static async sendReply(req, res) {
    try {
      const { chatId } = req.params;
      const { message } = req.body;
      const adminId = req.user.userId;

      // Validate input
      if (!message || !message.trim()) {
        return res.status(400).json({ message: 'Message cannot be empty' });
      }

      // Verify admin access
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      // Auto-assign if not assigned
      if (!chat.adminId) {
        chat.adminId = adminId;
        chat.status = 'in-progress';
        await Admin.findByIdAndUpdate(adminId, {
          $addToSet: { assignedChats: chatId },
        });
      } else if (chat.adminId.toString() !== adminId.toString()) {
        return res.status(403).json({ message: 'This chat is assigned to another admin' });
      }

      // Create message
      const chatMessage = new ChatMessage({
        chatId,
        senderId: adminId,
        senderType: 'admin',
        message: message.trim(),
      });

      await chatMessage.save();

      // Update chat
      chat.lastMessageAt = new Date();
      await chat.save();

      return res.status(201).json({
        success: true,
        message: chatMessage,
      });
    } catch (error) {
      console.error('Error in sendReply:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Update chat status
  static async updateChatStatus(req, res) {
    try {
      const { chatId } = req.params;
      const { status } = req.body;

      // Validate status
      if (!['open', 'in-progress', 'resolved'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const chat = await Chat.findByIdAndUpdate(
        chatId,
        { status },
        { new: true }
      ).populate('driverId', 'firstName lastName email');

      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      return res.status(200).json({
        success: true,
        message: `Chat status updated to ${status}`,
        chat,
      });
    } catch (error) {
      console.error('Error in updateChatStatus:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get chat statistics
  static async getChatStats(req, res) {
    try {
      const stats = {
        totalChats: await Chat.countDocuments({}),
        openChats: await Chat.countDocuments({ status: 'open' }),
        inProgressChats: await Chat.countDocuments({ status: 'in-progress' }),
        resolvedChats: await Chat.countDocuments({ status: 'resolved' }),
        totalMessages: await ChatMessage.countDocuments({}),
      };

      // Average response time (from first driver message to first admin reply)
      const recentChats = await Chat.find({})
        .limit(100)
        .sort({ createdAt: -1 });

      let totalResponseTime = 0;
      let count = 0;

      for (const chat of recentChats) {
        const firstDriverMsg = await ChatMessage.findOne({
          chatId: chat._id,
          senderType: 'driver',
        }).sort({ createdAt: 1 });

        const firstAdminMsg = await ChatMessage.findOne({
          chatId: chat._id,
          senderType: 'admin',
        }).sort({ createdAt: 1 });

        if (firstDriverMsg && firstAdminMsg) {
          totalResponseTime += firstAdminMsg.createdAt - firstDriverMsg.createdAt;
          count++;
        }
      }

      const avgResponseTime = count > 0 ? Math.round(totalResponseTime / count / 1000) : 0; // in seconds

      return res.status(200).json({
        success: true,
        stats: {
          ...stats,
          averageResponseTimeSeconds: avgResponseTime,
        },
      });
    } catch (error) {
      console.error('Error in getChatStats:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = AdminChatController;
