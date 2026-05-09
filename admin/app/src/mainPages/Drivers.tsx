import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ToastAndroid,
  Platform,
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useDriver, type DriverRecord } from "../../context/domains";
import {
  Tabs,
  SearchBar,
  Table,
  Button,
  Modal,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  type TableColumn,
} from "../../components/ui";

type DisplayDriver = {
  driverId: string; // This is actually the _id from backend
  name: string;
  phone: string;
  email: string;
  licenseNo: string;
  validationStatus?: string;
  isActive?: boolean;
  profileImgUrl?: string;
  raw: DriverRecord;
};

type ReviewUser = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  profileImgUrl?: string;
};

type ReviewBooking = {
  _id?: string;
  bookingCode?: string;
  status?: string;
  completedAt?: string;
};

type AdminReviewItem = {
  _id: string;
  rating: number;
  comment?: string;
  reviewedAt?: string;
  createdAt?: string;
  passengerId?: string | ReviewUser;
  bookingId?: string | ReviewBooking;
};

type AdminReviewSummary = {
  total: number;
  average: number;
  distribution: Record<string, number>;
};

const Drivers: React.FC = () => {
  const {
    drivers,
    pendingDrivers,
    loading,
    error,
    fetchAllDrivers,
    fetchPendingDrivers,
    approveDriver,
    rejectDriver,
    getDriverReviewInsights,
  } = useDriver();

  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DisplayDriver | null>(null);
  const [processingDriverId, setProcessingDriverId] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    driverId: string;
    driverName: string;
  } | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [driverReviewSummary, setDriverReviewSummary] = useState<AdminReviewSummary | null>(null);
  const [driverLatestReviews, setDriverLatestReviews] = useState<AdminReviewItem[]>([]);
  const [licenseImageViewerVisible, setLicenseImageViewerVisible] = useState(false);

  const toDisplayDriver = (drv: DriverRecord): DisplayDriver => {
    const fullName = `${drv.firstName || ""} ${drv.lastName || ""}`.trim();
    return {
      driverId: drv._id || '', // Using _id as the identifier
      name: fullName || drv.email || drv._id || 'Unknown',
      phone: drv.phoneNumber || "-",
      email: drv.email || "-",
      licenseNo: drv.licenseNo || "-",
      validationStatus: drv.validationStatus,
      isActive: drv.isActive,
      profileImgUrl: drv.profileImgUrl,
      raw: drv,
    };
  };

  const renderStars = (rating: number) => {
    const normalized = Math.max(0, Math.min(5, Math.round(rating)));
    return `${'★'.repeat(normalized)}${'☆'.repeat(5 - normalized)}`;
  };

  const getPassengerName = (review: AdminReviewItem) => {
    if (!review?.passengerId || typeof review.passengerId === 'string') {
      return 'Passenger';
    }
    const fullName = `${review.passengerId.firstName || ''} ${review.passengerId.lastName || ''}`.trim();
    return fullName || 'Passenger';
  };

  const formatReviewTime = (dateValue?: string) => {
    if (!dateValue) return 'Unknown date';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString();
  };

  const loadDriverReviews = React.useCallback(async (driverId: string) => {
    if (!driverId) return;
    try {
      setReviewsLoading(true);
      setReviewsError(null);

      const insights = await getDriverReviewInsights(driverId, 5);
      setDriverReviewSummary(insights?.summary || null);
      setDriverLatestReviews(insights?.reviews || []);
    } catch (err: any) {
      setReviewsError(err?.response?.data?.message || 'Failed to load review insights');
      setDriverReviewSummary(null);
      setDriverLatestReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [getDriverReviewInsights]);

  useEffect(() => {
    if (!modalVisible || !editingDriver?.driverId) {
      return;
    }
    loadDriverReviews(editingDriver.driverId);
  }, [modalVisible, editingDriver?.driverId, loadDriverReviews]);

  const normalizedDrivers = useMemo(
    () => drivers.map((drv) => toDisplayDriver(drv)),
    [drivers]
  );

  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedDrivers;
    return normalizedDrivers.filter((driver) =>
      [driver.name, driver.phone, driver.email, driver.driverId]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [normalizedDrivers, query]);

  const confirmApprove = (driverId: string, driverName: string) => {
    setConfirmAction({ type: 'approve', driverId, driverName });
    setConfirmModalVisible(true);
  };

  const confirmReject = (driverId: string, driverName: string) => {
    setConfirmAction({ type: 'reject', driverId, driverName });
    setConfirmModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setConfirmModalVisible(false);
    
    if (confirmAction.type === 'approve') {
      await handleApprove(confirmAction.driverId);
    } else {
      await handleReject(confirmAction.driverId);
    }
    
    setConfirmAction(null);
  };

  // Table columns for all drivers
  const driverColumns: TableColumn<DisplayDriver>[] = [
    {
      key: 'name',
      header: 'Name',
      flex: 1.5,
    },
    {
      key: 'phone',
      header: 'Phone',
      flex: 1,
    },
    {
      key: 'email',
      header: 'Email',
      flex: 1.5,
    },
    {
      key: 'validationStatus',
      header: 'Status',
      flex: 0.8,
      render: (item) => (
        <StatusBadge
          label={item.validationStatus || 'Unknown'}
          variant={item.validationStatus === 'approved' ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'licenseNo',
      header: 'License',
      flex: 1.2,
    },
    {
      key: 'isActive',
      header: 'Active',
      flex: 0.7,
      render: (item) => (item.isActive ? 'Yes' : 'No'),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 100,
      render: (item) => (
        <Button
          onPress={() => {
            setEditingDriver(item);
            setModalVisible(true);
          }}
          variant="outline"
          size="sm"
        >
          View
        </Button>
      ),
    },
  ];

  // Prepare pending drivers for table
  const pendingDriversDisplay = useMemo(() => {
    return pendingDrivers.map((req) => toDisplayDriver(req));
  }, [pendingDrivers]);

  // Table columns for pending requests
  const requestColumns: TableColumn<DisplayDriver>[] = [
    {
      key: 'name',
      header: 'Name',
      flex: 1.5,
    },
    {
      key: 'phone',
      header: 'Phone',
      flex: 1,
    },
    {
      key: 'email',
      header: 'Email',
      flex: 1.5,
    },
    {
      key: 'licenseNo',
      header: 'License',
      flex: 1.2,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (item) => (
        <View style={styles.actionButtons}>
          {processingDriverId === item.driverId ? (
            <ActivityIndicator size="small" />
          ) : (
            <>
              <Button
                onPress={() => confirmApprove(item.driverId, item.name)}
                variant="success"
                size="sm"
                disabled={processingDriverId !== null}
              >
                Accept
              </Button>
              <Button
                onPress={() => confirmReject(item.driverId, item.name)}
                variant="danger"
                size="sm"
                disabled={processingDriverId !== null}
              >
                Reject
              </Button>
            </>
          )}
        </View>
      ),
    },
  ];



  const handleApprove = async (driverId: string) => {
  try {
    setProcessingDriverId(driverId);

    const result = await approveDriver(driverId);

    if (result.success) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          result.message || "Driver approved successfully!",
          ToastAndroid.SHORT
        );
      } else {
        console.log(result.message || "Driver approved successfully!");
      }
    } else {
      console.error("Error:", result.message || "Failed to approve driver");
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          result.message || "Failed to approve driver",
          ToastAndroid.LONG
        );
      }
    }
  } catch (err) {
    console.error("Error:", "Something went wrong");
    if (Platform.OS === 'android') {
      ToastAndroid.show("Something went wrong", ToastAndroid.LONG);
    }
  } finally {
    setProcessingDriverId(null);
  }
};

const handleReject = async (driverId: string) => {
  try {
    setProcessingDriverId(driverId);

    const result = await rejectDriver(driverId);

    if (result.success) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          result.message || "Driver rejected successfully!",
          ToastAndroid.SHORT
        );
      } else {
        console.log(result.message || "Driver rejected successfully!");
      }
    } else {
      console.error("Error:", result.message || "Failed to reject driver");
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          result.message || "Failed to reject driver",
          ToastAndroid.LONG
        );
      }
    }
  } catch (err) {
    console.error("Error:", "Something went wrong");
    if (Platform.OS === 'android') {
      ToastAndroid.show("Something went wrong", ToastAndroid.LONG);
    }
  } finally {
    setProcessingDriverId(null);
  }
};

  useFocusEffect(
    React.useCallback(() => {
      fetchAllDrivers();
      fetchPendingDrivers();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Tabs
        tabs={[
          { key: 'all', label: 'All Drivers' },
          { key: 'requests', label: 'Driver Requests', badge: pendingDrivers.length },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as 'all' | 'requests')}
      />

      {activeTab === 'all' ? (
        <>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, phone, or email..."
            onClear={() => setQuery('')}
            showRefresh
            onRefresh={fetchAllDrivers}
          />

          {loading ? (
            <LoadingSpinner message="Loading drivers..." />
          ) : error ? (
            <EmptyState
              title="Failed to load drivers"
              description={error}
              action={
                <Button onPress={fetchAllDrivers} variant="primary">
                  Retry
                </Button>
              }
            />
          ) : (
            <Table
              data={filteredDrivers}
              columns={driverColumns}
              keyExtractor={(item) => item.driverId}
              emptyMessage="No drivers found"
            />
          )}
        </>
      ) : (
        <>
          {loading ? (
            <LoadingSpinner message="Loading requests..." />
          ) : error ? (
            <EmptyState
              title="Failed to load requests"
              description={error}
              action={
                <Button onPress={fetchPendingDrivers} variant="primary">
                  Retry
                </Button>
              }
            />
          ) : pendingDriversDisplay.length === 0 ? (
            <EmptyState
              title="No pending requests"
              description="All driver requests have been processed"
            />
          ) : (
            <Table
              data={pendingDriversDisplay}
              columns={requestColumns}
              keyExtractor={(item) => item.driverId}
              emptyMessage="No pending requests"
            />
          )}
        </>
      )}

      <Modal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingDriver(null);
          setDriverReviewSummary(null);
          setDriverLatestReviews([]);
          setReviewsError(null);
        }}
        title="Driver Details"
        size="lg"
        footer={
          <View style={styles.modalFooterActions}>
            <Button
              onPress={() => {
                if (editingDriver?.driverId) {
                  loadDriverReviews(editingDriver.driverId);
                }
              }}
              variant="outline"
            >
              Refresh Reviews
            </Button>
            <Button
              onPress={() => {
                setModalVisible(false);
                setEditingDriver(null);
                setDriverReviewSummary(null);
                setDriverLatestReviews([]);
                setReviewsError(null);
              }}
              variant="secondary"
            >
              Close
            </Button>
          </View>
        }
      >
        <View style={styles.modalContent}>
          <View style={styles.driverHeader}>
            <Image
              source={
                editingDriver?.profileImgUrl
                  ? { uri: editingDriver.profileImgUrl }
                  : require('../../utils/MainLogo.png')
              }
              style={styles.avatar}
            />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{editingDriver?.name ?? ''}</Text>
              <StatusBadge
                label={editingDriver?.validationStatus || 'Unknown'}
                variant={
                  editingDriver?.validationStatus === 'approved' ? 'success' : 'neutral'
                }
              />
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{editingDriver?.phone ?? '-'}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{editingDriver?.email ?? '-'}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>License Number</Text>
              <Text style={styles.detailValue}>{editingDriver?.licenseNo ?? '-'}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Active Status</Text>
              <Text style={styles.detailValue}>
                {editingDriver?.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Driver ID</Text>
              <Text style={styles.detailValue}>{editingDriver?.driverId ?? '-'}</Text>
            </View>
          </View>

          {editingDriver?.raw?.licenseImgUrl && (
            <View style={styles.licenseSection}>
              <Text style={styles.sectionTitle}>Driver License</Text>
              <Pressable onPress={() => setLicenseImageViewerVisible(true)}>
                <Image
                  source={{ uri: editingDriver.raw.licenseImgUrl }}
                  style={styles.licenseImage}
                />
                <View style={styles.licenseOverlay}>
                  <Feather name="maximize-2" size={28} color="#fff" />
                </View>
              </Pressable>
            </View>
          )}

          <View style={styles.reviewsBlock}>
            <Text style={styles.sectionTitle}>Review Insights</Text>

            {reviewsLoading ? (
              <View style={styles.reviewsLoadingWrap}>
                <ActivityIndicator size="small" color="#0f766e" />
                <Text style={styles.reviewsLoadingText}>Loading review analytics...</Text>
              </View>
            ) : reviewsError ? (
              <View style={styles.reviewsErrorCard}>
                <Text style={styles.reviewsErrorText}>{reviewsError}</Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryCardsRow}>
                  <View style={styles.summaryCardPrimary}>
                    <Text style={styles.summaryCardTitle}>Average Rating</Text>
                    <Text style={styles.summaryCardValue}>
                      {driverReviewSummary?.average?.toFixed(2) || '0.00'}
                    </Text>
                    <Text style={styles.summaryCardSubtle}>
                      {renderStars(driverReviewSummary?.average || 0)}
                    </Text>
                  </View>

                  <View style={styles.summaryCardMuted}>
                    <Text style={styles.summaryCardTitle}>Total Reviews</Text>
                    <Text style={styles.summaryCardCount}>{driverReviewSummary?.total || 0}</Text>
                    <Text style={styles.summaryCardSubtle}>Verified rider feedback</Text>
                  </View>
                </View>

                <View style={styles.distributionCard}>
                  <Text style={styles.distributionTitle}>Star Distribution</Text>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const total = driverReviewSummary?.total || 0;
                    const count = driverReviewSummary?.distribution?.[String(star)] || 0;
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <View key={star} style={styles.distRow}>
                        <Text style={styles.distLabel}>{star}★</Text>
                        <View style={styles.distBarTrack}>
                          <View style={[styles.distBarFill, { width: `${percent}%` }]} />
                        </View>
                        <Text style={styles.distCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.latestReviewsCard}>
                  <Text style={styles.distributionTitle}>Latest Passenger Reviews</Text>
                  {driverLatestReviews.length === 0 ? (
                    <Text style={styles.noReviewsText}>No reviews available for this driver yet.</Text>
                  ) : (
                    <View style={styles.reviewListWrap}>
                      {driverLatestReviews.map((review) => (
                        <View key={review._id} style={styles.reviewItemCard}>
                          <View style={styles.reviewItemTopRow}>
                            <Text style={styles.reviewPassengerName}>{getPassengerName(review)}</Text>
                            <Text style={styles.reviewRatingText}>{renderStars(review.rating)}</Text>
                          </View>
                          <Text style={styles.reviewMetaText}>
                            {formatReviewTime(review.reviewedAt || review.createdAt)}
                            {review.bookingId && typeof review.bookingId !== 'string' && review.bookingId.bookingCode
                              ? ` • ${review.bookingId.bookingCode}`
                              : ''}
                          </Text>
                          <Text style={styles.reviewCommentText}>
                            {review.comment?.trim() || 'No written comment provided.'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        onClose={() => {
          setConfirmModalVisible(false);
          setConfirmAction(null);
        }}
        title={confirmAction?.type === 'approve' ? 'Approve Driver' : 'Reject Driver'}
        size="sm"
        footer={
          <View style={styles.confirmFooter}>
            <Button
              onPress={() => {
                setConfirmModalVisible(false);
                setConfirmAction(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onPress={handleConfirmAction}
              variant={confirmAction?.type === 'approve' ? 'success' : 'danger'}
            >
              {confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </View>
        }
      >
        <Text style={styles.confirmText}>
          {confirmAction?.type === 'approve'
            ? `Are you sure you want to approve ${confirmAction?.driverName}?`
            : `Are you sure you want to reject ${confirmAction?.driverName}?`}
        </Text>
      </Modal>

      {/* License Image Viewer Modal */}
      <RNModal
        visible={licenseImageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLicenseImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          <Pressable
            style={styles.imageViewerClose}
            onPress={() => setLicenseImageViewerVisible(false)}
          >
            <Feather name="x" size={28} color="#fff" />
          </Pressable>
          {editingDriver?.raw?.licenseImgUrl && (
            <Image
              source={{ uri: editingDriver.raw.licenseImgUrl }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </RNModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalContent: {
    gap: 20,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  driverInfo: {
    flex: 1,
    gap: 8,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  detailsGrid: {
    gap: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#f9fafb',
  },
  detailItem: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
  },
  reviewsBlock: {
    gap: 14,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  reviewsLoadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f0fdfa',
  },
  reviewsLoadingText: {
    color: '#115e59',
    fontSize: 14,
    fontWeight: '500',
  },
  reviewsErrorCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    padding: 12,
  },
  reviewsErrorText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '500',
  },
  summaryCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCardPrimary: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#ecfeff',
    gap: 4,
  },
  summaryCardMuted: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 4,
  },
  summaryCardTitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryCardValue: {
    fontSize: 28,
    color: '#0f766e',
    fontWeight: '800',
  },
  summaryCardCount: {
    fontSize: 28,
    color: '#1e293b',
    fontWeight: '800',
  },
  summaryCardSubtle: {
    fontSize: 13,
    color: '#475569',
  },
  distributionCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  distLabel: {
    width: 28,
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  distBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 999,
  },
  distCount: {
    width: 24,
    fontSize: 13,
    color: '#334155',
    textAlign: 'right',
    fontWeight: '600',
  },
  latestReviewsCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
    gap: 12,
  },
  reviewListWrap: {
    gap: 10,
  },
  reviewItemCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 4,
  },
  reviewItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  reviewPassengerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  reviewRatingText: {
    fontSize: 13,
    color: '#b45309',
    fontWeight: '700',
  },
  reviewMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  reviewCommentText: {
    fontSize: 13,
    color: '#1e293b',
    lineHeight: 19,
  },
  noReviewsText: {
    fontSize: 13,
    color: '#64748b',
  },
  licenseSection: {
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#f9fafb',
  },
  licenseImage: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  licenseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
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
});

export default Drivers;