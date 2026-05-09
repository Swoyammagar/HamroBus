# 🎯 Driver Chat System - Complete Setup & Testing Guide

## ✅ What's Been Implemented

### Backend (Already Committed)
```
✅ Models: Chat, ChatMessage
✅ Controllers: DriverChatController, AdminChatController
✅ Routes: /api/driver/chat/*, /api/admin/chat/*
✅ Socket.io: 9 event handlers
✅ Middleware: chatAuth.middleware.js
✅ Service: chatSocket.service.js
```

### Frontend - Driver Mobile App (Just Committed)
```
✅ Services: driverChatService.ts, chatSocket.ts
✅ Hook: useChatSocket.ts
✅ Screen: ChatScreen.tsx
✅ Updated: SideMenu.tsx (added Help Centre button)
✅ Updated: _layout.tsx (registered ChatScreen)
```

---

## 🚀 Getting Started

### Step 1: Verify Backend is Running

```bash
cd Backend

# Install dependencies (if not done)
npm install

# Start backend
npm start

# Expected output:
# ✅ Connected to MongoDB
# ✅ Socket.io server listening
# ✅ Server running on port XXXX
```

### Step 2: Start Mobile App

```bash
cd mobile

# Install dependencies (already has socket.io-client)
npm install

# Start development server
npm start

# Open in Expo Go on your phone
# Or press 'i' for iOS simulator, 'a' for Android emulator
```

### Step 3: Login as Driver

1. Open driver app (or go to `/driver` route)
2. Login with your driver credentials
3. Ensure JWT token is saved to AsyncStorage

---

## 📝 Testing Flow

### Test 1: Open Chat Screen

**Steps:**
1. In driver app, click menu icon (☰)
2. Sidebar slides in from left
3. Click "Help Centre" (new option with message icon)
4. ChatScreen opens

**Expected Results:**
- ✅ Chat screen loads with spinner
- ✅ Previous chat loaded or new one created
- ✅ Connection indicator shows (green dot = connected, red = disconnected)
- ✅ Header shows "Help Centre" title
- ✅ Status badge shows "open"

**If Not Working:**
- Check backend is running
- Check socket.io connection logs
- Check browser console for errors
- Verify JWT token in AsyncStorage

---

### Test 2: Send Message from Driver

**Steps:**
1. On ChatScreen, type message in input field
2. Press send button (arrow icon)
3. Message should appear immediately

**Expected Results:**
- ✅ Message appears in blue bubble (driver message)
- ✅ Message moves to bottom of chat
- ✅ Input field clears
- ✅ Send button disabled while sending
- ✅ Message shows timestamp

**Backend Check:**
```bash
# In backend logs, you should see:
# "💬 Message sent via Socket.io"
# "admin:new_message broadcast to admin"
```

**Database Check:**
```bash
# In MongoDB:
db.chatmessages.findOne({senderType: "driver"})
# Should show your message with timestamp and read status
```

---

### Test 3: Real-Time Updates

**Setup:**
1. Keep driver ChatScreen open
2. Open another terminal
3. Use curl or Postman to simulate admin sending a message

**Curl Command:**
```bash
curl -X POST http://localhost:PORT/api/admin/chat/CHAT_ID/message \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from admin"}'
```

**Expected Results:**
- ✅ Message appears in gray bubble (admin message)
- ✅ Message appears instantly (via Socket.io)
- ✅ Message appears on left side
- ✅ Timestamp shown
- ✅ Chat status might change to "in-progress"

---

### Test 4: Unread Badge

**Steps:**
1. Have messages from admin
2. Close ChatScreen (go back)
3. Open sidebar again
4. Look at "Help Centre" menu item

**Expected Results:**
- ✅ Red badge appears on "Help Centre"
- ✅ Badge shows number of unread messages
- ✅ Badge shows "9+" if more than 9 messages
- ✅ Badge disappears after opening chat

---

### Test 5: Connection Status

**Steps:**
1. Open ChatScreen
2. Watch the connection indicator (top right dot)
3. Turn off network/WiFi
4. Message tries to send

**Expected Results - Connected:**
- ✅ Green dot in top right
- ✅ Message sends successfully
- ✅ No connection errors

**Expected Results - Disconnected:**
- ✅ Red dot appears
- ✅ Alert shows connection error
- ✅ Auto-reconnect attempted
- ✅ Green dot appears when reconnected

---

### Test 6: Chat Status Changes

**Steps:**
1. Send message as driver
2. Admin assigns chat to self (status → in-progress)
3. Watch chat status badge

**Expected Results:**
- ✅ Status badge changes from "open" to "in-progress"
- ✅ Badge changes from orange to blue
- ✅ Updated in real-time via Socket.io

**Then:**
1. Admin marks chat as resolved
2. Watch chat status and input area

**Expected Results:**
- ✅ Status badge changes to "resolved"
- ✅ Badge turns green
- ✅ Input area replaced with "Chat Resolved" UI
- ✅ No more messages can be sent

---

## 🔍 Debugging Tips

### Check Connection
```javascript
// In chatSocket.ts, verify:
ChatSocketService.isConnected() // Should return true

// Check instance
const socket = ChatSocketService.getInstance()
console.log('Socket ID:', socket?.id)
console.log('Connected:', socket?.connected)
```

### Check Messages
```javascript
// In AsyncStorage (where token is stored)
// No messages stored locally, all from backend

// Check database
db.chats.findOne({driverId: DRIVER_ID})
db.chatmessages.find({chatId: CHAT_ID})
```

### Check Socket Events
```javascript
// In backend index.js, Socket.io logs show:
// "driver:send_message" event received
// "admin:new_message" broadcast sent
// "Connection established" on join-chat
```

### Network Issues
```bash
# Check if backend is accessible
curl http://localhost:PORT/api/health

# Check Socket.io endpoint
curl http://localhost:PORT/socket.io/

# Should return Socket.io connection string
```

---

## 🛠️ Common Issues & Fixes

### Issue 1: "Chat not found" error
**Cause:** Chat ID not valid or chat doesn't exist
**Fix:**
1. Ensure you're logged in
2. Ensure backend has created chat
3. Check database for chat records

### Issue 2: Message doesn't appear
**Cause:** Socket.io event not received or API failed
**Fix:**
1. Check connection indicator is green
2. Check backend logs for errors
3. Verify message was sent to backend
4. Check database for message record

### Issue 3: Duplicate messages
**Cause:** Both Socket.io and REST API responses processed
**Fix:**
- Already handled in ChatScreen component
- Check message _id for duplicates
- Clear component state if issues persist

### Issue 4: Unread badge not showing
**Cause:** Chat history API not returning unread count
**Fix:**
1. Check backend /api/driver/chat-history endpoint
2. Verify response includes unreadCount
3. Check SideMenu loadUnreadCount function

### Issue 5: Keyboard covers input
**Cause:** Platform-specific keyboard behavior
**Fix:**
- iOS: KeyboardAvoidingView with padding (already set)
- Android: KeyboardAvoidingView with height (already set)
- Try adjusting keyboardVerticalOffset

---

## 📊 Performance Checklist

- [ ] Messages load within 2 seconds
- [ ] No lag when sending messages
- [ ] No duplicate messages
- [ ] Smooth scrolling with 50+ messages
- [ ] No memory leaks on component unmount
- [ ] Socket.io reconnects within 5 seconds
- [ ] Badge updates instantly
- [ ] UI responsive during sending

---

## 🔐 Security Checklist

- [ ] JWT token required for all operations
- [ ] Driver can only see their own chats
- [ ] Messages validated on backend
- [ ] Input sanitized (trimmed)
- [ ] No sensitive data logged
- [ ] Socket.io validates user type
- [ ] Rate limiting working (50 msgs/min)
- [ ] CORS properly configured

---

## 📱 Device Testing

### iOS Simulator
```bash
npm start
Press 'i' to open iOS simulator
```

### Android Emulator
```bash
npm start
Press 'a' to open Android emulator
```

### Physical Device
```bash
# Install Expo Go from app store
npm start
Scan QR code with Expo Go
```

---

## 📋 Deployment Checklist

Before going live:

```
Backend:
- [ ] MongoDB connected
- [ ] Socket.io listening on correct port
- [ ] CORS configured for frontend URL
- [ ] Environment variables set
- [ ] Error logging working
- [ ] Rate limiting enabled
- [ ] Authentication middleware working

Frontend:
- [ ] EXPO_PUBLIC_API_BASE set correctly
- [ ] Socket.io URL correct
- [ ] All imports resolved
- [ ] No console errors
- [ ] No memory leaks
- [ ] Offline handling working
- [ ] Error messages helpful
```

---

## 🎓 Code Architecture

```
ChatScreen Component
├─ loadChat() - Initialize chat
├─ handleSendMessage() - Send message
├─ Real-time listeners
│  ├─ admin:new_message
│  ├─ admin:chat_assigned
│  └─ admin:chat_resolved
└─ Render message bubbles

driverChatService
├─ REST API calls
├─ Error handling
└─ Response parsing

chatSocket
├─ Socket.io initialization
├─ Event emitters
├─ Event listeners
└─ Connection management
```

---

## 🚀 Next Steps

### For Now:
1. ✅ Test all functionality above
2. ✅ Verify backend working
3. ✅ Check Socket.io connection
4. ✅ Test real-time messaging
5. ✅ Verify data persistence

### In Next Prompt:
1. Create Admin Chat Dashboard
2. Create Admin Chat Modal
3. Implement admin-side messaging
4. Add notification system
5. Test admin-driver real-time sync

---

## 📞 Support

If issues occur:

1. **Check backend logs:**
   ```bash
   cd Backend && npm start
   Look for Socket.io and API logs
   ```

2. **Check frontend logs:**
   - Open console in simulator/device
   - Look for chat-related messages
   - Check Socket.io connection logs

3. **Check database:**
   ```bash
   db.chats.find()
   db.chatmessages.find()
   ```

4. **Network requests:**
   - Use React DevTools
   - Check Network tab in browser
   - Verify URLs and headers

---

## ✅ Success Criteria

You know it's working when:

1. ✅ Chat screen opens from sidebar
2. ✅ Messages send and receive in real-time
3. ✅ Badge shows unread count
4. ✅ Connection indicator changes appropriately
5. ✅ Chat status updates in real-time
6. ✅ Resolved chats show proper UI
7. ✅ No console errors
8. ✅ Messages persist in database
9. ✅ Socket.io connects automatically
10. ✅ All TypeScript types compile without errors

---

**Status:** ✅ COMPLETE - Ready for comprehensive testing
**Ready for:** Admin panel in next prompt
