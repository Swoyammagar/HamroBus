const express = require('express');
const router = express.Router();
const chatAuth = require('../middlewares/chatAuth.middleware');
const DriverChatController = require('../controllers/driver.chat.controller');

// All routes require authentication
router.use(chatAuth);

// Get or create chat for driver
router.get('/chat', DriverChatController.getOrCreateChat);

// Get messages for a specific chat
router.get('/chat/:chatId/messages', DriverChatController.getChatMessages);

// Send message
router.post('/chat/:chatId/message', DriverChatController.sendMessage);

// Get chat history
router.get('/chat-history', DriverChatController.getChatHistory);

module.exports = router;
