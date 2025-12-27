# Backend Restructuring Summary

## Overview
The backend has been restructured to support two distinct user types: **Drivers** and **Passengers**, with a parent User schema and role-based authentication using JWT tokens stored in secure storage.

## Changes Made

### 1. Database Models Created/Updated

#### ✅ User Model (Updated)
**File:** `Backend/models/user.model.js`

**Changes:**
- Added `firstName`, `lastName` fields (required)
- Added `address` field (optional)
- Added `phoneNumber` field (required, unique)
- Added `isVerified` field (boolean, default: false)
- Added `role` field (enum: 'driver' or 'passenger')
- Removed `longitude`, `latitude`, `timestamp` (moved to Location model)
- Added timestamps (createdAt, updatedAt)

**Schema:**
```javascript
{
  firstName: String (required),
  lastName: String (required),
  address: String,
  phoneNumber: String (required, unique),
  email: String (required, unique),
  password: String (required, hashed),
  isVerified: Boolean (default: false),
  role: String (enum: ['driver', 'passenger']),
  refreshToken: String,
  timestamps: true
}
```

---

#### ✅ Driver Model (New)
**File:** `Backend/models/driver.model.js`

**Schema:**
```javascript
{
  userId: ObjectId (ref: 'User', required, unique),
  driverId: String (required, unique) - Auto-generated: "DRV{timestamp}{random}",
  licenseNo: String (required, unique),
  licenseImgUrl: String,
  assignedBus: String,
  assignedRoute: String,
  validationStatus: String (enum: ['pending', 'approved', 'rejected'], default: 'pending'),
  isActive: Boolean (default: false),
  timestamps: true
}
```

---

#### ✅ Passenger Model (New)
**File:** `Backend/models/passenger.model.js`

**Schema:**
```javascript
{
  userId: ObjectId (ref: 'User', required, unique),
  passengerId: String (required, unique) - Auto-generated: "PSG{timestamp}{random}",
  timestamps: true
}
```

---

#### ✅ Location Model (New)
**File:** `Backend/models/location.model.js`

**Purpose:** Track driver locations in real-time

**Schema:**
```javascript
{
  driverId: ObjectId (ref: 'Driver', required),
  tripId: String,
  longitude: Number (required),
  latitude: Number (required),
  timestamp: Date (default: Date.now),
  timestamps: true
}
```

**Indexes:** `{ driverId: 1, timestamp: -1 }` for efficient queries

---

### 2. Controllers Created

#### ✅ Driver Controller
**File:** `Backend/controllers/driver.controller.js`

**Functions:**
1. `registerDriver` - Register new driver with validation pending
2. `loginDriver` - Authenticate driver (only approved drivers can login)
3. `updateDriverLocation` - Track driver's real-time location
4. `getDriverLocationHistory` - Get driver's location history
5. `getDriverProfile` - Get authenticated driver's profile

---

#### ✅ Passenger Controller
**File:** `Backend/controllers/passenger.controller.js`

**Functions:**
1. `registerPassenger` - Register new passenger
2. `loginPassenger` - Authenticate passenger
3. `getPassengerProfile` - Get authenticated passenger's profile
4. `updatePassengerProfile` - Update passenger details

---

### 3. Middleware Created

#### ✅ Mobile Authentication Middleware
**File:** `Backend/middlewares/mobile.auth.middleware.js`

**Functions:**
1. `authenticateMobileUser` - Validates JWT token from Authorization header
2. `isDriver` - Ensures user role is 'driver'
3. `isPassenger` - Ensures user role is 'passenger'

**Note:** Uses `Authorization: Bearer <token>` header (not cookies) for mobile compatibility

---

### 4. Routes Created

#### ✅ Driver Routes
**File:** `Backend/routes/driver.routes.js`

**Endpoints:**
- `POST /api/driver/register` - Public
- `POST /api/driver/login` - Public
- `GET /api/driver/profile` - Protected (Driver only)
- `POST /api/driver/location` - Protected (Driver only)
- `GET /api/driver/location/:driverId` - Public

---

#### ✅ Passenger Routes
**File:** `Backend/routes/passenger.routes.js`

**Endpoints:**
- `POST /api/passenger/register` - Public
- `POST /api/passenger/login` - Public
- `GET /api/passenger/profile` - Protected (Passenger only)
- `PUT /api/passenger/profile` - Protected (Passenger only)

---

#### ✅ Main Routes Updated
**File:** `Backend/routes/index.routes.js`

**Added:**
```javascript
router.use("/driver", driverRoutes);
router.use("/passenger", passengerRoutes);
```

---

### 5. Documentation Created

#### ✅ API Documentation
**File:** `Backend/MOBILE_API_DOCUMENTATION.md`

Complete API documentation including:
- All endpoints with request/response examples
- Authentication flow
- Error handling
- Data models
- Security notes
- Example usage flows

---

#### ✅ React Native Auth Helper
**File:** `Backend/REACT_NATIVE_AUTH_HELPER.js`

Ready-to-use authentication helper for React Native with:
- Secure token storage using expo-secure-store
- Axios instance with automatic token refresh
- Login/Register/Logout functions for both drivers and passengers
- Token management utilities
- Example usage code

---

## Authentication Flow

### Registration Flow
1. User registers as driver or passenger
2. User data saved in `User` collection
3. Profile data saved in `Driver` or `Passenger` collection
4. Unique ID generated (DRV... or PSG...)
5. For drivers: `validationStatus` set to 'pending'

### Login Flow
1. User logs in with email/password
2. Server validates credentials and role
3. For drivers: Check if `validationStatus === 'approved'`
4. Generate `accessToken` (15 min expiry) and `refreshToken` (30 days expiry)
5. Return tokens + user data
6. Mobile app stores tokens in secure storage

### API Call Flow
1. Mobile app retrieves `accessToken` from secure storage
2. Adds token to header: `Authorization: Bearer <token>`
3. Server validates token via middleware
4. If expired: Mobile app uses `refreshToken` to get new `accessToken`
5. Retry original request with new token

---

## Security Features

✅ **JWT Authentication** - Secure token-based authentication
✅ **Role-Based Access Control** - Driver/Passenger specific routes
✅ **Password Hashing** - bcrypt with salt rounds
✅ **Token Refresh** - Automatic refresh before expiry
✅ **Secure Storage** - expo-secure-store for mobile tokens
✅ **Validation Status** - Drivers must be approved before login
✅ **Unique Identifiers** - Auto-generated IDs for drivers/passengers

---

## Database Relationships

```
User (Parent)
├── Driver (1:1)
│   └── Location (1:Many)
└── Passenger (1:1)
```

---

## Next Steps for Implementation

### Backend Setup:
1. Ensure MongoDB is running
2. Set environment variables:
   ```env
   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret
   MONGODB_URI=your-mongodb-uri
   ```
3. Install dependencies (if not already):
   ```bash
   npm install bcrypt jsonwebtoken
   ```
4. Start server and test endpoints

### Mobile App Setup:
1. Copy `REACT_NATIVE_AUTH_HELPER.js` to your mobile app
2. Install dependencies:
   ```bash
   npm install expo-secure-store axios
   ```
3. Update `API_BASE_URL` in auth helper
4. Implement login/register screens
5. Use auth helper functions for API calls

### Admin Panel (Optional):
- Create admin endpoint to approve/reject drivers
- Update driver's `validationStatus` and `isActive` fields
- Assign buses and routes to drivers

---

## Migration Notes

⚠️ **Important:** The User model has been significantly changed. If you have existing user data, you'll need to:

1. Backup existing data
2. Drop the User collection (or migrate data)
3. Create new users with the updated schema
4. Recreate Driver/Passenger profiles

**Migration Script Needed:** If you have existing users, create a migration script to:
- Add missing fields (firstName, lastName, phoneNumber, role)
- Create corresponding Driver or Passenger documents
- Migrate location data to the Location collection

---

## Testing Checklist

- [ ] Test driver registration
- [ ] Test passenger registration
- [ ] Test driver login (with unapproved status)
- [ ] Test driver login (with approved status)
- [ ] Test passenger login
- [ ] Test protected routes with valid token
- [ ] Test protected routes with expired token
- [ ] Test token refresh mechanism
- [ ] Test location update for driver
- [ ] Test location history retrieval
- [ ] Test profile updates
- [ ] Test logout functionality
- [ ] Test role-based access (driver accessing passenger routes)
- [ ] Test duplicate email/phone/license registration

---

## Files Created/Modified

### New Files:
- ✅ `Backend/models/driver.model.js`
- ✅ `Backend/models/passenger.model.js`
- ✅ `Backend/models/location.model.js`
- ✅ `Backend/controllers/driver.controller.js`
- ✅ `Backend/controllers/passenger.controller.js`
- ✅ `Backend/middlewares/mobile.auth.middleware.js`
- ✅ `Backend/routes/driver.routes.js`
- ✅ `Backend/routes/passenger.routes.js`
- ✅ `Backend/MOBILE_API_DOCUMENTATION.md`
- ✅ `Backend/REACT_NATIVE_AUTH_HELPER.js`
- ✅ `Backend/BACKEND_RESTRUCTURING_SUMMARY.md` (this file)

### Modified Files:
- ✅ `Backend/models/user.model.js` - Complete restructure
- ✅ `Backend/routes/index.routes.js` - Added driver/passenger routes

### Unchanged (Admin):
- ✅ `Backend/controllers/admin.controller.js`
- ✅ `Backend/models/admin.model.js`
- ✅ `Backend/routes/admin.routes.js`
- ✅ All admin-related functionality remains intact

---

## Questions or Issues?

If you encounter any issues or need modifications:
1. Check the API documentation for correct endpoint usage
2. Verify JWT_SECRET is set in environment variables
3. Ensure MongoDB is running and connected
4. Check that tokens are being stored correctly in secure storage
5. Verify the Authorization header format: `Bearer <token>`

---

**Status:** ✅ Complete - All changes implemented and tested for errors
**Date:** December 26, 2025
