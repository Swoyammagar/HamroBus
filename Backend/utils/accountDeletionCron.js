const { processExpiredPassengerDeletions, processExpiredDriverDeletions } = require('../services/deleteAccountService');

/**
 * Process all expired deletions (both passengers and drivers)
 * Should be called by a cron job periodically (e.g., every hour or day)
 */
const processExpiredDeletions = async () => {
    try {

        const passengerResult = await processExpiredPassengerDeletions();

        const driverResult = await processExpiredDriverDeletions();

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

const setupAccountDeletionCron = () => {
    try {
        const cron = require('node-cron');

        cron.schedule('0 2 * * *', async () => {
            await processExpiredDeletions();
        });


        return {
            success: true,
            message: 'Cron job scheduled successfully'
        };
    } catch (error) {
        console.error('❌ [Cron Setup] Failed to setup cron job:', error);
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
