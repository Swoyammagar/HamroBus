const express = require('express');
const router = express.Router();
const chatAuth = require('../middlewares/chatAuth.middleware');
const AdminChatController = require('../controllers/admin.chat.controller');

// All routes require authentication
router.use(chatAuth);

// Get chat statistics (must come BEFORE /:chatId to avoid being matched as chatId='stats')
router.get('/stats/overview', AdminChatController.getChatStats);

// Get all chats (with optional filtering by status)
router.get('/', AdminChatController.getAllChats);

// Get specific chat with all messages
router.get('/:chatId', AdminChatController.getChat);

// Assign chat to admin
router.patch('/:chatId/assign', AdminChatController.assignChat);

// Update chat status
router.patch('/:chatId/status', AdminChatController.updateChatStatus);

// Send reply to chat
router.post('/:chatId/message', AdminChatController.sendReply);

module.exports = router;
