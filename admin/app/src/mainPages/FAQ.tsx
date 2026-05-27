import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useAdminFAQs, type FAQRecord, type FAQRole } from "../../context/domains";
import { Tabs } from "@/app/components/ui/Tabs";
import Pagination from "@/app/components/ui/Pagination";
import { Modal } from "@/app/components/ui/Modal";
import { SearchBar } from "../../components/ui";


const RolePill: React.FC<{
  label: string;
  active: boolean;
  count?: number;
  onPress: () => void;
  color: string;
}> = ({ label, active, count, onPress, color }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.pill,
      active && { backgroundColor: color, borderColor: color },
    ]}
    activeOpacity={0.75}
  >
    <Text style={[styles.pillText, active && styles.pillTextActive]}>
      {label}
    </Text>
    {count !== undefined && (
      <View style={[styles.pillBadge, active && styles.pillBadgeActive]}>
        <Text style={[styles.pillBadgeText, active && styles.pillBadgeTextActive]}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

const FAQCard: React.FC<{
  faq: FAQRecord;
  index: number;
  onDelete: (id: string) => void;
  onOpen: (faq: FAQRecord) => void;
  deleting: boolean;
}> = ({ faq, index, onDelete, onOpen, deleting }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        delay: index * 55,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        delay: index * 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isDriver = faq.role === "driver";
  const roleColor = isDriver ? "#0d9488" : "#7c3aed";
  const roleLabel = isDriver ? "Driver" : "Passenger";
  const roleIcon: any = isDriver ? "truck" : "user";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[styles.cardAccent, { backgroundColor: roleColor }]} />

      <TouchableOpacity
        style={styles.cardBody}
        onPress={() => onOpen(faq)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.roleTag, { backgroundColor: `${roleColor}18`, borderColor: `${roleColor}40` }]}>
            <Feather name={roleIcon} size={11} color={roleColor} />
            <Text style={[styles.roleTagText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(faq.createdAt)}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {faq.title || "Untitled FAQ"}
        </Text>

        {faq.message ? (
          <Text style={styles.cardMessage} numberOfLines={3}>
            {faq.message}
          </Text>
        ) : null}

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.cardUserInfo}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {(faq.name || faq.email || "?")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardUserText}>
              <Text style={styles.cardUserName} numberOfLines={1}>
                {faq.name || "Anonymous"}
              </Text>
              {faq.email ? (
                <Text style={styles.cardUserEmail} numberOfLines={1}>
                  {faq.email}
                </Text>
              ) : null}
              {faq.phoneNumber ? (
                <Text style={styles.cardUserPhone} numberOfLines={1}>
                  {faq.phoneNumber}
                </Text>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            onPress={(event: any) => {
              event?.stopPropagation?.();
              if (faq._id) onDelete(faq._id);
            }}
            style={styles.deleteBtn}
            disabled={deleting}
            activeOpacity={0.7}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Feather name="trash-2" size={15} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const EmptyState: React.FC<{ role: string; query: string }> = ({ role, query }) => (
  <View style={styles.emptyWrap}>
    <View style={styles.emptyIconWrap}>
      <Feather name="inbox" size={36} color="#cbd5e1" />
    </View>
    <Text style={styles.emptyTitle}>No FAQs found</Text>
    <Text style={styles.emptySubtitle}>
      {query
        ? `No results for "${query}"`
        : role !== "all"
        ? `No ${role} FAQs yet`
        : "No FAQs in the system yet"}
    </Text>
  </View>
);


const FAQsPage: React.FC = () => {
  const {
    faqs,
    pagination,
    loading,
    error,
    fetchAllFAQs,
    fetchFAQsByRole,
    deleteFAQ,
    goToPage,
    clearError,
  } = useAdminFAQs();

  const [activeRole, setActiveRole] = useState<"all" | FAQRole>("all");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQRecord | null>(null);

  const driverCount = faqs.filter((f) => f.role === "driver").length;
  const passengerCount = faqs.filter((f) => f.role === "passenger").length;

  const formatDetailDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  useFocusEffect(
    useCallback(() => {
      if (activeRole === "all") {
        fetchAllFAQs({ page: 1 });
      } else {
        fetchFAQsByRole(activeRole, 1);
      }
    }, [activeRole])
  );

  const handleRoleChange = useCallback(
    (role: "all" | FAQRole) => {
      setActiveRole(role);
      setQuery("");
      if (role === "all") {
        fetchAllFAQs({ page: 1 });
      } else {
        fetchFAQsByRole(role, 1);
      }
    },
    [fetchAllFAQs, fetchFAQsByRole]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const filters = activeRole !== "all" ? { role: activeRole } : {};
      goToPage(page, filters);
    },
    [activeRole, goToPage]
  );

  const handleDeleteConfirm = useCallback(
    async (id: string) => {
      setConfirmDeleteId(null);
      setDeletingId(id);
      await deleteFAQ(id);
      setDeletingId(null);
    },
    [deleteFAQ]
  );

  const filteredFAQs = query.trim()
    ? faqs.filter((faq) => {
        const q = query.toLowerCase();
        return (
          faq.title?.toLowerCase().includes(q) ||
          faq.message?.toLowerCase().includes(q) ||
          faq.name?.toLowerCase().includes(q) ||
          faq.email?.toLowerCase().includes(q)
        );
      })
    : faqs;

  const handleRefresh = useCallback(() => {
    if (activeRole === "all") {
      fetchAllFAQs({ page: pagination.page });
    } else {
      fetchFAQsByRole(activeRole, pagination.page);
    }
  }, [activeRole, pagination.page, fetchAllFAQs, fetchFAQsByRole]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>FAQ Submissions</Text>
          <Text style={styles.headerSub}>
            {pagination.total} total · page {pagination.page} of{" "}
            {pagination.pages || 1}
          </Text>
        </View>
      </View>

      <View className="ml-5">
        <Tabs
          tabs={[
            { key: 'all', label: 'All FAQs' },
            { key: 'driver', label: 'Drivers', badge: driverCount },
            { key: 'passenger', label: 'Passengers', badge: passengerCount },
        ]}
        activeTab={activeRole}
        onTabChange={(key) => handleRoleChange(key as 'all' | FAQRole)}
      />
      </View>

      <View style={styles.searchBarWrapper}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title, message, name or email…"
          onClear={() => setQuery("")}
          showRefresh
          onRefresh={handleRefresh}
        />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={14} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Feather name="x" size={14} color="#b91c1c" />
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0d9488" />
          <Text style={styles.loadingText}>Loading FAQs…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredFAQs.length === 0 ? (
            <EmptyState role={activeRole} query={query} />
          ) : (
            <>
              {filteredFAQs.map((faq, i) => (
                <FAQCard
                  key={faq._id || faq.faqId || String(i)}
                  faq={faq}
                  index={i}
                  onDelete={(id) => setConfirmDeleteId(id)}
                  onOpen={setSelectedFAQ}
                  deleting={deletingId === faq._id}
                />
              ))}

              {!query && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </ScrollView>
      )}

      {confirmDeleteId && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Feather name="trash-2" size={24} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete FAQ?</Text>
            <Text style={styles.confirmSub}>
              This action cannot be undone. The FAQ will be permanently removed.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => setConfirmDeleteId(null)}
                style={styles.confirmCancel}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteConfirm(confirmDeleteId)}
                style={styles.confirmDelete}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={!!selectedFAQ}
        onClose={() => setSelectedFAQ(null)}
        title={selectedFAQ?.title || "FAQ Details"}
        size="sm"
        containerStyle={styles.detailModal}
      >
        {selectedFAQ ? (
          <View style={styles.detailContent}>
            <View style={styles.detailTopRow}>
              <View
                style={[
                  styles.roleTag,
                  {
                    backgroundColor: `${selectedFAQ.role === "driver" ? "#0d9488" : "#7c3aed"}18`,
                    borderColor: `${selectedFAQ.role === "driver" ? "#0d9488" : "#7c3aed"}40`,
                  },
                ]}
              >
                <Feather
                  name={selectedFAQ.role === "driver" ? "truck" : "user"}
                  size={11}
                  color={selectedFAQ.role === "driver" ? "#0d9488" : "#7c3aed"}
                />
                <Text
                  style={[
                    styles.roleTagText,
                    { color: selectedFAQ.role === "driver" ? "#0d9488" : "#7c3aed" },
                  ]}
                >
                  {selectedFAQ.role === "driver" ? "Driver" : "Passenger"}
                </Text>
              </View>
              <Text style={styles.cardDate}>{formatDetailDate(selectedFAQ.createdAt)}</Text>
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Submitted by</Text>
              <Text style={styles.detailValue}>{selectedFAQ.name || "Anonymous"}</Text>
              {selectedFAQ.email ? <Text style={styles.detailSubValue}>{selectedFAQ.email}</Text> : null}
              {selectedFAQ.phoneNumber ? <Text style={styles.detailSubValue}>{selectedFAQ.phoneNumber}</Text> : null}
            </View>
            <View style={styles.detailBlock}>
              <Text style={styles.detailLabel}>Message</Text>
              <Text style={styles.detailMessage}>
                {selectedFAQ.message || "No message provided."}
              </Text>
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  refreshBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f0fdfa",
    borderWidth: 1,
    borderColor: "#0d9488",
  },

  pillRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  pillTextActive: {
    color: "#fff",
  },
  pillBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignItems: "center",
  },
  pillBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  pillBadgeTextActive: {
    color: "#fff",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#b91c1c",
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    alignSelf: "stretch",
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardDate: {
    fontSize: 11,
    color: "#94a3b8",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 21,
  },
  cardMessage: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
  },
  cardUserText: {
    flex: 1,
    gap: 1,
  },
  cardUserName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  cardUserEmail: {
    fontSize: 11,
    color: "#64748b",
  },
  cardUserPhone: {
    fontSize: 11,
    color: "#64748b",
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },

  detailModal: {
    maxHeight: "75%",
  },
  detailContent: {
    gap: 14,
  },
  detailTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  detailBlock: {
    gap: 5,
  },
  detailLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
  },
  detailSubValue: {
    fontSize: 12,
    color: "#64748b",
  },
  detailMessage: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 21,
  },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    maxWidth: 260,
  },

  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnActive: {
    backgroundColor: "#0d9488",
    borderColor: "#0d9488",
  },
  pageBtnDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: "#f1f5f9",
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  pageBtnTextActive: {
    color: "#fff",
  },
  pageDots: {
    fontSize: 14,
    color: "#94a3b8",
    paddingHorizontal: 2,
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
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
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
  confirmCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  confirmDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  searchBarWrapper: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
});

export default FAQsPage;
