import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api';

export const usePassengerFAQ = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const [faqs, setFaqs] = useState<any[]>([]);

  const submitFAQ = useCallback(
    async (
      name: string,
      phoneNumber: string,
      email: string,
      title: string,
      message: string
    ) => {
      setSubmitting(true);
      setError(null);

      try {
        const token = await AsyncStorage.getItem('authToken');

        const response = await apiClient.post(
          '/faq/submit',
          {
            name,
            phoneNumber,
            email,
            title,
            message,
            role: 'passenger',
          }
        );


        if (response.data.success) {
          return {
            success: true,
            message: response.data.message,
            faqId: response.data.faq?.faqId,
          };
        }

        return {
          success: false,
          message: 'Failed to submit FAQ',
        };
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.message ||
          'Failed to submit FAQ';

        setError(errorMsg);

        console.error(
          'FAQ Submission Error:',
          err
        );

        return {
          success: false,
          message: errorMsg,
        };
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const getUserFAQs = useCallback(
    async (page = 1, limit = 10) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get(
          `/faq/user?page=${page}&limit=${limit}`
        );

        if (response.data.success) {
          setFaqs(response.data.data || []);

          return {
            success: true,
            data: response.data.data,
            pagination:
              response.data.pagination,
          };
        }

        return {
          success: false,
          message: 'Unexpected response',
        };
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.message ||
          'Failed to fetch FAQs';

        setError(errorMsg);

        console.error(
          'Get FAQs Error:',
          err
        );

        return {
          success: false,
          message: errorMsg,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    submitting,
    error,
    faqs,
    submitFAQ,
    getUserFAQs,
  };
};
