const express = require('express');
const router = express.Router();
const chatAuth = require('../middlewares/chatAuth.middleware');
const AdminChatController = require('../controllers/admin.chat.controller');

// All routes require authentication
router.use(chatAuth);

// Get all chats (with optional filtering by status)
router.get('/', AdminChatController.getAllChats);

// Get specific chat with all messages
router.get('/:chatId', AdminChatController.getChat);

// Assign chat to admin
router.patch('/:chatId/assign', AdminChatController.assignChat);

// Send reply to chat
router.post('/:chatId/message', AdminChatController.sendReply);

// Update chat status
router.patch('/:chatId/status', AdminChatController.updateChatStatus);

// Get chat statistics
router.get('/stats/overview', AdminChatController.getChatStats);

module.exports = router;
