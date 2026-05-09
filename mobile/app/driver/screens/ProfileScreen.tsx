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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import ReviewsSection from '../component/ReviewsSection';
import { palette, spacing, radius, shadow } from '../theme';

const ProfileScreen = () => {
  const router = useRouter();
  const { user, driver, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

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

  const initials = user ? getInitials(user.firstName, user.lastName) : '?';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Unknown Driver';
  const driverId = driver?.id || 'Not assigned';
  const profileImage = user?.profileImgUrl;
  const licenseImage = driver?.licenseImgUrl;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileAvatar, { backgroundColor: palette.primary }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
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

        {/* Account Section */}
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

        {/* Driver Information Section */}
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

        {/* Recent Reviews Section */}
        <ReviewsSection />

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hamro Bus v1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2024 All rights reserved</Text>
        </View>
      </ScrollView>

      {/* Expanded Image Modal */}
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
});

export default ProfileScreen;