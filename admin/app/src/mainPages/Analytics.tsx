import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Tabs, Card, StatusBadge, EmptyState, Button, SearchBar } from '../../components/ui';
import Pagination from '../../components/ui/Pagination';
import { useDriver, type AdminReviewItem, type DriverLeaderboardRow } from '../../context/domains';

const Analytics = () => {
  const { width } = useWindowDimensions();
  const { getAllReviews, getDriverLeaderboard } = useDriver();

  const [activeTab, setActiveTab] = useState<'reviews' | 'leaderboard'>('reviews');
  const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<DriverLeaderboardRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [globalAverage, setGlobalAverage] = useState<number>(0);
  const [leaderboardTotal, setLeaderboardTotal] = useState<number>(0);
  const [reviewQuery, setReviewQuery] = useState('');
  const [reviewPage, setReviewPage] = useState(1);
  const [leaderPage, setLeaderPage] = useState(1);
  const REVIEWS_PER_PAGE = 12;
  const LEADERS_PER_PAGE = 10;
  const isWide = width >= 900;

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);
      setReviewPage(1);
      const res = await getAllReviews({ limit: 100, sort: 'desc' });
      setReviews(res.reviews || []);
    } catch (err: any) {
      setReviewsError(err?.response?.data?.message || 'Failed to load reviews');
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      setLeaderPage(1);
      const res = await getDriverLeaderboard({
        limit: 100,
        skip: 0,
        minReviews: 1,
        mode: 'bayesian',
      });
      setLeaderboard(res.leaderboard || []);
      setLeaderboardTotal(res.total || 0);
      setGlobalAverage(res.globalAverage || 0);
    } catch (err: any) {
      setLeaderboardError(err?.response?.data?.message || 'Failed to load leaderboard');
      setLeaderboard([]);
      setLeaderboardTotal(0);
      setGlobalAverage(0);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reviews' && reviews.length === 0) loadReviews();
    if (activeTab === 'leaderboard' && leaderboard.length === 0) loadLeaderboard();
  }, [activeTab]);

  const formatDate = (value?: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getDriverName = (driver: any) => {
    if (!driver || typeof driver === 'string') return 'Unknown Driver';
    return `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || 'Unknown Driver';
  };

  const getPassengerName = (review: AdminReviewItem) => {
    if (!review.passengerId || typeof review.passengerId === 'string') return 'Passenger';
    return `${review.passengerId.firstName || ''} ${review.passengerId.lastName || ''}`.trim() || 'Passenger';
  };

  const getBusNumber = (review: AdminReviewItem) => {
    const booking = review.bookingId;
    if (!booking || typeof booking === 'string') return '-';
    if (booking.busId && typeof booking.busId !== 'string') return booking.busId.busNumber || '-';
    return booking.bus?.busNumber || '-';
  };

  const renderStars = (rating: number) => {
    const filled = Math.max(0, Math.min(5, Math.round(rating)));
    return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
  };

  const filteredReviews = useMemo(() => {
    const q = reviewQuery.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((review) => {
      const driver = review.driverId && typeof review.driverId !== 'string' ? review.driverId : null;
      return (
        getDriverName(driver).toLowerCase().includes(q) ||
        getBusNumber(review).toLowerCase().includes(q)
      );
    });
  }, [reviewQuery, reviews]);

  // Pagination slices
  const reviewTotalPages = Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE);
  const paginatedReviews = filteredReviews.slice(
    (reviewPage - 1) * REVIEWS_PER_PAGE,
    reviewPage * REVIEWS_PER_PAGE
  );

  const leaderTotalPages = Math.ceil(leaderboard.length / LEADERS_PER_PAGE);
  const paginatedLeaderboard = leaderboard.slice(
    (leaderPage - 1) * LEADERS_PER_PAGE,
    leaderPage * LEADERS_PER_PAGE
  );

  const summaryCards = useMemo(() => {
    const topDriver = leaderboard[0];
    const topDriverName = topDriver
      ? `${topDriver.firstName || ''} ${topDriver.lastName || ''}`.trim() || 'Unknown'
      : '—';
    return [
      { label: 'Reviews Loaded', value: String(reviews.length), helper: 'Across all drivers', tone: 'teal' },
      { label: 'Drivers Ranked', value: String(leaderboardTotal), helper: 'Leaderboard entries', tone: 'blue' },
      { label: 'Global Avg Rating', value: globalAverage.toFixed(2), helper: 'Overall review average', tone: 'amber' },
      { label: 'Top Driver', value: topDriver ? `#${topDriver.rank}` : '—', helper: topDriverName, tone: 'slate' },
    ];
  }, [reviews.length, leaderboard, leaderboardTotal, globalAverage]);

  return (
    <View style={styles.container}>
      <View style={styles.headerShell}>
        <Text style={styles.kicker}>Reviews and Driver Ranking</Text>
      </View>

      <Tabs
        tabs={[
          { key: 'reviews', label: 'All Reviews', badge: reviews.length },
          { key: 'leaderboard', label: 'Leaderboard', badge: leaderboard.length },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => {
          setActiveTab(key as 'reviews' | 'leaderboard');
          setReviewPage(1);
          setLeaderPage(1);
        }}
        containerStyle={styles.tabs}
      />

      {activeTab === 'reviews' ? (
        <View style={styles.pageWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionSub}>Newest feedback first, across the full fleet.</Text>
          </View>

          <SearchBar
            value={reviewQuery}
            onChangeText={(v) => { setReviewQuery(v); setReviewPage(1); }}
            placeholder="Search by driver name or bus number"
            onClear={() => { setReviewQuery(''); setReviewPage(1); }}
            showRefresh
            onRefresh={loadReviews}
          />

          {reviewsLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#0f766e" />
              <Text style={styles.centerText}>Loading reviews...</Text>
            </View>
          ) : reviewsError ? (
            <EmptyState
              title="Failed to load reviews"
              description={reviewsError}
              action={<Button variant="primary" onPress={loadReviews}>Retry</Button>}
            />
          ) : filteredReviews.length === 0 ? (
            <EmptyState title="No reviews found" description="There are no driver reviews yet." />
          ) : (
            <>
              <ScrollView style={styles.reviewsScroll} contentContainerStyle={styles.cardGrid}>
                {paginatedReviews.map((review) => {
                  const driver = review.driverId && typeof review.driverId !== 'string' ? review.driverId : null;
                  const busNumber = getBusNumber(review);
                  const reviewCardStyle = isWide ? styles.reviewCardWide : styles.reviewCard;
                  return (
                    <Card key={review._id} padding="sm" style={reviewCardStyle}>
                      <View style={styles.reviewCardTop}>
                        <StatusBadge label={`⭐ ${review.rating.toFixed(1)}`} variant="success" />
                        <Text style={styles.reviewDate}>{formatDate(review.reviewedAt || review.createdAt)}</Text>
                      </View>
                      <Text style={styles.reviewDriver}>{getDriverName(driver)}</Text>
                      <Text style={styles.reviewMeta} numberOfLines={1}>
                        Passenger: {getPassengerName(review)} • Bus: {busNumber}
                      </Text>
                      <Text style={styles.reviewComment} numberOfLines={3}>
                        {review.comment?.trim() || 'No comment provided.'}
                      </Text>
                      <View style={styles.reviewFooter}>
                        <Text style={styles.reviewFooterText}>
                          Booking {review.bookingId && typeof review.bookingId !== 'string'
                            ? review.bookingId.bookingCode || '-'
                            : '-'}
                        </Text>
                        <Text style={styles.starText}>{renderStars(review.rating)}</Text>
                      </View>
                    </Card>
                  );
                })}
              </ScrollView>
              <Pagination
                currentPage={reviewPage}
                totalPages={reviewTotalPages}
                onPageChange={setReviewPage}
              />
            </>
          )}
        </View>
      ) : (
        <View style={styles.pageWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionSub}>Ranked by score, rating strength, and review volume.</Text>
          </View>

          <Card padding="md" style={styles.summaryCard}>
            <View style={styles.summaryGrid}>
              {summaryCards.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.metricCard,
                    item.tone === 'teal' && styles.metricTeal,
                    item.tone === 'blue' && styles.metricBlue,
                    item.tone === 'amber' && styles.metricAmber,
                    item.tone === 'slate' && styles.metricSlate,
                  ]}
                >
                  <Text style={styles.metricLabel}>{item.label}</Text>
                  <Text style={styles.metricValue}>{item.value}</Text>
                  <Text style={styles.metricHelper} numberOfLines={1}>{item.helper}</Text>
                </View>
              ))}
            </View>
          </Card>

          {leaderboardLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#0f766e" />
              <Text style={styles.centerText}>Loading leaderboard...</Text>
            </View>
          ) : leaderboardError ? (
            <EmptyState
              title="Failed to load leaderboard"
              description={leaderboardError}
              action={<Button variant="primary" onPress={loadLeaderboard}>Retry</Button>}
            />
          ) : leaderboard.length === 0 ? (
            <EmptyState title="No leaderboard data" description="Not enough reviews yet to rank drivers." />
          ) : (
            <>
              <ScrollView style={styles.leaderboardScroll} contentContainerStyle={styles.cardGrid}>
                {paginatedLeaderboard.map((row, index) => {
                  const globalIndex = (leaderPage - 1) * LEADERS_PER_PAGE + index;
                  const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown Driver';
                  const highlight = globalIndex < 3;
                  return (
                    <Card
                      key={row.driverId}
                      padding="md"
                      style={highlight ? { ...styles.leaderCard, ...styles.leaderCardTop } : styles.leaderCard}
                    >
                      <View style={styles.leaderTopRow}>
                        <View style={[styles.rankBadge, highlight && styles.rankBadgeTop]}>
                          <Text style={styles.rankText}>#{row.rank}</Text>
                        </View>
                        <View style={styles.leaderNameWrap}>
                          <Text style={styles.leaderName}>{fullName}</Text>
                          <Text style={styles.leaderMeta} numberOfLines={1}>
                            {row.ratingCount} reviews • {row.validationStatus || 'unknown'}
                          </Text>
                        </View>
                        <StatusBadge label={row.averageRating.toFixed(2)} variant="success" />
                      </View>

                      <View style={styles.leaderStatsGrid}>
                        <View style={styles.leaderStatBox}>
                          <Text style={styles.leaderStatLabel}>Average</Text>
                          <Text style={styles.leaderStatValue}>{row.averageRating.toFixed(2)}</Text>
                        </View>
                        <View style={styles.leaderStatBox}>
                          <Text style={styles.leaderStatLabel}>Bayesian</Text>
                          <Text style={styles.leaderStatValue}>
                            {typeof row.bayesianScore === 'number' ? row.bayesianScore.toFixed(3) : '—'}
                          </Text>
                        </View>
                        <View style={styles.leaderStatBox}>
                          <Text style={styles.leaderStatLabel}>Latest review</Text>
                          <Text style={styles.leaderStatValue}>{formatDate(row.latestReviewAt)}</Text>
                        </View>
                      </View>

                      <View style={styles.leaderBottomRow}>
                        <Text style={styles.starText}>{renderStars(row.averageRating)}</Text>
                        <Text style={styles.leaderBottomMeta}>
                          {row.validationStatus || 'unknown'} •{' '}
                          {typeof row.isActive === 'boolean'
                            ? row.isActive ? 'active' : 'inactive'
                            : 'status unknown'}
                        </Text>
                      </View>
                    </Card>
                  );
                })}
              </ScrollView>
              <Pagination
                currentPage={leaderPage}
                totalPages={leaderTotalPages}
                onPageChange={setLeaderPage}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#ffffff' },
  headerShell: { marginBottom: 14 },
  kicker: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  tabs: { marginBottom: 12 },
  summaryCard: { marginBottom: 14 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    minWidth: 150,
    flexGrow: 1,
    flexBasis: '23%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  metricTeal: { backgroundColor: '#f0fdfa', borderColor: '#99f6e4' },
  metricBlue: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  metricAmber: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  metricSlate: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: { marginTop: 6, fontSize: 24, fontWeight: '800', color: '#111827' },
  metricHelper: { marginTop: 4, fontSize: 12, color: '#475569' },
  pageWrap: { flex: 1, gap: 12 },
  reviewsScroll: { flex: 1 },
  leaderboardScroll: { flex: 1 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionSub: { fontSize: 13, color: '#6b7280' },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 260,
  },
  centerText: { color: '#6b7280', fontSize: 14 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  reviewCard: {
    flexBasis: '100%',
    flexGrow: 1,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  reviewCardWide: {
    flexBasis: '49%',
    flexGrow: 1,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  reviewCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  reviewDate: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  reviewDriver: { fontSize: 15, fontWeight: '800', color: '#111827' },
  reviewMeta: { marginTop: 4, color: '#6b7280', fontSize: 11 },
  reviewComment: { marginTop: 8, fontSize: 13, color: '#374151', lineHeight: 18 },
  reviewFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewFooterText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  starText: { color: '#b45309', fontWeight: '800', fontSize: 12, letterSpacing: 0.3 },
  leaderCard: {
    flexBasis: '49%',
    flexGrow: 1,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  leaderCardTop: { borderColor: '#99f6e4', backgroundColor: '#f0fdfa' },
  leaderTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeTop: { backgroundColor: '#065f46' },
  rankText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  leaderNameWrap: { flex: 1 },
  leaderName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  leaderMeta: { marginTop: 4, color: '#6b7280', fontSize: 12 },
  leaderStatsGrid: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  leaderStatBox: {
    flexGrow: 1,
    flexBasis: '31%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  leaderStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  leaderStatValue: { marginTop: 4, fontSize: 14, fontWeight: '800', color: '#111827' },
  leaderBottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  leaderBottomMeta: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
});

export default Analytics;