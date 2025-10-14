import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput } from 'react-native';
import { drivers } from '../data/dummyData';

const Analytics = () => {
    const [query, setQuery] = React.useState<string>('');
    
    const filteredDrivers = useMemo(() => {
        const q = query.trim().toLowerCase(); 
        if (!q) return drivers;
        return drivers.filter(driver => 
            driver.name.toLowerCase().includes(q) ||
            driver.reviews.some(review => 
                review.comment.toLowerCase().includes(q) || 
                review.passengerName.toLowerCase().includes(q) ||
                review.date.toLowerCase().includes(q)
            )
        );
    }, [query]);
  // Sort drivers by rating (high → low)
  const sortedDrivers = [...drivers].sort((a, b) => b.rating - a.rating);

  // Collect all reviews from all drivers
  const allReviews = filteredDrivers.flatMap((driver) =>
    driver.reviews.map((review) => ({
      ...review,
      driverName: driver.name,
      driverId: driver._id,
    }))
  );

  // Sort reviews by date (newest → oldest)
  const sortedReviews = allReviews.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Helper function to format review date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', options);
  };

  return (
    <View style={styles.container}>
      <View style={styles.splitRow}>
        {/* LEFT PANE — DRIVER LEADERBOARD */}
        <View style={styles.leftPane}>
          <Text style={styles.sectionTitle}>🏆 Driver Leaderboard</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {sortedDrivers.map((driver, index) => (
              <View key={driver._id} style={[styles.card, index < 3 && styles.topRank]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverRating}>⭐ {driver.rating.toFixed(1)}</Text>
                </View>
                <View style={styles.rideBadge}>
                  <Text style={styles.rideText}>{driver.totalReviews} Rides</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* RIGHT PANE — LATEST REVIEWS */}
        <View style={styles.rightPane}>
          <Text style={styles.sectionTitle}>🗒️ Latest Reviews</Text>
            <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search reviews..."
                placeholderTextColor="#9ca3af"
            />
          <ScrollView showsVerticalScrollIndicator={false}>
            {sortedReviews.map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <Text style={styles.reviewDriver}>{review.driverName}</Text>
                <Text style={styles.reviewText}>"{review.comment}"</Text>
                <Text style={styles.reviewerName}>— {review.passengerName || 'Anonymous'}</Text>
                <View style={styles.reviewFooter}>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>⭐ {review.rating}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(review.date)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 16,
  },

  // Left Pane (Leaderboard)
  leftPane: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    height: 560,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  topRank: {
    backgroundColor: '#ecfdf5',
  },
  rankBadge: {
    backgroundColor: '#10b981',
    borderRadius: 50,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  driverName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
  },
  driverRating: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 2,
  },
  rideBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rideText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  // Right Pane (Reviews)
  rightPane: {
    width: 360,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    height: 560,
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  reviewDriver: {
    fontWeight: '700',
    fontSize: 15,
    color: '#111827',
  },
  reviewText: {
    fontStyle: 'italic',
    color: '#374151',
    marginTop: 6,
  },
  reviewerName: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
  },
  reviewFooter: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  ratingText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  dateText: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  searchInput:{ marginBottom: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, color: '#111827' },

});

export default Analytics;
