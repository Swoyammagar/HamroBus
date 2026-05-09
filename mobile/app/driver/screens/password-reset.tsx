import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDriverPasswordChange } from '../hooks/useDriverPasswordChange';
import { palette } from '../theme';

const DriverPasswordReset = () => {
  const router = useRouter();
  const { changePassword, loading, error, clearError, validatePassword } = useDriverPasswordChange();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.currentPassword.trim()) {
      errors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword.trim()) {
      errors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    clearError();

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      await changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
      );

      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'OK',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (err: any) {
      // Error is already set by the hook
      Alert.alert('Error', err.message || 'Failed to change password');
    }
  };

  const passwordValidation = validatePassword(formData.newPassword);
  const passwordMeetsRequirements = Object.values(passwordValidation).every((v) => v);

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
        <Text style={styles.headerTitle}>Reset Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={palette.primary} />
          <Text style={styles.infoText}>
            For your security, please enter your current password before setting a new one.
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Current Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Current Password *</Text>
            <View
              style={[
                styles.inputContainer,
                formErrors.currentPassword && styles.inputContainerError,
              ]}
            >
              <Feather name="lock" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                value={formData.currentPassword}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, currentPassword: text }));
                  if (formErrors.currentPassword) {
                    setFormErrors((prev) => ({
                      ...prev,
                      currentPassword: '',
                    }));
                  }
                }}
                secureTextEntry={!showCurrentPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showCurrentPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {formErrors.currentPassword && (
              <Text style={styles.errorText}>{formErrors.currentPassword}</Text>
            )}
          </View>

          {/* New Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>New Password *</Text>
            <View
              style={[
                styles.inputContainer,
                formErrors.newPassword && styles.inputContainerError,
              ]}
            >
              <Feather name="key" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={formData.newPassword}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, newPassword: text }));
                  if (formErrors.newPassword) {
                    setFormErrors((prev) => ({
                      ...prev,
                      newPassword: '',
                    }));
                  }
                }}
                secureTextEntry={!showNewPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showNewPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {formErrors.newPassword && (
              <Text style={styles.errorText}>{formErrors.newPassword}</Text>
            )}
            {!formErrors.newPassword && formData.newPassword && (
              <View style={styles.passwordStrength}>
                <View style={styles.strengthBars}>
                  {passwordValidation.minLength && (
                    <View style={[styles.strengthBar, styles.strongBar]} />
                  )}
                  {passwordValidation.hasUppercase && (
                    <View style={[styles.strengthBar, styles.strongBar]} />
                  )}
                  {passwordValidation.hasLowercase && (
                    <View style={[styles.strengthBar, styles.strongBar]} />
                  )}
                  {passwordValidation.hasNumber && (
                    <View style={[styles.strengthBar, styles.strongBar]} />
                  )}
                </View>
                <Text style={styles.strengthText}>
                  {passwordMeetsRequirements ? 'Strong password' : 'Good password'}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Confirm New Password *</Text>
            <View
              style={[
                styles.inputContainer,
                formErrors.confirmPassword && styles.inputContainerError,
              ]}
            >
              <Feather name="lock" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChangeText={(text) => {
                  setFormData((prev) => ({ ...prev, confirmPassword: text }));
                  if (formErrors.confirmPassword) {
                    setFormErrors((prev) => ({
                      ...prev,
                      confirmPassword: '',
                    }));
                  }
                }}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showConfirmPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {formErrors.confirmPassword && (
              <Text style={styles.errorText}>{formErrors.confirmPassword}</Text>
            )}
            {!formErrors.confirmPassword &&
              formData.confirmPassword &&
              formData.newPassword === formData.confirmPassword && (
                <Text style={styles.successText}>✓ Passwords match</Text>
              )}
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password requirements:</Text>
            <View style={styles.requirementItem}>
              <Feather
                name={passwordValidation.minLength ? 'check-circle' : 'circle'}
                size={16}
                color={passwordValidation.minLength ? '#10b981' : '#d1d5db'}
              />
              <Text
                style={[
                  styles.requirementText,
                  passwordValidation.minLength && styles.requirementMet,
                ]}
              >
                At least 8 characters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Feather
                name={passwordValidation.hasUppercase ? 'check-circle' : 'circle'}
                size={16}
                color={passwordValidation.hasUppercase ? '#10b981' : '#d1d5db'}
              />
              <Text
                style={[
                  styles.requirementText,
                  passwordValidation.hasUppercase && styles.requirementMet,
                ]}
              >
                One uppercase letter
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Feather
                name={passwordValidation.hasLowercase ? 'check-circle' : 'circle'}
                size={16}
                color={passwordValidation.hasLowercase ? '#10b981' : '#d1d5db'}
              />
              <Text
                style={[
                  styles.requirementText,
                  passwordValidation.hasLowercase && styles.requirementMet,
                ]}
              >
                One lowercase letter
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Feather
                name={passwordValidation.hasNumber ? 'check-circle' : 'circle'}
                size={16}
                color={passwordValidation.hasNumber ? '#10b981' : '#d1d5db'}
              />
              <Text
                style={[
                  styles.requirementText,
                  passwordValidation.hasNumber && styles.requirementMet,
                ]}
              >
                One number
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Feather
                name={
                  formData.currentPassword &&
                  formData.newPassword &&
                  formData.currentPassword !== formData.newPassword
                    ? 'check-circle'
                    : 'circle'
                }
                size={16}
                color={
                  formData.currentPassword &&
                  formData.newPassword &&
                  formData.currentPassword !== formData.newPassword
                    ? '#10b981'
                    : '#d1d5db'
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  formData.currentPassword &&
                    formData.newPassword &&
                    formData.currentPassword !== formData.newPassword &&
                    styles.requirementMet,
                ]}
              >
                Different from current password
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Feather
                name={
                  formData.newPassword &&
                  formData.confirmPassword &&
                  formData.newPassword === formData.confirmPassword
                    ? 'check-circle'
                    : 'circle'
                }
                size={16}
                color={
                  formData.newPassword &&
                  formData.confirmPassword &&
                  formData.newPassword === formData.confirmPassword
                    ? '#10b981'
                    : '#d1d5db'
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  formData.newPassword &&
                    formData.confirmPassword &&
                    formData.newPassword === formData.confirmPassword &&
                    styles.requirementMet,
                ]}
              >
                Passwords match
              </Text>
            </View>
          </View>
        </View>

        {/* Error Alert */}
        {error && (
          <View style={styles.errorAlert}>
            <Feather name="alert-circle" size={20} color="#ef4444" />
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
              <Text style={styles.submitButtonText}>Change Password</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    color: palette.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: palette.primary,
    padding: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 13,
    color: '#1e40af',
    flex: 1,
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
    color: palette.text,
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
    color: palette.text,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
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
  passwordStrength: {
    marginTop: 10,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
  },
  strongBar: {
    backgroundColor: '#10b981',
  },
  strengthText: {
    fontSize: 12,
    color: '#10b981',
  },
  requirementsBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.text,
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  requirementMet: {
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
    color: palette.text,
  },
  submitButton: {
    backgroundColor: palette.primary,
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

export default DriverPasswordReset;
