import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Picker as RNPicker } from '@react-native-picker/picker';
import { Table, Modal, Input, Button, EmptyState, type TableColumn } from '../../components/ui';
import {
  useNotification,
  type NotificationAudience,
  type NotificationRecord,
  type NotificationType,
  type NotificationSeverity,
} from '../../context/domains';

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
      if (filter === 'Drivers') return n.targetAudience === 'drivers';
      if (filter === 'Passengers') return n.targetAudience === 'passengers';
      return true;
    });

    return [...byFilter].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filter, notifications]);

  const audienceLabel = (audience: NotificationAudience) => {
    if (audience === 'all') return 'All Users';
    if (audience === 'drivers') return 'Drivers';
    return 'Passengers';
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
      Alert.alert('Validation', 'Please fill both title and message.');
      return;
    }

    const result = await sendNotification(payload);
    if (!result.success) {
      Alert.alert('Failed', result.message);
      return;
    }

    setTitle('');
    setMessage('');
    setTarget('all');
    setType('info');
    setSeverity('medium');
    setModalVisible(false);
    Alert.alert('Success', result.message);
  };

  const handleDeleteConfirmed = async (item: NotificationRecord) => {
    const deleteId = item._id || item.notificationId;
    if (!deleteId) {
      Alert.alert('Failed', 'Notification id is missing.');
      return;
    }

    const result = await deleteNotification(deleteId);
    if (!result.success) {
      Alert.alert('Failed', result.message);
      return;
    }

    Alert.alert('Success', result.message);
  };

  const handleDelete = (item: NotificationRecord) => {
    if (Platform.OS === 'web') {
      const ok = globalThis.confirm?.('Do you want to delete this notification?') ?? false;
      if (ok) {
        handleDeleteConfirmed(item);
      }
      return;
    }

    Alert.alert('Delete notification', 'Do you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          handleDeleteConfirmed(item);
        },
      },
    ]);
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
      render: (item) => (
        <View
          style={[
            styles.badge,
            item.type === 'alert'
              ? styles.typeAlert
              : item.type === 'info'
                ? styles.typeInfo
                : item.type === 'maintenance'
                  ? styles.typeMaintenance
                  : item.type === 'announcement'
                    ? styles.typeAnnouncement
                    : styles.typeEmergency,
          ]}
        >
          <Text style={styles.badgeText}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
        </View>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      width: 95,
      render: (item) => (
        <View
          style={[
            styles.badge,
            item.severity === 'low'
              ? styles.severityLow
              : item.severity === 'medium'
                ? styles.severityMedium
                : item.severity === 'high'
                  ? styles.severityHigh
                  : styles.severityCritical,
          ]}
        >
          <Text style={styles.badgeText}>{item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}</Text>
        </View>
      ),
    },
    {
      key: 'targetAudience',
      header: 'Audience',
      width: 110,
      render: (item) => (
        <View
          style={[
            styles.badge,
            item.targetAudience === 'all'
              ? styles.badgeAll
              : item.targetAudience === 'drivers'
                ? styles.badgeDrivers
                : styles.badgePassengers,
          ]}
        >
          <Text style={styles.badgeText}>{audienceLabel(item.targetAudience)}</Text>
        </View>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      width: 160,
      render: (item) => new Date(item.createdAt).toLocaleString(),
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
        <Button variant="primary" onPress={() => setModalVisible(true)}>
          + Send
        </Button>
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
          onValueChange={(value) =>
            setFilter(value as 'All' | 'Sent' | 'Received' | 'Drivers' | 'Passengers')
          }
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
          {filteredNotifications.length > 0 ? (
            <Table
              data={filteredNotifications}
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
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeAll: {
    backgroundColor: '#2563eb',
  },
  badgeDrivers: {
    backgroundColor: '#ea580c',
  },
  badgePassengers: {
    backgroundColor: '#059669',
  },
  typeAlert: {
    backgroundColor: '#f59e0b',
  },
  typeInfo: {
    backgroundColor: '#3b82f6',
  },
  typeMaintenance: {
    backgroundColor: '#8b5cf6',
  },
  typeAnnouncement: {
    backgroundColor: '#06b6d4',
  },
  typeEmergency: {
    backgroundColor: '#dc2626',
  },
  severityLow: {
    backgroundColor: '#10b981',
  },
  severityMedium: {
    backgroundColor: '#f59e0b',
  },
  severityHigh: {
    backgroundColor: '#f97316',
  },
  severityCritical: {
    backgroundColor: '#dc2626',
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
});
