import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { findDriverById, findRouteById, drivers as allDrivers, routes as allRoutes, buses as allBuses, findBusById } from "../data/dummyData";
import { Modal } from 'react-native';
import type { Driver, Review , EmergencyContact, Location } from "../../types/driver";
const Drivers: React.FC = () => { 
  const [query, setQuery] = useState<string>("");
  const [drivers, setDrivers] = useState<Driver[]>(allDrivers as Driver[]);

  // modal / edit state
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Driver>>({});
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d: Driver) => {
      return (
        (d.name || "").toLowerCase().includes(q) ||
        (d.phone || "").toLowerCase().includes(q) ||
        (d.email || "").toLowerCase().includes(q) ||
        (d.address || "").toLowerCase().includes(q) ||
        (findBusById(d.assignedVehicle || "")?.busNumber || "").toLowerCase().includes(q) ||
        (findRouteById(d.assignedRouteId || "")?.name || "").toLowerCase().includes(q)
      );
    });
  }, [query, drivers]);

  const renderRow = ({ item }: { item: Driver }) => {
    const route = findRouteById(item.assignedRouteId || "");
    const assignedBus = allBuses.find(b => b._id === item.assignedVehicle) || null;

    return (
      <View style={styles.row}>
        <View style={[styles.cell, styles.colBus]}><Text style={styles.cellText}>{item.name}</Text></View>
        <View style={[styles.cell, styles.colModel]}><Text style={styles.cellText}>{item.phone}</Text></View>
        <View style={[styles.cell, styles.colNum]}><Text   style={styles.cellText}>{assignedBus ? assignedBus.busNumber : (item.assignedVehicle || '-')}</Text></View>
        <View style={[styles.cell, styles.colStatus]}><Text style={styles.ratingText}>{item.rating}</Text></View>
        <View style={[styles.cell, styles.colRoute]}><Text style={styles.routeText}>{route ? route.name : '-'}</Text></View>
                <View style={[styles.cell, styles.colModel]}><Text style={styles.cellText}>{item.hireDate}</Text></View>
        <View style={[styles.cell, { minWidth: 140, flex: 1 }]}> 
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={() => { setEditingDriver(item); setEditFields(item); setModalVisible(true); }} className="px-3 py-1.5 bg-blue-100 rounded-md">
              <Text className="text-blue-600">View</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item._id)} className="px-3 py-1.5 bg-red-100 rounded-md">
              <Text className="text-red-700">Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleDelete = (id: string) => {
    setDrivers((s) => s.filter((d) => d._id !== id));
  };

  const handleSaveEdit = () => {
    if (!editingDriver) return;
    setDrivers((prev) => prev.map((d) => (d._id === editingDriver._id ? { ...d, ...(editFields as Driver) } : d)));
    setModalVisible(false);
    setEditingDriver(null);
  };


  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, styles.tabTextActive]}>All Drivers</Text>
        </TouchableOpacity>
      </View>
        <>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name, phone, email or route..."
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Table header + rows in a horizontal ScrollView for small screens */}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={[styles.row, styles.headerRow]}>
                <View style={[styles.cell, styles.colBus]}><Text style={[styles.headerText]}>Name</Text></View>
                <View style={[styles.cell, styles.colModel]}><Text style={[styles.headerText]}>Phone</Text></View>
                <View style={[styles.cell, styles.colNum]}><Text style={[styles.headerText]}>Assigned Bus</Text></View>
                <View style={[styles.cell, styles.colStatus]}><Text style={[styles.headerText]}>Ratings</Text></View>
                <View style={[styles.cell, styles.colRoute]}><Text style={[styles.headerText]}>Assigned Route</Text></View>
                <View style={[styles.cell, styles.colModel]}><Text style={[styles.headerText]}>Join Date</Text></View>
                <View style={[styles.cell, { minWidth: 140, flex: 1 }]}><Text style={[styles.headerText]}>Actions</Text></View>
              </View>

              <FlatList
                data={filtered}
                
                renderItem={renderRow}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                style={{ width: "100%" }}
              />
              {/* Edit / View Modal */}
                  <Modal visible={modalVisible} animationType="slide" transparent>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 }}>
                      <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                          <View style={styles.avatarWrap}>
                            <Image source={require('../../../utils/MainLogo.png')} style={styles.avatarLarge} />
                          </View>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.detailName}>{editingDriver?.name ?? ''}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                              <View style={[styles.statusBadge, editingDriver?.status === 'Active' ? styles.statusActiveBadge : styles.statusNeutralBadge]}>
                                <Text style={styles.statusBadgeText}>{editingDriver?.status ?? 'Unknown'}</Text>
                              </View>
                              <Text style={{ marginLeft: 10, color: '#6b7280' }}>{editingDriver?.rating ? `⭐ ${editingDriver.rating}` : ''}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.divider} />

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                          <View style={styles.detailGrid}>
                            <View style={styles.gridCol}>
                              <Text style={styles.detailLabel}>Phone</Text>
                              <Text style={styles.detailValue}>{editingDriver?.phone ?? '-'}</Text>

                              <Text style={[styles.detailLabel, { marginTop: 12 }]}>Email</Text>
                              <Text style={styles.detailValue}>{editingDriver?.email ?? '-'}</Text>

                              <Text style={[styles.detailLabel, { marginTop: 12 }]}>Address</Text>
                              <Text style={styles.detailValue}>{editingDriver?.address ?? '-'}</Text>

                              <Text style={[styles.detailLabel, { marginTop: 12 }]}>License</Text>
                              <Text style={styles.detailValue}>{editingDriver?.licenseNumber ? `${editingDriver?.licenseNumber} (${editingDriver?.licenseType ?? ''})` : '-'}</Text>
                            </View>

                            <View style={styles.gridCol}>
                              <Text style={styles.detailLabel}>License Expiry</Text>
                              <Text style={styles.detailValue}>{editingDriver?.licenseExpiry ?? '-'}</Text>

                              <Text style={[styles.detailLabel, { marginTop: 12 }]}>Assigned Vehicle</Text>
                              <Text style={styles.detailValue}>{findBusById(editingDriver?.assignedVehicle ?? '')?.busNumber ?? (editingDriver?.assignedVehicle ?? '-')}</Text>

                              <Text style={[styles.detailLabel, { marginTop: 12 }]}>Assigned Route</Text>
                              <Text style={styles.detailValue}>{findRouteById(editingDriver?.assignedRouteId ?? '')?.name ?? '-'}</Text>

                              <Text style={[styles.detailLabel, { marginTop: 12 }]}>Hire Date</Text>
                              <Text style={styles.detailValue}>{editingDriver?.hireDate ?? '-'}</Text>
                            </View>
                          </View>

                          {editingDriver?.emergencyContact ? (
                            <View style={{ marginTop: 14 }}>
                              <Text style={[styles.detailLabel, { marginBottom: 6 }]}>Emergency Contact</Text>
                              <View style={styles.detailRow}>
                                <Text style={styles.detailValue}>{editingDriver.emergencyContact.name ?? '-'}</Text>
                                <Text style={styles.detailValue}>{editingDriver.emergencyContact.phone ?? '-'}</Text>
                              </View>
                            </View>
                          ) : null}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                          <TouchableOpacity onPress={() => { setModalVisible(false); setEditingDriver(null); }} style={styles.closeBtn}>
                            <Text style={{ color: '#374151' }}>Close</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
            </View>
          </ScrollView>
        </>
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
  colBus: { flex: 1.5 },   // Name
  colModel: { flex: 1 },   // Phone / Join Date
  colNum: { flex: 1 },     // Assigned Bus
  colStatus: { flex: 0.7 },// Ratings
  colRoute: { flex: 1.2 }, // Assigned Route

  headerText: { fontWeight: "700", color: "#374151" },
  cellText: { color: "#111827"},
  routeText :{ color: "#111827"},

  separator: { height: 1, backgroundColor: "#eef2f7", marginHorizontal: 6 },

  ratingText: { color: "#065f46", fontWeight: "600", textTransform: "capitalize"},

  addContainer: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",        // Shadow color (black)
    shadowOffset: { width: 0, height: 2 }, // Position of the shadow
    shadowOpacity: 0.15,        // How visible the shadow is
    shadowRadius: 4,            // How soft the shadow edges are

    elevation: 3,               // Android shadow (important!)
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: 520,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  detailName: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#111827' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { color: '#6b7280', fontSize: 13 },
  detailValue: { color: '#111827', fontSize: 14, maxWidth: '65%', textAlign: 'right' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  avatarWrap: { width: 96, alignItems: 'center', justifyContent: 'center' },
  avatarLarge: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: '#e5e7eb' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusActiveBadge: { backgroundColor: '#ECFDF5' },
  statusNeutralBadge: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { color: '#065f46', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#eef2f7', marginVertical: 10 },
  detailGrid: { flexDirection: 'row', gap: 16 },
  gridCol: { flex: 1 },
  closeBtn: { paddingHorizontal: 14, paddingVertical: 8 },
});

export { Drivers };