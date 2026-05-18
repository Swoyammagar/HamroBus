const { processExpiredPassengerDeletions, processExpiredDriverDeletions } = require('../services/deleteAccountService');

/**
 * Process all expired deletions (both passengers and drivers)
 * Should be called by a cron job periodically (e.g., every hour or day)
 */
const processExpiredDeletions = async () => {
    try {
        console.log('[Account Deletion Cron] Starting deletion process...');
        
        const passengerResult = await processExpiredPassengerDeletions();
        console.log('[Account Deletion Cron] Passengers:', passengerResult.message);
        
        const driverResult = await processExpiredDriverDeletions();
        console.log('[Account Deletion Cron] Drivers:', driverResult.message);

        return {
            success: true,
            passengers: passengerResult,
            drivers: driverResult
        };
    } catch (error) {
        console.error('[Account Deletion Cron] Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Setup function to initialize cron jobs
 * Call this in your main index.js file after server starts
 * 
 * Example usage in index.js:
 * 
 * const { setupAccountDeletionCron } = require('./utils/accountDeletionCron');
 * 
 * app.listen(PORT, () => {
 *     console.log(`Server running on port ${PORT}`);
 *     setupAccountDeletionCron(); // Setup automatic deletion processing
 * });
 */
const setupAccountDeletionCron = () => {
    try {
        const cron = require('node-cron');
        
        // Run deletion process every day at 2 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('🗑️  [Scheduled Task] Running account deletion cron job at 2 AM...');
            await processExpiredDeletions();
        });

        console.log('✅ [Cron Setup] Account deletion cron job scheduled to run daily at 2 AM');
        
        return {
            success: true,
            message: 'Cron job scheduled successfully'
        };
    } catch (error) {
        console.error('❌ [Cron Setup] Failed to setup cron job:', error);
        console.log('Make sure node-cron is installed: npm install node-cron');
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    processExpiredDeletions,
    setupAccountDeletionCron
};
