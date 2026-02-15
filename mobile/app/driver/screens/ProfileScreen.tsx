import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, 
  Pressable, Modal 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { useAuth } from '../../context/AuthContext';
import ReviewsSection from '../component/ReviewsSection';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
export default function ProfileScreen() {
  const { user, driver } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const { logout } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user) {
      setIsLoading(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  // Get initials as fallback
  const getInitials = (firstName: string, lastName: string) => {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header with Image */}
      <View style={[styles.headerCard, shadow.card]}>
        <View style={styles.avatarContainer}>
          {profileImage ? (
            <Image 
              source={{ uri: profileImage }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: palette.primary }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.sub}>Driver ID: {driverId}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Stat icon="phone" label="Phone" value={user?.phoneNumber || 'N/A'} />
        <Stat icon="mail" label="Email" value={user?.email.split('@')[0] || 'N/A'} />
      </View>

      <View style={[styles.card, shadow.card]}>
        <Text style={styles.cardTitle}>Account Status</Text>
        <View style={styles.statusRow}>
          <Feather name="check-circle" size={16} color={palette.success} />
          <Text style={[styles.statusText, { color: palette.success }]}>
            Email Verified
          </Text>
        </View>
        <View style={styles.statusRow}>
          <Feather 
            name={user?.passwordResetVerified ? "check-circle" : "x-circle"} 
            size={16} 
            color={user?.passwordResetVerified ? palette.success : palette.warning} 
          />
          <Text style={[
            styles.statusText, 
            { color: user?.passwordResetVerified ? palette.success : palette.warning }
          ]}>
            Password {user?.passwordResetVerified ? 'Verified' : 'Not Verified'}
          </Text>
        </View>
      </View>

      {/* Documents Section with License Image */}
      <View style={[styles.card, shadow.card]}>
        <Text style={styles.cardTitle}>Documents</Text>
        
        <View style={styles.licenseCard}>
          <View style={{ flex: 1 }}>
            <View style={styles.docRow}>
              <Feather 
                name={driver?.licenseNo ? "check" : "alert-circle"} 
                size={16} 
                color={driver?.licenseNo ? palette.success : palette.warning} 
              />
              <Text style={styles.docText}>
                License {driver?.licenseNo ? `(${driver.licenseNo})` : '· Pending'}
              </Text>
            </View>
          </View>
          
          {licenseImage && (
            <Pressable 
              style={styles.viewButton}
              onPress={() => setExpandedImage(licenseImage)}
            >
              <Feather name="eye" size={14} color="white" />
              <Text style={styles.viewButtonText}>View</Text>
            </Pressable>
          )}
        </View>

        {driver?.assignedRoute && (
          <View style={styles.docRow}>
            <Feather name="map-pin" size={16} color={palette.muted} />
            <Text style={styles.docText}>Route {driver.assignedRoute}</Text>
          </View>
        )}
        
        {driver?.assignedBus && (
          <View style={styles.docRow}>
            <Feather name="truck" size={16} color={palette.muted} />
            <Text style={styles.docText}>Bus {driver.assignedBus}</Text>
          </View>
        )}
      </View>

      <ReviewsSection />
      <Pressable 
        style={[styles.logoutButton, shadow.card]}
        onPress={handleLogout}
      >
        <Feather name="log-out" size={18} color="white" />
        <Text style={styles.logoutText}>Logout</Text>
      </Pressable>


      {/* Image Expansion Modal */}
      <Modal
        visible={expandedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExpandedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalClose}
            onPress={() => setExpandedImage(null)}
          >
            <Feather name="x" size={28} color="white" />
          </Pressable>
          
          {expandedImage && (
            <Image
              source={{ uri: expandedImage }}
              style={styles.expandedImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={[styles.stat, shadow.card]}>
      <Feather name={icon} size={16} color={palette.primary} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  
  headerCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#E0ECFF',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  avatarText: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 18, fontWeight: '700', color: palette.text },
  sub: { color: palette.muted, fontSize: 12 },
  email: { color: palette.muted, fontSize: 11, marginTop: 2 },
  
  infoRow: { flexDirection: 'row', gap: spacing.sm },
  
  stat: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  
  statValue: { fontSize: 16, fontWeight: '700', color: palette.text },
  statLabel: { color: palette.muted, fontSize: 12 },
  
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  
  cardTitle: { fontWeight: '700', color: palette.text, fontSize: 14 },
  
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: 6 },
  statusText: { fontSize: 13, fontWeight: '500' },
  
  licenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: 4 },
  docText: { color: palette.muted, fontSize: 13 },
  
  viewButton: {
    flexDirection: 'row',
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 4,
  },
  
  viewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: spacing.md,
  },
  
  expandedImage: {
    width: '90%',
    height: '80%',
  },
});