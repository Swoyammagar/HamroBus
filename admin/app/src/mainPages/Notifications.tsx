import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Picker as RNPicker } from '@react-native-picker/picker';
import { Table, Modal, Input, Button, EmptyState, FeedbackModal, type TableColumn } from '../../components/ui';
import {
  useNotification,
  type NotificationAudience,
  type NotificationRecord,
  type NotificationType,
  type NotificationSeverity,
} from '../../context/domains';
import Pagination from '../../components/ui/Pagination';
import Feather from '@expo/vector-icons/build/Feather';

const Notifications = () => {
  const {
    notifications,
    loading,
    sending,
    error,
    fetchNotifications,
    sendNotification,
    deleteNotification,
    clearError,
    unreadIncomingCount,
    markAllAsRead,
  } = useNotification();

  const [filter, setFilter] = useState<
    'All' | 'Sent' | 'Received' | 'Drivers' | 'Passengers'
  >('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<NotificationAudience>('all');
  const [type, setType] = useState<NotificationType>('info');
  const [severity, setSeverity] = useState<NotificationSeverity>('medium');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<NotificationRecord | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; title?: string; message: string } | null>(null);
  const ITEMS_PER_PAGE = 10;

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const filteredNotifications = useMemo(() => {
    const byFilter = notifications.filter((n) => {
      if (filter === 'All') return true;
      if (filter === 'Sent') return n.sentBy === 'admin';
      if (filter === 'Received') return n.sentBy !== 'admin';
      if (filter === 'Drivers') return n.targetAudience === 'specific_user';
      if (filter === 'Passengers') return n.targetAudience === 'passengers';
      return true;
    });

    const sorted = [...byFilter].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
    const safePage = Math.min(currentPage, totalPages || 1);
    const paginated = sorted.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    return { data: paginated, total: sorted.length, totalPages };
  }, [filter, notifications, currentPage]);

  const audienceLabel = (audience: NotificationAudience) => {
    if (audience === 'all') return 'All Users';
    if (audience === 'drivers') return 'Drivers';
    if (audience === 'passengers') return 'Passengers';
    if (audience === 'admins') return 'Admins';
    if (audience === 'specific_user') return 'Specific User';
    if (audience === 'specific_route') return 'Specific Route';
    if (audience === 'specific_bus') return 'Specific Bus';
    return 'Unknown';
  };

  const handleSend = async () => {
    const payload = {
      title: title.trim(),
      message: message.trim(),
      targetAudience: target,
      type,
      severity,
    };

    if (!payload.title || !payload.message) {
      setFeedback({ type: 'warning', title: 'Missing Details', message: 'Please fill both title and message.' });
      return;
    }

    const result = await sendNotification(payload);
    if (!result.success) {
      setFeedback({ type: 'error', title: 'Send Failed', message: result.message });
      return;
    }

    setTitle('');
    setMessage('');
    setTarget('all');
    setType('info');
    setSeverity('medium');
    setModalVisible(false);
    setFeedback({ type: 'success', title: 'Notification Sent', message: result.message });
  };

 const handleDeleteConfirmed = async (item: NotificationRecord) => {
  const deleteId = item._id || item.notificationId;
  if (!deleteId) {
    setFeedback({ type: 'error', title: 'Delete Failed', message: 'Notification id is missing.' });
    return;
  }
  const result = await deleteNotification(deleteId);
  setConfirmDeleteItem(null);
  if (!result.success) {
    setFeedback({ type: 'error', title: 'Delete Failed', message: result.message });
  } else {
    setFeedback({ type: 'success', title: 'Notification Deleted', message: result.message });
  }
};

  const handleDelete = (item: NotificationRecord) => {
    setConfirmDeleteItem(item);
  };

  const columns: TableColumn<NotificationRecord>[] = [
    {
      key: 'sentBy',
      header: 'From',
      width: 72,
      render: (item) => (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.sentBy === 'admin' ? 'A' : item.sentBy === 'driver' ? 'D' : 'S'}
          </Text>
        </View>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      flex: 1.2,
    },
    {
      key: 'message',
      header: 'Message',
      flex: 2,
      render: (item) => (
        <Text style={styles.messageCell} numberOfLines={2}>
          {item.message}
        </Text>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      width: 95,
      render: (item) => {
        const map: Record<string, { bg: string; text: string }> = {
          alert:        { bg: '#fef3c7', text: '#92400e' },
          info:         { bg: '#dbeafe', text: '#1e40af' },
          maintenance:  { bg: '#ede9fe', text: '#5b21b6' },
          announcement: { bg: '#cffafe', text: '#155e75' },
          emergency:    { bg: '#fee2e2', text: '#991b1b' },
        };
        const s = map[item.type] ?? { bg: '#f1f5f9', text: '#475569' };
        return (
          <View style={[styles.softBadge, { backgroundColor: s.bg, borderColor: s.bg }]}>
            <Text style={[styles.softBadgeText, { color: s.text }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'severity',
      header: 'Severity',
      width: 95,
      render: (item) => {
        const map: Record<string, { dot: string; text: string }> = {
          low:      { dot: '#10b981', text: '#065f46' },
          medium:   { dot: '#f59e0b', text: '#78350f' },
          high:     { dot: '#f97316', text: '#7c2d12' },
          critical: { dot: '#dc2626', text: '#7f1d1d' },
        };
        const s = map[item.severity] ?? { dot: '#94a3b8', text: '#475569' };
        return (
          <View style={styles.dotBadgeRow}>
            <View style={[styles.dotIndicator, { backgroundColor: s.dot }]} />
            <Text style={[styles.dotBadgeText, { color: s.text }]}>
              {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'targetAudience',
      header: 'Audience',
      width: 110,
      render: (item) => {
        const map: Record<string, { border: string; text: string }> = {
          all:            { border: '#2563eb', text: '#1e40af' },
          drivers:        { border: '#ea580c', text: '#9a3412' },
          passengers:     { border: '#059669', text: '#065f46' },
          admins:         { border: '#7c3aed', text: '#4c1d95' },
          specific_user:  { border: '#64748b', text: '#334155' },
          specific_route: { border: '#64748b', text: '#334155' },
          specific_bus:   { border: '#64748b', text: '#334155' },
        };
        const s = map[item.targetAudience] ?? { border: '#94a3b8', text: '#475569' };
        return (
          <View style={[styles.outlineBadge, { borderColor: s.border }]}>
            <Text style={[styles.outlineBadgeText, { color: s.text }]}>
              {audienceLabel(item.targetAudience)}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Date',
      width: 130,
      render: (item) => {
        const d = new Date(item.createdAt);
        return (
          <View style={styles.dateCell}>
            <Text style={styles.dateLine}>
              {d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={styles.timeLine}>
              {d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      width: 90,
      render: (item) => (
        <Button variant="danger" size="sm" onPress={() => handleDelete(item)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerText}>Notifications</Text>
          <Text style={styles.subHeader}>Send real-time announcements to users</Text>
        </View>
        <View style={styles.headerActions}>
          <Button variant="outline" onPress={markAllAsRead} disabled={unreadIncomingCount === 0}>
            Mark all as read
          </Button>
          <Button variant="primary" onPress={() => setModalVisible(true)}>
            + Send
          </Button>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
          <Button variant="outline" size="sm" onPress={clearError}>
            Dismiss
          </Button>
        </View>
      ) : null}

      <View style={styles.pickerWrapper}>
        <RNPicker
          selectedValue={filter}
          onValueChange={(value) => {
            setFilter(value as 'All' | 'Sent' | 'Received' | 'Drivers' | 'Passengers');
            setCurrentPage(1);
          }}
          style={styles.picker}
        >
          <RNPicker.Item label="All Notifications" value="All" />
          <RNPicker.Item label="Sent by Admin" value="Sent" />
          <RNPicker.Item label="Received" value="Received" />
          <RNPicker.Item label="Drivers Audience" value="Drivers" />
          <RNPicker.Item label="Passengers Audience" value="Passengers" />
        </RNPicker>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#27AE60" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          style={styles.listArea}
        >
            {filteredNotifications.data.length > 0 ? (
              <Table
                data={filteredNotifications.data}
                columns={columns}
                keyExtractor={(item) => item._id}
                emptyMessage="No notifications found"
              />
            ) : (
              <EmptyState
                title="No notifications"
                description="Send your first announcement to users"
              />
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={filteredNotifications.totalPages}
              onPageChange={setCurrentPage}
            />
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Send Notification"
        size="md"
        footer={
          <View style={styles.modalFooter}>
            <Button variant="secondary" onPress={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button variant="success" onPress={handleSend} loading={sending}>
              Send
            </Button>
          </View>
        }
      >
        <View style={styles.modalBody}>
          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter notification title"
          />

          <Input
            label="Message"
            value={message}
            onChangeText={setMessage}
            placeholder="Enter notification message"
            multiline
            numberOfLines={4}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Send To</Text>
            <View style={styles.pickerWrapperModal}>
              <RNPicker
                selectedValue={target}
                onValueChange={(v) => setTarget(v as NotificationAudience)}
                style={styles.picker}
              >
                <RNPicker.Item label="All Users" value="all" />
                <RNPicker.Item label="Drivers Only" value="drivers" />
                <RNPicker.Item label="Passengers Only" value="passengers" />
              </RNPicker>
            </View>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Type</Text>
            <View style={styles.pickerWrapperModal}>
              <RNPicker
                selectedValue={type}
                onValueChange={(v) => setType(v as NotificationType)}
                style={styles.picker}
              >
                <RNPicker.Item label="Info" value="info" />
                <RNPicker.Item label="Alert" value="alert" />
                <RNPicker.Item label="Maintenance" value="maintenance" />
                <RNPicker.Item label="Announcement" value="announcement" />
                <RNPicker.Item label="Emergency" value="emergency" />
              </RNPicker>
            </View>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Severity</Text>
            <View style={styles.pickerWrapperModal}>
              <RNPicker
                selectedValue={severity}
                onValueChange={(v) => setSeverity(v as NotificationSeverity)}
                style={styles.picker}
              >
                <RNPicker.Item label="Low" value="low" />
                <RNPicker.Item label="Medium" value="medium" />
                <RNPicker.Item label="High" value="high" />
                <RNPicker.Item label="Critical" value="critical" />
              </RNPicker>
            </View>
          </View>
        </View>
      </Modal>
      {confirmDeleteItem && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Feather name="trash-2" size={24} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Notification?</Text>
            <Text style={styles.confirmSub}>
              This will permanently remove "{confirmDeleteItem.title}". This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => setConfirmDeleteItem(null)}
                style={styles.confirmCancel}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteConfirmed(confirmDeleteItem)}
                style={styles.confirmDelete}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      <FeedbackModal
        visible={!!feedback}
        type={feedback?.type}
        title={feedback?.title}
        message={feedback?.message || ''}
        onClose={() => setFeedback(null)}
      />
    </View>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subHeader: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  pickerWrapperModal: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#6b7280',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#374151', fontWeight: '700', fontSize: 13 },
  typeAlert: {
    backgroundColor: '#f59e0b',
  },
  messageCell: {
    color: '#111827',
    fontSize: 13,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 8,
  },
  modalBody: {
    gap: 12,
  },
  errorBar: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#991b1b',
    flex: 1,
    marginRight: 8,
  },
  listArea: {
    flex: 1,
  },
  confirmOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(15,23,42,0.55)',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
},
confirmCard: {
  width: '82%',
  backgroundColor: '#fff',
  borderRadius: 20,
  padding: 24,
  alignItems: 'center',
  gap: 10,
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 8 },
  elevation: 12,
},
confirmIconWrap: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '#fef2f2',
  borderWidth: 1,
  borderColor: '#fecaca',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 4,
},
confirmTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: '#0f172a',
},
confirmSub: {
  fontSize: 13,
  color: '#64748b',
  textAlign: 'center',
  lineHeight: 19,
},
confirmActions: {
  flexDirection: 'row',
  gap: 10,
  marginTop: 6,
  width: '100%',
},
confirmCancel: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 12,
  backgroundColor: '#f1f5f9',
  alignItems: 'center',
},
confirmCancelText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#334155',
},
confirmDelete: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 12,
  backgroundColor: '#ef4444',
  alignItems: 'center',
},
confirmDeleteText: {
  fontSize: 14,
  fontWeight: '700',
  color: '#fff',
},
softBadge: {
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 4,
  alignSelf: 'flex-start',
  borderWidth: 1,
},
softBadgeText: {
  fontSize: 12,
  fontWeight: '600',
},
dotBadgeRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
dotIndicator: {
  width: 7,
  height: 7,
  borderRadius: 999,
},
dotBadgeText: {
  fontSize: 13,
  fontWeight: '600',
},
outlineBadge: {
  borderRadius: 6,
  borderWidth: 1.5,
  paddingHorizontal: 8,
  paddingVertical: 4,
  alignSelf: 'flex-start',
},
outlineBadgeText: {
  fontSize: 12,
  fontWeight: '600',
},
dateCell: {
  gap: 2,
},
dateLine: {
  fontSize: 13,
  fontWeight: '600',
  color: '#1e293b',
},
timeLine: {
  fontSize: 11,
  color: '#94a3b8',
},
});
