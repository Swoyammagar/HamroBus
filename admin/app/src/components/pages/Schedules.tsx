import React, {useMemo, useState} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";
import { schedules as allSchedules, findBusById, findDriverById, findRouteById, buses as allBuses, drivers as allDrivers, routes as allRoutes } from "../data/dummyData";
import type { Schedule } from "../../types/schedules";

const BusesDesignOnly: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "add">("all");
  const [query, setQuery] = useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>(allSchedules as Schedule[]);

  // modal / edit state
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Schedule>>({});
  const [busPickerOpen, setBusPickerOpen] = useState(false);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const formatTimeForInput = (val?: string | null) => {
    if (!val) return '';
    try {
      if (val.includes('T')) {
        const d = new Date(val);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      return val;
    } catch (e) {
      return String(val);
    }
  };




  const filteredSchedules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter((s) => {
      const bus = findBusById(s.busId);
      const driver = findDriverById(s.driverId);
      const route = findRouteById(s.routeId);
      return (
        (bus?.busNumber || '').toLowerCase().includes(q) ||
        (driver?.name || '').toLowerCase().includes(q) ||
        (route?.name || '').toLowerCase().includes(q) ||
        (s.date || '').toLowerCase().includes(q)
      );
    });
  }, [query, schedules]);

  const renderRow = ({ item, index }: { item: Schedule; index: number }) => {
    const route = findRouteById(item.routeId);
    const bus = findBusById(item.busId);
    const driver = findDriverById(item.driverId);

  const dep = formatTimeForInput(item.departureTime);
  const arr = formatTimeForInput(item.arrivalTime);

    return (
      <View style={[styles.row, index % 2 === 1 ? styles.rowAlt : undefined]}>
        <View style={[styles.cell, styles.colBus]}>
          <Text style={styles.cellText}>{route?.name ?? '-'}</Text>
        </View>
        <View style={[styles.cell, styles.colModel]}>
          <Text style={styles.cellText}>{bus?.busNumber ?? '-'}</Text>
        </View>
        <View style={[styles.cell, styles.colNum]}>
          <Text style={styles.cellText}>{driver?.name ?? '-'}</Text>
        </View>
        <View style={[styles.cell, styles.colStatus]}>
          <Text style={styles.cellText}>{item.date ?? '-'}</Text>
        </View>
        <View style={[styles.cell, styles.colDriver]}>
          <Text style={styles.cellText}>{dep}</Text>
        </View>
        <View style={[styles.cell, styles.colRoute]}>
          <Text style={styles.cellText}>{arr}</Text>
        </View>
  <View style={[styles.cell, styles.colActions]}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
                  onPress={()=> {
                    setEditingSchedule(item);
                    setEditFields({
                      ...item,
                      departureTime: item.departureTime ? formatTimeForInput(item.departureTime) : item.departureTime,
                      arrivalTime: item.arrivalTime ? formatTimeForInput(item.arrivalTime) : item.arrivalTime,
                    });
                    setModalVisible(true);
                    setCalendarOpen(false);
                  }}
              style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#dbeafe", borderRadius: 6 }}
            >
              <Text style={{ color: "#1d4ed8" }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSchedules(s => s.filter(x => x._id !== item._id))}
              style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#fee2e2", borderRadius: 6 }}
            >
              <Text style={{ color: "#b91c1c" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === "all" && styles.tabBtnActive]}
        onPress={() => setActiveTab("all")}>
          <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>All Schedules</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === "add" && styles.tabBtnActive]}
        onPress={() => setActiveTab("add")}>
          <Text style={[styles.tabText, activeTab === "add" && styles.tabTextActive]}>Add Schedule</Text>
        </TouchableOpacity>
      </View>
      {activeTab === "all" ?( 
      <> 
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by bus number, driver or route..."
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
            
        </View>

        {/* Table */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.table}>
            {/* Header Row */}
            <View style={[styles.row, styles.headerRow]}>
              <View style={[styles.cell, styles.colBus]}>
                <Text style={styles.headerText}>Route</Text>
              </View>
              <View style={[styles.cell, styles.colModel]}>
                <Text style={styles.headerText}>Bus Number</Text>
              </View>
              <View style={[styles.cell, styles.colNum]}>
                <Text style={styles.headerText}>Driver</Text>
              </View>
              <View style={[styles.cell, styles.colStatus]}>
                <Text style={styles.headerText}>Date</Text>
              </View>
              <View style={[styles.cell, styles.colDriver]}>
                <Text style={styles.headerText}>Departure</Text>
              </View>
              <View style={[styles.cell, styles.colRoute]}>
                <Text style={styles.headerText}>Arrival</Text>
              </View>
              <View style={[styles.cell, { minWidth: 140, flex: 1 }]}>
                <Text style={styles.headerText}>Actions</Text>
              </View>
            </View>

            {/* Example Row */}
            <FlatList
              data={filteredSchedules}
              renderItem={renderRow}
              keyExtractor={(item) => item._id}
              ItemSeparatorComponent={() => (
                <View style={styles.separator} />
              )}
            />
            
            <Modal visible={modalVisible} animationType="slide" transparent>
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                    <Text style={styles.modalTitle}>Edit Schedule</Text>

                    {/* Bus dropdown */}
                    <Text style={styles.fieldLabel}>Bus</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setBusPickerOpen(v => !v)}>
                      <Text>{allBuses.find(b => b._id === (editFields.busId ?? editingSchedule?.busId))?.busNumber ?? 'Select bus'}</Text>
                    </TouchableOpacity>
                    {busPickerOpen && (
                      <View style={styles.dropdownList}>
                        {allBuses.map(b => (
                          <TouchableOpacity key={b._id} style={styles.pickerItem} onPress={() => { setEditFields(s => ({ ...s, busId: b._id })); setBusPickerOpen(false); }}>
                            <Text>{b.busNumber}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Driver dropdown */}
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Driver</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setDriverPickerOpen(v => !v)}>
                      <Text>{allDrivers.find(d => d._id === editFields.driverId)?.name ?? 'Select driver'}</Text>
                    </TouchableOpacity>
                    {driverPickerOpen && (
                      <View style={styles.dropdownList}>
                        {allDrivers.map(d => (
                          <TouchableOpacity key={d._id} style={styles.pickerItem} onPress={() => { setEditFields(s => ({ ...s, driverId: d._id })); setDriverPickerOpen(false); }}>
                            <Text>{d.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Route dropdown */}
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Route</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setRoutePickerOpen(v => !v)}>
                      <Text>{allRoutes.find(r => r._id === editFields.routeId)?.name ?? 'Select route'}</Text>
                    </TouchableOpacity>
                    {routePickerOpen && (
                      <View style={styles.dropdownList}>
                        {allRoutes.map(r => (
                          <TouchableOpacity key={r._id} style={styles.pickerItem} onPress={() => { setEditFields(s => ({ ...s, routeId: r._id })); setRoutePickerOpen(false); }}>
                            <Text>{r.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Date picker (simple calendar) */}
                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Date</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setCalendarOpen(v => !v)}>
                      <Text>{editFields.date ?? editingSchedule?.date ?? 'Select date'}</Text>
                    </TouchableOpacity>
                    {calendarOpen && (
                      <View style={styles.calendarCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => { setCalMonth(m => { const nm = m - 1; if (nm < 0) { setCalYear(y => y - 1); return 11; } return nm; }); }}>
                            <Text>{'‹'}</Text>
                          </TouchableOpacity>
                          <Text style={{ fontWeight: '600' }}>{`${monthNames[calMonth]} ${calYear}`}</Text>
                          <TouchableOpacity onPress={() => { setCalMonth(m => { const nm = m + 1; if (nm > 11) { setCalYear(y => y + 1); return 0; } return nm; }); }}>
                            <Text>{'›'}</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                          {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                            const day = i + 1;
                            const iso = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                            return (
                              <TouchableOpacity key={iso} style={styles.calendarDay} onPress={() => { setEditFields(s => ({ ...s, date: iso })); setCalendarOpen(false); }}>
                                <Text>{day}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Departure Time</Text>
                    <TextInput value={String(editFields.departureTime ?? (editingSchedule?.departureTime ? formatTimeForInput(editingSchedule.departureTime) : ''))} onChangeText={(t) => setEditFields(s => ({ ...s, departureTime: t }))} style={styles.searchInput} placeholder="e.g. 08:30" />

                    <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Arrival Time</Text>
                    <TextInput value={String(editFields.arrivalTime ?? (editingSchedule?.arrivalTime ? formatTimeForInput(editingSchedule.arrivalTime) : ''))} onChangeText={(t) => setEditFields(s => ({ ...s, arrivalTime: t }))} style={styles.searchInput} placeholder="e.g. 09:45" />

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                      <TouchableOpacity onPress={() => { setModalVisible(false); setEditingSchedule(null); }} style={{ padding: 8 }}>
                        <Text style={{ color: '#374151' }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        if (!editingSchedule) return;
                        // Save raw input strings for departure/arrival (no forced ISO conversion)
                        const merged: Schedule = {
                          ...editingSchedule,
                          ...(editFields as Schedule),
                          departureTime: editFields.departureTime ?? editingSchedule.departureTime,
                          arrivalTime: editFields.arrivalTime ?? editingSchedule.arrivalTime,
                        } as Schedule;
                        setSchedules(s => s.map(x => x._id === editingSchedule._id ? merged : x));
                        setModalVisible(false); setEditingSchedule(null);
                      }} style={{ padding: 8, backgroundColor: '#059669', borderRadius: 6, marginLeft: 8 }}>
                        <Text style={{ color: '#fff' }}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </View>
        </ScrollView>
      </>
      ) : (
      <>
        {/* Add Schedule Form */}
        <View style={[styles.addContainer, { marginTop: 24 }]}>
          <Text style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>
            Bus
          </Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setBusPickerOpen(v => !v)}>
            <Text>{allBuses.find(b => b._id === (editFields.busId ?? undefined))?.busNumber ?? 'Select bus'}</Text>
          </TouchableOpacity>
          {busPickerOpen && (
            <View style={styles.dropdownList}>
              {allBuses.map(b => (
                <TouchableOpacity key={b._id} style={styles.pickerItem} onPress={() => { setEditFields(s => ({ ...s, busId: b._id })); setBusPickerOpen(false); }}>
                  <Text>{b.busNumber}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Driver
          </Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setDriverPickerOpen(v => !v)}>
            <Text>{allDrivers.find(d => d._id === (editFields.driverId ?? undefined))?.name ?? 'Select driver'}</Text>
          </TouchableOpacity>
          {driverPickerOpen && (
            <View style={styles.dropdownList}>
              {allDrivers.map(d => (
                <TouchableOpacity key={d._id} style={styles.pickerItem} onPress={() => { setEditFields(s => ({ ...s, driverId: d._id })); setDriverPickerOpen(false); }}>
                  <Text>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Route
          </Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setRoutePickerOpen(v => !v)}>
            <Text>{allRoutes.find(r => r._id === (editFields.routeId ?? undefined))?.name ?? 'Select route'}</Text>
          </TouchableOpacity>
          {routePickerOpen && (
            <View style={styles.dropdownList}>
              {allRoutes.map(r => (
                <TouchableOpacity key={r._id} style={styles.pickerItem} onPress={() => { setEditFields(s => ({ ...s, routeId: r._id })); setRoutePickerOpen(false); }}>
                  <Text>{r.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Date
          </Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setCalendarOpen(v => !v)}>
            <Text>{editFields.date ?? 'Select date'}</Text>
          </TouchableOpacity>
          {calendarOpen && (
            <View style={styles.calendarCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { setCalMonth(m => { const nm = m - 1; if (nm < 0) { setCalYear(y => y - 1); return 11; } return nm; }); }}>
                  <Text>{'‹'}</Text>
                </TouchableOpacity>
                <Text style={{ fontWeight: '600' }}>{`${monthNames[calMonth]} ${calYear}`}</Text>
                <TouchableOpacity onPress={() => { setCalMonth(m => { const nm = m + 1; if (nm > 11) { setCalYear(y => y + 1); return 0; } return nm; }); }}>
                  <Text>{'›'}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1;
                  const iso = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  return (
                    <TouchableOpacity key={iso} style={styles.calendarDay} onPress={() => { setEditFields(s => ({ ...s, date: iso })); setCalendarOpen(false); }}>
                      <Text>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Departure Time
          </Text>
          <TextInput style={styles.searchInput} placeholder="e.g. 08:30" value={String(editFields.departureTime ?? '')} onChangeText={(t) => setEditFields(s => ({ ...s, departureTime: t }))} />

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Arrival Time
          </Text>
          <TextInput style={styles.searchInput} placeholder="e.g. 09:45" value={String(editFields.arrivalTime ?? '')} onChangeText={(t) => setEditFields(s => ({ ...s, arrivalTime: t }))} />

          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16, gap: 8 }}>
            <TouchableOpacity style={{ padding: 8 }} onPress={() => setEditFields({})}>
              <Text style={{ color: "#374151" }}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 8, backgroundColor: "#059669", borderRadius: 6 }}
              onPress={() => {
                // validate required fields
                const busId = editFields.busId as string | undefined;
                const driverId = editFields.driverId as string | undefined;
                const routeId = editFields.routeId as string | undefined;
                const date = editFields.date as string | undefined;
                const departureTime = editFields.departureTime as string | undefined;
                const arrivalTime = editFields.arrivalTime as string | undefined;
                if (!busId || !driverId || !routeId || !date || !departureTime || !arrivalTime) {
                  // simple alert - replace with nicer UI if needed
                  // @ts-ignore
                  alert('Please fill all fields');
                  return;
                }
                const newSchedule: Schedule = {
                  _id: 'sch_' + Math.random().toString(36).slice(2, 9),
                  busId,
                  driverId,
                  routeId,
                  date,
                  departureTime: departureTime,
                  arrivalTime: arrivalTime,
                } as Schedule;
                setSchedules(s => [newSchedule, ...s]);
                // clear form
                setEditFields({});
                // switch to all tab
                setActiveTab('all');
              }}
            >
              <Text style={{ color: "#fff" }}>Add Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
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
  clearBtn: { marginLeft: 8, padding: 8 },
  clearText: { color: "#374151" },
  table: {
    minWidth: 800,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  headerRow: { backgroundColor: "#f8fafc", paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  cell: { paddingHorizontal: 8, justifyContent: "center" },
  colBus: { minWidth: 200, flex: 2 },
  colModel: { minWidth: 200, flex: 1.5 },
  colNum: { minWidth: 120, flex: 0.8 },
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
  statusText: { color: "#065f46", fontWeight: "600", textTransform: "capitalize" },
  addContainer: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  rowAlt: { backgroundColor: '#fbfdff' },
  colActions: { minWidth: 140, flex: 0, paddingHorizontal: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '90%', overflow: 'hidden' },
  modalTitle: { fontWeight: '700', fontSize: 18, marginBottom: 8 },
  fieldLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  pickerButton: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#fff' },
  dropdownList: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginTop: 8, backgroundColor: '#fff' },
  pickerItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  calendarCard: { marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  calendarDay: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', margin: 4, borderRadius: 6, backgroundColor: '#f8fafc' },
});

export default BusesDesignOnly;
