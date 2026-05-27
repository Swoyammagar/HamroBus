import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import ReviewsSection from '../component/ReviewsSection';
import { palette, spacing, radius, shadow } from '../theme';
import { useFocusEffect } from '@react-navigation/native';
import { driverProfileService } from '../services/driverProfileService';
import { useAccountDeletion } from '../hooks/useAccountDeletion';

const ProfileAvatar: React.FC<{ uri?: string | null; initials: string }> = ({ uri, initials }) => {
  const [failed, setFailed] = useState(false);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={styles.profileImage}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[styles.profileAvatar, { backgroundColor: palette.primary }]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
};

const ProfileScreen = () => {
  const router = useRouter();
  const { user, driver, logout, getCurrentUser } = useAuth(); // add getCurrentUser
  const [isLoading, setIsLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [licenseNo, setLicenseNo] = useState<string | null>(null); // local driver info

  const {
    isDeletionPending,
    remainingDays,
    deletionDate,
    loading: deletionLoading,
    checkDeletionStatus,
    requestDeletion,
    cancelDeletion,
  } = useAccountDeletion();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletionStatus, setShowDeletionStatus] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      getCurrentUser().then(() => setIsLoading(false));
      checkDeletionStatus();

      driverProfileService.getProfile().then((data) => {
        setLicenseNo(data?.driver?.licenseNo || null);
      }).catch(() => {});
    }, [checkDeletionStatus])
  );

  useEffect(() => {
    if (user) {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  };

  const handleEditProfile = () => {
    router.push('./profile-edit');
  };

  const handleResetPassword = () => {
    router.push('./password-reset');
  };

  const handleViewDocuments = () => {
    router.push('./documents');
  };

  const handleTerms = () => {
    router.push('/legal/terms' as any);
  };

  const handlePrivacy = () => {
    router.push('/legal/privacy' as any);
  };

  const handleAbout = () => {
    router.push('/legal/about' as any);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Logout',
        onPress: () => {
          logout();
          Alert.alert('Success', 'You have been logged out');
          router.push('/pages/mobilelogin');
        },
        style: 'destructive',
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

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

  const initials = user ? getInitials(user.firstName, user.lastName) : '?';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Unknown Driver';
  const driverId = driver?.id || 'Not assigned';
  const profileImage = user?.profileImgUrl;
  const deletionDaysLabel = remainingDays ?? 'calculating';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <ProfileAvatar uri={profileImage} initials={initials} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{fullName}</Text>

            <View style={styles.metaRow}>
              <Feather name="mail" size={12} color="#6b7280" />
              <Text style={styles.metaText}>{user?.email}</Text>
            </View>

            <View style={styles.metaRow}>
              <Feather name="phone" size={12} color="#6b7280" />
              <Text style={styles.metaText}>{user?.phoneNumber || 'N/A'}</Text>
            </View>

            {driverId && (
              <View style={styles.metaRow}>
                <Feather name="hash" size={12} color="#6b7280" />
                <Text style={styles.metaText}>ID: {driverId}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Feather name="edit-2" size={16} color={palette.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleResetPassword}>
            <View style={styles.menuItemLeft}>
              <Feather name="lock" size={20} color={palette.primary} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Reset Password</Text>
                <Text style={styles.menuItemSubtitle}>Update your password</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleViewDocuments}>
            <View style={styles.menuItemLeft}>
              <Feather name="file-text" size={20} color={palette.primary} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Documents</Text>
                <Text style={styles.menuItemSubtitle}>Manage your license</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleTerms}>
            <View style={styles.menuItemLeft}>
              <Feather name="file-text" size={20} color={palette.primary} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Terms & Conditions</Text>
                <Text style={styles.menuItemSubtitle}>Service rules and responsibilities</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handlePrivacy}>
            <View style={styles.menuItemLeft}>
              <Feather name="shield" size={20} color={palette.primary} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>Privacy Policy</Text>
                <Text style={styles.menuItemSubtitle}>Data, GPS, and payment handling</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleAbout}>
            <View style={styles.menuItemLeft}>
              <Feather name="info" size={20} color={palette.primary} />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemLabel}>About Hamro Bus</Text>
                <Text style={styles.menuItemSubtitle}>Platform goals and services</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color="#d1d5db" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Information</Text>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>License Number</Text>
              <Text style={styles.infoValue}>{driver?.licenseNo || 'Not assigned'}</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Status</Text>
              <Text style={[styles.infoValue, { color: palette.success }]}>Verified</Text>
            </View>
          </View>
        </View>

        <ReviewsSection />

        {isDeletionPending && (
          <View style={styles.deletionPendingCard}>
            <View style={styles.deletionPendingHeader}>
              <Feather name="alert-triangle" size={18} color="#dc2626" />
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, isDeletionPending && styles.deleteButtonWarning]}
          onPress={() => isDeletionPending ? handleCancelDeletion() : setShowDeleteConfirm(true)}
          disabled={deletionLoading}
        >
          <Feather name={isDeletionPending ? 'rotate-ccw' : 'trash-2'} size={20} color={isDeletionPending ? '#ffffff' : '#ef4444'} />
          <Text style={[styles.deleteButtonText, isDeletionPending && styles.deleteButtonWarningText]}>
            {isDeletionPending ? 'Cancel Profile Deletion' : 'Delete Profile'}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hamro Bus v1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2024 All rights reserved</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmHeader}>
              <Feather name="alert-circle" size={40} color="#dc2626" />
            </View>

            <Text style={styles.confirmTitle}>Delete Profile?</Text>
            <Text style={styles.confirmMessage}>
              Your profile will be permanently deleted in 7 days. You can cancel anytime before then by logging back in.
            </Text>

            <View style={styles.confirmDetails}>
              <View style={styles.detailRow}>
                <Feather name="clock" size={16} color="#f59e0b" />
                <Text style={styles.detailText}>7-day grace period</Text>
              </View>
              <View style={styles.detailRow}>
                <Feather name="check" size={16} color="#10b981" />
                <Text style={styles.detailText}>Can restore by logging in</Text>
              </View>
              <View style={styles.detailRow}>
                <Feather name="alert-circle" size={16} color="#ef4444" />
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

      <Modal
        visible={showDeletionStatus}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeletionStatus(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmHeader}>
              <Feather name="alert-triangle" size={40} color="#dc2626" />
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
              <Feather name="info" size={16} color="#2563eb" />
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

      {expandedImage && (
        <View style={styles.expandedImageContainer}>
          <TouchableOpacity
            style={styles.expandedImageBackdrop}
            onPress={() => setExpandedImage(null)}
          />
          <View style={styles.expandedImageContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setExpandedImage(null)}
            >
              <Feather name="x" size={24} color={palette.text} />
            </TouchableOpacity>
            <Image
              source={{ uri: expandedImage }}
              style={styles.expandedImage}
              resizeMode="contain"
            />
          </View>
        </View>
      )}
    </SafeAreaView>
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
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,

    flexDirection: 'row',
    alignItems: 'center',

    borderWidth: 1,
    borderColor: '#eef0f4',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  avatarWrapper: {
    marginRight: 14,
  },

  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e5e7eb',
  },

  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 6,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },

  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },

  editButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f1f5ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  profileEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  profileId: {
    fontSize: 11,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  expandedImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImageBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  expandedImageContent: {
    position: 'relative',
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImage: {
    width: '100%',
    height: 400,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
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

export default ProfileScreen;
