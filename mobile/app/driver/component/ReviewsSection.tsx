import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';

const reviews = [
  {
    id: 1,
    name: 'Sarah M.',
    rating: 5,
    comment: 'Excellent driver, very professional and on time.',
    date: '2 days ago',
  },
  {
    id: 2,
    name: 'John D.',
    rating: 4.5,
    comment: 'Great service, would ride again.',
    date: '1 week ago',
  },
  {
    id: 3,
    name: 'Emma L.',
    rating: 5,
    comment: 'Very safe and comfortable ride.',
    date: '2 weeks ago',
  },
];

export default function ReviewsSection() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Reviews</Text>
      {reviews.map((review) => (
        <View key={review.id} style={[styles.card, shadow.card]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.name}>{review.name}</Text>
              <Text style={styles.date}>{review.date}</Text>
            </View>
            <View style={styles.rating}>
              <Feather name="star" size={16} color="#FCD34D" fill="#FCD34D" />
              <Text style={styles.ratingText}>{review.rating}</Text>
            </View>
          </View>
          <Text style={styles.comment}>{review.comment}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontWeight: '700',
    color: palette.text,
  },
  date: {
    color: palette.muted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  ratingText: {
    fontWeight: '700',
    color: palette.text,
    fontSize: 14,
  },
  comment: {
    color: palette.muted,
    lineHeight: 20,
  },
});

