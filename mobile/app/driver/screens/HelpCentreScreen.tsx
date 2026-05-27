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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDriver } from '../context/AppContext';
import { useDriverFAQ } from '../hooks/useFAQ';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HelpCentreScreen() {
  const router = useRouter();
  const { user } = useDriver();

  const {
    submitFAQ,
    submitting,
    error: hookError,
    getUserFAQs,
    faqs,
    loading,
  } = useDriverFAQ();

  const [activeTab, setActiveTab] = useState<'submit' | 'view'>('submit');

  const [name, setName] = useState(
    user?.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : ''
  );
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'view') {
      getUserFAQs();
    }
  }, [activeTab]);

  const handleSubmit = async () => {
    setError('');

    if (!name.trim()) return setError('Please enter your name');
    if (!phoneNumber.trim()) return setError('Please enter your phone number');
    if (!title.trim()) return setError('Please enter FAQ title');
    if (!message.trim()) return setError('Please enter your message');

    const result = await submitFAQ(
      name.trim(),
      phoneNumber.trim(),
      email.trim(),
      title.trim(),
      message.trim()
    );

    if (result?.success) {
      Alert.alert('✅ Success', result.message, [
        {
          text: 'OK',
          onPress: () => {
            setTitle('');
            setMessage('');
          },
        },
      ]);
    } else {
      setError(result?.message || 'Failed to submit FAQ');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[ 'top' ]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color="#1f2937" />
        </Pressable>

        <Text style={styles.headerTitle}>Help Centre</Text>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'submit' && styles.activeTab]}
          onPress={() => setActiveTab('submit')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'submit' && styles.activeTabText,
            ]}
          >
            Submit Question
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'view' && styles.activeTab]}
          onPress={() => setActiveTab('view')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'view' && styles.activeTabText,
            ]}
          >
            My Questions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'submit' ? (
          <View style={styles.formContainer}>
            {(error || hookError) && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={20} color="#dc2626" />
                <Text style={styles.errorText}>
                  {error || hookError}
                </Text>
              </View>
            )}

            <View style={styles.infoBox}>
              <Feather name="info" size={20} color="#3b82f6" />
              <Text style={styles.infoText}>
                Have a question? Our support team will help you soon.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="Phone number"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email (optional)"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="FAQ title"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                value={message}
                onChangeText={setMessage}
                multiline
                placeholder="Write your issue..."
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    Send Question
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* ================= VIEW TAB ================= */
          <View style={styles.viewFAQContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : faqs.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="help-circle" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>
                  No Questions Yet
                </Text>
                <Text style={styles.emptyStateText}>
                  Your submitted questions will appear here.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.faqList}>
                  {faqs.map((faq: any) => (
                    <View key={faq._id} style={styles.faqCard}>
                      <View style={styles.faqHeader}>
                        <Text style={styles.faqTitle}>
                          {faq.title}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            faq.status === 'resolved'
                              ? styles.statusResolved
                              : faq.status === 'pending'
                              ? styles.statusPending
                              : styles.statusOpen,
                          ]}
                        >
                          <Text style={styles.statusText}>
                            {faq.status || 'submitted'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.faqMessage}>
                        {faq.message}
                      </Text>

                      <Text style={styles.faqDate}>
                        {new Date(faq.createdAt).toLocaleDateString()}
                      </Text>

                      {faq.response && (
                        <View style={styles.responseBox}>
                          <Text style={styles.responseLabel}>
                            Admin Response
                          </Text>
                          <Text style={styles.responseText}>
                            {faq.response}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>
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

  formContainer: {
    padding: 16,
    gap: 16,
  },

  errorBox: {
    flexDirection: 'row',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    gap: 10,
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
    gap: 10,
    alignItems: 'flex-start',
  },

  infoText: {
    color: '#1e40af',
    fontSize: 14,
    flex: 1,
  },

  formGroup: {
    gap: 6,
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
    fontSize: 14,
    color: '#1f2937',
  },

  messageInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },

  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
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
    padding: 16,
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
    marginBottom: 10,
    alignItems: 'center',
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
    marginTop: 10,
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
    marginTop: 12,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },

  responseLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1f2937',
  },

  responseText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
