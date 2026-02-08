import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Picker as RNPicker } from '@react-native-picker/picker';
import { notifications as initialNotifications } from "../data/dummyData";
import { Table, Modal, Input, Button, EmptyState, type TableColumn } from '../../components/ui';

const Notifications = () => {
  const [filter, setFilter] = useState("All");
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sentBy, setSentBy] = useState("admin");
  const [target, setTarget] = useState<'drivers'|'passengers'|'all'>('all');

  type Notification = {
    id: string;
    title: string;
    message: string;
    date: string;
    sentby: string;
    target?: 'drivers' | 'passengers' | 'all';
  };

  // initial mapped notifications with consistent shape
  const mapped = initialNotifications.map((it) => ({
    id: it._id,
    title: it.title,
    message: it.message,
    date: it.createdAt,
    sentby: it.sentby,
    target: it.target ?? 'all',
  })) as Notification[];

  const [items, setItems] = useState<Notification[]>(mapped);

  const filteredNotifications = useMemo(() => {
    const filtered = filter === "All" ? items : items.filter((n) => n.sentby === (filter === 'Sent' ? 'admin' : 'driver'));
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filter, items]);

  // Filter options for picker
  const filterOptions = [
    { label: 'All', value: 'All' },
    { label: 'Sent', value: 'Sent' },
    { label: 'Received', value: 'Received' },
  ];

  // Target options for send modal
  const targetOptions = [
    { label: 'To All', value: 'all' },
    { label: 'Drivers', value: 'drivers' },
    { label: 'Passengers', value: 'passengers' },
  ];

  // Table columns for notifications
  const columns: TableColumn<Notification>[] = [
    {
      key: 'sentby',
      header: 'From',
      width: 80,
      render: (item) => (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.sentby === 'admin' ? 'A' : 'D'}</Text>
        </View>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      flex: 1.5,
    },
    {
      key: 'message',
      header: 'Message',
      flex: 2,
    },
    {
      key: 'date',
      header: 'Date',
      flex: 1,
      render: (item) => new Date(item.date).toLocaleString(),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerText}>Recent Notifications</Text>
          <Text style={styles.subHeader}>Manage messages sent to drivers and admins</Text>
        </View>
        <Button variant="primary" onPress={() => setModalVisible(true)}>
          + Send
        </Button>
      </View>

      {/* Filter Dropdown */}
      <View style={styles.pickerWrapper}>
        <RNPicker
          selectedValue={filter}
          onValueChange={(value) => setFilter(value as string)}
          style={styles.picker}
        >
          <RNPicker.Item label="All Notifications" value="All" />
          <RNPicker.Item label="Sent by Me" value="Sent" />
          <RNPicker.Item label="Received" value="Received" />
        </RNPicker>
      </View>

      {/* Notifications Table */}
      {filteredNotifications.length > 0 ? (
        <Table
          data={filteredNotifications}
          columns={columns}
          keyExtractor={(item) => item.id.toString()}
          emptyMessage="No notifications found"
        />
      ) : (
        <EmptyState title="No notifications found" description="Try adjusting your filter settings" />
      )}

      {/* Send Notification Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Send Notification"
        size="md"
        footer={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant="secondary" onPress={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onPress={() => {
                if (!title.trim() || !message.trim()) return;
                const newItem: Notification = {
                  id: `n_${Date.now()}`,
                  title: title.trim(),
                  message: message.trim(),
                  date: new Date().toISOString(),
                  sentby: sentBy,
                  target: target,
                };
                setItems((s) => [newItem, ...s]);
                setTitle('');
                setMessage('');
                setSentBy('admin');
                setTarget('all');
                setModalVisible(false);
              }}
            >
              Send
            </Button>
          </View>
        }
      >
        <View style={{ gap: 12 }}>
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
            <View style={styles.pickerWrapper}>
              <RNPicker
                selectedValue={target}
                onValueChange={(v) => setTarget(v as 'all' | 'drivers' | 'passengers')}
                style={styles.picker}
              >
                <RNPicker.Item label="All Users" value="all" />
                <RNPicker.Item label="Drivers Only" value="drivers" />
                <RNPicker.Item label="Passengers Only" value="passengers" />
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#374151', fontWeight: '700', fontSize: 14 },
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
  picker: {
    height: 50,
    width: '100%',
  },
});
