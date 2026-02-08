import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { drivers } from '../data/dummyData';
import { SearchBar, Card, StatusBadge } from '../../components/ui';

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
              <Card key={driver._id} padding="md" style={[styles.driverCard, index < 3 && styles.topRank].filter(Boolean)}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverRating}>⭐ {driver.rating.toFixed(1)}</Text>
                </View>
                <StatusBadge label={`${driver.totalReviews} Rides`} variant="info" />
              </Card>
            ))}
          </ScrollView>
        </View>

        {/* RIGHT PANE — LATEST REVIEWS */}
        <View style={styles.rightPane}>
          <Text style={styles.sectionTitle}>🗒️ Latest Reviews</Text>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search reviews..."
            onClear={() => setQuery('')}
          />
          <ScrollView showsVerticalScrollIndicator={false}>
            {sortedReviews.map((review, index) => (
              <Card key={index} padding="md" style={styles.reviewCard}>
                <Text style={styles.reviewDriver}>{review.driverName}</Text>
                <Text style={styles.reviewText}>"{review.comment}"</Text>
                <Text style={styles.reviewerName}>— {review.passengerName || 'Anonymous'}</Text>
                <View style={styles.reviewFooter}>
                  <StatusBadge label={`⭐ ${review.rating}`} variant="info" />
                  <Text style={styles.dateText}>{formatDate(review.date)}</Text>
                </View>
              </Card>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  leftPane: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    height: 560,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  rightPane: {
    width: 360,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    height: 560,
  },
  reviewCard: {
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
  dateText: {
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default Analytics;
