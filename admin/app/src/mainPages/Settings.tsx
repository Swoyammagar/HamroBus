import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useChangePassword } from '../hooks/useChangePassword';
import { useAdminProfile } from '../hooks/useAdminProfile';
import { useAuth } from '../../context/AuthContext';

const Settings = () => {
  const { user, validateToken } = useAuth();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [fullname, setFullname] = useState(user?.fullname || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { changePassword, loading, error, success, reset } = useChangePassword();
  const {
    updateProfile,
    loading: profileLoading,
    error: profileError,
    success: profileSuccess,
    reset: resetProfile,
  } = useAdminProfile();

  useEffect(() => {
    if (!showProfileForm) {
      setFullname(user?.fullname || '');
      setEmail(user?.email || '');
      setPhone(user?.phone || '');
    }
  }, [showProfileForm, user]);

  const resetProfileForm = () => {
    setFullname(user?.fullname || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    resetProfile();
  };

  const handleProfileSubmit = async () => {
    const result = await updateProfile({
      fullname,
      email,
      phone,
    });

    if (result.success) {
      await validateToken();
      Alert.alert('Success', result.message, [
        {
          text: 'OK',
          onPress: () => {
            setShowProfileForm(false);
            resetProfile();
          },
        },
      ]);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  const handleSubmit = async () => {
    const result = await changePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (result.success) {
      Alert.alert('Success', result.message, [
        {
          text: 'OK',
          onPress: () => {
            setShowPasswordForm(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            reset();
          },
        },
      ]);
    } else {
      Alert.alert('Error', result.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Update Section */}
      <View style={styles.section}>
        <Pressable
          style={styles.sectionButton}
          onPress={() => {
            const nextVisible = !showProfileForm;
            setShowProfileForm(nextVisible);
            if (nextVisible) {
              resetProfileForm();
            } else {
              resetProfile();
            }
          }}
        >
          <View style={styles.sectionButtonContent}>
            <Feather name="user" size={24} color="#6366f1" />
            <View style={styles.sectionButtonText}>
              <Text style={styles.sectionButtonTitle}>Edit Profile</Text>
              <Text style={styles.sectionButtonSubtitle}>Update your full name, email, and phone number</Text>
            </View>
          </View>
          <Feather
            name={showProfileForm ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#999"
          />
        </Pressable>

        {showProfileForm && (
          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={fullname}
                  onChangeText={setFullname}
                  editable={!profileLoading}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  value={email}
                  onChangeText={setEmail}
                  editable={!profileLoading}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!profileLoading}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {profileError && (
              <View style={styles.errorAlert}>
                <Feather name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{profileError}</Text>
              </View>
            )}

            {profileSuccess && (
              <View style={styles.successAlert}>
                <Feather name="check-circle" size={18} color="#22c55e" />
                <Text style={styles.successText}>Profile updated successfully!</Text>
              </View>
            )}

            <View style={styles.buttonGroup}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowProfileForm(false);
                  resetProfileForm();
                }}
                disabled={profileLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.submitButton, profileLoading && styles.submitButtonDisabled]}
                onPress={handleProfileSubmit}
                disabled={profileLoading}
              >
                {profileLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Save Profile</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Password Change Section */}
      <View style={styles.section}>
        <Pressable 
          style={styles.sectionButton}
          onPress={() => {
            setShowPasswordForm(!showPasswordForm);
            reset();
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }}
        >
          <View style={styles.sectionButtonContent}>
            <Feather name="lock" size={24} color="#6366f1" />
            <View style={styles.sectionButtonText}>
              <Text style={styles.sectionButtonTitle}>Change Password</Text>
              <Text style={styles.sectionButtonSubtitle}>Update your admin password</Text>
            </View>
          </View>
          <Feather 
            name={showPasswordForm ? 'chevron-up' : 'chevron-down'} 
            size={24} 
            color="#999" 
          />
        </Pressable>

        {showPasswordForm && (
          <View style={styles.form}>
            {/* Current Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current password"
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  editable={!loading}
                />
                <Pressable onPress={() => setShowCurrent(!showCurrent)}>
                  <Feather 
                    name={showCurrent ? 'eye' : 'eye-off'} 
                    size={20} 
                    color="#999" 
                  />
                </Pressable>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password (min. 8 characters)"
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!loading}
                />
                <Pressable onPress={() => setShowNew(!showNew)}>
                  <Feather 
                    name={showNew ? 'eye' : 'eye-off'} 
                    size={20} 
                    color="#999" 
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!loading}
                />
                <Pressable onPress={() => setShowConfirm(!showConfirm)}>
                  <Feather 
                    name={showConfirm ? 'eye' : 'eye-off'} 
                    size={20} 
                    color="#999" 
                  />
                </Pressable>
              </View>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorAlert}>
                <Feather name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Success Message */}
            {success && (
              <View style={styles.successAlert}>
                <Feather name="check-circle" size={18} color="#22c55e" />
                <Text style={styles.successText}>Password changed successfully!</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonGroup}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowPasswordForm(false);
                  reset();
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Change Password</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Additional Settings Sections can be added here */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  section: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionButton: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionButtonText: {
    marginLeft: 12,
    flex: 1,
  },
  sectionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sectionButtonSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  form: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    color: '#dc2626',
    fontSize: 14,
    flex: 1,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    marginLeft: 8,
    color: '#16a34a',
    fontSize: 14,
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#6366f1',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default Settings;
