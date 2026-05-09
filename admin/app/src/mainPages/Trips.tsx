import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card, StatusBadge } from '../../components/ui';
import { getAllTrips, getTripById, type TripListItem, type TripDetails } from '../services/tripService';

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

const formatTime = (timeString: string | undefined) => {
  if (!timeString) return 'N/A';
  // Handle HH:MM format
  if (timeString.includes(':') && timeString.length === 5) {
    return timeString;
  }
  // Handle ISO date format
  return new Date(timeString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

interface SelectedTrip extends TripDetails {
  _id?: string;
}

interface ImageViewerState {
  visible: boolean;
  imageUrl: string | null;
}

export default function Trips() {
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<SelectedTrip | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [imageViewer, setImageViewer] = useState<ImageViewerState>({ visible: false, imageUrl: null });

  const fetchTrips = async () => {
    setLoading(true);
    const data = await getAllTrips({
      status: statusFilter || undefined,
    });
    setTrips(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrips();
  }, [statusFilter]);

  const handleViewDetails = async (trip: TripListItem) => {
    setDetailsLoading(true);
    const details = await getTripById(trip.tripId);
    if (details) {
      setSelectedTrip(details);
    }
    setDetailsLoading(false);
  };

  const filteredTrips = trips.filter((trip) =>
    trip.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trip.driverName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-progress':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'missed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
        case 'in-progress':
        return 'info';
        case 'completed':
        return 'success';
        case 'missed':
        return 'danger';  // Changed from 'error'
        default:
        return 'warning';
    }
    };

  return (
    <View style={styles.container}>
      {/* Header with Search and Filters */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by route, bus, driver..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View style={styles.filterButtons}>
          <Pressable
            style={[styles.filterBtn, statusFilter === '' && styles.filterBtnActive]}
            onPress={() => setStatusFilter('')}
          >
            <Text style={[styles.filterBtnText, statusFilter === '' && styles.filterBtnTextActive]}>
              All
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterBtn, statusFilter === 'in-progress' && styles.filterBtnActive]}
            onPress={() => setStatusFilter('in-progress')}
          >
            <Text style={[styles.filterBtnText, statusFilter === 'in-progress' && styles.filterBtnTextActive]}>
              In Progress
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterBtn, statusFilter === 'completed' && styles.filterBtnActive]}
            onPress={() => setStatusFilter('completed')}
          >
            <Text style={[styles.filterBtnText, statusFilter === 'completed' && styles.filterBtnTextActive]}>
              Completed
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterBtn, statusFilter === 'missed' && styles.filterBtnActive]}
            onPress={() => setStatusFilter('missed')}
          >
            <Text style={[styles.filterBtnText, statusFilter === 'missed' && styles.filterBtnTextActive]}>
              Missed
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Trips List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : filteredTrips.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No trips found</Text>
          </View>
        ) : (
          <View style={styles.tripsList}>
            {filteredTrips.map((trip) => (
              <Pressable
                key={trip.tripId}
                onPress={() => handleViewDetails(trip)}
                style={({ pressed }) => [
                  styles.tripCard,
                  pressed && styles.tripCardPressed
                ]}
              >
                <Card padding="md">
                    <View style={styles.tripHeader}>
                      <View style={styles.tripHeaderLeft}>
                        <View style={styles.headerTopRow}>
                          {((trip as any).driverProfileImgUrl || (trip as any).driverAvatar) ? (
                            <Image source={{ uri: (trip as any).driverProfileImgUrl || (trip as any).driverAvatar }} style={styles.smallAvatar} />
                          ) : (
                            <View style={styles.smallAvatarFallback}><Text style={{fontWeight:'700'}}>{(trip.driverName||'').split(' ').map(s=>s[0]).slice(0,2).join('')}</Text></View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.routeName}>{trip.routeName}</Text>
                            <Text style={styles.metaTextSmall}>{trip.driverName} • {trip.busNumber}</Text>
                          </View>
                        </View>
                      </View>
                      <StatusBadge label={trip.status} variant={getStatusBadgeVariant(trip.status)} />
                    </View>

                  <View style={styles.tripDetails}>
                    <View style={styles.detailRow}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Passengers</Text>
                        <Text style={styles.detailValue}>{trip.passengerCount}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Bookings</Text>
                        <Text style={styles.detailValue}>{trip.bookingCount}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Total Seats</Text>
                        <Text style={styles.detailValue}>{trip.totalSeats}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Delay</Text>
                        <Text style={[styles.detailValue, trip.delayMinutes > 0 && { color: '#ef4444' }]}>
                          {trip.delayMinutes}m
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tripTime}>
                      <Feather name="clock" size={14} color="#6b7280" />
                      <Text style={styles.timeText}>{formatDate(trip.startTime)}</Text>
                    </View>
                  </View>

                  <View style={styles.viewDetailsBtn}>
                    <Text style={styles.viewDetailsBtnText}>View Details →</Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Trip Details Modal */}
      <Modal
        visible={selectedTrip !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTrip(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trip Details</Text>
              <Pressable
                onPress={() => setSelectedTrip(null)}
                style={styles.closeBtn}
              >
                <Feather name="x" size={24} color="#111827" />
              </Pressable>
            </View>

            {detailsLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#10b981" />
              </View>
            ) : selectedTrip ? (
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {/* Beautiful Hero Header */}
                <View style={styles.heroHeader}>
                  <View style={styles.heroGradient}>
                    <View style={styles.heroContent}>
                      <View style={styles.heroTop}>
                        <View style={styles.heroLeft}>
                          <Text style={styles.heroRoute}>{selectedTrip.route.startingStop}</Text>
                          <Text style={styles.heroArrow}>↓</Text>
                          <Text style={styles.heroRoute}>{selectedTrip.route.endingStop}</Text>
                        </View>
                        {selectedTrip.driver?.profileImgUrl ? (
                          <Image source={{ uri: selectedTrip.driver.profileImgUrl }} style={styles.heroAvatar} />
                        ) : (
                          <View style={styles.heroAvatarFallback}>
                            <Text style={styles.heroAvatarText}>{(selectedTrip.driver?.name||'').split(' ').map(s=>s[0]).slice(0,2).join('')}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.heroInfo}>
                        <Text style={styles.heroDriver}>{selectedTrip.driver.name}</Text>
                        <Text style={styles.heroBus}>{selectedTrip.bus.busNumber} • {selectedTrip.bus.capacity} seats</Text>
                      </View>
                    </View>
                    <StatusBadge label={selectedTrip.status} variant={getStatusBadgeVariant(selectedTrip.status)} />
                  </View>
                </View>

                {/* Driver & Bus Info Cards */}
                <View style={styles.cardsRow}>
                  <View style={styles.infoCard}>
                    <View style={styles.cardIcon}><Text style={styles.cardIconText}>🚌</Text></View>
                    <Text style={styles.cardLabel}>Bus</Text>
                    <Text style={styles.cardValue}>{selectedTrip.bus.busNumber}</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <View style={styles.cardIcon}><Text style={styles.cardIconText}>👤</Text></View>
                    <Text style={styles.cardLabel}>Driver</Text>
                    <Text style={styles.cardValue} numberOfLines={1}>{(selectedTrip.driver.name || '').split(' ')[0]}</Text>
                  </View>
                  <View style={styles.infoCard}>
                    <View style={styles.cardIcon}><Text style={styles.cardIconText}>📱</Text></View>
                    <Text style={styles.cardLabel}>Phone</Text>
                    <Text style={styles.cardValue}>{selectedTrip.driver.phone.slice(-4)}</Text>
                  </View>
                </View>

                {/* Timeline Section */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>⏱️</Text>
                    <Text style={styles.sectionTitle}>Timeline</Text>
                  </View>
                  <View style={styles.timelineContainer}>
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineMarker}><View style={styles.timelineDot} /></View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Scheduled Start</Text>
                        <Text style={styles.timelineValue}>{formatTime(selectedTrip.times.scheduledStart)}</Text>
                      </View>
                    </View>
                    <View style={styles.timelineConnector} />
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineMarker}><View style={styles.timelineDot} /></View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Actual Start</Text>
                        <Text style={styles.timelineValue}>{formatDate(selectedTrip.times.actualStart)}</Text>
                      </View>
                    </View>
                    <View style={styles.timelineConnector} />
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineMarker}><View style={styles.timelineDot} /></View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Scheduled End</Text>
                        <Text style={styles.timelineValue}>{formatTime(selectedTrip.times.scheduledEnd)}</Text>
                      </View>
                    </View>
                    <View style={styles.timelineConnector} />
                    <View style={styles.timelineItem}>
                      <View style={styles.timelineMarker}><View style={[styles.timelineDot, { backgroundColor: selectedTrip.times.actualEnd === 'N/A' ? '#e5e7eb' : '#10b981' }]} /></View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineLabel}>Actual End</Text>
                        <Text style={styles.timelineValue}>{formatDate(selectedTrip.times.actualEnd)}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Metrics Grid */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>📊</Text>
                    <Text style={styles.sectionTitle}>Trip Metrics</Text>
                  </View>
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCardLarge}>
                      <Text style={styles.metricCardLabel}>Passengers</Text>
                      <Text style={styles.metricCardValue}>{selectedTrip.metrics.passengerCount}</Text>
                      <View style={[styles.metricCardBar, { backgroundColor: '#3b82f6' }]} />
                    </View>
                    <View style={styles.metricCardLarge}>
                      <Text style={styles.metricCardLabel}>Seats Used</Text>
                      <Text style={styles.metricCardValue}>{selectedTrip.metrics.totalSeats}</Text>
                      <View style={[styles.metricCardBar, { backgroundColor: '#8b5cf6' }]} />
                    </View>
                    <View style={styles.metricCardLarge}>
                      <Text style={styles.metricCardLabel}>Total Fare</Text>
                      <Text style={styles.metricCardValue}>₹{selectedTrip.metrics.totalFare.toFixed(0)}</Text>
                      <View style={[styles.metricCardBar, { backgroundColor: '#10b981' }]} />
                    </View>
                    <View style={styles.metricCardLarge}>
                      <Text style={styles.metricCardLabel}>Paid</Text>
                      <Text style={[styles.metricCardValue, { color: '#10b981' }]}>{selectedTrip.metrics.paidBookings}</Text>
                      <View style={[styles.metricCardBar, { backgroundColor: '#10b981' }]} />
                    </View>
                    <View style={styles.metricCardLarge}>
                      <Text style={styles.metricCardLabel}>Pending</Text>
                      <Text style={[styles.metricCardValue, { color: '#f59e0b' }]}>{selectedTrip.metrics.pendingPayments}</Text>
                      <View style={[styles.metricCardBar, { backgroundColor: '#f59e0b' }]} />
                    </View>
                    <View style={styles.metricCardLarge}>
                      <Text style={styles.metricCardLabel}>Delay</Text>
                      <Text style={[styles.metricCardValue, { color: selectedTrip.times.delayMinutes > 0 ? '#ef4444' : '#10b981' }]}>{selectedTrip.times.delayMinutes}m</Text>
                      <View style={[styles.metricCardBar, { backgroundColor: selectedTrip.times.delayMinutes > 0 ? '#ef4444' : '#10b981' }]} />
                    </View>
                  </View>
                </View>

                {/* Passengers Section */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionIcon}>👥</Text>
                    <Text style={styles.sectionTitle}>Passengers ({selectedTrip.bookings.length})</Text>
                  </View>
                  
                  {selectedTrip.bookings.length === 0 ? (
                    <Text style={styles.noBookingsText}>No bookings for this trip</Text>
                  ) : (
                    <>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
                        <View style={{flexDirection:'row', gap:8}}>
                          {selectedTrip.bookings.map((b, i) => {
                            const avatar = (b as any).passengerProfileImgUrl || (b as any).profileImgUrl;
                            return (
                              <View key={i} style={{alignItems:'center', width:80}}>
                                {avatar ? (
                                  <Image source={{ uri: avatar }} style={styles.passengerAvatar} />
                                ) : (
                                  <View style={styles.passengerAvatarFallback}><Text style={{fontWeight:'700'}}>{(b.passengerName||'').split(' ').map(s=>s[0]).slice(0,2).join('')}</Text></View>
                                )}
                                <Text numberOfLines={1} style={{fontSize:11, color:'#374151', marginTop:6, textAlign:'center'}}>{b.passengerName}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookingsTable}>
                        <View style={styles.table}>
                          <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Code</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Passenger</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Seats</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>From</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>To</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Fare</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Payment</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Status</Text>
                          </View>

                          {selectedTrip.bookings.map((booking, idx) => (
                            <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                              <Text style={[styles.tableCell, { flex: 1.5 }]}>{booking.bookingCode}</Text>
                              <Text style={[styles.tableCell, { flex: 2 }]}>{booking.passengerName}</Text>
                              <Text style={[styles.tableCell, { flex: 1.2 }]}>{booking.seats}</Text>
                              <Text style={[styles.tableCell, { flex: 1.5 }]}>{booking.boardingStop}</Text>
                              <Text style={[styles.tableCell, { flex: 1.5 }]}>{booking.alightingStop}</Text>
                              <Text style={[styles.tableCell, { flex: 1 }]}>₹{booking.fare}</Text>
                              <View style={[styles.tableCell, { flex: 1.2, alignItems: 'center' }]}>
                                <StatusBadge 
                                  label={booking.paymentStatus} 
                                  variant={booking.paymentStatus === 'paid' ? 'success' : 'warning'}
                                />
                              </View>
                              <View style={[styles.tableCell, { flex: 1.2, alignItems: 'center' }]}>
                                <StatusBadge 
                                  label={booking.bookingStatus} 
                                  variant={booking.bookingStatus === 'completed' ? 'success' : booking.bookingStatus === 'cancelled' ? 'danger' : 'info'}
                                />
                              </View>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </>
                  )}
                </View>

                <View style={styles.modalBottomPadding} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewer.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewer({ visible: false, imageUrl: null })}
      >
        <View style={styles.imageViewerContainer}>
          <Pressable
            style={styles.imageViewerClose}
            onPress={() => setImageViewer({ visible: false, imageUrl: null })}
          >
            <Feather name="x" size={28} color="#fff" />
          </Pressable>
          {imageViewer.imageUrl && (
            <Image
              source={{ uri: imageViewer.imageUrl }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  filterBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  filterBtnText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  smallAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8, backgroundColor: '#f3f4f6' },
  smallAvatarFallback: { width: 40, height: 40, borderRadius: 20, marginRight: 8, backgroundColor: '#e5e7eb', alignItems:'center', justifyContent:'center' },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaTextSmall: { fontSize: 12, color: '#6b7280' },
  passengerAvatar: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#f3f4f6' },
  passengerAvatarFallback: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems:'center', justifyContent:'center' },
  tripsList: {
    gap: 12,
  },
  tripCard: {
    marginBottom: 0,
  },
  tripCardPressed: {
    opacity: 0.7,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripHeaderLeft: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  tripMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  tripDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  tripTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  viewDetailsBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  viewDetailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: Platform.OS === 'web' ? 0 : 60,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 12,
    gap: 16,
  },
  tripHeaderSection: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  heroHeader: {
    marginHorizontal: -12,
    marginTop: -12,
    marginBottom: 16,
  },
  heroGradient: {
    backgroundColor: '#0f172a',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroContent: {
    marginBottom: 12,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroLeft: {
    flex: 1,
  },
  heroRoute: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 22,
  },
  heroArrow: {
    fontSize: 14,
    color: '#60a5fa',
    fontWeight: '700',
    marginVertical: 4,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#60a5fa',
    backgroundColor: '#f3f4f6',
  },
  heroAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#60a5fa',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#60a5fa',
  },
  heroAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  heroInfo: {
    marginTop: 8,
  },
  heroDriver: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  heroBus: {
    fontSize: 13,
    color: '#d1d5db',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  cardIconText: {
    fontSize: 24,
  },
  cardLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  timelineContainer: {
    paddingLeft: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineMarker: {
    width: 32,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 3,
    borderColor: '#fff',
  },
  timelineConnector: {
    position: 'absolute',
    left: 17,
    top: 32,
    width: 2,
    height: 28,
    backgroundColor: '#cbd5e1',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 8,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  timelineValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCardLarge: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricCardLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  metricCardBar: {
    height: 4,
    borderRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 18,
  },
  licenseImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  licenseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
  },
  imageViewerImage: {
    width: '90%',
    height: '80%',
  },
  sectionBlock: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  metricsCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  licenseImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  bookingsTable: {
    marginTop: 12,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#111827',
  },
  noBookingsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalBottomPadding: {
    height: 32,
  },
});
