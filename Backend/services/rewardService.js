const Passenger = require('../models/passenger.model');

// Configuration Constants
const POINTS_PER_COMPLETED_TRIP = 50; // Points awarded per completed trip
const POINTS_DEDUCTION_ON_CANCEL = 25; // Points deducted per cancellation
const CANCELLATION_BAN_THRESHOLD = 5; // Number of consecutive cancellations before ban
const BAN_DURATION_MINUTES = 30; // Ban duration in minutes
const POINTS_FOR_DISCOUNT_THRESHOLD = 500; // Points needed to redeem for 10% discount
const DISCOUNT_PERCENTAGE = 10; // Discount percentage when redeeming

/**
 * Award points to a passenger when they complete a trip
 * @param {string} passengerId - Passenger ID
 * @param {string} tripId - Trip/Booking ID
 * @returns {Promise<{success: boolean, message: string, rewardPoints: number}>}
 */
const awardPoints = async (passengerId, tripId) => {
  try {
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) {
      return { success: false, message: 'Passenger not found' };
    }

    // Award points
    passenger.rewardPoints += POINTS_PER_COMPLETED_TRIP;
    passenger.totalPointsEarned += POINTS_PER_COMPLETED_TRIP;

    // Reset cancellation streak on successful trip
    passenger.consecutiveCancellations = 0;

    // Add to points history
    passenger.pointsHistory.push({
      tripId,
      action: 'earned',
      points: POINTS_PER_COMPLETED_TRIP,
      description: `Completed trip - ${POINTS_PER_COMPLETED_TRIP} points earned`,
      timestamp: new Date(),
    });

    await passenger.save();

    console.log(`✅ Points awarded to passenger ${passengerId}: +${POINTS_PER_COMPLETED_TRIP} (Total: ${passenger.rewardPoints})`);

    return {
      success: true,
      message: `${POINTS_PER_COMPLETED_TRIP} points awarded for completed trip`,
      rewardPoints: passenger.rewardPoints,
    };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, message: 'Failed to award points' };
  }
};

/**
 * Deduct points when a passenger cancels a booking
 * @param {string} passengerId - Passenger ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<{success: boolean, message: string, rewardPoints: number, isBanned: boolean, banUntil: Date}>}
 */
const deductPoints = async (passengerId, bookingId) => {
  try {
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) {
      return { success: false, message: 'Passenger not found' };
    }

    // Deduct points (min 0)
    const pointsToDeduct = Math.min(passenger.rewardPoints, POINTS_DEDUCTION_ON_CANCEL);
    passenger.rewardPoints -= pointsToDeduct;

    // Increment cancellation streak
    passenger.consecutiveCancellations += 1;

    // Add to points history
    passenger.pointsHistory.push({
      bookingId,
      action: 'deducted',
      points: pointsToDeduct,
      description: `Booking cancelled - ${pointsToDeduct} points deducted`,
      timestamp: new Date(),
    });

    // Check if passenger should be banned (5 consecutive cancellations)
    let isBanned = false;
    let banUntil = null;

    if (passenger.consecutiveCancellations >= CANCELLATION_BAN_THRESHOLD) {
      banUntil = new Date(Date.now() + BAN_DURATION_MINUTES * 60 * 1000);
      passenger.banUntil = banUntil;
      isBanned = true;

      console.log(`🚫 Passenger ${passengerId} banned until ${banUntil} (${CANCELLATION_BAN_THRESHOLD} consecutive cancellations)`);
    }

    await passenger.save();

    console.log(`❌ Points deducted from passenger ${passengerId}: -${pointsToDeduct} (Total: ${passenger.rewardPoints})`);

    return {
      success: true,
      message: `${pointsToDeduct} points deducted for cancellation`,
      rewardPoints: passenger.rewardPoints,
      isBanned,
      banUntil,
      cancellationStreak: passenger.consecutiveCancellations,
    };
  } catch (error) {
    console.error('Error deducting points:', error);
    return { success: false, message: 'Failed to deduct points' };
  }
};

/**
 * Check if a passenger is currently banned
 * @param {string} passengerId - Passenger ID
 * @returns {Promise<{isBanned: boolean, banUntil: Date, minutesRemaining: number}>}
 */
const checkBanStatus = async (passengerId) => {
  try {
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) {
      return { isBanned: false, banUntil: null, minutesRemaining: 0 };
    }

    if (!passenger.banUntil) {
      return { isBanned: false, banUntil: null, minutesRemaining: 0 };
    }

    const now = new Date();
    const isBanned = passenger.banUntil > now;

    if (!isBanned) {
      // Ban has expired, clear it
      passenger.banUntil = null;
      passenger.consecutiveCancellations = 0;
      await passenger.save();
      return { isBanned: false, banUntil: null, minutesRemaining: 0 };
    }

    const minutesRemaining = Math.ceil((passenger.banUntil - now) / (1000 * 60));

    return {
      isBanned: true,
      banUntil: passenger.banUntil,
      minutesRemaining,
    };
  } catch (error) {
    console.error('Error checking ban status:', error);
    return { isBanned: false, banUntil: null, minutesRemaining: 0 };
  }
};

/**
 * Redeem points for a discount
 * Points needed: POINTS_FOR_DISCOUNT_THRESHOLD (default: 500)
 * Discount given: DISCOUNT_PERCENTAGE (default: 10%)
 * @param {string} passengerId - Passenger ID
 * @returns {Promise<{success: boolean, message: string, discountCode: string, discountPercentage: number, discountAmount: number, bookingAmount: number, rewardPoints: number}>}
 */
const redeemPoints = async (passengerId, bookingAmount) => {
  try {
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) {
      return { success: false, message: 'Passenger not found' };
    }

    // Check if passenger has enough points
    if (passenger.rewardPoints < POINTS_FOR_DISCOUNT_THRESHOLD) {
      return {
        success: false,
        message: `You need ${POINTS_FOR_DISCOUNT_THRESHOLD} points to redeem for a discount. You currently have ${passenger.rewardPoints} points.`,
        rewardPoints: passenger.rewardPoints,
        pointsNeeded: POINTS_FOR_DISCOUNT_THRESHOLD - passenger.rewardPoints,
      };
    }

    // Calculate discount
    const discountAmount = (bookingAmount * DISCOUNT_PERCENTAGE) / 100;

    // Deduct points
    passenger.rewardPoints -= POINTS_FOR_DISCOUNT_THRESHOLD;
    passenger.totalPointsRedeemed += POINTS_FOR_DISCOUNT_THRESHOLD;

    // Generate discount code
    const discountCode = `HAMRO-${Date.now()}-${passengerId.slice(-6).toUpperCase()}`;

    // Add to points history
    passenger.pointsHistory.push({
      action: 'redeemed',
      points: POINTS_FOR_DISCOUNT_THRESHOLD,
      description: `Redeemed ${DISCOUNT_PERCENTAGE}% discount (${discountCode})`,
      timestamp: new Date(),
    });

    await passenger.save();

    console.log(`🎁 Passenger ${passengerId} redeemed ${POINTS_FOR_DISCOUNT_THRESHOLD} points for ${DISCOUNT_PERCENTAGE}% discount`);

    return {
      success: true,
      message: `Successfully redeemed ${POINTS_FOR_DISCOUNT_THRESHOLD} points for ${DISCOUNT_PERCENTAGE}% discount`,
      discountCode,
      discountPercentage: DISCOUNT_PERCENTAGE,
      discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimals
      originalAmount: bookingAmount,
      finalAmount: Math.round((bookingAmount - discountAmount) * 100) / 100,
      rewardPoints: passenger.rewardPoints,
    };
  } catch (error) {
    console.error('Error redeeming points:', error);
    return { success: false, message: 'Failed to redeem points' };
  }
};

/**
 * Get passenger reward information
 * @param {string} passengerId - Passenger ID
 * @returns {Promise<{rewardPoints: number, totalPointsEarned: number, totalPointsRedeemed: number, consecutiveCancellations: number, isBanned: boolean, banUntil: Date, pointsNeededForNextReward: number, pointsHistory: Array}>}
 */
const getRewardInfo = async (passengerId) => {
  try {
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) {
      return { success: false, message: 'Passenger not found' };
    }

    const banStatus = await checkBanStatus(passengerId);
    const pointsNeededForNextReward = Math.max(0, POINTS_FOR_DISCOUNT_THRESHOLD - passenger.rewardPoints);

    return {
      success: true,
      rewardPoints: passenger.rewardPoints,
      totalPointsEarned: passenger.totalPointsEarned,
      totalPointsRedeemed: passenger.totalPointsRedeemed,
      consecutiveCancellations: passenger.consecutiveCancellations,
      isBanned: banStatus.isBanned,
      banUntil: banStatus.banUntil,
      minutesRemainingInBan: banStatus.minutesRemaining,
      pointsNeededForNextReward,
      pointsPerCompletedTrip: POINTS_PER_COMPLETED_TRIP,
      pointsDeductedPerCancellation: POINTS_DEDUCTION_ON_CANCEL,
      pointsThresholdForDiscount: POINTS_FOR_DISCOUNT_THRESHOLD,
      discountPercentage: DISCOUNT_PERCENTAGE,
      cancellationBanThreshold: CANCELLATION_BAN_THRESHOLD,
      pointsHistory: passenger.pointsHistory.slice(-20), // Last 20 transactions
    };
  } catch (error) {
    console.error('Error getting reward info:', error);
    return { success: false, message: 'Failed to retrieve reward information' };
  }
};

module.exports = {
  awardPoints,
  deductPoints,
  checkBanStatus,
  redeemPoints,
  getRewardInfo,
  // Exported constants for frontend use
  POINTS_PER_COMPLETED_TRIP,
  POINTS_DEDUCTION_ON_CANCEL,
  POINTS_FOR_DISCOUNT_THRESHOLD,
  DISCOUNT_PERCENTAGE,
  CANCELLATION_BAN_THRESHOLD,
  BAN_DURATION_MINUTES,
};
