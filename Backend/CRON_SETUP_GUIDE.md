# How to Setup Account Deletion Cron Job

## What is the Cron Job?
The `accountDeletionCron.js` utility automatically processes and permanently deletes user profiles after their 7-day grace period expires. Without it, expired deletions won't happen automatically.

---

## Installation

### 1. Install node-cron
In your Backend directory, run:
```bash
npm install node-cron
```

---

## Integration in index.js

### Step 1: Import the setup function
Add this at the top of your `Backend/index.js` file:

```javascript
const { setupAccountDeletionCron } = require('./utils/accountDeletionCron');
```

### Step 2: Initialize the cron job when server starts
Find where your app starts listening (usually at the bottom of index.js), and add the setup:

**Example:**
```javascript
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Setup automatic account deletion processing
    setupAccountDeletionCron();
});
```

---

## Complete Example

Here's what your index.js should look like:

```javascript
const express = require('express');
const mongoose = require('mongoose');
const { setupAccountDeletionCron } = require('./utils/accountDeletionCron');

const app = express();

// Middleware
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Routes
app.use('/passenger', require('./routes/passenger.routes'));
app.use('/driver', require('./routes/driver.routes'));
app.use('/admin', require('./routes/admin.routes'));

// Error handling
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Setup automatic account deletion cron job
    setupAccountDeletionCron();
});
```

---

## How It Works

### Timeline:
1. **User clicks "Delete Profile"** → `deleteRequestedAt` is set to NOW
2. **7 Days Pass** → User can login to cancel anytime during this period
3. **Day 7, 2:00 AM** → Cron job runs automatically:
   - Finds all profiles with `deleteRequestedAt > 7 days ago`
   - Permanently deletes them from database
   - Anonymizes all related data (bookings, reviews, trips)
4. **Result:**
   - Profile completely removed
   - Bookings show "Deleted User" instead of user info
   - Reviews show "Deleted User" as author
   - User account cannot be recovered

---

## Cron Schedule Format

Current schedule: **`0 2 * * *`** (Every day at 2:00 AM)

### To change the schedule:
Edit `Backend/utils/accountDeletionCron.js` line 22:

```javascript
cron.schedule('0 2 * * *', async () => {  // Change this
    console.log('🗑️  [Scheduled Task] Running account deletion cron job at 2 AM...');
    await processExpiredDeletions();
});
```

### Common Cron Patterns:
```
'0 * * * *'      // Every hour at :00
'*/30 * * * *'   // Every 30 minutes
'0 2 * * *'      // Daily at 2:00 AM (default)
'0 2 * * 0'      // Every Sunday at 2:00 AM
'0 0 1 * *'      // First day of each month at midnight
```

---

## Verification

After starting your server, you should see:
```
🚀 Server running on port 5000
✅ [Cron Setup] Account deletion cron job scheduled to run daily at 2 AM
```

If you see an error like:
```
❌ [Cron Setup] Failed to setup cron job
Make sure node-cron is installed: npm install node-cron
```

Then install node-cron: `npm install node-cron`

---

## Testing the Cron Job

### Manual Trigger (for testing):
You can manually trigger deletion processing at any time by calling:

```bash
curl -X POST http://localhost:5000/test-deletion-cron \
  -H "Content-Type: application/json"
```

Add this endpoint to your admin controller for testing:
```javascript
const { processExpiredDeletions } = require('../utils/accountDeletionCron');

const testAccountDeletion = async (req, res) => {
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

// In admin routes:
router.post('/test-deletion-cron', authenticateAdmin, testAccountDeletion);
```

---

## Functions Breakdown

### In `deleteAccountService.js`:

**For Passengers:**
- `checkPassengerDeletionStatusOnLogin(passengerId)` - Check status when logging in

**For Drivers:**
- `checkDriverDeletionStatusOnLogin(driverId)` - Check status when logging in

**Batch Processing (used by cron):**
- `processExpiredPassengerDeletions()` - Processes all expired passenger deletions
- `processExpiredDriverDeletions()` - Processes all expired driver deletions

### In `accountDeletionCron.js`:

- `setupAccountDeletionCron()` - Initialize the scheduled cron job
- `processExpiredDeletions()` - Process both passenger and driver deletions

---

## What Gets Deleted?

### Passenger Deletion:
- ✅ Passenger user record
- ✅ All personal data (email, phone, address, etc.)
- ❌ Bookings NOT deleted, but `passengerId` set to `null`
- ❌ Reviews NOT deleted, but `passengerId` set to `null` and author set to "Deleted User"

### Driver Deletion:
- ✅ Driver user record
- ✅ All personal data (license, etc.)
- ❌ Trips NOT deleted, but `driverId` set to `null`
- ❌ Reviews NOT deleted, but `driverId` set to `null` and driver name set to "Deleted User"

---

## Troubleshooting

### Cron job not running?
1. Check if `node-cron` is installed: `npm list node-cron`
2. Check server logs for errors
3. Verify `setupAccountDeletionCron()` is called in `index.js`

### Want to verify cron is working?
Add temporary logging in `accountDeletionCron.js`:
```javascript
const setupAccountDeletionCron = () => {
    try {
        const cron = require('node-cron');
        
        // Test task - runs every minute for testing
        cron.schedule('* * * * *', async () => {
            console.log('[DEBUG] Cron check - currently: ' + new Date());
        });
        
        // Actual task - runs daily at 2 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('🗑️  [Scheduled Task] Running account deletion...');
            await processExpiredDeletions();
        });
        
        return { success: true };
    } catch (error) {
        // ...
    }
};
```

---

## API Endpoints Summary

### Passenger Endpoints:
- `POST /passenger/profile/request-delete` - Request deletion (7-day timer starts)
- `POST /passenger/profile/cancel-delete` - Cancel deletion request
- `GET /passenger/profile/deletion-status` - Check deletion status
- `GET /passenger/reviews/my-reviews` - Get all reviews given
- `GET /passenger/reviews/stats` - Get review statistics

### Driver Endpoints:
- `POST /driver/profile/request-delete` - Request deletion (7-day timer starts)
- `POST /driver/profile/cancel-delete` - Cancel deletion request
- `GET /driver/profile/deletion-status` - Check deletion status

---

## Questions?

Refer to the main documentation:
`Backend/PROFILE_DELETION_AND_REVIEWS_DOCUMENTATION.md`
