import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useDriverProfileUpdate } from '../hooks/useDriverProfileUpdate';
import { driverProfileService } from '../services/driverProfileService';
import { palette, spacing, radius, shadow } from '../theme';

const DriverProfileEdit = () => {
  const router = useRouter();
  const { user, driver, uploadImageToCloudinary, getCurrentUser } = useAuth(); // ← add uploadImageToCloudinary
  const {
    updateProfileWithImages, // ← was updateProfile
    loading,
    error,
    uploadProgress,          // ← new: shows "Uploading profile photo…" etc.
    phoneCheckLoading,
    phoneCheckError,
    licenseCheckLoading,
    licenseCheckError,
  } = useDriverProfileUpdate();

  const [profileLoading, setProfileLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    licenseNo: '',
    profileImgUrl: '',
    licenseImgUrl: '',
  });
  const [originalFormData, setOriginalFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    licenseNo: '',
    profileImgUrl: '',
    licenseImgUrl: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [phoneValidated, setPhoneValidated] = useState(true);
  const [licenseValidated, setLicenseValidated] = useState(true);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [licenseImageUri, setLicenseImageUri] = useState<string | null>(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const [licenseImageError, setLicenseImageError] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setProfileLoading(true);
      const profileData = await driverProfileService.getProfile();

      const data = {
        firstName: profileData.user?.firstName || '',
        lastName: profileData.user?.lastName || '',
        phoneNumber: profileData.user?.phoneNumber || '',
        licenseNo: profileData.driver?.licenseNo || '',
        profileImgUrl: profileData.user?.profileImgUrl || '',
        licenseImgUrl: profileData.driver?.licenseImgUrl || '',
      };

      setFormData(data);
      setOriginalFormData(data);
      setProfileImageError(false);
      setLicenseImageError(false);
      setProfileImageUri(data.profileImgUrl || null);
      setLicenseImageUri(data.licenseImgUrl || null);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      Alert.alert('Error', err.message || 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (!formData.licenseNo.trim()) errors.licenseNo = 'License number is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePhoneNumber = async () => {
    const result = await driverProfileService.validatePhoneNumber(
      formData.phoneNumber,
      driver?.id
    );
    setPhoneValidated(result.isValid);
    setFormErrors((prev) => ({
      ...prev,
      phoneNumber: result.isValid ? '' : result.error || 'Invalid phone number',
    }));
    return result.isValid;
  };

  const validateLicenseNumber = async () => {
    const result = await driverProfileService.validateLicenseNumber(
      formData.licenseNo,
      driver?.id
    );
    setLicenseValidated(result.isValid);
    setFormErrors((prev) => ({
      ...prev,
      licenseNo: result.isValid ? '' : result.error || 'Invalid license number',
    }));
    return result.isValid;
  };

  const handlePhoneNumberChange = (text: string) => {
    setFormData((prev) => ({ ...prev, phoneNumber: text }));
    if (phoneValidated) setPhoneValidated(false);
  };

  const handleLicenseNumberChange = (text: string) => {
    setFormData((prev) => ({ ...prev, licenseNo: text }));
    if (licenseValidated) setLicenseValidated(false);
  };

  const handleImagePicker = async (type: 'profile' | 'license') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'We need access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        if (type === 'profile') {
          setProfileImageUri(imageUri);
          setProfileImageError(false);
        } else {
          setLicenseImageUri(imageUri);
          setLicenseImageError(false);
        }
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (formData.phoneNumber !== originalFormData.phoneNumber) {
      const isPhoneValid = await validatePhoneNumber();
      if (!isPhoneValid) return;
    }

    if (formData.licenseNo !== originalFormData.licenseNo) {
      const isLicenseValid = await validateLicenseNumber();
      if (!isLicenseValid) return;
    }

    // Check whether anything actually changed
    const textChanged =
      formData.firstName !== originalFormData.firstName ||
      formData.lastName !== originalFormData.lastName ||
      formData.phoneNumber !== originalFormData.phoneNumber ||
      formData.licenseNo !== originalFormData.licenseNo;

    // profileImageUri / licenseImageUri are local file:// URIs when freshly picked,
    // or the original https:// URL when unchanged. We detect a new pick by checking
    // whether the current URI differs from what was loaded from the server.
    const profileImageChanged =
      !!profileImageUri && profileImageUri !== originalFormData.profileImgUrl;
    const licenseImageChanged =
      !!licenseImageUri && licenseImageUri !== originalFormData.licenseImgUrl;

    if (!textChanged && !profileImageChanged && !licenseImageChanged) {
      Alert.alert('No Changes', 'You have not made any changes to your profile');
      return;
    }

    try {
      // updateProfileWithImages will:
      //   1. Upload profileImageUri to Cloudinary if it's a local file:// URI
      //   2. Upload licenseImageUri to Cloudinary if it's a local file:// URI
      //   3. Call driverProfileService.updateProfile() with the resolved https:// URLs
      const response = await updateProfileWithImages(
        {
          // Only send text fields that changed
          ...(formData.firstName !== originalFormData.firstName && { firstName: formData.firstName.trim() }),
          ...(formData.lastName !== originalFormData.lastName && { lastName: formData.lastName.trim() }),
          ...(formData.phoneNumber !== originalFormData.phoneNumber && { phoneNumber: formData.phoneNumber.trim() }),
          ...(formData.licenseNo !== originalFormData.licenseNo && { licenseNo: formData.licenseNo.trim() }),
          // Pass current URIs — hook detects whether upload is needed
          ...(profileImageChanged && { profileImageUri: profileImageUri! }),
          ...(licenseImageChanged && { licenseImageUri: licenseImageUri! }),
        },
        uploadImageToCloudinary, // from useAuth()
      );

      setOriginalFormData({
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        phoneNumber: response.user.phoneNumber,
        licenseNo: response.driver.licenseNo,
        profileImgUrl: response.user.profileImgUrl,
        licenseImgUrl: response.driver.licenseImgUrl,
      });
      await getCurrentUser(); // refresh user data in context

      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    }
  };

  const isRemoteUri = (uri: string | null): boolean =>
    !!uri && (uri.startsWith('http://') || uri.startsWith('https://'));

  if (profileLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="chevron-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Profile Image ── */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>Profile Photo</Text>
            <View style={styles.imageContainer}>
              {profileImageUri && !profileImageError ? (
                <Image
                  source={{
                    uri: profileImageUri,
                    ...(isRemoteUri(profileImageUri) && { headers: { Pragma: 'no-cache' } }),
                  }}
                  style={styles.profileImage}
                  onError={() => setProfileImageError(true)}
                />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Feather name="user" size={40} color="#d1d5db" />
                </View>
              )}
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => handleImagePicker('profile')}
                disabled={loading}
              >
                <Feather name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.imageHint}>Tap camera to change photo</Text>
          </View>

          {/* ── License Image ── */}
          <View style={styles.imageSection}>
            <Text style={styles.sectionLabel}>License Image</Text>
            <View style={styles.imageContainer}>
              {licenseImageUri && !licenseImageError ? (
                <Image
                  source={{
                    uri: licenseImageUri,
                    ...(isRemoteUri(licenseImageUri) && { headers: { Pragma: 'no-cache' } }),
                  }}
                  style={styles.licenseImage}
                  onError={() => setLicenseImageError(true)}
                />
              ) : (
                <View style={styles.licenseAvatarPlaceholder}>
                  <Feather name="file-text" size={40} color="#d1d5db" />
                </View>
              )}
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => handleImagePicker('license')}
                disabled={loading}
              >
                <Feather name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.imageHint}>Tap camera to change license photo</Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.formSection}>

            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name *</Text>
              <View style={[styles.inputContainer, formErrors.firstName && styles.inputContainerError]}>
                <Feather name="user" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter first name"
                  placeholderTextColor="#9ca3af"
                  value={formData.firstName}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, firstName: text }))}
                  editable={!loading}
                />
              </View>
              {formErrors.firstName && <Text style={styles.errorText}>{formErrors.firstName}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <View style={[styles.inputContainer, formErrors.lastName && styles.inputContainerError]}>
                <Feather name="user" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name"
                  placeholderTextColor="#9ca3af"
                  value={formData.lastName}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, lastName: text }))}
                  editable={!loading}
                />
              </View>
              {formErrors.lastName && <Text style={styles.errorText}>{formErrors.lastName}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <View style={[styles.inputContainer, formErrors.phoneNumber && styles.inputContainerError]}>
                <Feather name="phone" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9ca3af"
                  value={formData.phoneNumber}
                  onChangeText={handlePhoneNumberChange}
                  keyboardType="phone-pad"
                  editable={!loading}
                />
                {phoneCheckLoading && <ActivityIndicator size="small" color={palette.primary} />}
              </View>
              {formErrors.phoneNumber && <Text style={styles.errorText}>{formErrors.phoneNumber}</Text>}
              {phoneCheckError && <Text style={styles.errorText}>{phoneCheckError}</Text>}
              {phoneValidated && formData.phoneNumber !== originalFormData.phoneNumber && (
                <Text style={styles.successText}>✓ Phone number available</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>License Number *</Text>
              <View style={[styles.inputContainer, formErrors.licenseNo && styles.inputContainerError]}>
                <Feather name="award" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter license number"
                  placeholderTextColor="#9ca3af"
                  value={formData.licenseNo}
                  onChangeText={handleLicenseNumberChange}
                  editable={!loading}
                />
                {licenseCheckLoading && <ActivityIndicator size="small" color={palette.primary} />}
              </View>
              {formErrors.licenseNo && <Text style={styles.errorText}>{formErrors.licenseNo}</Text>}
              {licenseCheckError && <Text style={styles.errorText}>{licenseCheckError}</Text>}
              {licenseValidated && formData.licenseNo !== originalFormData.licenseNo && (
                <Text style={styles.successText}>✓ License number available</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email (Read-only)</Text>
              <View style={[styles.inputContainer, styles.inputDisabled]}>
                <Feather name="mail" size={20} color="#d1d5db" />
                <TextInput
                  style={[styles.input, styles.inputDisabledText]}
                  value={user?.email || ''}
                  editable={false}
                />
              </View>
            </View>
          </View>

          {/* Upload progress — shown during Cloudinary upload */}
          {loading && uploadProgress && (
            <View style={styles.uploadProgressBar}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={styles.uploadProgressText}>{uploadProgress}</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorAlert}>
              <Feather name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorAlertText}>{error.message}</Text>
            </View>
          )}

          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: palette.text },
  content: { flex: 1, paddingHorizontal: 16 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  imageSection: { alignItems: 'center', paddingVertical: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: palette.text, marginBottom: 12 },
  imageContainer: { position: 'relative', marginBottom: 12 },
  profileImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#e5e7eb' },
  licenseImage: { width: 200, height: 120, borderRadius: 8, backgroundColor: '#e5e7eb' },
  profileAvatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
  licenseAvatarPlaceholder: {
    width: 200, height: 120, borderRadius: 8,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute', bottom: 0, right: 0,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: palette.primary, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  imageHint: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  formSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: palette.text, marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, height: 48,
  },
  inputContainerError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  input: { flex: 1, marginLeft: 8, fontSize: 14, color: palette.text },
  inputDisabled: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },
  inputDisabledText: { color: '#9ca3af' },
  errorText: { marginTop: 6, fontSize: 12, color: '#ef4444' },
  successText: { marginTop: 6, fontSize: 12, color: '#10b981' },
  uploadProgressBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  uploadProgressText: { fontSize: 13, color: '#1d4ed8', fontWeight: '500' },
  errorAlert: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', borderRadius: 8,
    borderLeftWidth: 4, borderLeftColor: '#ef4444',
    padding: 12, marginBottom: 16,
  },
  errorAlertText: { marginLeft: 12, fontSize: 13, color: '#991b1b', flex: 1 },
  buttonSection: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  button: { flex: 1, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: palette.text },
  submitButton: { backgroundColor: palette.primary },
  submitButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  buttonDisabled: { opacity: 0.6 },
  spacer: { height: 32 },
});

export default DriverProfileEdit;