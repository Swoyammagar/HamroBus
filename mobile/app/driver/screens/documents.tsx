import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useDriverProfileUpdate } from '../hooks/useDriverProfileUpdate';
import { driverProfileService } from '../services/driverProfileService';
import { palette, spacing, radius, shadow } from '../theme';

const DocumentsScreen = () => {
  const router = useRouter();
  const { user, driver } = useAuth();
  const { updateProfile, loading } = useDriverProfileUpdate();

  const [licenseImage, setLicenseImage] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Load profile data on mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoadingInitial(true);
      const profileData = await driverProfileService.getProfile();
      const licenseImg = profileData.driver?.licenseImgUrl;
      if (licenseImg) {
        setLicenseImage(licenseImg);
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleUpdateLicenseImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', 'We need access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setLicenseImage(imageUri);

        // Update profile with new license image
        try {
          await updateProfile({
            licenseImgUrl: imageUri,
          });

          Alert.alert('Success', 'License image updated successfully');
        } catch (error: any) {
          Alert.alert('Error', error.message || 'Failed to update license image');
          // Revert the image
          await loadProfileData();
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleViewLicense = () => {
    if (licenseImage) {
      setExpandedImage(licenseImage);
    }
  };

  if (loadingInitial) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Documents</Text>
        <Text style={styles.headerSubtitle}>Manage your license and documents</Text>
      </View>

      {/* Driver Information Card */}
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHeader}>
          <Feather name="info" size={20} color={palette.primary} />
          <Text style={styles.cardTitle}>License Information</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.label}>License Number:</Text>
          <Text style={styles.value}>{driver?.licenseNo || 'Not assigned'}</Text>
        </View>
      </View>

      {/* License Image Section */}
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHeader}>
          <Feather name="file-text" size={20} color={palette.primary} />
          <Text style={styles.cardTitle}>License Image</Text>
        </View>
        <View style={styles.divider} />

        {licenseImage ? (
          <>
            <TouchableOpacity
              style={styles.imagePreviewContainer}
              onPress={handleViewLicense}
            >
              <Image
                source={{ uri: licenseImage }}
                style={styles.licenseImagePreview}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Feather name="maximize-2" size={24} color="#fff" />
                <Text style={styles.overlayText}>Tap to view</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdateLicenseImage}
              disabled={loading}
            >
              <Feather name="upload" size={18} color={palette.primary} />
              <Text style={styles.updateButtonText}>Update License Image</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.noImageContainer}>
              <Feather name="file-text" size={48} color="#d1d5db" />
              <Text style={styles.noImageText}>No license image uploaded</Text>
              <Text style={styles.noImageSubtext}>Upload your license document</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.uploadButton]}
              onPress={handleUpdateLicenseImage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="upload" size={18} color="#fff" />
                  <Text style={styles.uploadButtonText}>Upload License Image</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Requirements Info Card */}
      <View style={[styles.card, styles.infoCard]}>
        <View style={styles.cardHeader}>
          <Feather name="alert-circle" size={20} color="#f59e0b" />
          <Text style={[styles.cardTitle, { color: '#f59e0b' }]}>Requirements</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.requirementItem}>
          <Feather name="check-circle" size={16} color={palette.success} />
          <Text style={styles.requirementText}>Ensure the document is clear and legible</Text>
        </View>
        <View style={styles.requirementItem}>
          <Feather name="check-circle" size={16} color={palette.success} />
          <Text style={styles.requirementText}>All text should be readable</Text>
        </View>
        <View style={styles.requirementItem}>
          <Feather name="check-circle" size={16} color={palette.success} />
          <Text style={styles.requirementText}>Document should not be expired</Text>
        </View>
      </View>

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

      <View style={styles.spacer} />
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: palette.text,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  licenseImagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
  },
  noImageContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 16,
  },
  noImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
    marginTop: 12,
  },
  noImageSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  updateButton: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: palette.primary,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primary,
  },
  uploadButton: {
    backgroundColor: palette.primary,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requirementText: {
    fontSize: 13,
    color: palette.text,
    marginLeft: 8,
    flex: 1,
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
  spacer: {
    height: 32,
  },
});

export default DocumentsScreen;
