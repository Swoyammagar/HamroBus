const express = require('express');
const router = express.Router();
const chatAuth = require('../middlewares/chatAuth.middleware');
const DriverChatController = require('../controllers/driver.chat.controller');

// All routes require authentication
router.use(chatAuth);

// Get or create chat for driver
router.get('/', DriverChatController.getOrCreateChat);

// Get messages for a specific chat
router.get('/:chatId/messages', DriverChatController.getChatMessages);

// Send message
router.post('/:chatId/message', DriverChatController.sendMessage);

// Get chat history
router.get('/history', DriverChatController.getChatHistory);

module.exports = router;
