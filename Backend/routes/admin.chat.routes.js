const express = require('express');
const router = express.Router();
const chatAuth = require('../middlewares/chatAuth.middleware');
const AdminChatController = require('../controllers/admin.chat.controller');

// All routes require authentication
router.use(chatAuth);

// Get all chats (with optional filtering by status)
router.get('/chats', AdminChatController.getAllChats);

// Get specific chat with all messages
router.get('/chat/:chatId', AdminChatController.getChat);

// Assign chat to admin
router.patch('/chat/:chatId/assign', AdminChatController.assignChat);

// Send reply to chat
router.post('/chat/:chatId/message', AdminChatController.sendReply);

// Update chat status
router.patch('/chat/:chatId/status', AdminChatController.updateChatStatus);

// Get chat statistics
router.get('/stats/overview', AdminChatController.getChatStats);

module.exports = router;
