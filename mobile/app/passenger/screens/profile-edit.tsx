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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/app/context/AuthContext';
import { usePassenger } from '../context/PassengerContext';
import { useProfileUpdate } from '../hooks/useProfileUpdate';
import { passengerProfileService } from '../services/passengerProfileService';

const ProfileEdit = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, setProfile } = usePassenger();
  const { updateProfile, loading, error, phoneCheckLoading, phoneCheckError } = useProfileUpdate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    profileImgUrl: '',
  });

  const [originalFormData, setOriginalFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    profileImgUrl: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [phoneValidated, setPhoneValidated] = useState(true);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);

  // Load profile data on mount
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoadingInitial(true);
      const profileData = await passengerProfileService.getProfile();

      const userData = profileData.user;
      const initialData = {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phoneNumber: userData.phoneNumber || '',
        profileImgUrl: userData.profileImgUrl || '',
      };

      setFormData(initialData);
      setOriginalFormData(initialData);
      setImagePreviewUri(userData.profileImgUrl || null);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoadingInitial(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePhoneNumber = async () => {
    const phoneValidation = await passengerProfileService.validatePhoneNumber(
      formData.phoneNumber,
      user?._id
    );
    setPhoneValidated(phoneValidation.isValid);
    if (!phoneValidation.isValid) {
      setFormErrors((prev) => ({
        ...prev,
        phoneNumber: phoneValidation.error || 'Invalid phone number',
      }));
    } else {
      setFormErrors((prev) => ({
        ...prev,
        phoneNumber: '',
      }));
    }
    return phoneValidation.isValid;
  };

  const handlePhoneNumberChange = (text: string) => {
    setFormData((prev) => ({
      ...prev,
      phoneNumber: text,
    }));
    // Clear validation status when user changes the number
    if (phoneValidated) {
      setPhoneValidated(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', 'We need access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setImagePreviewUri(imageUri);
        // For now, we'll store the URI as is. In production, upload to cloud storage
        setFormData((prev) => ({
          ...prev,
          profileImgUrl: imageUri,
        }));
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Validate phone if it has changed
    if (formData.phoneNumber !== originalFormData.phoneNumber) {
      const isPhoneValid = await validatePhoneNumber();
      if (!isPhoneValid) {
        return;
      }
    }

    // Prepare update payload
    const updatePayload: any = {};

    if (formData.firstName !== originalFormData.firstName) {
      updatePayload.firstName = formData.firstName.trim();
    }

    if (formData.lastName !== originalFormData.lastName) {
      updatePayload.lastName = formData.lastName.trim();
    }

    if (formData.phoneNumber !== originalFormData.phoneNumber) {
      updatePayload.phoneNumber = formData.phoneNumber.trim();
    }

    // For profile image, only include if it's a URL and not a local URI
    if (formData.profileImgUrl !== originalFormData.profileImgUrl) {
      updatePayload.profileImgUrl = formData.profileImgUrl;
    }

    // If no changes, alert user
    if (Object.keys(updatePayload).length === 0) {
      Alert.alert('No Changes', 'You have not made any changes to your profile');
      return;
    }

    try {
      const response = await updateProfile(updatePayload);

      // Update profile context
      if (profile) {
        setProfile({
          ...profile,
          name: `${response.user.firstName} ${response.user.lastName}`,
          phone: response.user.phoneNumber,
          profilePicture: response.user.profileImgUrl,
        });
      }

      // Update original data
      setOriginalFormData({
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        phoneNumber: response.user.phoneNumber,
        profileImgUrl: response.user.profileImgUrl,
      });

      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    }
  };

  if (loadingInitial) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Image Section */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            {imagePreviewUri ? (
              <Image source={{ uri: imagePreviewUri }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileAvatarPlaceholder}>
                <Ionicons name="person-circle" size={80} color="#d1d5db" />
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={handleImagePicker}>
              <Ionicons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.imageHint}>Tap camera to change photo</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* First Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>First Name *</Text>
            <View
              style={[
                styles.inputContainer,
                formErrors.firstName && styles.inputContainerError,
              ]}
            >
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                value={formData.firstName}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, firstName: text }))
                }
                editable={!loading}
              />
            </View>
            {formErrors.firstName && (
              <Text style={styles.errorText}>{formErrors.firstName}</Text>
            )}
          </View>

          {/* Last Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <View
              style={[
                styles.inputContainer,
                formErrors.lastName && styles.inputContainerError,
              ]}
            >
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                value={formData.lastName}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, lastName: text }))
                }
                editable={!loading}
              />
            </View>
            {formErrors.lastName && (
              <Text style={styles.errorText}>{formErrors.lastName}</Text>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View
              style={[
                styles.inputContainer,
                formErrors.phoneNumber && styles.inputContainerError,
              ]}
            >
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={formData.phoneNumber}
                onChangeText={handlePhoneNumberChange}
                keyboardType="phone-pad"
                editable={!loading}
              />
              {phoneCheckLoading && (
                <ActivityIndicator size="small" color="#3b82f6" />
              )}
            </View>
            {formErrors.phoneNumber && (
              <Text style={styles.errorText}>{formErrors.phoneNumber}</Text>
            )}
            {phoneCheckError && (
              <Text style={styles.errorText}>{phoneCheckError}</Text>
            )}
            {phoneValidated && formData.phoneNumber !== originalFormData.phoneNumber && (
              <Text style={styles.successText}>✓ Phone number available</Text>
            )}
          </View>

          {/* Display Email (Read-only) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email (Read-only)</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={20} color="#d1d5db" />
              <TextInput
                style={[styles.input, styles.inputDisabledText]}
                value={user?.email || ''}
                editable={false}
              />
            </View>
          </View>
        </View>

        {/* Error Alert */}
        {error && (
          <View style={styles.errorAlert}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorAlertText}>{error.message}</Text>
          </View>
        )}

        {/* Action Buttons */}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
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
  imageSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingTop: 32,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e5e7eb',
  },
  profileAvatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  imageHint: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 48,
  },
  inputContainerError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1f2937',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  inputDisabledText: {
    color: '#9ca3af',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#ef4444',
  },
  successText: {
    marginTop: 6,
    fontSize: 12,
    color: '#10b981',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 12,
    marginBottom: 16,
  },
  errorAlertText: {
    marginLeft: 12,
    fontSize: 13,
    color: '#991b1b',
    flex: 1,
  },
  buttonSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  spacer: {
    height: 32,
  },
});

export default ProfileEdit;
