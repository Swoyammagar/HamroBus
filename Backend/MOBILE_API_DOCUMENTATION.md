# Mobile API Documentation

## Overview
This API provides authentication and management endpoints for two types of mobile users: **Drivers** and **Passengers**.

## Authentication
All protected endpoints require JWT token authentication. After login, the client receives:
- `accessToken` - Short-lived token (15 minutes)
- `refreshToken` - Long-lived token (30 days)

### Using the Token
Include the access token in the Authorization header for protected routes:
```
Authorization: Bearer <accessToken>
```

## Base URL
```
http://your-api-url/api
```

---

## Driver Endpoints

### 1. Register Driver
**POST** `/driver/register`

Register a new driver account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "address": "123 Main St, City",
  "phoneNumber": "+1234567890",
  "email": "john.driver@example.com",
  "password": "securePassword123",
  "licenseNo": "DL123456789",
  "licenseImgUrl": "https://example.com/license.jpg" // Optional
}
```

**Response (201):**
```json
{
  "message": "Driver registered successfully. Awaiting validation.",
  "driver": {
    "id": "userId",
    "driverId": "DRV1234567890123",
    "email": "john.driver@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "validationStatus": "pending"
  }
}
```

---

### 2. Driver Login
**POST** `/driver/login`

Authenticate a driver and receive JWT tokens.

**Request Body:**
```json
{
  "email": "john.driver@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "userId",
    "email": "john.driver@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "role": "driver"
  },
  "driver": {
    "driverId": "DRV1234567890123",
    "licenseNo": "DL123456789",
    "assignedBus": "BUS-001",
    "assignedRoute": "Route-A",
    "isActive": true
  }
}
```

**Error Response (403):**
```json
{
  "message": "Driver account is not approved yet",
  "validationStatus": "pending"
}
```

---

### 3. Get Driver Profile
**GET** `/driver/profile`

Get the authenticated driver's profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "user": {
    "id": "userId",
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St, City",
    "phoneNumber": "+1234567890",
    "email": "john.driver@example.com",
    "isVerified": true,
    "role": "driver"
  },
  "driver": {
    "userId": "userId",
    "driverId": "DRV1234567890123",
    "licenseNo": "DL123456789",
    "licenseImgUrl": "https://example.com/license.jpg",
    "assignedBus": "BUS-001",
    "assignedRoute": "Route-A",
    "validationStatus": "approved",
    "isActive": true
  }
}
```

---

### 4. Update Driver Location
**POST** `/driver/location`

Update the driver's current location (for real-time tracking).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "longitude": -122.4194,
  "latitude": 37.7749,
  "tripId": "TRIP123" // Optional
}
```

**Response (200):**
```json
{
  "message": "Location updated successfully",
  "location": {
    "driverId": "DRV1234567890123",
    "longitude": -122.4194,
    "latitude": 37.7749,
    "timestamp": "2025-12-26T10:30:00.000Z"
  }
}
```

---

### 5. Get Driver Location History
**GET** `/driver/location/:driverId?limit=100`

Get location history for a specific driver.

**Query Parameters:**
- `limit` - Number of records to return (default: 100)

**Response (200):**
```json
{
  "driverId": "DRV1234567890123",
  "locations": [
    {
      "driverId": "driverObjectId",
      "tripId": "TRIP123",
      "longitude": -122.4194,
      "latitude": 37.7749,
      "timestamp": "2025-12-26T10:30:00.000Z"
    }
  ]
}
```

---

## Passenger Endpoints

### 1. Register Passenger
**POST** `/passenger/register`

Register a new passenger account.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "address": "456 Oak Ave, City",
  "phoneNumber": "+1987654321",
  "email": "jane.passenger@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "message": "Passenger registered successfully",
  "passenger": {
    "id": "userId",
    "passengerId": "PSG1234567890123",
    "email": "jane.passenger@example.com",
    "firstName": "Jane",
    "lastName": "Smith"
  }
}
```

---

### 2. Passenger Login
**POST** `/passenger/login`

Authenticate a passenger and receive JWT tokens.

**Request Body:**
```json
{
  "email": "jane.passenger@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "userId",
    "email": "jane.passenger@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "phoneNumber": "+1987654321",
    "role": "passenger"
  },
  "passenger": {
    "passengerId": "PSG1234567890123"
  }
}
```

---

### 3. Get Passenger Profile
**GET** `/passenger/profile`

Get the authenticated passenger's profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "user": {
    "id": "userId",
    "firstName": "Jane",
    "lastName": "Smith",
    "address": "456 Oak Ave, City",
    "phoneNumber": "+1987654321",
    "email": "jane.passenger@example.com",
    "isVerified": true,
    "role": "passenger"
  },
  "passenger": {
    "userId": "userId",
    "passengerId": "PSG1234567890123"
  }
}
```

---

### 4. Update Passenger Profile
**PUT** `/passenger/profile`

Update the authenticated passenger's profile information.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith-Updated",
  "address": "789 New St, City",
  "phoneNumber": "+1555555555"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "userId",
    "email": "jane.passenger@example.com",
    "firstName": "Jane",
    "lastName": "Smith-Updated",
    "phoneNumber": "+1555555555",
    "address": "789 New St, City"
  }
}
```

---

## Common Auth Endpoints

### Refresh Token
**POST** `/auth/refresh`

Get a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Logout
**POST** `/auth/logout`

Logout user and invalidate refresh token.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Error Responses

### Common Error Codes
- `400` - Bad Request (missing/invalid data)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## Data Models

### User Schema
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

### Driver Schema
```javascript
{
  userId: ObjectId (ref: 'User'),
  driverId: String (unique),
  licenseNo: String (unique),
  licenseImgUrl: String,
  assignedBus: String,
  assignedRoute: String,
  validationStatus: String (enum: ['pending', 'approved', 'rejected']),
  isActive: Boolean (default: false),
  timestamps: true
}
```

### Passenger Schema
```javascript
{
  userId: ObjectId (ref: 'User'),
  passengerId: String (unique),
  timestamps: true
}
```

### Location Schema
```javascript
{
  driverId: ObjectId (ref: 'Driver'),
  tripId: String,
  longitude: Number (required),
  latitude: Number (required),
  timestamp: Date (default: Date.now),
  timestamps: true
}
```

---

## Secure Storage Implementation

### Mobile App (React Native)
Store JWT tokens securely using:

#### For React Native:
```javascript
import * as SecureStore from 'expo-secure-store';

// Save tokens
await SecureStore.setItemAsync('accessToken', accessToken);
await SecureStore.setItemAsync('refreshToken', refreshToken);

// Retrieve tokens
const accessToken = await SecureStore.getItemAsync('accessToken');
const refreshToken = await SecureStore.getItemAsync('refreshToken');

// Delete tokens on logout
await SecureStore.deleteItemAsync('accessToken');
await SecureStore.deleteItemAsync('refreshToken');
```

#### For Android (Native):
Use `EncryptedSharedPreferences` or Android Keystore

#### For iOS (Native):
Use Keychain Services

---

## Example Usage Flow

### Driver Registration & Login
1. Driver registers via `/driver/register`
2. Admin approves driver (validationStatus: 'approved')
3. Driver logs in via `/driver/login`
4. App stores tokens in secure storage
5. App uses accessToken for subsequent API calls
6. When accessToken expires, use refreshToken to get new one

### Real-time Location Tracking
1. Driver starts trip
2. App periodically sends location via `/driver/location` (e.g., every 10 seconds)
3. Backend stores location with timestamp
4. Admin/Passenger can view location history via `/driver/location/:driverId`

---

## Security Notes

1. **Always use HTTPS** in production
2. **Store JWT tokens securely** - Never in AsyncStorage/localStorage
3. **Implement token refresh** logic before accessToken expires
4. **Clear tokens on logout**
5. **Validate user input** on all endpoints
6. **Use strong passwords** - Minimum 8 characters
7. **Implement rate limiting** to prevent brute force attacks
8. **Add OTP verification** for phone numbers (recommended)

---

## Environment Variables Required

```env
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
MONGODB_URI=your-mongodb-connection-string
NODE_ENV=development
PORT=3000
```
