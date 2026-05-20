import apiClient from './api';

export interface RewardInfo {
  success: boolean;
  data: {
    rewardPoints: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    consecutiveCancellations: number;
    isBanned: boolean;
    banUntil: string | null;
    minutesRemainingInBan: number;
    pointsNeededForNextReward: number;
    pointsPerCompletedTrip: number;
    pointsDeductedPerCancellation: number;
    pointsThresholdForDiscount: number;
    discountPercentage: number;
    cancellationBanThreshold: number;
    pointsHistory: Array<{
      tripId?: string;
      bookingId?: string;
      action: 'earned' | 'deducted' | 'redeemed';
      points: number;
      description: string;
      timestamp: string;
    }>;
  };
}

export interface RedeemPointsPayload {
  bookingAmount: number;
}

export interface RedeemPointsResponse {
  success: boolean;
  message: string;
  data?: {
    discountCode: string;
    discountPercentage: number;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    pointsUsed: number;
    remainingPoints: number;
  };
}

export class RewardService {
  /**
   * Get passenger reward points and information
   */
  static async getRewardPoints(): Promise<RewardInfo> {
    try {
      const response = await apiClient.get('/passenger/rewards/points');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to fetch reward points' };
    }
  }

  /**
   * Redeem reward points for a discount on booking
   */
  static async redeemPoints(bookingAmount: number): Promise<RedeemPointsResponse> {
    try {
      const response = await apiClient.post('/passenger/rewards/redeem', {
        bookingAmount,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to redeem points' };
    }
  }
}
