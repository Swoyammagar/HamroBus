import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker"; // For dropdown
import { notifications as initialNotifications } from "../data/dummyData";

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
    if (filter === "All") return items;
    return items.filter((n) => n.sentby === (filter === 'Sent' ? 'admin' : 'driver'));
  }, [filter, items]);

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={styles.notificationRow}>
      <View style={styles.avatar}>{item.sentby === 'admin' ? <Text style={styles.avatarText}>A</Text> : <Text style={styles.avatarText}>D</Text>}</View>
      <View style={styles.notificationBody}>
        <View style={styles.rowTop}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.date}>{new Date(item.date).toLocaleString()}</Text>
        </View>
        <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerText}>Recent Notifications</Text>
          <Text style={styles.subHeader}>Manage messages sent to drivers and admins</Text>
        </View>

        <TouchableOpacity style={styles.sendButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.sendButtonText}>+ Send</Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown Filter */}
      <View style={styles.dropdownContainer}>
        <Picker selectedValue={filter} onValueChange={(value: string) => setFilter(value)} style={styles.picker}>
          <Picker.Item label="All" value="All" />
          <Picker.Item label="Sent" value="Sent" />
          <Picker.Item label="Received" value="Received" />
        </Picker>
      </View>
      {/* Notifications List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <Text style={styles.emptyText}>No notifications found</Text>
      )}
      </ScrollView>
      

      {/* Send Notification Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Send Notification</Text>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Title" style={styles.input} />

            <Text style={styles.inputLabel}>Message</Text>
            <TextInput value={message} onChangeText={setMessage} placeholder="Message" style={[styles.input, { height: 100 }]} multiline />

            <Text style={styles.inputLabel}>Send To</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={target} onValueChange={(v) => setTarget(v as any)}>
                <Picker.Item label="To All" value="all" />
                <Picker.Item label="Drivers" value="drivers" />
                <Picker.Item label="Passengers" value="passengers" />
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#374151' }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalSend}
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
                <Text style={{ color: '#fff', fontWeight: '600' }}>Send</Text>
              </Pressable>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subHeader: { color: '#6b7280', fontSize: 13, marginTop: 4 },

  sendButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendButtonText: { color: '#fff', fontWeight: '600' },

  dropdownContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  picker: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#10b98122', borderWidth: 1, borderColor: '#e5e7eb' },

  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#374151', fontWeight: '700' },
  notificationBody: { flex: 1, marginLeft: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  message: { fontSize: 14, color: '#374151', marginTop: 6 },
  date: { fontSize: 12, color: '#6b7280' },

  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 40, fontSize: 15 },

  /* Modal styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  inputLabel: { color: '#6b7280', marginTop: 8, marginBottom: 6, fontSize: 13 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f8fafc' },
  pickerWrap: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  modalCancel: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  modalSend: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#065f46' },
});
