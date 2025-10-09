import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ScrollView,
} from "react-native";
import { buses as initialBuses, findDriverById, findRouteById, drivers as allDrivers, routes as allRoutes } from "../data/dummyData";
import { Modal } from 'react-native';

type Bus = {
  _id: string;
  busNumber: string;
  capacity: number;
  model: string;
  status: string;
  assignedDriverId?: string | null;
  assignedRouteId?: string | null;
};

const Buses: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "add">("all");
  const [query, setQuery] = useState<string>("");
  const [buses, setBuses] = useState<Bus[]>(initialBuses as Bus[]);

  // modal / edit state
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Bus>>({});
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  // add-form state
  const [addFields, setAddFields] = useState<Partial<Bus>>({ busNumber: '', model: '', capacity: 0, status: 'active', assignedDriverId: null, assignedRouteId: null });
  const [addDriverPickerOpen, setAddDriverPickerOpen] = useState(false);
  const [addRoutePickerOpen, setAddRoutePickerOpen] = useState(false);
  const [addStatusPickerOpen, setAddStatusPickerOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
  if (!q) return buses;
  return buses.filter((b: Bus) => {
      return (
        (b.busNumber || "").toLowerCase().includes(q) ||
        String(b.capacity).toLowerCase().includes(q) ||
        (b.status || "").toLowerCase().includes(q) ||
        (b.model || "").toLowerCase().includes(q) ||
        (findDriverById(b.assignedDriverId || "")?.name || "").toLowerCase().includes(q) ||
        (findRouteById(b.assignedRouteId || "")?.name || "").toLowerCase().includes(q)
      );
    });
  }, [query]);

  const renderRow = ({ item }: { item: Bus }) => {
    const driver = findDriverById(item.assignedDriverId || "");
    const route = findRouteById(item.assignedRouteId || "");

    return (
      <View style={styles.row}>
        <View style={[styles.cell, styles.colBus]}><Text style={styles.cellText}>{item.busNumber}</Text></View>
        <View style={[styles.cell, styles.colModel]}><Text style={styles.cellText}>{item.model}</Text></View>
        <View style={[styles.cell, styles.colNum]}><Text style={styles.cellText}>{item.capacity}</Text></View>
        <View style={[styles.cell, styles.colStatus]}>
          <View style={[styles.statusPill, item.status === "active" ? styles.statusActive : item.status === "maintenance" ? styles.statusWarn : styles.statusNeutral]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={[styles.cell, styles.colDriver]}><Text style={styles.cellText}>{driver ? driver.name : "-"}</Text></View>
        <View style={[styles.cell, styles.colRoute]}><Text style={styles.cellText}>{route ? route.name : "-"}</Text></View>
        <View style={[styles.cell, { minWidth: 140, flex: 1 }]}> 
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={() => { setEditingBus(item); setEditFields(item); setModalVisible(true); }} className="px-3 py-1.5 bg-blue-100 rounded-md">
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
  };

  const handleSaveEdit = () => {
    if (!editingBus) return;
    setModalVisible(false);
    setEditingBus(null);
  };


  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "all" && styles.tabBtnActive]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>All Buses</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "add" && styles.tabBtnActive]}
          onPress={() => setActiveTab("add")}
        >
          <Text style={[styles.tabText, activeTab === "add" && styles.tabTextActive]}>Add Bus</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "all" ? (
        <>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by bus number, driver or route..."
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={[styles.row, styles.headerRow]}>
                <View style={[styles.cell, styles.colBus]}><Text style={[styles.headerText]}>Bus Number</Text></View>
                <View style={[styles.cell, styles.colModel]}><Text style={[styles.headerText]}>Model</Text></View>
                <View style={[styles.cell, styles.colNum]}><Text style={[styles.headerText]}>Capacity</Text></View>
                <View style={[styles.cell, styles.colStatus]}><Text style={[styles.headerText]}>Status</Text></View>
                <View style={[styles.cell, styles.colDriver]}><Text style={[styles.headerText]}>Assigned Driver</Text></View>
                <View style={[styles.cell, styles.colRoute]}><Text style={[styles.headerText]}>Assigned Route</Text></View>
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
                <View className="flex-1 bg-black/40 justify-center p-5">
                  <View className="bg-white rounded-lg p-4 max-h-[90%]">
                    <Text className="font-bold text-lg mb-2">Edit Bus</Text>

                    <Text className="text-xs text-gray-700">Bus Number</Text>
                    <TextInput value={String(editFields.busNumber ?? '')} onChangeText={(t) => setEditFields((s) => ({ ...s, busNumber: t }))} style={styles.searchInput} />

                    <Text className="text-xs text-gray-700 mt-2">Model</Text>
                    <TextInput value={String(editFields.model ?? '')} onChangeText={(t) => setEditFields((s) => ({ ...s, model: t }))} style={styles.searchInput} />

                    <Text className="text-xs text-gray-700 mt-2">Capacity</Text>
                    <TextInput value={String(editFields.capacity ?? '')} onChangeText={(t) => setEditFields((s) => ({ ...s, capacity: Number(t) }))} keyboardType="numeric" style={styles.searchInput} />

                    <Text className="text-xs text-gray-700 mt-2">Status</Text>
                    <TouchableOpacity onPress={() => setStatusPickerOpen((v) => !v)} className="border border-gray-200 rounded-md px-3 py-2 mt-1">
                      <Text>{String(editFields.status ?? 'Select status')}</Text>
                    </TouchableOpacity>
                    {statusPickerOpen && (
                      <View className="mt-2 border border-gray-200 rounded-md">
                        {['active','maintenance','inactive'].map((st) => (
                          <TouchableOpacity key={st} onPress={() => { setEditFields((s) => ({ ...s, status: st })); setStatusPickerOpen(false); }} className={`p-3 ${editFields.status === st ? 'bg-blue-50' : 'bg-white'}`}>
                            <Text className="text-base">{st}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text className="text-xs text-gray-700 mt-2">Assigned Driver</Text>
                    <TouchableOpacity onPress={() => setDriverPickerOpen((v) => !v)} className="border border-gray-200 rounded-md px-3 py-2 mt-1 flex-row justify-between items-center">
                      <Text>{allDrivers.find(d => d._id === editFields.assignedDriverId)?.name ?? 'Select driver'}</Text>
                      <View className="flex-row items-center">
                        {editFields.assignedDriverId ? (
                          <TouchableOpacity onPress={() => setEditFields((s) => ({ ...s, assignedDriverId: null }))} className="mr-2">
                            <Text className="text-red-500">×</Text>
                          </TouchableOpacity>
                        ) : null}
                        <Text className="text-gray-400">▾</Text>
                      </View>
                    </TouchableOpacity>
                    {driverPickerOpen && (
                      <ScrollView className="max-h-32 border border-gray-200 rounded-md mt-2">
                        {allDrivers.map((d) => (
                          <TouchableOpacity key={d._id} onPress={() => { setEditFields((s) => ({ ...s, assignedDriverId: d._id })); setDriverPickerOpen(false); }} className={`p-3 ${editFields.assignedDriverId === d._id ? 'bg-blue-50' : 'bg-white'}`}>
                            <Text>{d.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    <Text className="text-xs text-gray-700 mt-2">Assigned Route</Text>
                    <TouchableOpacity onPress={() => setRoutePickerOpen((v) => !v)} className="border border-gray-200 rounded-md px-3 py-2 mt-1 flex-row justify-between items-center">
                      <Text>{allRoutes.find(r => r._id === editFields.assignedRouteId)?.name ?? 'Select route'}</Text>
                      <View className="flex-row items-center">
                        {editFields.assignedRouteId ? (
                          <TouchableOpacity onPress={() => setEditFields((s) => ({ ...s, assignedRouteId: null }))} className="mr-2">
                            <Text className="text-red-500">×</Text>
                          </TouchableOpacity>
                        ) : null}
                        <Text className="text-gray-400">▾</Text>
                      </View>
                    </TouchableOpacity>
                    {routePickerOpen && (
                      <ScrollView className="max-h-32 border border-gray-200 rounded-md mt-2">
                        {allRoutes.map((r) => (
                          <TouchableOpacity key={r._id} onPress={() => { setEditFields((s) => ({ ...s, assignedRouteId: r._id })); setRoutePickerOpen(false); }} className={`p-3 ${editFields.assignedRouteId === r._id ? 'bg-blue-50' : 'bg-white'}`}>
                            <Text>{r.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    <View className="flex-row justify-end gap-2 mt-3">
                      <TouchableOpacity onPress={() => { setModalVisible(false); setEditingBus(null); }} className="px-3 py-2">
                        <Text className="text-gray-700">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleSaveEdit} className="px-3 py-2 bg-emerald-600 rounded-md">
                        <Text className="text-white">Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          </ScrollView>
        </>
      ) : (
        <View style={styles.addContainer}>
          <Text className="text-sm text-gray-700 mb-2">Bus Number</Text>
          <TextInput value={String(addFields.busNumber ?? '')} onChangeText={(t) => setAddFields((s) => ({ ...s, busNumber: t }))} style={styles.searchInput} placeholder="Enter bus number" />

          <Text className="text-sm text-gray-700 mt-2 mb-2">Model</Text>
          <TextInput value={String(addFields.model ?? '')} onChangeText={(t) => setAddFields((s) => ({ ...s, model: t }))} style={styles.searchInput} placeholder="Model" />

          <Text className="text-sm text-gray-700 mt-2 mb-2">Capacity</Text>
          <TextInput value={addFields.capacity ? String(addFields.capacity) : ''} onChangeText={(t) => setAddFields((s) => ({ ...s, capacity: Number(t) }))} keyboardType="numeric" style={styles.searchInput} placeholder="Number of seats" />

          <Text className="text-sm text-gray-700 mt-2 mb-2">Status</Text>
          <TouchableOpacity onPress={() => setAddStatusPickerOpen((v) => !v)} className="border border-gray-200 rounded-md px-3 py-2 mt-1">
            <Text>{String(addFields.status ?? 'Select status')}</Text>
          </TouchableOpacity>
          {addStatusPickerOpen && (
            <View className="mt-2  border border-gray-200 rounded-md">
              {['active','maintenance','inactive'].map((st) => (
                <TouchableOpacity key={st} onPress={() => { setAddFields((s) => ({ ...s, status: st })); setAddStatusPickerOpen(false); }} className={`p-3 ${addFields.status === st ? 'bg-blue-50' : 'bg-white'}`}>
                  <Text className="text-base">{st}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text className="text-sm text-gray-700 mt-2 mb-2">Assigned Driver</Text>
          <TouchableOpacity onPress={() => setAddDriverPickerOpen((v) => !v)} className="border border-gray-200 rounded-md px-3 py-2 mt-1 flex-row justify-between items-center">
            <Text>{allDrivers.find(d => d._id === addFields.assignedDriverId)?.name ?? 'Select driver'}</Text>
            <View className="flex-row items-center">
              {addFields.assignedDriverId ? (
                <TouchableOpacity onPress={() => setAddFields((s) => ({ ...s, assignedDriverId: null }))} className="mr-2">
                  <Text className="text-red-500">×</Text>
                </TouchableOpacity>
              ) : null} 
              <Text className="text-gray-400">▾</Text>
            </View>
          </TouchableOpacity>
          {addDriverPickerOpen && (
            <ScrollView className="max-h-32 border border-gray-200 rounded-md mt-2">
              {allDrivers.map((d) => (
                <TouchableOpacity key={d._id} onPress={() => { setAddFields((s) => ({ ...s, assignedDriverId: d._id })); setAddDriverPickerOpen(false); }} className={`p-3 ${addFields.assignedDriverId === d._id ? 'bg-blue-50' : 'bg-white'}`}>
                  <Text>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text className="text-sm text-gray-700 mt-2 mb-2">Assigned Route</Text>
          <TouchableOpacity onPress={() => setAddRoutePickerOpen((v) => !v)} className="border border-gray-200 rounded-md px-3 py-2 mt-1 flex-row justify-between items-center">
            <Text>{allRoutes.find(r => r._id === addFields.assignedRouteId)?.name ?? 'Select route'}</Text>
            <View className="flex-row items-center">
              {addFields.assignedRouteId ? (
                <TouchableOpacity onPress={() => setAddFields((s) => ({ ...s, assignedRouteId: null }))} className="mr-2">
                  <Text className="text-red-500">×</Text>
                </TouchableOpacity>
              ) : null}
              <Text className="text-gray-400">▾</Text>
            </View>
          </TouchableOpacity>
          {addRoutePickerOpen && (
            <ScrollView className="max-h-32 border border-gray-200 rounded-md mt-2">
              {allRoutes.map((r) => (
                <TouchableOpacity key={r._id} onPress={() => { setAddFields((s) => ({ ...s, assignedRouteId: r._id })); setAddRoutePickerOpen(false); }} className={`p-3 ${addFields.assignedRouteId === r._id ? 'bg-blue-50' : 'bg-white'}`}>
                  <Text>{r.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <TouchableOpacity onPress={() => { setAddFields({ busNumber: '', model: '', capacity: 0, status: 'active', assignedDriverId: null, assignedRouteId: null }); }} className="px-3 py-2">
              <Text className="text-gray-700">Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              // basic validation
              if (!addFields.busNumber || !addFields.model || !addFields.capacity) {
                return; // optionally show validation
              }
              const newBus: Bus = {
                _id: `bus_${Date.now()}`,
                busNumber: String(addFields.busNumber),
                model: String(addFields.model),
                capacity: Number(addFields.capacity),
                status: String(addFields.status ?? 'active'),
                assignedDriverId: addFields.assignedDriverId ?? null,
                assignedRouteId: addFields.assignedRouteId ?? null,
              };
              setBuses((s) => [newBus, ...s]);
              // reset and switch to All tab
              setAddFields({ busNumber: '', model: '', capacity: 0, status: 'active', assignedDriverId: null, assignedRouteId: null });
              setActiveTab('all');
            }} className="px-3 py-2 bg-emerald-600 rounded-md">
              <Text className="text-white">Add Bus</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    minWidth: 800,
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
  },
  cell: {
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  colBus: { minWidth: 200, flex: 2 },
  colModel: { minWidth: 200, flex: 1.5 },
  colNum: { minWidth: 120, flex: 0.8, alignItems: "flex-start" },
  colStatus: { minWidth: 140, flex: 1 },
  colDriver: { minWidth: 220, flex: 1.6 },
  colRoute: { minWidth: 220, flex: 1.6 },

  headerText: { fontWeight: "700", color: "#374151" },
  cellText: { color: "#111827" },

  separator: { height: 1, backgroundColor: "#eef2f7", marginHorizontal: 6 },

  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusActive: { backgroundColor: "#ecfdf5" },
  statusWarn: { backgroundColor: "#fff7ed" },
  statusNeutral: { backgroundColor: "#f3f4f6" },
  statusText: { color: "#065f46", fontWeight: "600", textTransform: "capitalize" },

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
});

export { Buses };