import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { usePassenger } from '../context/PassengerContext';
import { useAuth } from '@/app/context/AuthContext';
import { usePassengerFAQ } from '../hooks/useFAQ';

export default function FAQScreen() {
  const router = useRouter();

  const { profile } = usePassenger();

  const { user, token } = useAuth();

  const {
    submitFAQ,
    submitting,
    error: hookError,
    getUserFAQs,
    faqs,
    loading,
  } = usePassengerFAQ();

  const [activeTab, setActiveTab] = useState<'submit' | 'view'>(
    'submit'
  );

  const [name, setName] = useState<string>(
    profile?.name
      ? profile.name
      : user?.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : ''
  );

  const [phoneNumber, setPhoneNumber] = useState<string>(
    profile?.phone || user?.phoneNumber || ''
  );

  const [email, setEmail] = useState<string>(
    user?.email || profile?.email || ''
  );

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'view' && token) {
      getUserFAQs();
    } else if (activeTab === 'view' && !token) {
    }
  }, [activeTab, token, getUserFAQs]);

  const handleSubmit = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!title.trim()) {
      setError('Please enter FAQ title');
      return;
    }

    if (!message.trim()) {
      setError('Please enter your message');
      return;
    }

    const result = await submitFAQ(
      name.trim(),
      phoneNumber.trim(),
      email.trim(),
      title.trim(),
      message.trim()
    );

    if (result && result.success) {
      Alert.alert('✅ Success', result.message, [
        {
          text: 'OK',
          onPress: () => {
            setTitle('');
            setMessage('');

            setName(
              profile?.name
                ? profile.name
                : user?.firstName
                ? `${user.firstName} ${
                    user.lastName || ''
                  }`.trim()
                : ''
            );

            setPhoneNumber(
              profile?.phone || user?.phoneNumber || ''
            );

            setEmail(
              user?.email || profile?.email || ''
            );
          },
        },
      ]);
    } else {
      setError(
        result?.message || 'Failed to submit FAQ'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[ 'top' ]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color="#1f2937"
            />
          </Pressable>

          <Text style={styles.headerTitle}>
            Help & Support
          </Text>

          <View style={{ width: 24 }} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'submit' &&
                styles.activeTab,
            ]}
            onPress={() => setActiveTab('submit')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'submit' &&
                  styles.activeTabText,
              ]}
            >
              Submit FAQ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'view' &&
                styles.activeTab,
            ]}
            onPress={() => setActiveTab('view')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'view' &&
                  styles.activeTabText,
              ]}
            >
              My FAQs
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'submit' ? (
            <View style={styles.formContainer}>
              {(error || hookError) && (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color="#dc2626"
                  />

                  <Text style={styles.errorText}>
                    {error || hookError}
                  </Text>
                </View>
              )}

              <View style={styles.infoBox}>
                <Ionicons
                  name="information-circle"
                  size={20}
                  color="#3b82f6"
                />

                <Text style={styles.infoText}>
                  Share your questions or concerns
                  with us. Our support team will
                  review and respond shortly.
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Full Name
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  value={name}
                  onChangeText={setName}
                  editable={!submitting}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Phone Number
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Your phone number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  editable={!submitting}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Email
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  editable={!submitting}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  FAQ Title
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="e.g., How to cancel booking?"
                  value={title}
                  onChangeText={setTitle}
                  editable={!submitting}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Message
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    styles.messageInput,
                  ]}
                  placeholder="Describe your issue..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  editable={!submitting}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="send"
                      size={18}
                      color="#fff"
                    />

                    <Text
                      style={
                        styles.submitButtonText
                      }
                    >
                      Submit FAQ
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.viewFAQContainer}>
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="#3b82f6"
                />
              ) : faqs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="clipboard-outline"
                    size={48}
                    color="#d1d5db"
                  />

                  <Text
                    style={
                      styles.emptyStateTitle
                    }
                  >
                    No FAQs Yet
                  </Text>

                  <Text
                    style={
                      styles.emptyStateText
                    }
                  >
                    Your submitted FAQs will
                    appear here.
                  </Text>
                </View>
              ) : (
                <View style={styles.faqList}>
                  {faqs.map((faq: any) => (
                    <View
                      key={faq._id}
                      style={styles.faqCard}
                    >
                      <View
                        style={
                          styles.faqHeader
                        }
                      >
                        <Text
                          style={
                            styles.faqTitle
                          }
                        >
                          {faq.title}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            faq.status ===
                            'resolved'
                              ? styles.statusResolved
                              : faq.status ===
                                'pending'
                              ? styles.statusPending
                              : styles.statusOpen,
                          ]}
                        >
                          <Text
                            style={
                              styles.statusText
                            }
                          >
                            {faq.status ||
                              'submitted'}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.faqMessage
                        }
                      >
                        {faq.message}
                      </Text>

                      <Text
                        style={styles.faqDate}
                      >
                        {new Date(
                          faq.createdAt
                        ).toLocaleDateString()}
                      </Text>

                      {faq.response && (
                        <View
                          style={
                            styles.responseBox
                          }
                        >
                          <Text
                            style={
                              styles.responseLabel
                            }
                          >
                            Admin Response
                          </Text>

                          <Text
                            style={
                              styles.responseText
                            }
                          >
                            {faq.response}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  backButton: {
    padding: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },

  activeTab: {
    borderBottomColor: '#3b82f6',
  },

  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },

  activeTabText: {
    color: '#3b82f6',
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },

  formContainer: {
    gap: 16,
  },

  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
  },

  errorText: {
    color: '#991b1b',
    fontSize: 14,
    flex: 1,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    gap: 12,
    alignItems: 'flex-start',
  },

  infoText: {
    color: '#1e40af',
    fontSize: 14,
    flex: 1,
  },

  formGroup: {
    gap: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    color: '#1f2937',
    fontSize: 14,
  },

  messageInput: {
    minHeight: 140,
    paddingTop: 12,
  },

  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  viewFAQContainer: {
    flex: 1,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },

  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },

  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },

  faqList: {
    gap: 16,
  },

  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  faqTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 10,
  },

  faqMessage: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },

  faqDate: {
    marginTop: 12,
    fontSize: 12,
    color: '#9ca3af',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  statusOpen: {
    backgroundColor: '#dbeafe',
  },

  statusPending: {
    backgroundColor: '#fef3c7',
  },

  statusResolved: {
    backgroundColor: '#dcfce7',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  responseBox: {
    marginTop: 14,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },

  responseLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },

  responseText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
