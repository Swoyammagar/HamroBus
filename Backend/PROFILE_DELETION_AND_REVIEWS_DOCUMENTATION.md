# Passenger & Driver Profile Management - Backend Implementation

## Overview
This document describes the backend implementation for:
1. **Passenger Reviews Retrieval** - Get all reviews given by a passenger
2. **Profile Deletion System** - 7-day grace period account deletion with cancellation ability
3. **Review Statistics** - Get summary stats about passenger's reviews

---

## Database Changes

### Passenger Model (`models/passenger.model.js`)
Added new field for profile deletion:
```javascript
deleteRequestedAt: {
    type: Date,
    required: false,
    index: true
}
```

### Driver Model (`models/driver.model.js`)
Added new field for profile deletion:
```javascript
deleteRequestedAt: {
    type: Date,
    required: false,
    index: true
}
```

---

## New Services

### 1. Passenger Review Service (`services/passengerReviewService.js`)

**Functions:**

#### `getPassengerReviews(passengerId, options)`
Retrieves all reviews given by a passenger with pagination and sorting.

**Parameters:**
- `passengerId`: ID of the passenger
- `options`: Object with:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sortBy`: Field to sort by (default: 'createdAt')
  - `sortOrder`: 'asc' or 'desc' (default: 'desc')

**Returns:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review_id",
        "reviewId": "review_id",
        "driverId": "driver_id",
        "driverName": "John Doe",
        "driverImage": "url",
        "driverRating": 4.5,
        "driverRatingCount": 50,
        "rating": 5,
        "comment": "Great service",
        "isEdited": false,
        "reviewedAt": "2026-05-18T...",
        "createdAt": "2026-05-18T...",
        "booking": {
          "id": "booking_id",
          "bookingCode": "HB001",
          "serviceDate": "2026-05-18",
          "route": {
            "id": "route_id",
            "name": "Kathmandu to Pokhara",
            "source": "Kathmandu",
            "destination": "Pokhara"
          },
          "bus": {
            "id": "bus_id",
            "busNumber": "BA-1-CH-1234",
            "busType": "AC"
          },
          "totalFare": 500
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalReviews": 50,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### `getPassengerReviewStats(passengerId)`
Returns summary statistics about passenger's reviews.

**Returns:**
```json
{
  "success": true,
  "data": {
    "totalReviews": 25,
    "averageRating": 4.3,
    "ratingDistribution": {
      "5": 15,
      "4": 8,
      "3": 2,
      "2": 0,
      "1": 0
    }
  }
}
```

---

### 2. Account Deletion Service (`services/deleteAccountService.js`)

**Key Constants:**
```javascript
DELETION_GRACE_PERIOD_DAYS = 7
GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
```

**Functions:**

#### `requestPassengerProfileDeletion(passengerId)`
Marks a passenger profile for deletion. User has 7 days to cancel.

**Returns:**
```json
{
  "success": true,
  "message": "Your profile will be permanently deleted on 2026-05-25. You can restore it by logging in anytime before then.",
  "deleteScheduledFor": "2026-05-25"
}
```

#### `requestDriverProfileDeletion(driverId)`
Marks a driver profile for deletion. User has 7 days to cancel.

**Returns:** Same format as passenger deletion

#### `cancelPassengerProfileDeletion(passengerId)`
Cancels a pending deletion request by clearing the `deleteRequestedAt` field.

**Returns:**
```json
{
  "success": true,
  "message": "Profile deletion cancelled. Your profile is safe."
}
```

#### `cancelDriverProfileDeletion(driverId)`
Cancels a pending deletion request for driver.

**Returns:** Same format as passenger cancellation

#### `permanentlyDeletePassengerProfile(passengerId)`
Actually deletes a passenger profile after 7-day grace period has expired.

**What gets deleted:**
- Passenger user record is deleted
- All bookings by this passenger have `passengerId` set to `null`
- All reviews given by this passenger have `passengerId` set to `null` and author name set to "Deleted User"

**Returns:**
```json
{
  "success": true,
  "message": "Passenger profile and associated data have been permanently deleted"
}
```

#### `permanentlyDeleteDriverProfile(driverId)`
Actually deletes a driver profile after 7-day grace period has expired.

**What gets deleted:**
- Driver user record is deleted
- All trips by this driver have `driverId` set to `null`
- All reviews received by this driver have `driverId` set to `null` and driver name set to "Deleted User"

#### `processExpiredPassengerDeletions()`
Finds all passengers with expired deletion grace period and deletes them.
**Used by cron job**

#### `processExpiredDriverDeletions()`
Finds all drivers with expired deletion grace period and deletes them.
**Used by cron job**

#### `checkDeletionStatusOnLogin(passengerId)`
Called during login to check if profile should be deleted or warn user about pending deletion.

**Returns:**
```json
{
  "isDeletionPending": false  // or true
}
```

Or if pending:
```json
{
  "isDeletionPending": true,
  "remainingDays": 3,
  "deletionDate": "2026-05-25",
  "message": "Your profile is scheduled for deletion in 3 days"
}
```

Or if expired:
```json
{
  "isDeletionPending": false,
  "deleted": true,
  "message": "Your profile has been permanently deleted"
}
```

---

## API Endpoints

### Passenger Endpoints

#### 1. Get My Reviews
**Endpoint:** `GET /passenger/reviews/my-reviews`
**Auth:** Required (authenticatePassenger)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sortBy`: Field to sort by (default: 'createdAt')
- `sortOrder`: 'asc' or 'desc' (default: 'desc')

**Response:** Returns paginated list of reviews with booking and driver details

**Example:**
```bash
curl -X GET "http://localhost:5000/passenger/reviews/my-reviews?page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

#### 2. Get Review Statistics
**Endpoint:** `GET /passenger/reviews/stats`
**Auth:** Required (authenticatePassenger)

**Response:** Returns aggregated review statistics

**Example:**
```bash
curl -X GET "http://localhost:5000/passenger/reviews/stats" \
  -H "Authorization: Bearer <token>"
```

---

#### 3. Request Profile Deletion
**Endpoint:** `POST /passenger/profile/request-delete`
**Auth:** Required (authenticatePassenger)

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Your profile will be permanently deleted on 2026-05-25. You can restore it by logging in anytime before then.",
  "deleteScheduledFor": "2026-05-25"
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/passenger/profile/request-delete" \
  -H "Authorization: Bearer <token>"
```

---

#### 4. Cancel Profile Deletion
**Endpoint:** `POST /passenger/profile/cancel-delete`
**Auth:** Required (authenticatePassenger)

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Profile deletion cancelled. Your profile is safe."
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/passenger/profile/cancel-delete" \
  -H "Authorization: Bearer <token>"
```

---

#### 5. Check Deletion Status
**Endpoint:** `GET /passenger/profile/deletion-status`
**Auth:** Required (authenticatePassenger)

**Response:** Returns deletion status with remaining days if pending

**Example:**
```bash
curl -X GET "http://localhost:5000/passenger/profile/deletion-status" \
  -H "Authorization: Bearer <token>"
```

---

### Driver Endpoints

#### 1. Request Profile Deletion
**Endpoint:** `POST /driver/profile/request-delete`
**Auth:** Required (authenticateDriver)

**Response:** Same as passenger deletion request

---

#### 2. Cancel Profile Deletion
**Endpoint:** `POST /driver/profile/cancel-delete`
**Auth:** Required (authenticateDriver)

**Response:** Same as passenger cancellation

---

#### 3. Check Deletion Status
**Endpoint:** `GET /driver/profile/deletion-status`
**Auth:** Required (authenticateDriver)

**Response:** Same as passenger status check

---

## Setting Up Automatic Deletion Processing

### Option 1: Using node-cron (Recommended)

Install node-cron:
```bash
npm install node-cron
```

In your main `index.js` file, add:
```javascript
const cron = require('node-cron');
const { processExpiredDeletions } = require('./utils/accountDeletionCron');

// Run deletion process every day at 2 AM
cron.schedule('0 2 * * *', async () => {
    console.log('Running account deletion cron job...');
    await processExpiredDeletions();
});

// Or run every hour
cron.schedule('0 * * * *', async () => {
    console.log('Running account deletion cron job...');
    await processExpiredDeletions();
});
```

### Option 2: Manual Trigger

Create an admin endpoint to manually trigger the deletion process:

```javascript
// In admin controller
const { processExpiredDeletions } = require('../utils/accountDeletionCron');

const triggerAccountDeletionProcess = async (req, res) => {
    try {
        const result = await processExpiredDeletions();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
```

---

## Workflow Examples

### Passenger Deletion Workflow

1. **User requests deletion:**
   ```bash
   POST /passenger/profile/request-delete
   ```
   Response: "Profile will be deleted on 2026-05-25"

2. **User can cancel anytime within 7 days:**
   ```bash
   POST /passenger/profile/cancel-delete
   ```
   Response: "Deletion cancelled"

3. **After 7 days, profile is permanently deleted:**
   - Automatic: Via cron job
   - Manual: Can check during next login via `checkDeletionStatusOnLogin()`

4. **Result:**
   - Profile deleted
   - Bookings show "Deleted User" instead of passenger info
   - Reviews show "Deleted User" as author
   - Points history remains for bookings but not linked to user

---

### Data Anonymization Details

**When Passenger is Deleted:**
- Passenger document is removed from database
- Booking records:
  - `passengerId`: set to `null`
  - `passengerName`: set to "Deleted User" (if such field exists)
- Review records:
  - `passengerId`: set to `null`
  - `passengerName`: set to "Deleted User" (if such field exists)

**When Driver is Deleted:**
- Driver document is removed from database
- Trip records:
  - `driverId`: set to `null`
  - `driverName`: set to "Deleted User" (if such field exists)
- Review records:
  - `driverId`: set to `null`
  - `driverName`: set to "Deleted User" (if such field exists)

---

## Testing

### Test Passenger Reviews
```bash
# Get passenger reviews
curl -X GET "http://localhost:5000/passenger/reviews/my-reviews" \
  -H "Authorization: Bearer <passenger_token>"

# Get stats
curl -X GET "http://localhost:5000/passenger/reviews/stats" \
  -H "Authorization: Bearer <passenger_token>"
```

### Test Profile Deletion
```bash
# Request deletion
curl -X POST "http://localhost:5000/passenger/profile/request-delete" \
  -H "Authorization: Bearer <passenger_token>"

# Check status
curl -X GET "http://localhost:5000/passenger/profile/deletion-status" \
  -H "Authorization: Bearer <passenger_token>"

# Cancel deletion
curl -X POST "http://localhost:5000/passenger/profile/cancel-delete" \
  -H "Authorization: Bearer <passenger_token>"
```

---

## Notes

1. **Grace Period:** 7 days from deletion request
2. **Cancellation:** Can be done by logging in or calling cancel endpoint
3. **Auto-deletion:** Requires cron job or manual trigger
4. **Data Preservation:** Historical data (bookings, reviews) is preserved with anonymized user info
5. **Logging:** All deletion processes are logged for audit purposes

---

## Files Modified/Created

### New Files:
- `services/deleteAccountService.js` - Account deletion business logic
- `services/passengerReviewService.js` - Passenger review retrieval
- `utils/accountDeletionCron.js` - Cron job utility

### Modified Files:
- `models/passenger.model.js` - Added deleteRequestedAt field
- `models/driver.model.js` - Added deleteRequestedAt field
- `controllers/passenger.controller.js` - Added 4 new functions
- `controllers/driver.controller.js` - Added 3 new functions
- `routes/passenger.routes.js` - Added 5 new routes
- `routes/driver.routes.js` - Added 3 new routes

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Error details"
}
```

Common errors:
- `400 Bad Request`: Missing required fields
- `404 Not Found`: User/profile not found
- `500 Internal Server Error`: Database or server error

---

## Future Enhancements

1. Add email notification before deletion
2. Add two-factor confirmation for deletion
3. Add data export before deletion
4. Add deletion reason/feedback collection
5. Add admin panel to view pending deletions
6. Add scheduled deletion pause/resume

