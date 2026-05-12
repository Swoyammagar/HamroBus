# FAQ Service Backend Implementation - Complete ✅

## Overview
The FAQ service has been fully implemented with models, controllers, and routes. Users (drivers/passengers) can submit FAQs which automatically trigger admin notifications and emails.

---

## Backend Architecture

### 1. **FAQ Model** (`/Backend/models/faq.model.js`)

**Fields:**
- `faqId` - Unique identifier for the FAQ
- `name` - Name of the person submitting
- `phoneNumber` - Contact phone number
- `email` - Contact email
- `title` - FAQ title/subject
- `message` - Detailed FAQ message
- `category` - Category (billing, technical, booking, safety, general, complaint, suggestion, other)
- `role` - Submitter role (driver/passenger)
- `userId` - Reference to driver/passenger user
- `status` - Status (pending, in-review, resolved, closed)
- `priority` - Priority level (low, medium, high, urgent)
- `adminNotes` - Admin's response/notes
- `assignedToAdmin` - Admin assigned to handle this FAQ
- `createdAt` - Timestamp
- `updatedAt` - Last update timestamp
- `resolvedAt` - When FAQ was resolved
- `resolvedBy` - Admin who resolved it

---

## API Endpoints

### **Public Endpoints**

#### **1. Submit FAQ**
```
POST /api/faq/submit
```

**Request Body:**
```json
{
  "name": "John Doe",
  "phoneNumber": "9841234567",
  "email": "john@example.com",
  "title": "How to cancel a booking?",
  "message": "I want to know the cancellation process and refund policy",
  "category": "booking",
  "role": "passenger",
  "userId": "optional_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "FAQ submitted successfully. Our team will review it shortly.",
  "faq": {
    "id": "507f1f77bcf86cd799439011",
    "faqId": "faq_abc123",
    "name": "John Doe",
    "title": "How to cancel a booking?",
    "status": "pending",
    "createdAt": "2026-05-11T10:30:00Z"
  }
}
```

**What happens:**
1. ✅ FAQ saved to database
2. 📧 Email sent to admin with FAQ details
3. 🔔 Admin notification created
4. 📢 Real-time socket event emitted: `faq:submitted` and `notification:new`

---

### **User Endpoints (Auth Required)**

#### **2. Get User's FAQs**
```
GET /api/faq/user?role=passenger&status=pending&page=1&limit=10
```

**Query Parameters:**
- `role` - Filter by role (optional)
- `status` - Filter by status (optional)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "faqId": "faq_abc123",
      "name": "John Doe",
      "title": "How to cancel a booking?",
      "message": "...",
      "category": "booking",
      "role": "passenger",
      "status": "in-review",
      "priority": "medium",
      "adminNotes": "We're reviewing your concern...",
      "createdAt": "2026-05-11T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

---

### **Admin Endpoints (Admin Auth Required)**

#### **3. Get All FAQs**
```
GET /api/faq/admin/all?role=driver&status=pending&category=technical&priority=high&page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

**Query Parameters:**
- `role` - Filter by role (driver/passenger)
- `status` - Filter by status (pending, in-review, resolved, closed)
- `category` - Filter by category
- `priority` - Filter by priority (low, medium, high, urgent)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort order: asc/desc (default: desc)

**Response:** Same as "Get User's FAQs" but with all FAQs

---

#### **4. Get FAQ Statistics**
```
GET /api/faq/admin/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "pending": 12,
    "inReview": 8,
    "resolved": 20,
    "closed": 5,
    "driverCount": 25,
    "passengerCount": 20,
    "byCategory": [
      { "_id": "technical", "count": 15 },
      { "_id": "booking", "count": 12 },
      { "_id": "billing", "count": 10 },
      { "_id": "safety", "count": 8 }
    ],
    "byPriority": [
      { "_id": "high", "count": 20 },
      { "_id": "medium", "count": 18 },
      { "_id": "low", "count": 7 }
    ]
  }
}
```

---

#### **5. Get Single FAQ**
```
GET /api/faq/admin/:faqId
```

**Response:** Returns single FAQ object with admin details

---

#### **6. Update FAQ Status & Notes**
```
PATCH /api/faq/admin/:faqId/status
```

**Request Body:**
```json
{
  "status": "resolved",
  "priority": "high",
  "adminNotes": "Issue resolved. Updated the booking system to prevent this.",
  "assignedToAdmin": "admin_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "FAQ updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "faqId": "faq_abc123",
    "status": "resolved",
    "priority": "high",
    "adminNotes": "Issue resolved...",
    "resolvedAt": "2026-05-11T14:30:00Z",
    "resolvedBy": {
      "_id": "admin_id",
      "fullname": "Admin Name",
      "email": "admin@example.com"
    },
    "updatedAt": "2026-05-11T14:30:00Z"
  }
}
```

**Real-time Update:**
- Socket event: `faq:updated` emitted to admin-room

---

#### **7. Delete FAQ**
```
DELETE /api/faq/admin/:faqId
```

**Response:**
```json
{
  "success": true,
  "message": "FAQ deleted successfully"
}
```

**Real-time Update:**
- Socket event: `faq:deleted` emitted to admin-room

---

## Real-Time Socket Events

### **Admin Receives (via Socket.io):**

**When FAQ is submitted:**
```javascript
// Event 1: FAQ submitted event
io.to('admin-room').emit('faq:submitted', {
  _id: '507f1f77bcf86cd799439011',
  faqId: 'faq_abc123',
  name: 'John Doe',
  phoneNumber: '9841234567',
  email: 'john@example.com',
  title: 'How to cancel a booking?',
  message: '...',
  category: 'booking',
  role: 'passenger',
  status: 'pending',
  priority: 'medium',
  createdAt: '2026-05-11T10:30:00Z',
  notificationId: 'faq_abc123_timestamp'
})

// Event 2: Notification event (for notifications list)
io.to('admin-room').emit('notification:new', {
  _id: 'notif_id',
  notificationId: 'faq_abc123_timestamp',
  title: 'New FAQ from PASSENGER',
  message: 'John Doe submitted a FAQ: "How to cancel a booking?"',
  type: 'info',
  severity: 'medium',
  sentBy: 'system',
  targetAudience: 'admins',
  createdAt: '2026-05-11T10:30:00Z',
  metadata: {
    faqId: '507f1f77bcf86cd799439011',
    actionRequired: 'review_faq'
  }
})
```

**When FAQ is updated:**
```javascript
io.to('admin-room').emit('faq:updated', {
  _id: '507f1f77bcf86cd799439011',
  faqId: 'faq_abc123',
  status: 'resolved',
  priority: 'high',
  adminNotes: 'Issue resolved...',
  resolvedAt: '2026-05-11T14:30:00Z',
  updatedAt: '2026-05-11T14:30:00Z'
})
```

**When FAQ is deleted:**
```javascript
io.to('admin-room').emit('faq:deleted', {
  _id: '507f1f77bcf86cd799439011',
  faqId: 'faq_abc123'
})
```

---

## Data Flow

```
Driver/Passenger App
        ↓
POST /api/faq/submit
        ↓
Backend FAQ Controller
    ├→ Validate input
    ├→ Save to MongoDB
    ├→ Create Notification document
    ├→ Send Email to Admin
    ├→ Emit Socket Events:
    │  ├→ 'faq:submitted' to admin-room
    │  └→ 'notification:new' to admin-room
    └→ Return success response
        ↓
Admin Panel receives:
├→ Real-time 'faq:submitted' event
├→ Real-time 'notification:new' event
├→ Email notification
└→ In-app notification in dashboard
```

---

## Email Template

When FAQ is submitted, admin receives email:

```
Subject: New FAQ from DRIVER: How to get better ratings?

---

From: DRIVER - Ahmed Hassan
Phone: 9841234567
Email: ahmed@example.com
Category: general

---

Title: How to get better ratings?

Message:
I want to know what factors affect my ratings and how I can improve them.

---

FAQ ID: faq_abc123

Please log in to the admin panel to review and respond to this FAQ.
```

---

## Environment Variables Required

In `.env` file:
```
ADMIN_EMAIL=admin@hamrobus.com
```

---

## Next Steps

### Frontend Implementation (Driver/Passenger Apps)
1. Create FAQ Submit Page
2. Display form with fields: name, phone, email, title, message, category
3. Send POST request to `/api/faq/submit`
4. Show confirmation message

### Admin Panel
1. Create FAQ List Page
2. Display all FAQs with filters and sorting
3. Create FAQ Detail/Review Page
4. Allow status updates and add notes
5. Show FAQ Statistics Dashboard

---

## Testing Checklist

- [ ] Submit FAQ as driver → Check database entry
- [ ] Verify admin receives email
- [ ] Verify real-time notification appears in admin panel
- [ ] Admin updates FAQ status → Check real-time update
- [ ] Admin deletes FAQ → Check real-time delete event
- [ ] Driver views own FAQs → Check GET /api/faq/user response
- [ ] Admin views all FAQs → Check filtering and pagination
- [ ] FAQ stats endpoint → Verify counts are accurate

---

## Error Handling

All endpoints include error handling for:
- Missing required fields
- Invalid role/status/category values
- Database errors
- Email sending failures (non-blocking)
- Socket emission failures (non-blocking)

---

## Security Notes

✅ Admin routes are protected with `adminAuthMiddleware`
✅ User FAQ retrieval checks `userId` from JWT token
✅ Database validation on all inputs
✅ No sensitive admin data exposed in responses

---

**Backend FAQ Service is now ready for frontend integration!** 🎉
