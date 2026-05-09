# Real-Time Driver-Admin Messaging System - Backend Architecture

## Overview
A real-time messaging platform where drivers can send help requests to admins, and admins can reply. Messages are delivered instantly with Socket.io and stored in MongoDB.

---

## 1. DATABASE MODELS

### A. Chat Model (chat.model.js)
```javascript
{
  _id: ObjectId,
  driverId: ObjectId (ref: Driver),
  adminId: ObjectId (ref: Admin) [optional - assigned when admin opens conversation],
  subject: String, // "Help Request", "Technical Issue", etc.
  status: Enum ["open", "in-progress", "resolved"], // default: "open"
  priority: Enum ["low", "medium", "high"], // default: "medium"
  createdAt: Date,
  updatedAt: Date,
  lastMessageAt: Date,
  readBy: [{ userId: ObjectId, readAt: Date }]
}
```

### B. Chat Message Model (chatMessage.model.js)
```javascript
{
  _id: ObjectId,
  chatId: ObjectId (ref: Chat), [required]
  senderId: ObjectId (ref: User/Admin), [required]
  senderType: Enum ["driver", "admin"], [required]
  senderName: String, // Display name
  message: String, [required]
  timestamp: Date, [default: now]
  readAt: Date [optional - when admin reads it],
  attachments: [{
    type: String, // "image", "file", "document"
    url: String,
    fileName: String
  }],
  isDeleted: Boolean [default: false]
}
```

### C. Driver Model Updates (driver.model.js)
Add these fields:
```javascript
hasUnreadMessages: Boolean [default: false],
unreadMessageCount: Number [default: 0],
lastChatId: ObjectId (ref: Chat)
```

### D. Admin Model Updates (admin.model.js)
Add these fields:
```javascript
hasUnreadMessages: Boolean [default: false],
unreadMessageCount: Number [default: 0],
assignedChats: [ObjectId] (ref: Chat) // Chats assigned to this admin
```

---

## 2. API ENDPOINTS

### Driver Endpoints

#### Start/Get Chat Conversation
```
GET /driver/chat/:driverId
Response: {
  chat: { _id, driverId, adminId, status, createdAt },
  messages: [ { senderId, senderType, message, timestamp, readAt } ]
}
```

#### Send Message
```
POST /driver/chat/message
Body: {
  chatId: ObjectId,
  message: String,
  attachments: [ { type, url, fileName } ]
}
Response: {
  message: { _id, chatId, senderId, message, timestamp }
}
Error: {
  error: "Chat not found" | "Unauthorized"
}
```

#### Mark Messages as Read
```
PATCH /driver/chat/read/:chatId
Response: { success: true, unreadCount: 0 }
```

#### Get Chat History
```
GET /driver/chat/history/:driverId?limit=50&skip=0
Response: {
  messages: [ { ...chatMessage } ],
  total: Number
}
```

### Admin Endpoints

#### Get All Open Chats
```
GET /admin/chats?status=open&limit=20&skip=0
Response: {
  chats: [{
    _id, driverId, adminId, status, lastMessageAt,
    driver: { name, email, phoneNumber, profileImg },
    lastMessage: String,
    unreadCount: Number
  }],
  total: Number
}
```

#### Get Chat Details & Messages
```
GET /admin/chat/:chatId
Response: {
  chat: { ...chat details },
  messages: [ { ...all messages in chat } ]
}
```

#### Assign Chat to Admin
```
PATCH /admin/chat/:chatId/assign
Body: { adminId: ObjectId }
Response: { success: true, chat: { ...updated chat } }
```

#### Send Reply Message
```
POST /admin/chat/message
Body: {
  chatId: ObjectId,
  message: String,
  adminId: ObjectId,
  attachments: [ { type, url, fileName } ]
}
Response: {
  message: { _id, chatId, senderId, message, timestamp }
}
```

#### Update Chat Status
```
PATCH /admin/chat/:chatId
Body: { status: "in-progress" | "resolved" }
Response: { success: true, chat: { ...updated } }
```

#### Mark Chat as Read by Admin
```
PATCH /admin/chat/:chatId/read
Response: { success: true }
```

#### Get Admin Dashboard Stats
```
GET /admin/chat/stats/overview
Response: {
  totalOpen: Number,
  totalInProgress: Number,
  totalResolved: Number,
  unreadChats: Number,
  averageResponseTime: Number (in minutes)
}
```

---

## 3. SOCKET.IO EVENTS

### Driver Socket Events

**Emit:**
- `driver:send_message` → Send message to admin
  - Data: `{ chatId, message, attachments }`
- `driver:typing` → Indicate driver is typing
  - Data: `{ chatId }`
- `driver:stop_typing` → Stop typing indicator
  - Data: `{ chatId }`

**Listen:**
- `admin:new_message` → Receive message from admin
  - Data: `{ chatId, senderId, message, timestamp }`
- `admin:chat_assigned` → Chat assigned to admin
  - Data: `{ chatId, adminName, adminId }`
- `admin:chat_resolved` → Chat marked as resolved
  - Data: `{ chatId, resolvedMessage }`
- `admin:typing` → Admin is typing
  - Data: `{ chatId }`
- `admin:stop_typing` → Admin stopped typing
  - Data: `{ chatId }`

### Admin Socket Events

**Emit:**
- `admin:send_message` → Send message to driver
  - Data: `{ chatId, message, attachments }`
- `admin:assign_chat` → Assign chat to self
  - Data: `{ chatId }`
- `admin:resolve_chat` → Mark chat as resolved
  - Data: `{ chatId, resolutionNotes }`
- `admin:typing` → Indicate admin is typing
  - Data: `{ chatId }`
- `admin:stop_typing` → Stop typing indicator
  - Data: `{ chatId }`

**Listen:**
- `driver:new_message` → Receive message from driver
  - Data: `{ chatId, senderId, senderName, message, timestamp }`
- `driver:new_chat` → Driver initiated new chat
  - Data: `{ chatId, driverId, driverName, subject }`
- `driver:typing` → Driver is typing
  - Data: `{ chatId }`
- `driver:stop_typing` → Driver stopped typing
  - Data: `{ chatId }`
- `notification:unread_messages` → Broadcast unread count update
  - Data: `{ userId, unreadCount, type: "admin" | "driver" }`

---

## 4. MIDDLEWARE

### Chat Authorization Middleware
```javascript
async function authorizeChatAccess(req, res, next) {
  const userId = req.user._id;
  const userRole = req.user.role; // "driver" or "admin"
  const chatId = req.params.chatId;
  
  const chat = await Chat.findById(chatId);
  
  if (userRole === "driver") {
    if (String(chat.driverId) !== String(userId)) {
      return res.status(403).json({ error: "Unauthorized" });
    }
  } else if (userRole === "admin") {
    // Allow all admins to view chats, but only assigned admin can be primary
    // Optional: restrict based on assignedChats
  }
  
  req.chat = chat;
  next();
}
```

---

## 5. BUSINESS LOGIC

### Message Delivery Flow
1. Driver sends message → POST `/driver/chat/message`
2. Message saved to ChatMessage collection
3. Emit `driver:new_message` via Socket.io to assigned admin (if any)
4. Update Chat.lastMessageAt and readBy
5. If no admin assigned, emit `notification:new_unassigned_chat` to all admins
6. Admin receives in-app notification + badge

### Notification Badge Logic
- **Driver**: `unreadCount` = messages from admins not read by driver
- **Admin**: `unreadCount` = total unread messages in all assigned chats

### Auto-Typing Indicator
- When message starts: emit `driver:typing` or `admin:typing`
- When message finishes: emit `driver:stop_typing` or `admin:stop_typing`
- Timeout after 3 seconds of no activity

---

## 6. FILE STRUCTURE

```
Backend/
├── models/
│   ├── chat.model.js [NEW]
│   ├── chatMessage.model.js [NEW]
│   ├── driver.model.js [UPDATED]
│   └── admin.model.js [UPDATED]
├── controllers/
│   ├── driver.chat.controller.js [NEW]
│   └── admin.chat.controller.js [NEW]
├── routes/
│   ├── driver.chat.routes.js [NEW]
│   └── admin.chat.routes.js [NEW]
├── middlewares/
│   └── chatAuth.middleware.js [NEW]
└── services/
    └── chatSocket.service.js [NEW - Socket.io handlers]
```

---

## 7. IMPLEMENTATION ORDER

### Phase 1: Database & Models
1. Create `chat.model.js`
2. Create `chatMessage.model.js`
3. Update `driver.model.js` and `admin.model.js`

### Phase 2: Middleware & Utilities
1. Create `chatAuth.middleware.js`
2. Create `chatSocket.service.js`

### Phase 3: Controllers
1. Create `driver.chat.controller.js`
2. Create `admin.chat.controller.js`

### Phase 4: Routes
1. Create `driver.chat.routes.js`
2. Create `admin.chat.routes.js`
3. Register routes in `index.routes.js`

### Phase 5: Socket.io Integration
1. Integrate socket handlers in `index.js`
2. Connect Socket.io events to controllers

### Phase 6: Frontend (Next Prompt)
1. Driver chat screen
2. Admin chat dashboard
3. Notification badges
4. Real-time message updates

---

## 8. SECURITY CONSIDERATIONS

- ✅ Authorize chat access: Only driver and assigned admin can view/send
- ✅ Rate limiting: Max 50 messages per minute per user
- ✅ Input validation: Sanitize message content
- ✅ XSS protection: Escape all user inputs
- ✅ Attachment scanning: Validate file types and size (max 10MB)
- ✅ Encryption: Optional - encrypt messages at rest
- ✅ Admin audit: Log all admin actions on chats

---

## 9. PERFORMANCE OPTIMIZATION

- ✅ Pagination: Fetch messages in chunks (50 per page)
- ✅ Indexing: Index on `chatId`, `driverId`, `adminId`, `createdAt`
- ✅ Caching: Cache unread counts in Redis
- ✅ Lazy loading: Load older messages on scroll
- ✅ Batch updates: Use bulk operations for marking multiple messages as read

---

## 10. ERROR HANDLING

```javascript
- "Chat not found" (404)
- "Unauthorized access" (403)
- "Message too long" (400) - Max 2000 chars
- "Chat is resolved" (400) - Cannot send to resolved chat
- "Admin not assigned" (400)
- "Database error" (500)
```

---

## Ready to Implement?

Once you approve this architecture, I'll:
1. ✅ Create all 4 models
2. ✅ Set up middleware and Socket.io service
3. ✅ Build driver & admin controllers
4. ✅ Configure routes
5. ✅ Integrate Socket.io events

Then in the next prompt, we'll build the frontend screens!
