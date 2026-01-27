import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePassenger, type Booking, type Review } from '../context/PassengerContext';
import { mockBusesData, mockRoutesData } from "../utils/mockData";

const ReviewPage = () => {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();
  const { bookings, addReview } = usePassenger();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [categories, setCategories] = useState({
    cleanliness: 0,
    drivingSkill: 0,
    comfort: 0,
    timelinessCount: 0,
  });

  const booking = bookings.find(b => b.id === bookingId);
  const bus = booking ? mockBusesData.find(b => b.id === booking.busId) : null;
  const route = booking ? mockRoutesData.find(r => r.id === booking.routeId) : null;

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert('Required', 'Please provide an overall rating');
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert('Required', 'Please provide at least 10 characters for your review');
      return;
    }

    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const newReview: Review = {
        id: `review_${Date.now()}`,
        bookingId: booking!.id,
        busId: bus!.id,
        rating,
        comment,
        date: new Date().toISOString(),
        categories,
      };

      addReview(newReview);
      setSubmitted(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (currentRating: number, onRate: (rating: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <TouchableOpacity
            key={star}
            onPress={() => onRate(star)}
            style={styles.starWrapper}
          >
            <Ionicons
              name={star <= currentRating ? 'star' : 'star-outline'}
              size={40}
              color={star <= currentRating ? '#f59e0b' : '#d1d5db'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!booking || !bus || !route) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('../(tabs)/bookings')}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thank You!</Text>
        </View>

        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#10b981" />
          </View>

          <Text style={styles.successTitle}>Review Submitted!</Text>
          <Text style={styles.successSubtitle}>
            Thank you for your feedback. Your review helps us improve our services.
          </Text>

          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Your Rating</Text>
              <View style={styles.ratingDisplay}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < rating ? 'star' : 'star-outline'}
                    size={20}
                    color={i < rating ? '#f59e0b' : '#d1d5db'}
                  />
                ))}
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bus</Text>
              <Text style={styles.summaryValue}>{bus.busNumber}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Route</Text>
              <Text style={styles.summaryValue}>{route.name}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push('../(tabs)/bookings')}
          >
            <Text style={styles.continueButtonText}>Back to Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave a Review</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trip Info */}
        <View style={styles.tripInfo}>
          <View style={styles.tripIconContainer}>
            <Ionicons name="bus" size={32} color="#3b82f6" />
          </View>
          <View style={styles.tripInfoContent}>
            <Text style={styles.tripBusNumber}>{bus.busNumber}</Text>
            <Text style={styles.tripRoute}>{route.name}</Text>
          </View>
        </View>

        {/* Overall Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Rating</Text>
          <Text style={styles.ratingSubtitle}>How was your experience?</Text>

          {renderStars(rating, setRating)}

          <Text style={styles.ratingLabel}>
            {rating === 0
              ? 'Select a rating'
              : rating === 1
              ? 'Poor'
              : rating === 2
              ? 'Fair'
              : rating === 3
              ? 'Good'
              : rating === 4
              ? 'Very Good'
              : 'Excellent'}
          </Text>
        </View>

        {/* Category Ratings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate Categories</Text>

          {[
            { key: 'cleanliness', label: 'Cleanliness', icon: 'water' },
            { key: 'drivingSkill', label: 'Driving Skill', icon: 'speedometer' },
            { key: 'comfort', label: 'Comfort', icon: 'bed' },
            { key: 'timelinessCount', label: 'On-Time Arrival', icon: 'timer' },
          ].map(category => (
            <View key={category.key} style={styles.categoryRating}>
              <View style={styles.categoryLabel}>
                <Ionicons name={category.icon as any} size={18} color="#3b82f6" />
                <Text style={styles.categoryName}>{category.label}</Text>
              </View>
              <View style={styles.categoryStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() =>
                      setCategories({
                        ...categories,
                        [category.key]: star,
                      } as typeof categories)
                    }
                  >
                    <Ionicons
                      name={star <= categories[category.key as keyof typeof categories] ? 'star' : 'star-outline'}
                      size={24}
                      color={star <= categories[category.key as keyof typeof categories] ? '#f59e0b' : '#d1d5db'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Review Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Review</Text>
          <Text style={styles.commentLabel}>
            Share your experience (minimum 10 characters)
          </Text>

          <TextInput
            style={styles.commentInput}
            placeholder="Tell us about your journey, the driver, the bus condition, and anything else you'd like to share..."
            placeholderTextColor="#d1d5db"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Text style={styles.characterCount}>
            {comment.length} / 500 characters
          </Text>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Tips for a helpful review</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Be honest and specific about your experience</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Mention both positive and negative aspects</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>Help other passengers make better decisions</Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.submitFooter}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmitReview}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#ffffff" />
              <Text style={styles.submitButtonText}>Submit Review</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tripInfo: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tripIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tripInfoContent: {
    flex: 1,
  },
  tripBusNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  tripRoute: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  ratingSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  starWrapper: {
    marginHorizontal: 8,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 12,
  },
  categoryRating: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  categoryStars: {
    flexDirection: 'row',
  },
  commentLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#1f2937',
    minHeight: 120,
  },
  characterCount: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'right',
  },
  tipsSection: {
    backgroundColor: '#fef3c7',
    marginHorizontal: 12,
    marginVertical: 12,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 12,
    color: '#92400e',
    marginRight: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
  },
  submitFooter: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  successContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  summaryBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  ratingDisplay: {
    flexDirection: 'row',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ReviewPage;
