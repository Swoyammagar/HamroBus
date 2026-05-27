import { useState, useCallback } from 'react';
import { RewardService, type RewardInfo, type RedeemPointsResponse } from '../services/rewardService';

export const useRewardPoints = () => {
  const [rewardInfo, setRewardInfo] = useState<RewardInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRewardPoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await RewardService.getRewardPoints();
      setRewardInfo(data);
      return data;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load reward points';
      setError(errorMsg);
      console.error('Fetch reward points error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const redeemPoints = useCallback(async (bookingAmount: number): Promise<RedeemPointsResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await RewardService.redeemPoints(bookingAmount);
      if (result.success && rewardInfo) {
        setRewardInfo({
          ...rewardInfo,
          data: {
            ...rewardInfo.data,
            rewardPoints: result.data?.remainingPoints || 0,
          },
        });
      }
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to redeem points';
      setError(errorMsg);
      console.error('Redeem points error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [rewardInfo]);

  const refetch = useCallback(() => {
    return fetchRewardPoints();
  }, [fetchRewardPoints]);

  return {
    rewardInfo,
    loading,
    error,
    fetchRewardPoints,
    redeemPoints,
    refetch,
  };
};
