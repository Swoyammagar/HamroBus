import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Image, ActivityIndicator, Pressable, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { usePassenger } from '../context/PassengerContext';
import { formatDate } from '../utils/helpers';
import { useAuth } from '@/app/context/AuthContext';
import { usePassengerProfile } from '../hooks/useProfile';
import { useRewardPoints } from '../hooks/useRewardPoints';
import { useReviews } from '../hooks/useReviews';
import { useAccountDeletion } from '../hooks/useAccountDeletion';

const Profile = () => {
  const router = useRouter();
  const { profile, setProfile } = usePassenger();
  const { logout } = useAuth();

  // 👇 Replace the inline axios + useState(loading) with your hook
  const { profileData, loading, error, refetch } = usePassengerProfile();
  
  // Reward points
  const { rewardInfo, loading: rewardLoading, fetchRewardPoints, refetch: refetchRewards } = useRewardPoints();
  const [showRewardHistory, setShowRewardHistory] = React.useState(false);

  // Reviews
  const { stats: reviewStats, fetchStats: fetchReviewStats } = useReviews();

  // Account Deletion
  const {
    isDeletionPending,
    remainingDays,
    deletionDate,
    loading: deletionLoading,
    checkDeletionStatus,
    requestDeletion,
    cancelDeletion,
  } = useAccountDeletion();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showDeletionStatus, setShowDeletionStatus] = React.useState(false);

  // Fetch rewards and reviews when profile tab is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchRewardPoints();
      fetchReviewStats();
      checkDeletionStatus();
    }, [fetchRewardPoints, fetchReviewStats, checkDeletionStatus])
  );

  // Map hook data into the PassengerProfile shape your UI expects
  React.useEffect(() => {
    if (!profileData) return;

    const { user: userData } = profileData;
    setProfile({
      id: '',                          // not returned by hook — add to service if needed
      passengerId: '',
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      phone: userData.phoneNumber || 'N/A',
      profilePicture: userData.profileImgUrl,
      totalTrips: 0,
      totalSpent: 0,
      averageRating: 0,
      memberSince: new Date().toISOString(), // add createdAt to service if needed
    });
  }, [profileData]);

  // --- handlers unchanged ---
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Logout',
        onPress: async () => { await logout(); router.push('/pages/mobilelogin'); },
        style: 'destructive',
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleEditProfile    = () => router.push('../screens/profile-edit');
  const handleResetPassword  = () => router.push('../screens/password-reset');
  const handleTravelHistory  = () => router.push('../(tabs)/bookings');
  const handleHelpSupport    = () => router.push('../screens/faq');
  const handleMyReviews      = () => router.push('../screens/myReviews');
  const handleTerms          = () => router.push('/legal/terms' as any);
  const handlePrivacy        = () => router.push('/legal/privacy' as any);
  const handleAbout          = () => router.push('/legal/about' as any);

  const handleDeleteProfile = async () => {
    setShowDeleteConfirm(false);
    const result = await requestDeletion();
    if (result.success) {
      Alert.alert(
        'Deletion Requested',
        `Your profile will be permanently deleted on ${result.deleteScheduledFor}. You can cancel anytime before then.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to request deletion');
    }
  };

  const handleCancelDeletion = async () => {
    const result = await cancelDeletion();
    if (result.success) {
      Alert.alert('Success', result.message);
      setShowDeletionStatus(false);
    } else {
      Alert.alert('Error', result.error || 'Failed to cancel deletion');
    }
  };

  // --- loading / error guards ---
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error ?? 'Failed to load profile'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}> 
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const deletionDaysLabel = remainingDays ?? 'calculating';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {profile.profilePicture ? (
            <Image source={{ uri: profile.profilePicture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileAvatar}>
              <Ionicons name="person-circle" size={80} color="#3b82f6" />
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
            <Text style={styles.profilePhone}>{profile.phone}</Text>
            {profile.id && (
              <Text style={styles.profileId}>ID: {profile.id.slice(-8)}</Text>
            )}
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={18} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Reward Points Card */}
        {rewardInfo && (
          <TouchableOpacity 
            style={styles.rewardCard} 
            onPress={() => setShowRewardHistory(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rewardCardHeader}>
              <View style={styles.rewardCardTitle}>
                <Ionicons name="gift" size={28} color="#fff" />
                <View style={styles.rewardCardTitleText}>
                  <Text style={styles.rewardCardLabel}>Reward Points</Text>
                  <Text style={styles.rewardCardSubLabel}>Earn & Redeem</Text>
                </View>
              </View>
              <View style={styles.rewardBadge}>
                <Ionicons name="information-circle" size={20} color="#fff" />
              </View>
            </View>

            <View style={styles.rewardCardContent}>
              <View style={styles.rewardPointsSection}>
                <Text style={styles.rewardPointsValue}>{rewardInfo.data.rewardPoints}</Text>
                <Text style={styles.rewardPointsLabel}>Points Available</Text>
              </View>

              <View style={styles.rewardDivider} />

              <View style={styles.rewardInfoGrid}>
                <View style={styles.rewardInfoItem}>
                  <Text style={styles.rewardInfoLabel}>Earned</Text>
                  <Text style={styles.rewardInfoValue}>{rewardInfo.data.totalPointsEarned}</Text>
                </View>
                <View style={styles.rewardInfoItem}>
                  <Text style={styles.rewardInfoLabel}>Redeemed</Text>
                  <Text style={styles.rewardInfoValue}>{rewardInfo.data.totalPointsRedeemed}</Text>
                </View>
                <View style={styles.rewardInfoItem}>
                  <Text style={styles.rewardInfoLabel}>Next Reward</Text>
                  <Text style={styles.rewardInfoValue}>{rewardInfo.data.pointsNeededForNextReward}</Text>
                </View>
              </View>

              {rewardInfo.data.pointsNeededForNextReward <= 0 && (
                <View style={styles.rewardReadyBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.rewardReadyText}>Ready to Redeem!</Text>
                </View>
              )}

              <Text style={styles.rewardCardFooter}>Tap to view history</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleResetPassword}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="lock-closed-outline" size={20} color="#3b82f6" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Reset Password</Text>
                <Text style={styles.menuItemSubtitle}>Update your password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleTravelHistory}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="time-outline" size={20} color="#3b82f6" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Travel History</Text>
                <Text style={styles.menuItemSubtitle}>View past trips</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>

          <Pressable onPress={handleHelpSupport} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={20} color="#3b82f6" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Help & Support</Text>
                <Text style={styles.menuItemSubtitle}>Get help with issues</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </Pressable>

          <Pressable onPress={handleTerms} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Terms & Conditions</Text>
                <Text style={styles.menuItemSubtitle}>Our policies</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </Pressable>

          <Pressable onPress={handlePrivacy} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#3b82f6" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Privacy Policy</Text>
                <Text style={styles.menuItemSubtitle}>How we protect you</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </Pressable>

          <Pressable onPress={handleAbout} style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={20} color="#3b82f6" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>About Hamro Bus</Text>
                <Text style={styles.menuItemSubtitle}>Version 1.0.0</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </Pressable>
        </View>

        {/* Your Reviews Section */}
        <TouchableOpacity style={styles.section} onPress={handleMyReviews} activeOpacity={0.7}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Reviews</Text>
            <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
          </View>

          {reviewStats ? (
            <View style={styles.reviewsQuickView}>
              <View style={styles.reviewQuickStat}>
                <Text style={styles.reviewQuickStatValue}>{reviewStats.totalReviews}</Text>
                <Text style={styles.reviewQuickStatLabel}>Reviews</Text>
              </View>
              <View style={styles.reviewQuickDivider} />
              <View style={styles.reviewQuickStat}>
                <View style={styles.reviewRatingDisplay}>
                  <Ionicons name="star" size={16} color="#f59e0b" />
                  <Text style={styles.reviewQuickStatValue}>{reviewStats.averageRating.toFixed(1)}</Text>
                </View>
                <Text style={styles.reviewQuickStatLabel}>Avg Rating</Text>
              </View>
              <View style={styles.reviewQuickDivider} />
              <View style={styles.reviewQuickStat}>
                <Text style={styles.reviewQuickStatValue}>{reviewStats.ratingDistribution[5]}</Text>
                <Text style={styles.reviewQuickStatLabel}>5-Star</Text>
              </View>
            </View>
          ) : (
            <View style={styles.reviewsQuickView}>
              <Text style={styles.reviewsEmptyText}>Tap to view your reviews</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{formatDate(profile.memberSince)}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <Text style={styles.infoValueActive}>Active</Text>
            </View>
          </View>
        </View>

        {isDeletionPending && (
          <View style={styles.deletionPendingCard}>
            <View style={styles.deletionPendingHeader}>
              <Ionicons name="warning-outline" size={18} color="#dc2626" />
              <Text style={styles.deletionPendingTitle}>Profile deletion pending</Text>
            </View>
            <Text style={styles.deletionPendingText}>
              Your profile is scheduled for deletion{deletionDate ? ` on ${new Date(deletionDate).toLocaleDateString()}` : ''}.
            </Text>
            <Text style={styles.deletionPendingText}>
              {remainingDays != null ? `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining in the grace period.` : 'Grace period remaining is being calculated.'}
            </Text>
            <TouchableOpacity
              style={styles.cancelDeletionInlineButton}
              onPress={handleCancelDeletion}
              disabled={deletionLoading}
            >
              {deletionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.cancelDeletionInlineText}>Cancel Profile Deletion</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* Delete Profile Button */}
        <TouchableOpacity 
          style={[styles.deleteButton, isDeletionPending && styles.deleteButtonWarning]} 
          onPress={() => isDeletionPending ? handleCancelDeletion() : setShowDeleteConfirm(true)}
          disabled={deletionLoading}
        >
          <Ionicons name={isDeletionPending ? 'refresh-outline' : 'trash-outline'} size={20} color={isDeletionPending ? '#ffffff' : '#ef4444'} />
          <Text style={[styles.deleteButtonText, isDeletionPending && styles.deleteButtonWarningText]}>
            {isDeletionPending ? 'Cancel Profile Deletion' : 'Delete Profile'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hamro Bus v1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2024 All rights reserved</Text>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmHeader}>
              <Ionicons name="alert-circle" size={40} color="#dc2626" />
            </View>

            <Text style={styles.confirmTitle}>Delete Profile?</Text>
            <Text style={styles.confirmMessage}>
              Your profile will be permanently deleted in 7 days. You can cancel anytime before then by logging back in.
            </Text>

            <View style={styles.confirmDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="hourglass" size={16} color="#f59e0b" />
                <Text style={styles.detailText}>7-day grace period</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="checkmark" size={16} color="#10b981" />
                <Text style={styles.detailText}>Can restore by logging in</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={styles.detailText}>All data will be anonymized</Text>
              </View>
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={styles.confirmCancel}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmDelete}
                onPress={handleDeleteProfile}
                disabled={deletionLoading}
              >
                {deletionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deletion Status Modal */}
      <Modal
        visible={showDeletionStatus}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeletionStatus(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmHeader}>
              <Ionicons name="warning" size={40} color="#dc2626" />
            </View>

            <Text style={styles.confirmTitle}>Profile Deletion Pending</Text>
            <Text style={styles.confirmMessage}>
              Your profile is scheduled for permanent deletion.
            </Text>

            <View style={styles.statusBox}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Deletion Date:</Text>
                <Text style={styles.statusValue}>{deletionDate ? new Date(deletionDate).toLocaleDateString() : 'Unknown'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Days Remaining:</Text>
                <Text style={[styles.statusValue, { color: '#dc2626', fontWeight: '700' }]}>{deletionDaysLabel} days</Text>
              </View>
            </View>

            <View style={styles.statusWarning}>
              <Ionicons name="information-circle" size={16} color="#2563eb" />
              <Text style={styles.statusWarningText}>
                Log in anytime to restore your profile
              </Text>
            </View>

            <View style={styles.confirmActions}>
              <TouchableOpacity 
                style={styles.confirmCancel}
                onPress={() => setShowDeletionStatus(false)}
              >
                <Text style={styles.confirmCancelText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.confirmRestore}
                onPress={handleCancelDeletion}
                disabled={deletionLoading}
              >
                {deletionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmRestoreText}>Cancel Deletion</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reward History Modal */}
      <Modal
        visible={showRewardHistory}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRewardHistory(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowRewardHistory(false)}>
                <Ionicons name="close" size={28} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Rewards History</Text>
              <View style={{ width: 28 }} />
            </View>

            {rewardInfo && (
              <>
                {/* Stats Summary */}
                <View style={styles.modalStatsSummary}>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatLabel}>Current Points</Text>
                    <Text style={styles.modalStatValue}>{rewardInfo.data.rewardPoints}</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatLabel}>Total Earned</Text>
                    <Text style={styles.modalStatValue}>{rewardInfo.data.totalPointsEarned}</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatLabel}>Total Redeemed</Text>
                    <Text style={styles.modalStatValue}>{rewardInfo.data.totalPointsRedeemed}</Text>
                  </View>
                </View>

                {/* Ban Status Warning */}
                {rewardInfo.data.isBanned && (
                  <View style={styles.banWarningBox}>
                    <Ionicons name="warning" size={20} color="#ef4444" />
                    <View style={styles.banWarningText}>
                      <Text style={styles.banWarningTitle}>Temporarily Banned</Text>
                      <Text style={styles.banWarningSubtitle}>
                        You are banned from cancelling bookings for {rewardInfo.data.minutesRemainingInBan} more minutes due to {rewardInfo.data.consecutiveCancellations} consecutive cancellations.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Cancellation Streak Warning */}
                {!rewardInfo.data.isBanned && rewardInfo.data.consecutiveCancellations > 0 && (
                  <View style={styles.streakWarningBox}>
                    <Ionicons name="alert-circle" size={20} color="#f59e0b" />
                    <View style={styles.streakWarningText}>
                      <Text style={styles.streakWarningTitle}>Cancellation Streak: {rewardInfo.data.consecutiveCancellations}/5</Text>
                      <Text style={styles.streakWarningSubtitle}>
                        {5 - rewardInfo.data.consecutiveCancellations} more cancellations will get you banned for 30 minutes
                      </Text>
                    </View>
                  </View>
                )}

                {/* History List */}
                <FlatList
                  data={rewardInfo.data.pointsHistory}
                  keyExtractor={(item, idx) => idx.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.historyItem}>
                      <View style={[styles.historyIcon, { backgroundColor: item.action === 'earned' ? '#d1fae5' : item.action === 'redeemed' ? '#dbeafe' : '#fee2e2' }]}>
                        <Ionicons
                          name={item.action === 'earned' ? 'add-circle' : item.action === 'redeemed' ? 'gift' : 'remove-circle'}
                          size={20}
                          color={item.action === 'earned' ? '#10b981' : item.action === 'redeemed' ? '#3b82f6' : '#ef4444'}
                        />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyDescription}>{item.description}</Text>
                        <Text style={styles.historyTimestamp}>{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}</Text>
                      </View>
                      <Text style={[styles.historyPoints, { color: item.action === 'earned' ? '#10b981' : item.action === 'redeemed' ? '#3b82f6' : '#ef4444' }]}>
                        {item.action === 'earned' ? '+' : item.action === 'redeemed' ? '-' : '-'}{item.points}
                      </Text>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Ionicons name="document-outline" size={48} color="#d1d5db" />
                      <Text style={styles.emptyStateText}>No reward history yet</Text>
                    </View>
                  }
                  scrollEnabled={false}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1d5db',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileAvatar: {
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  profileEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  profilePhone: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  profileId: {
    fontSize: 11,
    color: '#3b82f6',
    marginTop: 4,
    fontWeight: '600',
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  menuItemSubtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  infoBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  infoValueActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fee2e2',
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  // Reward Card Styles
  rewardCard: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    marginHorizontal: 12,
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rewardCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardCardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardCardTitleText: {
    marginLeft: 12,
  },
  rewardCardLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  rewardCardSubLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  rewardBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardCardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
  },
  rewardPointsSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardPointsValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#667eea',
  },
  rewardPointsLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  rewardDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  rewardInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  rewardInfoItem: {
    alignItems: 'center',
  },
  rewardInfoLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  rewardInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 4,
  },
  rewardReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 12,
  },
  rewardReadyText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  rewardCardFooter: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalStatsSummary: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  modalStatItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#667eea',
    marginTop: 6,
  },
  banWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  banWarningText: {
    flex: 1,
    marginLeft: 12,
  },
  banWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  banWarningSubtitle: {
    fontSize: 12,
    color: '#b91c1c',
    marginTop: 4,
  },
  streakWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  streakWarningText: {
    flex: 1,
    marginLeft: 12,
  },
  streakWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
  },
  streakWarningSubtitle: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 4,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
    marginLeft: 12,
  },
  historyDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  historyTimestamp: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  historyPoints: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
  // Reviews Section Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewsQuickView: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reviewQuickStat: {
    flex: 1,
    alignItems: 'center',
  },
  reviewQuickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
  },
  reviewQuickStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    fontWeight: '500',
  },
  reviewQuickDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#d1d5db',
  },
  reviewRatingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewsEmptyText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  // Delete Button Styles
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  deleteButtonWarning: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButtonWarningText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  deletionPendingCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  deletionPendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deletionPendingTitle: {
    color: '#9a3412',
    fontSize: 14,
    fontWeight: '700',
  },
  deletionPendingText: {
    color: '#9a3412',
    fontSize: 12,
    lineHeight: 18,
  },
  cancelDeletionInlineButton: {
    marginTop: 12,
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDeletionInlineText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Confirmation Modal Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: '100%',
    width: '100%',
  },
  confirmHeader: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#4b5563',
    flex: 1,
  },
  statusBox: {
    width: '100%',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  statusWarning: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  statusWarningText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmRestore: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmRestoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Profile;
