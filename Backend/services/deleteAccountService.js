const Passenger = require('../models/passenger.model');
const Driver = require('../models/driver.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');
const TripSession = require('../models/tripSession.model');

const DELETION_GRACE_PERIOD_DAYS = 7;
const GRACE_PERIOD_MS = DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Request profile deletion for a passenger
 * Sets deleteRequestedAt to current time
 * User can still login to cancel deletion within 7 days
 */
const requestPassengerProfileDeletion = async (passengerId) => {
    try {
        const passenger = await Passenger.findById(passengerId);
        
        if (!passenger) {
            return {
                success: false,
                message: 'Passenger not found'
            };
        }

        // If already marked for deletion, return current deletion date
        if (passenger.deleteRequestedAt) {
            const deletionDate = new Date(passenger.deleteRequestedAt.getTime() + GRACE_PERIOD_MS);
            return {
                success: true,
                message: `Your profile is already scheduled for deletion on ${deletionDate.toLocaleDateString()}`,
                deleteScheduledFor: deletionDate
            };
        }

        // Mark profile for deletion
        passenger.deleteRequestedAt = new Date();
        await passenger.save();

        const deletionDate = new Date(Date.now() + GRACE_PERIOD_MS);
        
        return {
            success: true,
            message: `Your profile will be permanently deleted on ${deletionDate.toLocaleDateString()}. You can restore it by logging in anytime before then.`,
            deleteScheduledFor: deletionDate
        };
    } catch (error) {
        console.error('Error requesting passenger profile deletion:', error);
        return {
            success: false,
            message: 'Error processing deletion request',
            error: error.message
        };
    }
};

/**
 * Request profile deletion for a driver
 * Sets deleteRequestedAt to current time
 * Driver can still login to cancel deletion within 7 days
 */
const requestDriverProfileDeletion = async (driverId) => {
    try {
        const driver = await Driver.findById(driverId);
        
        if (!driver) {
            return {
                success: false,
                message: 'Driver not found'
            };
        }

        // If already marked for deletion, return current deletion date
        if (driver.deleteRequestedAt) {
            const deletionDate = new Date(driver.deleteRequestedAt.getTime() + GRACE_PERIOD_MS);
            return {
                success: true,
                message: `Your profile is already scheduled for deletion on ${deletionDate.toLocaleDateString()}`,
                deleteScheduledFor: deletionDate
            };
        }

        // Mark profile for deletion
        driver.deleteRequestedAt = new Date();
        await driver.save();

        const deletionDate = new Date(Date.now() + GRACE_PERIOD_MS);
        
        return {
            success: true,
            message: `Your profile will be permanently deleted on ${deletionDate.toLocaleDateString()}. You can restore it by logging in anytime before then.`,
            deleteScheduledFor: deletionDate
        };
    } catch (error) {
        console.error('Error requesting driver profile deletion:', error);
        return {
            success: false,
            message: 'Error processing deletion request',
            error: error.message
        };
    }
};

/**
 * Cancel profile deletion for a passenger
 * Clears the deleteRequestedAt field
 */
const cancelPassengerProfileDeletion = async (passengerId) => {
    try {
        const passenger = await Passenger.findById(passengerId);
        
        if (!passenger) {
            return {
                success: false,
                message: 'Passenger not found'
            };
        }

        if (!passenger.deleteRequestedAt) {
            return {
                success: true,
                message: 'No active deletion request found'
            };
        }

        passenger.deleteRequestedAt = null;
        await passenger.save();

        return {
            success: true,
            message: 'Profile deletion cancelled. Your profile is safe.'
        };
    } catch (error) {
        console.error('Error cancelling passenger profile deletion:', error);
        return {
            success: false,
            message: 'Error cancelling deletion request',
            error: error.message
        };
    }
};

/**
 * Cancel profile deletion for a driver
 * Clears the deleteRequestedAt field
 */
const cancelDriverProfileDeletion = async (driverId) => {
    try {
        const driver = await Driver.findById(driverId);
        
        if (!driver) {
            return {
                success: false,
                message: 'Driver not found'
            };
        }

        if (!driver.deleteRequestedAt) {
            return {
                success: true,
                message: 'No active deletion request found'
            };
        }

        driver.deleteRequestedAt = null;
        await driver.save();

        return {
            success: true,
            message: 'Profile deletion cancelled. Your profile is safe.'
        };
    } catch (error) {
        console.error('Error cancelling driver profile deletion:', error);
        return {
            success: false,
            message: 'Error cancelling deletion request',
            error: error.message
        };
    }
};

/**
 * Actually delete a passenger profile after 7 days
 * Called by cron job or during login check
 * Sets all user-related data to null/deleted state
 */
const permanentlyDeletePassengerProfile = async (passengerId) => {
    try {
        const passenger = await Passenger.findById(passengerId);
        
        if (!passenger) {
            return {
                success: false,
                message: 'Passenger not found'
            };
        }

        // Check if deletion grace period has passed
        if (passenger.deleteRequestedAt) {
            const gracePeriodExpired = Date.now() - passenger.deleteRequestedAt.getTime() >= GRACE_PERIOD_MS;
            
            if (!gracePeriodExpired) {
                return {
                    success: false,
                    message: 'Deletion grace period has not expired yet'
                };
            }
        } else {
            return {
                success: false,
                message: 'No active deletion request for this passenger'
            };
        }

        // Update all bookings by this passenger
        await Booking.updateMany(
            { passengerId },
            {
                $set: {
                    passengerId: null,
                    // Optionally anonymize passenger data
                    passengerName: 'Deleted User',
                    passengerEmail: null,
                    passengerPhoneNumber: null
                }
            }
        );

        // Update all reviews given by this passenger
        await Review.updateMany(
            { passengerId },
            {
                $set: {
                    passengerId: null,
                    passengerName: 'Deleted User'
                }
            }
        );

        // Delete the passenger profile
        await Passenger.findByIdAndDelete(passengerId);

        return {
            success: true,
            message: 'Passenger profile and associated data have been permanently deleted'
        };
    } catch (error) {
        console.error('Error permanently deleting passenger profile:', error);
        return {
            success: false,
            message: 'Error deleting profile',
            error: error.message
        };
    }
};

/**
 * Actually delete a driver profile after 7 days
 * Called by cron job or during login check
 * Sets all user-related data to null/deleted state
 */
const permanentlyDeleteDriverProfile = async (driverId) => {
    try {
        const driver = await Driver.findById(driverId);
        
        if (!driver) {
            return {
                success: false,
                message: 'Driver not found'
            };
        }

        // Check if deletion grace period has passed
        if (driver.deleteRequestedAt) {
            const gracePeriodExpired = Date.now() - driver.deleteRequestedAt.getTime() >= GRACE_PERIOD_MS;
            
            if (!gracePeriodExpired) {
                return {
                    success: false,
                    message: 'Deletion grace period has not expired yet'
                };
            }
        } else {
            return {
                success: false,
                message: 'No active deletion request for this driver'
            };
        }

        // Update all trips by this driver
        await TripSession.updateMany(
            { driverId },
            {
                $set: {
                    driverId: null,
                    driverName: 'Deleted User'
                }
            }
        );

        // Update all reviews received by this driver
        await Review.updateMany(
            { driverId },
            {
                $set: {
                    driverId: null,
                    driverName: 'Deleted User'
                }
            }
        );

        // Delete the driver profile
        await Driver.findByIdAndDelete(driverId);

        return {
            success: true,
            message: 'Driver profile and associated data have been permanently deleted'
        };
    } catch (error) {
        console.error('Error permanently deleting driver profile:', error);
        return {
            success: false,
            message: 'Error deleting profile',
            error: error.message
        };
    }
};

/**
 * Check and delete expired passenger profiles
 * Should be called by a cron job periodically
 */
const processExpiredPassengerDeletions = async () => {
    try {
        const cutoffDate = new Date(Date.now() - GRACE_PERIOD_MS);
        
        // Find all passengers with expired deletion grace period
        const expiredPassengers = await Passenger.find({
            deleteRequestedAt: { $lt: cutoffDate }
        });

        let deletedCount = 0;
        for (const passenger of expiredPassengers) {
            const result = await permanentlyDeletePassengerProfile(passenger._id);
            if (result.success) {
                deletedCount++;
            }
        }

        return {
            success: true,
            message: `Processed ${deletedCount} expired passenger deletion requests`,
            deletedCount
        };
    } catch (error) {
        console.error('Error processing expired passenger deletions:', error);
        return {
            success: false,
            message: 'Error processing deletions',
            error: error.message
        };
    }
};

/**
 * Check and delete expired driver profiles
 * Should be called by a cron job periodically
 */
const processExpiredDriverDeletions = async () => {
    try {
        const cutoffDate = new Date(Date.now() - GRACE_PERIOD_MS);
        
        // Find all drivers with expired deletion grace period
        const expiredDrivers = await Driver.find({
            deleteRequestedAt: { $lt: cutoffDate }
        });

        let deletedCount = 0;
        for (const driver of expiredDrivers) {
            const result = await permanentlyDeleteDriverProfile(driver._id);
            if (result.success) {
                deletedCount++;
            }
        }

        return {
            success: true,
            message: `Processed ${deletedCount} expired driver deletion requests`,
            deletedCount
        };
    } catch (error) {
        console.error('Error processing expired driver deletions:', error);
        return {
            success: false,
            message: 'Error processing deletions',
            error: error.message
        };
    }
};

/**
 * Check deletion status when passenger logs in
 * If grace period expired, actually delete profile
 * If grace period not expired but deleteRequestedAt is set, warn user
 */
const checkPassengerDeletionStatusOnLogin = async (passengerId) => {
    try {
        const passenger = await Passenger.findById(passengerId);
        
        if (!passenger) {
            return { isDeletionPending: false };
        }

        if (!passenger.deleteRequestedAt) {
            return { isDeletionPending: false };
        }

        const timeSinceRequest = Date.now() - passenger.deleteRequestedAt.getTime();
        
        if (timeSinceRequest >= GRACE_PERIOD_MS) {
            // Grace period expired, delete the profile
            await permanentlyDeletePassengerProfile(passengerId);
            return {
                isDeletionPending: false,
                deleted: true,
                message: 'Your profile has been permanently deleted'
            };
        } else {
            // Grace period still active
            const remainingDays = Math.ceil((GRACE_PERIOD_MS - timeSinceRequest) / (24 * 60 * 60 * 1000));
            const deletionDate = new Date(passenger.deleteRequestedAt.getTime() + GRACE_PERIOD_MS);
            
            return {
                isDeletionPending: true,
                remainingDays,
                deletionDate,
                message: `Your profile is scheduled for deletion in ${remainingDays} days (${deletionDate.toLocaleDateString()})`
            };
        }
    } catch (error) {
        console.error('Error checking passenger deletion status:', error);
        return {
            isDeletionPending: false,
            error: error.message
        };
    }
};

/**
 * Check deletion status when driver logs in
 * If grace period expired, actually delete profile
 * If grace period not expired but deleteRequestedAt is set, warn user
 */
const checkDriverDeletionStatusOnLogin = async (driverId) => {
    try {
        const driver = await Driver.findById(driverId);
        
        if (!driver) {
            return { isDeletionPending: false };
        }

        if (!driver.deleteRequestedAt) {
            return { isDeletionPending: false };
        }

        const timeSinceRequest = Date.now() - driver.deleteRequestedAt.getTime();
        
        if (timeSinceRequest >= GRACE_PERIOD_MS) {
            // Grace period expired, delete the profile
            await permanentlyDeleteDriverProfile(driverId);
            return {
                isDeletionPending: false,
                deleted: true,
                message: 'Your profile has been permanently deleted'
            };
        } else {
            // Grace period still active
            const remainingDays = Math.ceil((GRACE_PERIOD_MS - timeSinceRequest) / (24 * 60 * 60 * 1000));
            const deletionDate = new Date(driver.deleteRequestedAt.getTime() + GRACE_PERIOD_MS);
            
            return {
                isDeletionPending: true,
                remainingDays,
                deletionDate,
                message: `Your profile is scheduled for deletion in ${remainingDays} days (${deletionDate.toLocaleDateString()})`
            };
        }
    } catch (error) {
        console.error('Error checking driver deletion status:', error);
        return {
            isDeletionPending: false,
            error: error.message
        };
    }
};

module.exports = {
    requestPassengerProfileDeletion,
    requestDriverProfileDeletion,
    cancelPassengerProfileDeletion,
    cancelDriverProfileDeletion,
    permanentlyDeletePassengerProfile,
    permanentlyDeleteDriverProfile,
    processExpiredPassengerDeletions,
    processExpiredDriverDeletions,
    checkPassengerDeletionStatusOnLogin,
    checkDriverDeletionStatusOnLogin,
    DELETION_GRACE_PERIOD_DAYS
};
