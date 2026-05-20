import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Image, ScrollView } from 'react-native';
import axios from 'axios';
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';
import { Modal, Button, EmptyState, StatusBadge } from '../../components/ui';
import Pagination from '../../components/ui/Pagination';

const SosList = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const fetchSos = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const res = await axios.get(`${API_BASE}/admin/sos?limit=200`);
      if (res.data?.success) {
        setRows(res.data.data || []);
      } else {
        setRows([]);
      }
    } catch (err: any) {
      console.error('Failed to load SOS list', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to load SOS list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSos();
  }, []);

  const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);
  const paginatedRows = rows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const openMap = (row: any) => {
    setSelected(row);
    setMapVisible(true);
  };

  const getStatusVariant = (s: string) => {
    switch (s) {
      case 'active': return 'danger';
      case 'cleared': return 'success';
      default: return 'warning';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerText}>SOS History</Text>
          <Text style={styles.subHeader}>All SOS alerts — active and history</Text>
        </View>
        <View style={styles.headerActions}>
          <Button variant="outline" onPress={fetchSos}>Refresh</Button>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#27AE60" />
        </View>
      ) : rows.length > 0 ? (
        <>
          <ScrollView style={styles.listScroll} contentContainerStyle={styles.list}>
            {paginatedRows.map((r) => {
              const sender = r.senderSnapshot || {};
              const driverName = sender.name || r.driverId || 'Driver';
              const avatar = sender.profileImgUrl;
              const busLabel = sender.busNumber || (r.busId ? String(r.busId).slice(-6) : '—');

              return (
                <View key={r._id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarInitials}>
                            {(driverName || '').split(' ').map((s: string) => s[0]).slice(0, 2).join('')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.headerMid}>
                      <Text style={styles.driverName}>{driverName}</Text>
                      <Text style={styles.metaText}>Bus: <Text style={{ fontWeight: '600' }}>{busLabel}</Text></Text>
                    </View>
                    <View style={styles.headerRight}>
                      <StatusBadge label={r.status || 'unknown'} variant={getStatusVariant(r.status)} />
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.sosTypeBox}>
                      <Text style={styles.sosTypeLabel}>Type</Text>
                      <Text style={styles.sosTypeValue}>{r.category || '—'}</Text>
                    </View>
                    <Text style={styles.detailsText} numberOfLines={2}>
                      {r.details || 'No details provided'}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.timestamp}>{new Date(r.createdAt).toLocaleString()}</Text>
                    <Button size="sm" variant="outline" onPress={() => openMap(r)}>View on map</Button>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <EmptyState title="No SOS alerts" description="No SOS records found" />
      )}

      <Modal
        visible={mapVisible}
        title="SOS Location"
        size="lg"
        onClose={() => setMapVisible(false)}
        footer={<Button onPress={() => setMapVisible(false)}>Close</Button>}
      >
        <View style={{ height: 480 }}>
          {selected && selected.location ? (
            <iframe
              title="sos-map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selected.location.longitude - 0.01}%2C${selected.location.latitude - 0.01}%2C${selected.location.longitude + 0.01}%2C${selected.location.latitude + 0.01}&layer=mapnik&marker=${selected.location.latitude}%2C${selected.location.longitude}`}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <View style={{ padding: 16 }}>
              <Text>No location saved for this SOS.</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default SosList;

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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listScroll: { flex: 1 },
  list: { gap: 10, paddingBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  headerLeft: { width: 56 },
  headerMid: { flex: 1, gap: 4 },
  headerRight: { alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f3f4f6' },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: '#111827', fontWeight: '700', fontSize: 18 },
  driverName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  metaText: { fontSize: 13, color: '#6b7280' },
  cardBody: { padding: 12, gap: 8 },
  sosTypeBox: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sosTypeLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  sosTypeValue: { fontSize: 13, fontWeight: '600', color: '#374151' },
  detailsText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  timestamp: { fontSize: 12, color: '#9ca3af', flex: 1 },
});