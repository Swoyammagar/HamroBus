import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  ToastAndroid,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDriver, DriverRecord } from "../../context/DriverContext";

type DisplayDriver = {
  driverId: string;
  name: string;
  phone: string;
  email: string;
  licenseNo: string;
  validationStatus?: string;
  isActive?: boolean;
  profileImgUrl?: string;
  raw: DriverRecord;
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
  } = useDriver();

  const [activeTab, setActiveTab] = useState<"all" | "requests">("all");
  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DisplayDriver | null>(null);

  const toDisplayDriver = (drv: DriverRecord): DisplayDriver => {
    const user = typeof drv.userId === "object" ? drv.userId : undefined;
    const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    return {
      driverId: drv.driverId,
      name: fullName || user?.email || drv.driverId,
      phone: user?.phoneNumber || "-",
      email: user?.email || "-",
      licenseNo: drv.licenseNo || "-",
      validationStatus: drv.validationStatus,
      isActive: drv.isActive,
      profileImgUrl: user?.profileImgUrl,
      raw: drv,
    };
  };

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

  useEffect(() => {
    fetchAllDrivers();
    fetchPendingDrivers();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refresh data when screen gains focus, without including functions in deps
      const refreshData = async () => {
        await fetchAllDrivers();
        await fetchPendingDrivers();
      };
      refreshData();
    }, [])
  );

  const handleApprove = async (driverId: string) => {
    const result = await approveDriver(driverId);
    if (result.success) {
      ToastAndroid.show(
        result.message || "Driver approved successfully!",
        ToastAndroid.SHORT
      );
      Alert.alert("Driver approved", result.message || "The driver can now access the app.");
    } else {
      ToastAndroid.show(
        result.message || "Failed to approve driver",
        ToastAndroid.SHORT
      );
      Alert.alert("Approval failed", result.message || "Please try again.");
    }
  };

  const handleReject = async (driverId: string) => {
    const result = await rejectDriver(driverId);
    if (result.success) {
      ToastAndroid.show(
        result.message || "Driver rejected successfully!",
        ToastAndroid.SHORT
      );
      Alert.alert("Driver rejected", result.message || "The driver has been notified.");
    } else {
      ToastAndroid.show(
        result.message || "Failed to reject driver",
        ToastAndroid.SHORT
      );
      Alert.alert("Rejection failed", result.message || "Please try again.");
    }
  };

  const renderRow = ({ item }: { item: DisplayDriver }) => (
    <View style={styles.row}>
      <View style={[styles.cell, styles.colBus]}>
        <Text style={styles.cellText}>{item.name}</Text>
      </View>
      <View style={[styles.cell, styles.colModel]}>
        <Text style={styles.cellText}>{item.phone}</Text>
      </View>
      <View style={[styles.cell, styles.colNum]}>
        <Text style={styles.cellText}>{item.email}</Text>
      </View>
      <View style={[styles.cell, styles.colStatus]}>
        <Text style={styles.ratingText}>{item.validationStatus || "-"}</Text>
      </View>
      <View style={[styles.cell, styles.colRoute]}>
        <Text style={styles.cellText}>{item.licenseNo}</Text>
      </View>
      <View style={[styles.cell, styles.colModel]}>
        <Text style={styles.cellText}>{item.isActive ? "Active" : "Inactive"}</Text>
      </View>
      <View style={[styles.cell, { minWidth: 140, flex: 1 }]}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => {
            setEditingDriver(item);
            setModalVisible(true);
          }}
        >
          <Text style={styles.viewBtnText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRequests = () => {
    if (loading) {
      return (
        <View style={styles.stateRow}>
          <ActivityIndicator size="small" color="#16a34a" />
          <Text style={styles.stateText}>Loading requests...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateRow}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchPendingDrivers} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (pendingDrivers.length === 0) {
      return <Text style={styles.stateText}>No pending requests</Text>;
    }

    return pendingDrivers.map((req) => {
      const user = typeof req.userId === "object" ? req.userId : undefined;
      const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

      return (
        <View key={req.driverId} style={styles.row}>
          <View style={[styles.cell, styles.colBus]}>
            <Text style={styles.cellText}>{fullName || user?.email || req.driverId}</Text>
          </View>
          <View style={[styles.cell, styles.colModel]}>
            <Text style={styles.cellText}>{user?.phoneNumber || "-"}</Text>
          </View>
          <View style={[styles.cell, styles.colNum]}>
            <Text style={styles.cellText}>{user?.email || "-"}</Text>
          </View>
          <View style={[styles.cell, styles.colRoute]}>
            <Text style={styles.cellText}>{req.licenseNo || "-"}</Text>
          </View>
          <View style={[styles.cell, { minWidth: 180, flex: 1 }]}>
            <View style={styles.requestActions}>
              <TouchableOpacity
                onPress={() => handleApprove(req.driverId)}
                style={[styles.actionBtn, styles.acceptBtn]}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReject(req.driverId)}
                style={[styles.actionBtn, styles.rejectBtn]}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "all" ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[styles.tabText, activeTab === "all" ? styles.tabTextActive : null]}>All Drivers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "requests" ? styles.tabBtnActive : null]}
          onPress={() => setActiveTab("requests")}
        >
          <Text style={[styles.tabText, activeTab === "requests" ? styles.tabTextActive : null]}>
            Driver Requests {pendingDrivers.length ? `(${pendingDrivers.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "all" ? (
        <>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, phone, or email..."
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={fetchAllDrivers} style={styles.clearBtn}>
              <Text style={styles.clearText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={[styles.row, styles.headerRow]}>
                <View style={[styles.cell, styles.colBus]}>
                  <Text style={styles.headerText}>Name</Text>
                </View>
                <View style={[styles.cell, styles.colModel]}>
                  <Text style={styles.headerText}>Phone</Text>
                </View>
                <View style={[styles.cell, styles.colNum]}>
                  <Text style={styles.headerText}>Email</Text>
                </View>
                <View style={[styles.cell, styles.colStatus]}>
                  <Text style={styles.headerText}>Status</Text>
                </View>
                <View style={[styles.cell, styles.colRoute]}>
                  <Text style={styles.headerText}>License</Text>
                </View>
                <View style={[styles.cell, styles.colModel]}>
                  <Text style={styles.headerText}>Active</Text>
                </View>
                <View style={[styles.cell, { minWidth: 140, flex: 1 }]}>
                  <Text style={styles.headerText}>Actions</Text>
                </View>
              </View>

              {loading && (
                <View style={styles.stateRow}>
                  <ActivityIndicator size="small" color="#16a34a" />
                  <Text style={styles.stateText}>Loading drivers...</Text>
                </View>
              )}

              {error && !loading && (
                <View style={styles.stateRow}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={fetchAllDrivers} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!loading && !error && (
                <FlatList
                  data={filteredDrivers}
                  keyExtractor={(item) => item.driverId}
                  renderItem={renderRow}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  style={{ width: "100%" }}
                />
              )}
            </View>
          </ScrollView>
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <View style={[styles.cell, styles.colBus]}>
                <Text style={styles.headerText}>Name</Text>
              </View>
              <View style={[styles.cell, styles.colModel]}>
                <Text style={styles.headerText}>Phone</Text>
              </View>
              <View style={[styles.cell, styles.colNum]}>
                <Text style={styles.headerText}>Email</Text>
              </View>
              <View style={[styles.cell, styles.colRoute]}>
                <Text style={styles.headerText}>License</Text>
              </View>
              <View style={[styles.cell, { minWidth: 180, flex: 1 }]}>
                <Text style={styles.headerText}>Actions</Text>
              </View>
            </View>

            {renderRequests()}
          </View>
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.avatarWrap}>
                <Image
                  source={editingDriver?.profileImgUrl ? { uri: editingDriver.profileImgUrl } : require("../../../utils/MainLogo.png")}
                  style={styles.avatarLarge}
                />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.detailName}>{editingDriver?.name ?? ""}</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      editingDriver?.isActive ? styles.statusActiveBadge : styles.statusNeutralBadge,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {editingDriver?.validationStatus || "Unknown"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              <View style={styles.detailGrid}>
                <View style={styles.gridCol}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{editingDriver?.phone ?? "-"}</Text>

                  <Text style={[styles.detailLabel, { marginTop: 12 }]}>Email</Text>
                  <Text style={styles.detailValue}>{editingDriver?.email ?? "-"}</Text>

                  <Text style={[styles.detailLabel, { marginTop: 12 }]}>License</Text>
                  <Text style={styles.detailValue}>{editingDriver?.licenseNo ?? "-"}</Text>
                </View>

                <View style={styles.gridCol}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{editingDriver?.validationStatus ?? "-"}</Text>

                  <Text style={[styles.detailLabel, { marginTop: 12 }]}>Active</Text>
                  <Text style={styles.detailValue}>{editingDriver?.isActive ? "Yes" : "No"}</Text>

                  <Text style={[styles.detailLabel, { marginTop: 12 }]}>Driver ID</Text>
                  <Text style={styles.detailValue}>{editingDriver?.driverId ?? "-"}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setEditingDriver(null);
                }}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tabBtnActive: {
    backgroundColor: "#10b98122",
    borderColor: "#10b981",
  },
  tabText: { color: "#374151", fontWeight: "600" },
  tabTextActive: { color: "#065f46" },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  searchInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    color: "#111827",
  },
  clearBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 8 },
  clearText: { color: "#374151" },
  table: {
    minWidth: "auto",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  headerRow: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    width: "100%",
  },
  cell: {
    paddingHorizontal: 8,
    justifyContent: "center",
    flex: 1,
  },
  colBus: { flex: 1.5 },
  colModel: { flex: 1 },
  colNum: { flex: 1 },
  colStatus: { flex: 0.7 },
  colRoute: { flex: 1.2 },
  headerText: { fontWeight: "700", color: "#374151" },
  cellText: { color: "#111827" },
  separator: { height: 1, backgroundColor: "#eef2f7", marginHorizontal: 6 },
  ratingText: { color: "#065f46", fontWeight: "600", textTransform: "capitalize" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    maxHeight: 520,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  detailName: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: 8, color: "#111827" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  detailLabel: { color: "#6b7280", fontSize: 13 },
  detailValue: { color: "#111827", fontSize: 14, maxWidth: "65%", textAlign: "right" },
  modalHeader: { flexDirection: "row", alignItems: "center", paddingBottom: 8 },
  avatarWrap: { width: 96, alignItems: "center", justifyContent: "center" },
  avatarLarge: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: "#e5e7eb" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusActiveBadge: { backgroundColor: "#ECFDF5" },
  statusNeutralBadge: { backgroundColor: "#F3F4F6" },
  statusBadgeText: { color: "#065f46", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#eef2f7", marginVertical: 10 },
  detailGrid: { flexDirection: "row", gap: 16 },
  gridCol: { flex: 1 },
  closeBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#f3f4f6", borderRadius: 8 },
  closeText: { color: "#374151" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  statusRating: { marginLeft: 10, color: "#6b7280" },
  modalFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  viewBtn: {
    backgroundColor: "#eef2ff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  viewBtnText: { color: "#4338ca", fontWeight: "600" },
  stateRow: { padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  stateText: { color: "#374151" },
  errorText: { color: "#b91c1c", flex: 1 },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#eef2ff", borderRadius: 6 },
  retryText: { color: "#4338ca", fontWeight: "600" },
  requestActions: { flexDirection: "row", gap: 8 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  acceptBtn: { backgroundColor: "#dcfce7" },
  rejectBtn: { backgroundColor: "#fee2e2" },
  acceptText: { color: "#15803d", fontWeight: "600" },
  rejectText: { color: "#b91c1c", fontWeight: "600" },
});

export { Drivers };
