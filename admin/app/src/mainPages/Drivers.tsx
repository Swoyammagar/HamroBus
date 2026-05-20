import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useDriver, type DriverRecord } from "../../context/domains";
import { useAdminPassengers } from "../../context/domains"; // ← for deleteDriver
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
import Pagination from "../../components/ui/Pagination";

type DisplayDriver = {
  driverId: string;
  name: string;
  phone: string;
  email: string;
  licenseNo: string;
  validationStatus?: string;
  isActive?: boolean;
  profileImgUrl?: string;
  licenseImgUrl?: string;
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

// ─── Initials Avatar ──────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  (name || "")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const AVATAR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#0891b2",
  "#16a34a",
  "#d97706",
  "#dc2626",
];
const pickColor = (name: string) =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const InitialsAvatar: React.FC<{ name: string; size: number; style?: any }> = ({
  name,
  size,
  style,
}) => (
  <View
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: pickColor(name),
        alignItems: "center",
        justifyContent: "center",
      },
      style,
    ]}
  >
    <Text style={{ color: "#fff", fontSize: size * 0.36, fontWeight: "700" }}>
      {getInitials(name)}
    </Text>
  </View>
);

const SmartAvatar: React.FC<{
  uri?: string | null;
  name: string;
  size: number;
  style?: any;
}> = ({ uri, name, size, style }) => {
  const [failed, setFailed] = useState(false);
  if (!uri || failed)
    return <InitialsAvatar name={name} size={size} style={style} />;
  return (
    <Image
      source={{ uri }}
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      onError={() => setFailed(true)}
    />
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderStars = (rating: number) => {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(n)}${"☆".repeat(5 - n)}`;
};

const getPassengerName = (review: AdminReviewItem) => {
  if (!review?.passengerId || typeof review.passengerId === "string")
    return "Passenger";
  const full =
    `${review.passengerId.firstName || ""} ${review.passengerId.lastName || ""}`.trim();
  return full || "Passenger";
};

const formatReviewTime = (dateValue?: string) => {
  if (!dateValue) return "Unknown date";
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? "Unknown date" : d.toLocaleDateString();
};

// ─── Main Component ───────────────────────────────────────────────────────────

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

  // Pull deleteDriver from the passengers hook (it lives there per your codebase)
  const { deleteDriver } = useAdminPassengers();

  const [activeTab, setActiveTab] = useState<"all" | "requests">("all");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DisplayDriver | null>(null);
  const [processingDriverId, setProcessingDriverId] = useState<string | null>(null);

  // ── Updated: type now includes 'delete' ──
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "delete";
    driverId: string;
    driverName: string;
  } | null>(null);

  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [driverReviewSummary, setDriverReviewSummary] =
    useState<AdminReviewSummary | null>(null);
  const [driverLatestReviews, setDriverLatestReviews] = useState<AdminReviewItem[]>([]);
  const [licenseImageViewerVisible, setLicenseImageViewerVisible] =
    useState(false);

  const toDisplayDriver = (drv: DriverRecord): DisplayDriver => {
    const fullName = `${drv.firstName || ""} ${drv.lastName || ""}`.trim();
    const profileImgUrl =
      drv.profileImgUrl ||
      (drv as any).profileImage ||
      (drv as any).avatarUrl ||
      undefined;
    const licenseImgUrl =
      drv.licenseImgUrl ||
      (drv as any).licenseImageUrl ||
      (drv as any).licenseImage ||
      undefined;
    return {
      driverId: drv._id || "",
      name: fullName || drv.email || drv._id || "Unknown",
      phone: drv.phoneNumber || "-",
      email: drv.email || "-",
      licenseNo: drv.licenseNo || "-",
      validationStatus: drv.validationStatus,
      isActive: drv.isActive,
      profileImgUrl,
      licenseImgUrl,
      raw: drv,
    };
  };

  const loadDriverReviews = useCallback(
    async (driverId: string) => {
      if (!driverId) return;
      try {
        setReviewsLoading(true);
        setReviewsError(null);
        const insights = await getDriverReviewInsights(driverId, 5);
        setDriverReviewSummary(insights?.summary || null);
        setDriverLatestReviews(insights?.reviews || []);
      } catch (err: any) {
        setReviewsError(
          err?.response?.data?.message || "Failed to load review insights"
        );
        setDriverReviewSummary(null);
        setDriverLatestReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    },
    [getDriverReviewInsights]
  );

  useEffect(() => {
    if (!modalVisible || !editingDriver?.driverId) return;
    loadDriverReviews(editingDriver.driverId);
  }, [modalVisible, editingDriver?.driverId, loadDriverReviews]);

  const normalizedDrivers = useMemo(
    () => drivers.map(toDisplayDriver),
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

  const driverTotalPages = Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE);
  const paginatedDrivers = filteredDrivers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const pendingDriversDisplay = useMemo(
    () => pendingDrivers.map(toDisplayDriver),
    [pendingDrivers]
  );

  const requestTotalPages = Math.ceil(
    pendingDriversDisplay.length / ITEMS_PER_PAGE
  );
  const paginatedRequests = pendingDriversDisplay.slice(
    (requestPage - 1) * ITEMS_PER_PAGE,
    requestPage * ITEMS_PER_PAGE
  );

  const confirmApprove = (driverId: string, driverName: string) =>
    setConfirmAction({ type: "approve", driverId, driverName });

  const confirmReject = (driverId: string, driverName: string) =>
    setConfirmAction({ type: "reject", driverId, driverName });

  const confirmDelete = (driverId: string, driverName: string) =>
    setConfirmAction({ type: "delete", driverId, driverName });

  // ── Updated: routes to delete handler too ──
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, driverId } = confirmAction;
    setConfirmAction(null);
    if (type === "approve") await handleApprove(driverId);
    else if (type === "reject") await handleReject(driverId);
    else await handleDelete(driverId);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingDriver(null);
    setDriverReviewSummary(null);
    setDriverLatestReviews([]);
    setReviewsError(null);
  };

  // ── Table columns ──

  const driverColumns: TableColumn<DisplayDriver>[] = [
    {
      key: "avatar",
      header: "",
      width: 48,
      render: (item) => (
        <SmartAvatar uri={item.profileImgUrl} name={item.name} size={36} />
      ),
    },
    { key: "name", header: "Name", flex: 1.5 },
    { key: "phone", header: "Phone", flex: 1 },
    { key: "email", header: "Email", flex: 1.5 },
    {
      key: "validationStatus",
      header: "Status",
      flex: 0.8,
      render: (item) => (
        <StatusBadge
          label={item.validationStatus || "Unknown"}
          variant={
            item.validationStatus === "approved" ? "success" : "neutral"
          }
        />
      ),
    },
    { key: "licenseNo", header: "License", flex: 1.2 },
    {
      key: "isActive",
      header: "Active",
      flex: 0.7,
      render: (item) => (item.isActive ? "Yes" : "No"),
    },
    {
      key: "actions",
      header: "Actions",
      width: 160,                          // ← wider to fit both buttons
      render: (item) => (
        <View style={styles.actionButtons}>
          <Button
            onPress={() => {
              setEditingDriver(item);
              setModalVisible(true);
            }}
            variant="outline"
            size="sm"
            disabled={processingDriverId !== null}
          >
            View
          </Button>
          <Button
            onPress={() => confirmDelete(item.driverId, item.name)}
            variant="danger"
            size="sm"
            disabled={processingDriverId !== null}
          >
            {processingDriverId === item.driverId ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              "Delete"
            )}
          </Button>
        </View>
      ),
    },
  ];

  const requestColumns: TableColumn<DisplayDriver>[] = [
    {
      key: "avatar",
      header: "",
      width: 48,
      render: (item) => (
        <SmartAvatar uri={item.profileImgUrl} name={item.name} size={36} />
      ),
    },
    { key: "name", header: "Name", flex: 1.5 },
    { key: "phone", header: "Phone", flex: 1 },
    { key: "email", header: "Email", flex: 1.5 },
    { key: "licenseNo", header: "License", flex: 1.2 },
    {
      key: "actions",
      header: "Actions",
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
      if (Platform.OS === "android") {
        ToastAndroid.show(
          result.message ||
            (result.success ? "Driver approved!" : "Failed to approve"),
          result.success ? ToastAndroid.SHORT : ToastAndroid.LONG
        );
      }
    } catch {
      if (Platform.OS === "android")
        ToastAndroid.show("Something went wrong", ToastAndroid.LONG);
    } finally {
      setProcessingDriverId(null);
    }
  };

  const handleReject = async (driverId: string) => {
    try {
      setProcessingDriverId(driverId);
      const result = await rejectDriver(driverId);
      if (Platform.OS === "android") {
        ToastAndroid.show(
          result.message ||
            (result.success ? "Driver rejected!" : "Failed to reject"),
          result.success ? ToastAndroid.SHORT : ToastAndroid.LONG
        );
      }
    } catch {
      if (Platform.OS === "android")
        ToastAndroid.show("Something went wrong", ToastAndroid.LONG);
    } finally {
      setProcessingDriverId(null);
    }
  };

  // ── New delete handler ──
  const handleDelete = async (driverId: string) => {
    try {
      setProcessingDriverId(driverId);
      const result = await deleteDriver(driverId);
      if (Platform.OS === "android") {
        ToastAndroid.show(
          result.message ||
            (result.success ? "Driver deleted!" : "Failed to delete"),
          result.success ? ToastAndroid.SHORT : ToastAndroid.LONG
        );
      }
      if (result.success) {
        // Close modal if the deleted driver was open
        if (editingDriver?.driverId === driverId) closeModal();
        fetchAllDrivers();
      }
    } catch {
      if (Platform.OS === "android")
        ToastAndroid.show("Something went wrong", ToastAndroid.LONG);
    } finally {
      setProcessingDriverId(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllDrivers();
      fetchPendingDrivers();
    }, [])
  );

  // ── Confirm overlay helpers ──
  const confirmIconName = () => {
    if (!confirmAction) return "alert-circle";
    if (confirmAction.type === "approve") return "check-circle";
    if (confirmAction.type === "reject") return "x-circle";
    return "trash-2";
  };

  const confirmIconColor = () => {
    if (!confirmAction) return "#6b7280";
    if (confirmAction.type === "approve") return "#16a34a";
    if (confirmAction.type === "reject") return "#ef4444";
    return "#ea580c";
  };

  const confirmIconBg = () => {
    if (!confirmAction) return "#f9fafb";
    if (confirmAction.type === "approve") return "#f0fdf4";
    if (confirmAction.type === "reject") return "#fef2f2";
    return "#fff7ed";
  };

  const confirmIconBorder = () => {
    if (!confirmAction) return "#e5e7eb";
    if (confirmAction.type === "approve") return "#bbf7d0";
    if (confirmAction.type === "reject") return "#fecaca";
    return "#fed7aa";
  };

  const confirmBtnColor = () => {
    if (!confirmAction) return "#6b7280";
    if (confirmAction.type === "approve") return "#16a34a";
    if (confirmAction.type === "reject") return "#ef4444";
    return "#ea580c";
  };

  const confirmTitle = () => {
    if (!confirmAction) return "";
    if (confirmAction.type === "approve") return "Approve Driver";
    if (confirmAction.type === "reject") return "Reject Driver";
    return "Delete Driver";
  };

  const confirmSubtitle = () => {
    if (!confirmAction) return "";
    if (confirmAction.type === "approve")
      return `Are you sure you want to approve ${confirmAction.driverName}?`;
    if (confirmAction.type === "reject")
      return `Are you sure you want to reject ${confirmAction.driverName}?`;
    return `Are you sure you want to delete ${confirmAction.driverName}? This action cannot be undone.`;
  };

  const confirmBtnLabel = () => {
    if (!confirmAction) return "";
    if (confirmAction.type === "approve") return "Approve";
    if (confirmAction.type === "reject") return "Reject";
    return "Delete";
  };

  return (
    <View style={styles.container}>
      <Tabs
        tabs={[
          { key: "all", label: "All Drivers" },
          {
            key: "requests",
            label: "Driver Requests",
            badge: pendingDrivers.length,
          },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => {
          setActiveTab(key as "all" | "requests");
          setCurrentPage(1);
          setRequestPage(1);
        }}
      />

      {activeTab === "all" ? (
        <>
          <SearchBar
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setCurrentPage(1);
            }}
            placeholder="Search by name, phone, or email..."
            onClear={() => {
              setQuery("");
              setCurrentPage(1);
            }}
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
            <>
              <Table
                data={paginatedDrivers}
                columns={driverColumns}
                keyExtractor={(item) => item.driverId}
                emptyMessage="No drivers found"
              />
              <Pagination
                currentPage={currentPage}
                totalPages={driverTotalPages}
                onPageChange={setCurrentPage}
              />
            </>
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
            <>
              <Table
                data={paginatedRequests}
                columns={requestColumns}
                keyExtractor={(item) => item.driverId}
                emptyMessage="No pending requests"
              />
              <Pagination
                currentPage={requestPage}
                totalPages={requestTotalPages}
                onPageChange={setRequestPage}
              />
            </>
          )}
        </>
      )}

      {/* ── Driver Detail Modal ── */}
      <Modal
        visible={modalVisible}
        onClose={closeModal}
        title="Driver Details"
        size="lg"
        footer={
          <View style={styles.modalFooterActions}>
            <Button
              onPress={() =>
                editingDriver?.driverId &&
                loadDriverReviews(editingDriver.driverId)
              }
              variant="outline"
            >
              Refresh Reviews
            </Button>
            {/* Delete button inside modal footer */}
            {editingDriver && (
              <Button
                onPress={() =>
                  confirmDelete(editingDriver.driverId, editingDriver.name)
                }
                variant="danger"
              >
                Delete Driver
              </Button>
            )}
            <Button onPress={closeModal} variant="secondary">
              Close
            </Button>
          </View>
        }
      >
        <View style={styles.modalContent}>
          {/* Header with avatar */}
          <View style={styles.driverHeader}>
            <SmartAvatar
              uri={editingDriver?.profileImgUrl}
              name={editingDriver?.name ?? "?"}
              size={88}
              style={styles.avatarBorder}
            />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{editingDriver?.name ?? ""}</Text>
              <StatusBadge
                label={editingDriver?.validationStatus || "Unknown"}
                variant={
                  editingDriver?.validationStatus === "approved"
                    ? "success"
                    : "neutral"
                }
              />
              <View style={styles.activeRow}>
                <View
                  style={[
                    styles.activeDot,
                    {
                      backgroundColor: editingDriver?.isActive
                        ? "#16a34a"
                        : "#9ca3af",
                    },
                  ]}
                />
                <Text style={styles.activeLabel}>
                  {editingDriver?.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
          </View>

          {/* Details grid */}
          <View style={styles.detailsGrid}>
            {[
              {
                label: "Phone",
                value: editingDriver?.phone ?? "-",
                icon: "phone",
              },
              {
                label: "Email",
                value: editingDriver?.email ?? "-",
                icon: "mail",
              },
              {
                label: "License No.",
                value: editingDriver?.licenseNo ?? "-",
                icon: "credit-card",
              },
              {
                label: "Driver ID",
                value: editingDriver?.driverId ?? "-",
                icon: "hash",
              },
            ].map((item) => (
              <View key={item.label} style={styles.detailItem}>
                <View style={styles.detailLabelRow}>
                  <Feather name={item.icon as any} size={12} color="#9ca3af" />
                  <Text style={styles.detailLabel}>{item.label}</Text>
                </View>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* License image */}
          {editingDriver?.licenseImgUrl ? (
            <View style={styles.licenseSection}>
              <Text style={styles.sectionTitle}>Driver License</Text>
              <Pressable onPress={() => setLicenseImageViewerVisible(true)}>
                <Image
                  source={{ uri: editingDriver.licenseImgUrl }}
                  style={styles.licenseImage}
                  onError={() => {}}
                />
                <View style={styles.licenseOverlay}>
                  <Feather name="maximize-2" size={28} color="#fff" />
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={styles.licenseSection}>
              <Text style={styles.sectionTitle}>Driver License</Text>
              <View style={styles.licenseEmpty}>
                <Feather name="file-text" size={28} color="#d1d5db" />
                <Text style={styles.licenseEmptyText}>
                  No license image uploaded
                </Text>
              </View>
            </View>
          )}

          {/* Review insights */}
          <View style={styles.reviewsBlock}>
            <Text style={styles.sectionTitle}>Review Insights</Text>
            {reviewsLoading ? (
              <View style={styles.reviewsLoadingWrap}>
                <ActivityIndicator size="small" color="#0f766e" />
                <Text style={styles.reviewsLoadingText}>
                  Loading review analytics...
                </Text>
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
                      {driverReviewSummary?.average?.toFixed(2) || "0.00"}
                    </Text>
                    <Text style={styles.summaryCardSubtle}>
                      {renderStars(driverReviewSummary?.average || 0)}
                    </Text>
                  </View>
                  <View style={styles.summaryCardMuted}>
                    <Text style={styles.summaryCardTitle}>Total Reviews</Text>
                    <Text style={styles.summaryCardCount}>
                      {driverReviewSummary?.total || 0}
                    </Text>
                    <Text style={styles.summaryCardSubtle}>
                      Verified rider feedback
                    </Text>
                  </View>
                </View>

                <View style={styles.distributionCard}>
                  <Text style={styles.distributionTitle}>
                    Star Distribution
                  </Text>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const total = driverReviewSummary?.total || 0;
                    const count =
                      driverReviewSummary?.distribution?.[String(star)] || 0;
                    const percent =
                      total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <View key={star} style={styles.distRow}>
                        <Text style={styles.distLabel}>{star}★</Text>
                        <View style={styles.distBarTrack}>
                          <View
                            style={[
                              styles.distBarFill,
                              { width: `${percent}%` as any },
                            ]}
                          />
                        </View>
                        <Text style={styles.distCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.latestReviewsCard}>
                  <Text style={styles.distributionTitle}>
                    Latest Passenger Reviews
                  </Text>
                  {driverLatestReviews.length === 0 ? (
                    <Text style={styles.noReviewsText}>
                      No reviews available for this driver yet.
                    </Text>
                  ) : (
                    <View style={styles.reviewListWrap}>
                      {driverLatestReviews.map((review) => (
                        <View key={review._id} style={styles.reviewItemCard}>
                          <View style={styles.reviewItemTopRow}>
                            <View style={styles.reviewPassengerLeft}>
                              {typeof review.passengerId !== "string" &&
                              review.passengerId?.profileImgUrl ? (
                                <SmartAvatar
                                  uri={review.passengerId.profileImgUrl}
                                  name={getPassengerName(review)}
                                  size={28}
                                />
                              ) : (
                                <InitialsAvatar
                                  name={getPassengerName(review)}
                                  size={28}
                                />
                              )}
                              <Text style={styles.reviewPassengerName}>
                                {getPassengerName(review)}
                              </Text>
                            </View>
                            <Text style={styles.reviewRatingText}>
                              {renderStars(review.rating)}
                            </Text>
                          </View>
                          <Text style={styles.reviewMetaText}>
                            {formatReviewTime(
                              review.reviewedAt || review.createdAt
                            )}
                            {review.bookingId &&
                            typeof review.bookingId !== "string" &&
                            review.bookingId.bookingCode
                              ? ` · ${review.bookingId.bookingCode}`
                              : ""}
                          </Text>
                          <Text style={styles.reviewCommentText}>
                            {review.comment?.trim() ||
                              "No written comment provided."}
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

      {/* ── Approve / Reject / Delete Confirm Overlay ── */}
      {confirmAction && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View
              style={[
                styles.confirmIconWrap,
                {
                  backgroundColor: confirmIconBg(),
                  borderColor: confirmIconBorder(),
                },
              ]}
            >
              <Feather
                name={confirmIconName() as any}
                size={24}
                color={confirmIconColor()}
              />
            </View>
            <Text style={styles.confirmTitle}>{confirmTitle()}</Text>
            <Text style={styles.confirmSub}>{confirmSubtitle()}</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => setConfirmAction(null)}
                style={styles.confirmCancel}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmAction}
                style={[
                  styles.confirmActionBtn,
                  { backgroundColor: confirmBtnColor() },
                ]}
              >
                <Text style={styles.confirmActionText}>
                  {confirmBtnLabel()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── License Image Fullscreen Viewer ── */}
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
          {editingDriver?.licenseImgUrl && (
            <Image
              source={{ uri: editingDriver.licenseImgUrl }}
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
  container: { flex: 1, padding: 16 },
  actionButtons: { flexDirection: "row", gap: 8 },
  modalFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalContent: { gap: 20 },

  driverHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  avatarBorder: { borderWidth: 2, borderColor: "#bfdbfe" },
  driverInfo: { flex: 1, gap: 8 },
  driverName: { fontSize: 20, fontWeight: "700", color: "#111827" },
  activeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  activeLabel: { fontSize: 13, color: "#6b7280", fontWeight: "500" },

  detailsGrid: {
    gap: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  detailItem: { gap: 3 },
  detailLabelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  detailLabel: { fontSize: 12, fontWeight: "600", color: "#9ca3af" },
  detailValue: { fontSize: 15, color: "#111827", fontWeight: "500" },

  licenseSection: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  licenseImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  licenseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  licenseEmpty: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  licenseEmptyText: { fontSize: 13, color: "#9ca3af" },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },

  reviewsBlock: { gap: 14, marginTop: 2 },
  reviewsLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#ccfbf1",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f0fdfa",
  },
  reviewsLoadingText: {
    color: "#115e59",
    fontSize: 14,
    fontWeight: "500",
  },
  reviewsErrorCard: {
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    padding: 12,
  },
  reviewsErrorText: { color: "#b91c1c", fontSize: 14, fontWeight: "500" },

  summaryCardsRow: { flexDirection: "row", gap: 12 },
  summaryCardPrimary: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#99f6e4",
    backgroundColor: "#ecfeff",
    gap: 4,
  },
  summaryCardMuted: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    gap: 4,
  },
  summaryCardTitle: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryCardValue: { fontSize: 28, color: "#0f766e", fontWeight: "800" },
  summaryCardCount: { fontSize: 28, color: "#1e293b", fontWeight: "800" },
  summaryCardSubtle: { fontSize: 13, color: "#64748b" },

  distributionCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#ffffff",
    gap: 10,
  },
  distributionTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  distRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  distLabel: {
    width: 28,
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  distBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  distBarFill: {
    height: "100%",
    backgroundColor: "#14b8a6",
    borderRadius: 999,
  },
  distCount: {
    width: 24,
    fontSize: 13,
    color: "#334155",
    textAlign: "right",
    fontWeight: "600",
  },

  latestReviewsCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#ffffff",
    gap: 12,
  },
  reviewListWrap: { gap: 10 },
  reviewItemCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
    gap: 5,
  },
  reviewItemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  reviewPassengerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  reviewPassengerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  reviewRatingText: { fontSize: 13, color: "#b45309", fontWeight: "700" },
  reviewMetaText: { fontSize: 12, color: "#64748b" },
  reviewCommentText: { fontSize: 13, color: "#1e293b", lineHeight: 19 },
  noReviewsText: { fontSize: 13, color: "#64748b" },

  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageViewerClose: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 24,
  },
  imageViewerImage: { width: "90%", height: "80%" },

  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  confirmCard: {
    width: "82%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1,
  },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  confirmSub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    width: "100%",
  },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  confirmCancelText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  confirmActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmActionText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

export default Drivers;