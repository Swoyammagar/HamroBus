import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ToastAndroid,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import {
  useAdminPassengers,
  type PassengerSummary,
  type PassengerDetail,
  type BookingHistoryItem,
  type ReviewItem,
} from "../../context/domains";
import {
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

// ─── Avatar helpers (mirrored from Drivers) ───────────────────────────────────

const getInitials = (name: string) =>
  (name || "")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const AVATAR_COLORS = [
  "#3b82f6","#8b5cf6","#0891b2","#16a34a","#d97706","#dc2626",
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

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};

const renderStars = (rating: number) => {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(n)}${"☆".repeat(5 - n)}`;
};

const bookingStatusVariant = (
  status: string
): "success" | "warning" | "danger" | "neutral" => {
  if (status === "completed") return "success";
  if (status === "confirmed") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Passengers: React.FC = () => {
  const {
    passengers,
    pagination,
    loading,
    detailLoading,
    error,
    fetchAllPassengers,
    getPassengerById,
    deletePassenger,
    searchPassengers,
    goToPage,
  } = useAdminPassengers();

  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<PassengerDetail | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    passengerId: string;
    passengerName: string;
  } | null>(null);

  // ── Search with debounce ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) {
        searchPassengers(query.trim(), 1);
        setCurrentPage(1);
      } else {
        fetchAllPassengers({ page: 1 });
        setCurrentPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (query.trim()) {
      searchPassengers(query.trim(), page);
    } else {
      goToPage(page);
    }
  };

  // ── Open detail modal ──────────────────────────────────────────────────────
  const openDetail = async (passenger: PassengerSummary) => {
    setModalVisible(true);
    setSelectedDetail(null);
    const detail = await getPassengerById(passenger._id);
    setSelectedDetail(detail);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedDetail(null);
  };

  // ── Delete flow ────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!confirmAction) return;
    const { passengerId } = confirmAction;
    setConfirmAction(null);
    try {
      setProcessingId(passengerId);
      const result = await deletePassenger(passengerId);
      if (Platform.OS === "android") {
        ToastAndroid.show(
          result.message || (result.success ? "Passenger deleted!" : "Failed to delete"),
          result.success ? ToastAndroid.SHORT : ToastAndroid.LONG
        );
      }
      if (result.success && modalVisible && selectedDetail?._id === passengerId) {
        closeModal();
      }
    } catch {
      if (Platform.OS === "android")
        ToastAndroid.show("Something went wrong", ToastAndroid.LONG);
    } finally {
      setProcessingId(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllPassengers({ page: 1 });
      setCurrentPage(1);
    }, [])
  );
  const sortedPassengers = useMemo(
      () => [...passengers].sort((a, b) => (b.totalPointsEarned ?? 0) - (a.totalPointsEarned ?? 0)),
      [passengers]
  );

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns: TableColumn<PassengerSummary>[] = [
    {
      key: "avatar",
      header: "",
      width: 48,
      render: (item) => (
        <SmartAvatar uri={item.profileImgUrl} name={item.fullName || item.firstName} size={36} />
      ),
    },
    { key: "fullName", header: "Name", flex: 1.5 },
    { key: "phoneNumber", header: "Phone", flex: 1 },
    { key: "email", header: "Email", flex: 1.5 },
    {
      key: "bookingCount",
      header: "Bookings",
      flex: 0.7,
      render: (item) => (
        <Text style={styles.countBadge}>{item.bookingCount ?? 0}</Text>
      ),
    },
    {
      key: "totalPointsEarned",
      header: "Total Points",
      flex: 0.7,
      render: (item) => (
        <Text style={styles.pointsBadge}>{item.totalPointsEarned ?? 0}</Text>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: 160,
      render: (item) => (
        <View style={styles.actionButtons}>
          <Button
            onPress={() => openDetail(item)}
            variant="outline"
            size="sm"
            disabled={processingId !== null}
          >
            View
          </Button>
          <Button
            onPress={() =>
              setConfirmAction({
                passengerId: item._id,
                passengerName: item.fullName || `${item.firstName} ${item.lastName}`,
              })
            }
            variant="danger"
            size="sm"
            disabled={processingId !== null}
          >
            {processingId === item._id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              "Delete"
            )}
          </Button>
        </View>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <SearchBar
        value={query}
        onChangeText={(v) => setQuery(v)}
        placeholder="Search by name, phone, or email..."
        onClear={() => setQuery("")}
        showRefresh
        onRefresh={() => fetchAllPassengers({ page: currentPage })}
      />

      {loading ? (
        <LoadingSpinner message="Loading passengers..." />
      ) : error ? (
        <EmptyState
          title="Failed to load passengers"
          description={error}
          action={
            <Button onPress={() => fetchAllPassengers({ page: 1 })} variant="primary">
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <Table
            data={sortedPassengers}
            columns={columns}
            keyExtractor={(item) => item._id}
            emptyMessage="No passengers found"
          />
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.pages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* ── Passenger Detail Modal ── */}
      <Modal
        visible={modalVisible}
        onClose={closeModal}
        title="Passenger Details"
        size="lg"
        footer={
          <View style={styles.modalFooterActions}>
            {selectedDetail && (
              <Button
                onPress={() =>
                  setConfirmAction({
                    passengerId: selectedDetail._id,
                    passengerName: selectedDetail.fullName,
                  })
                }
                variant="danger"
              >
                Delete Passenger
              </Button>
            )}
            <Button onPress={closeModal} variant="secondary">
              Close
            </Button>
          </View>
        }
      >
        {detailLoading || !selectedDetail ? (
          <View style={styles.detailLoadingWrap}>
            <ActivityIndicator size="large" color="#0f766e" />
            <Text style={styles.detailLoadingText}>Loading passenger data...</Text>
          </View>
        ) : (
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.passengerHeader}>
              <SmartAvatar
                uri={selectedDetail.profileImgUrl}
                name={selectedDetail.fullName}
                size={88}
                style={styles.avatarBorder}
              />
              <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>{selectedDetail.fullName}</Text>
                <Text style={styles.passengerSince}>
                  Member since {formatDate(selectedDetail.createdAt)}
                </Text>
                {selectedDetail.consecutiveCancellations > 0 && (
                  <View style={styles.warningBadge}>
                    <Feather name="alert-triangle" size={12} color="#b45309" />
                    <Text style={styles.warningBadgeText}>
                      {selectedDetail.consecutiveCancellations} consecutive cancellation
                      {selectedDetail.consecutiveCancellations > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              {[
                {
                  label: "Bookings",
                  value: selectedDetail.stats.totalBookings,
                  icon: "map",
                  color: "#0891b2",
                  bg: "#ecfeff",
                  border: "#a5f3fc",
                },
                {
                  label: "Reviews",
                  value: selectedDetail.stats.totalReviews,
                  icon: "star",
                  color: "#b45309",
                  bg: "#fffbeb",
                  border: "#fde68a",
                },
                {
                  label: "Total Points",
                  value: selectedDetail.totalPointsEarned,
                  icon: "gift",
                  color: "#16a34a",
                  bg: "#f0fdf4",
                  border: "#bbf7d0",
                },
              ].map((s) => (
                <View
                  key={s.label}
                  style={[
                    styles.statCard,
                    { backgroundColor: s.bg, borderColor: s.border },
                  ]}
                >
                  <Feather name={s.icon as any} size={16} color={s.color} />
                  <Text style={[styles.statValue, { color: s.color }]}>
                    {s.value}
                  </Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Contact details */}
            <View style={styles.detailsGrid}>
              {[
                {
                  label: "Phone",
                  value: selectedDetail.phoneNumber || "-",
                  icon: "phone",
                },
                {
                  label: "Email",
                  value: selectedDetail.email || "-",
                  icon: "mail",
                },
                {
                  label: "Passenger ID",
                  value: selectedDetail._id,
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

            {/* Booking history */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Booking History</Text>
              {selectedDetail.bookingHistory.length === 0 ? (
                <Text style={styles.emptyText}>No bookings yet.</Text>
              ) : (
                <View style={styles.listWrap}>
                  {selectedDetail.bookingHistory.map((booking: BookingHistoryItem) => (
                    <View key={booking._id} style={styles.bookingItem}>
                      <View style={styles.bookingLeft}>
                        <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
                        <Text style={styles.bookingDate}>
                          {formatDate(booking.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.bookingRight}>
                        <StatusBadge
                          label={booking.status}
                          variant={bookingStatusVariant(booking.status)}
                        />
                        <View
                          style={[
                            styles.paymentDot,
                            {
                              backgroundColor: booking.paymentStatus
                                ? "#16a34a"
                                : "#ef4444",
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Reviews given */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Reviews Given</Text>
              {selectedDetail.reviews.length === 0 ? (
                <Text style={styles.emptyText}>No reviews submitted yet.</Text>
              ) : (
                <View style={styles.listWrap}>
                  {selectedDetail.reviews.map((review: ReviewItem) => (
                    <View key={review._id} style={styles.reviewItem}>
                      <View style={styles.reviewTopRow}>
                        <Text style={styles.reviewRating}>
                          {renderStars(review.rating)}
                        </Text>
                        <View style={styles.reviewMeta}>
                          <Text style={styles.reviewDate}>
                            {formatDate(review.createdAt)}
                          </Text>
                          {review.isEdited && (
                            <Text style={styles.editedTag}>edited</Text>
                          )}
                        </View>
                      </View>
                      <Text style={styles.reviewComment}>
                        {review.comment?.trim() || "No comment provided."}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>

      {/* ── Delete Confirm Overlay ── */}
      {confirmAction && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Feather name="trash-2" size={24} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Passenger</Text>
            <Text style={styles.confirmSub}>
              Are you sure you want to delete{" "}
              <Text style={{ fontWeight: "700" }}>
                {confirmAction.passengerName}
              </Text>
              ? This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => setConfirmAction(null)}
                style={styles.confirmCancel}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                style={styles.confirmActionBtn}
              >
                <Text style={styles.confirmActionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  actionButtons: { flexDirection: "row", gap: 8 },
  modalFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "flex-end",
  },
  modalContent: { gap: 20 },

  detailLoadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  detailLoadingText: { color: "#0f766e", fontSize: 14, fontWeight: "500" },

  passengerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  avatarBorder: { borderWidth: 2, borderColor: "#bfdbfe" },
  passengerInfo: { flex: 1, gap: 6 },
  passengerName: { fontSize: 20, fontWeight: "700", color: "#111827" },
  passengerSince: { fontSize: 13, color: "#6b7280" },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  warningBadgeText: { fontSize: 12, color: "#b45309", fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

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

  sectionCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#ffffff",
    gap: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  emptyText: { fontSize: 13, color: "#9ca3af" },
  listWrap: { gap: 8 },

  bookingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
  },
  bookingLeft: { gap: 2 },
  bookingCode: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  bookingDate: { fontSize: 12, color: "#64748b" },
  bookingRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  paymentDot: { width: 8, height: 8, borderRadius: 4 },

  reviewItem: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
    gap: 4,
  },
  reviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewRating: { fontSize: 13, color: "#b45309", fontWeight: "700" },
  reviewMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewDate: { fontSize: 12, color: "#64748b" },
  editedTag: {
    fontSize: 10,
    color: "#9ca3af",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: "600",
  },
  reviewComment: { fontSize: 13, color: "#1e293b", lineHeight: 19 },

  countBadge: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0891b2",
  },
  pointsBadge: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
  },

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
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
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
    backgroundColor: "#ef4444",
  },
  confirmActionText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

export default Passengers;