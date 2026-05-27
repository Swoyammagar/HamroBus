import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Tabs, SearchBar, Table, Modal, Picker, Button, Input, FeedbackModal, type TableColumn } from '../../components/ui';
import Pagination from '../../components/ui/Pagination';
import {
  useRoute,
  useBus,
  useDriver,
  type DayOfWeek,
  type ScheduleRecord,
  type StopArrivalRecord,
} from '../../context/domains';

const toStopArrivalTimeMap = (stopArrivals?: StopArrivalRecord[]) => {
  const initialMap: Record<string, string> = {};
  (stopArrivals || []).forEach((entry) => {
    if (entry?.stopName) {
      initialMap[entry.stopName] = entry.arrivalTime || '';
    }
  });
  return initialMap;
};

const Schedules: React.FC = () => {
  const { routes, fetchAllRoutes, addSchedule, updateSchedule, deleteSchedule, getRouteSchedules } = useRoute();
  const { buses, fetchAllBuses } = useBus();
  const { drivers, fetchAllDrivers } = useDriver();

  const [activeTab, setActiveTab] = useState<"all" | "add">("all");
  const [query, setQuery] = useState<string>("");
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [editingSchedule, setEditingSchedule] = useState<ScheduleRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; title?: string; message: string } | null>(null);

  interface ScheduleFormFields {
    dayOfWeek?: DayOfWeek;
    busId?: string;
    driverId?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    stopArrivalTimes?: Record<string, string>;
  }

  const [editFields, setEditFields] = useState<ScheduleFormFields>({});

  const selectedRoute = useMemo(
    () => routes.find((r) => r._id === selectedRouteId),
    [routes, selectedRouteId]
  );

  const selectedRouteStops = useMemo(
    () => [...(selectedRoute?.stops || [])].sort((a, b) => Number(a.sequence) - Number(b.sequence)),
    [selectedRoute]
  );

  const buildStopArrivalsPayload = () => {
    if (!selectedRouteStops.length) return [] as StopArrivalRecord[];
    return selectedRouteStops
      .map((stop) => ({
        stopName: stop.stopName,
        arrivalTime: String(editFields.stopArrivalTimes?.[stop.stopName] || '').trim(),
      }))
      .filter((entry) => entry.arrivalTime);
  };

  useEffect(() => {
    if (selectedRouteId) {
      const route = routes.find(r => r._id === selectedRouteId);
      setSchedules(route?.schedules || []);
      setCurrentPage(1);
      setEditFields(prev => ({ ...prev, busId: undefined, driverId: undefined, stopArrivalTimes: {} }));
    } else {
      setSchedules([]);
    }
  }, [selectedRouteId, routes]);

  useEffect(() => {
    if (editFields.busId) {
      const selectedBus = buses.find(b => b._id === editFields.busId);
      if (selectedBus?.assignedDriverId) {
        const driverId = typeof selectedBus.assignedDriverId === 'string'
          ? selectedBus.assignedDriverId
          : selectedBus.assignedDriverId._id;
        setEditFields(prev => ({ ...prev, driverId }));
      }
    }
  }, [editFields.busId, buses]);

  const filteredSchedules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schedules;
    return schedules.filter((s) => {
      const bus = buses.find(b => b._id === (typeof s.busId === 'string' ? s.busId : s.busId?._id));
      const driver = drivers.find(d => d._id === (typeof s.driverId === 'string' ? s.driverId : s.driverId?._id));
      return (
        (bus?.busNumber || '').toLowerCase().includes(q) ||
        ((driver?.firstName || '') + ' ' + (driver?.lastName || '')).toLowerCase().includes(q) ||
        (s.dayOfWeek || '').toLowerCase().includes(q)
      );
    });
  }, [query, schedules, buses, drivers]);

  const totalPages = Math.ceil(filteredSchedules.length / ITEMS_PER_PAGE);
  const paginatedSchedules = filteredSchedules.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const routeOptions = routes
    .filter(r => r._id)
    .map(r => ({ label: r.routeName || r.routeNumber || 'Unknown', value: r._id! }));

  const busOptions = useMemo(() => {
    if (!selectedRouteId) {
      return buses.filter(b => b._id).map(b => ({ label: b.busNumber || 'Unknown', value: b._id! }));
    }
    const selectedRoute = routes.find(r => r._id === selectedRouteId);
    const assignedBusIds = selectedRoute?.assignedBusIds || [];
    const busIdSet = new Set(
      assignedBusIds.map(busId => typeof busId === 'string' ? busId : busId._id).filter(id => id)
    );
    return buses.filter(b => b._id && busIdSet.has(b._id)).map(b => ({ label: b.busNumber || 'Unknown', value: b._id! }));
  }, [buses, selectedRouteId, routes]);

  const driverOptions = drivers
    .filter(d => d._id)
    .map(d => ({ label: `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown', value: d._id! }));

  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => ({ label: d, value: d }));

  const columns: TableColumn<ScheduleRecord>[] = [
    {
      key: 'dayOfWeek',
      header: 'Day',
      flex: 1,
      render: (item) => item.dayOfWeek ?? '-',
    },
    {
      key: 'busId',
      header: 'Bus',
      flex: 1.5,
      render: (item) => {
        const busId = typeof item.busId === 'string' ? item.busId : item.busId?._id;
        const bus = buses.find(b => b._id === busId);
        return bus?.busNumber ?? '-';
      },
    },
    {
      key: 'driverId',
      header: 'Driver',
      flex: 1.5,
      render: (item) => {
        const driverId = typeof item.driverId === 'string' ? item.driverId : item.driverId?._id;
        const driver = drivers.find(d => d._id === driverId);
        return `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim() || '-';
      },
    },
    {
      key: 'startTime',
      header: 'Start Time',
      flex: 1,
      render: (item) => item.startTime ?? '-',
    },
    {
      key: 'endTime',
      header: 'End Time',
      flex: 1,
      render: (item) => item.endTime ?? '-',
    },
    {
      key: 'notes',
      header: 'Notes',
      flex: 1.2,
      render: (item) => item.notes ?? '-',
    },
    {
      key: 'stopArrivals',
      header: 'Stop Arrivals',
      flex: 1.2,
      render: (item) => {
        const count = item.stopArrivals?.length || 0;
        if (!count) return '-';
        const firstStop = item.stopArrivals?.[0];
        return `${count} stop${count > 1 ? 's' : ''}${firstStop ? ` (${firstStop.stopName}: ${firstStop.arrivalTime})` : ''}`;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 160,
      render: (item) => (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setEditingSchedule(item);
              setEditFields({
                dayOfWeek: item.dayOfWeek,
                busId: typeof item.busId === 'string' ? item.busId : item.busId?._id,
                driverId: typeof item.driverId === 'string' ? item.driverId : item.driverId?._id,
                startTime: item.startTime,
                endTime: item.endTime,
                notes: item.notes,
                stopArrivalTimes: toStopArrivalTimeMap(item.stopArrivals),
              });
              setModalVisible(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onPress={() => setConfirmDeleteId(item._id ?? null)}
          >
            Delete
          </Button>
        </View>
      ),
    },
  ];

  useEffect(() => {
    fetchAllRoutes();
    fetchAllBuses?.();
    fetchAllDrivers?.();
  }, []);

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!scheduleId || !selectedRouteId) return;
    setConfirmDeleteId(null);
    try {
      const result = await deleteSchedule(selectedRouteId, scheduleId);
      if (result.success) {
        const route = routes.find(r => r._id === selectedRouteId);
        if (route?.schedules) setSchedules(route.schedules);
        setFeedback({ type: 'success', title: 'Schedule Deleted', message: result.message || 'Schedule deleted successfully.' });
      } else {
        setFeedback({ type: 'error', title: 'Delete Failed', message: result.message || 'Unable to delete schedule.' });
      }
    } catch (error) {
      setFeedback({ type: 'error', title: 'Delete Failed', message: 'Failed to delete schedule.' });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule || !selectedRouteId) return;
    if (!editFields.dayOfWeek || !editFields.busId || !editFields.startTime || !editFields.endTime) {
      setFeedback({ type: 'warning', title: 'Missing Details', message: 'Please fill all required fields.' });
      return;
    }
    if (!editFields.driverId) {
      setFeedback({ type: 'warning', title: 'Driver Required', message: 'Selected bus must have an assigned driver.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await updateSchedule(selectedRouteId, editingSchedule._id!, {
        dayOfWeek: editFields.dayOfWeek as DayOfWeek,
        busId: editFields.busId as string,
        driverId: editFields.driverId as string,
        startTime: editFields.startTime as string,
        endTime: editFields.endTime as string,
        notes: editFields.notes as string | undefined,
        stopArrivals: buildStopArrivalsPayload(),
      });
      if (result.success) {
        const route = routes.find(r => r._id === selectedRouteId);
        if (route?.schedules) setSchedules(route.schedules);
        setModalVisible(false);
        setEditingSchedule(null);
        setEditFields({});
        setFeedback({ type: 'success', title: 'Schedule Updated', message: result.message || 'Schedule updated successfully.' });
      } else {
        setFeedback({ type: 'error', title: 'Update Failed', message: result.message || 'Unable to update schedule.' });
      }
    } catch (error) {
      setFeedback({ type: 'error', title: 'Update Failed', message: 'Failed to update schedule.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedRouteId) { setFeedback({ type: 'warning', title: 'Route Required', message: 'Please select a route first.' }); return; }
    if (busOptions.length === 0) { setFeedback({ type: 'warning', title: 'No Buses Assigned', message: 'No buses are assigned to this route.' }); return; }
    if (!editFields.dayOfWeek || !editFields.busId || !editFields.startTime || !editFields.endTime) {
      setFeedback({ type: 'warning', title: 'Missing Details', message: 'Please fill all required fields.' });
      return;
    }
    if (!editFields.driverId) { setFeedback({ type: 'warning', title: 'Driver Required', message: 'Selected bus must have an assigned driver.' }); return; }
    setIsSubmitting(true);
    try {
      const result = await addSchedule(selectedRouteId, {
        dayOfWeek: editFields.dayOfWeek as DayOfWeek,
        busId: editFields.busId as string,
        driverId: editFields.driverId as string,
        startTime: editFields.startTime as string,
        endTime: editFields.endTime as string,
        notes: editFields.notes as string | undefined,
        stopArrivals: buildStopArrivalsPayload(),
      });
      if (result.success) {
        const route = routes.find(r => r._id === selectedRouteId);
        if (route?.schedules) setSchedules(route.schedules);
        setEditFields({});
        setActiveTab('all');
        setFeedback({ type: 'success', title: 'Schedule Added', message: result.message || 'Schedule added successfully.' });
      } else {
        setFeedback({ type: 'error', title: 'Add Failed', message: result.message || 'Unable to add schedule.' });
      }
    } catch (error) {
      setFeedback({ type: 'error', title: 'Add Failed', message: 'Failed to add schedule.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Tabs
        tabs={[
          { key: 'all', label: 'All Schedules' },
          { key: 'add', label: 'Add Schedule' },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as 'all' | 'add')}
      />

      {activeTab === "all" ? (
        <>
          <View style={styles.routeSelector}>
            <Text style={styles.label}>Select Route</Text>
            <Picker
              options={routeOptions}
              value={selectedRouteId}
              onSelect={(value) => { setSelectedRouteId(String(value)); setCurrentPage(1); }}
              placeholder="Choose a route..."
            />
          </View>

          {selectedRouteId ? (
            <>
              <SearchBar
                value={query}
                onChangeText={(v) => { setQuery(v); setCurrentPage(1); }}
                placeholder="Search schedules..."
                onClear={() => { setQuery(''); setCurrentPage(1); }}
              />

              {schedules.length > 0 ? (
                <>
                  <Table
                    data={paginatedSchedules}
                    columns={columns}
                    keyExtractor={(item) => item._id || ''}
                    emptyMessage="No schedules found for this route"
                  />
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No schedules for this route yet</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Please select a route to view schedules</Text>
            </View>
          )}

          <Modal
            visible={modalVisible}
            onClose={() => { setModalVisible(false); setEditingSchedule(null); setEditFields({}); }}
            title="Edit Schedule"
            size="md"
            footer={
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button variant="secondary" onPress={() => { setModalVisible(false); setEditingSchedule(null); setEditFields({}); }}>Cancel</Button>
                <Button variant="success" onPress={handleSaveEdit} loading={isSubmitting} disabled={isSubmitting}>Save</Button>
              </View>
            }
          >
            <View style={{ gap: 12 }}>
              <Picker
                label="Day of Week"
                options={dayOptions}
                value={editFields.dayOfWeek ?? editingSchedule?.dayOfWeek ?? ''}
                onSelect={(value) => setEditFields(s => ({ ...s, dayOfWeek: String(value) as DayOfWeek }))}
                placeholder="Select day"
              />

              {selectedRouteId && busOptions.length === 0 && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>⚠️ No buses are assigned to this route.</Text>
                </View>
              )}

              <Picker
                label="Bus"
                options={busOptions}
                value={editFields.busId || (typeof editingSchedule?.busId === 'string' ? editingSchedule.busId : (editingSchedule?.busId as any)?._id) || ''}
                onSelect={(value) => setEditFields(s => ({ ...s, busId: String(value) }))}
                placeholder={busOptions.length === 0 ? "No buses available" : "Select bus"}
                disabled={busOptions.length === 0}
              />

              {(editFields.busId || (typeof editingSchedule?.busId === 'string' ? editingSchedule.busId : (editingSchedule?.busId as any)?._id)) && (
                <View style={styles.driverInfoBox}>
                  <Text style={styles.driverInfoLabel}>Assigned Driver</Text>
                  <Text style={styles.driverInfoValue}>
                    {(() => {
                      const busId = editFields.busId || (typeof editingSchedule?.busId === 'string' ? editingSchedule.busId : (editingSchedule?.busId as any)?._id);
                      const selectedBus = buses.find(b => b._id === busId);
                      if (!selectedBus?.assignedDriverId) return 'No driver assigned to this bus';
                      const driverId = typeof selectedBus.assignedDriverId === 'string' ? selectedBus.assignedDriverId : selectedBus.assignedDriverId._id;
                      const driver = drivers.find(d => d._id === driverId);
                      return `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim() || 'Unknown';
                    })()}
                  </Text>
                </View>
              )}

              <Input label="Start Time (HH:MM)" type="text" value={editFields.startTime ?? editingSchedule?.startTime ?? ''} onChangeText={(t) => setEditFields(s => ({ ...s, startTime: t }))} placeholder="e.g. 06:00" />
              <Input label="End Time (HH:MM)" type="text" value={editFields.endTime ?? editingSchedule?.endTime ?? ''} onChangeText={(t) => setEditFields(s => ({ ...s, endTime: t }))} placeholder="e.g. 08:30" />
              <Input label="Notes (Optional)" type="text" value={editFields.notes ?? editingSchedule?.notes ?? ''} onChangeText={(t) => setEditFields(s => ({ ...s, notes: t }))} placeholder="Add any notes..." />

              {!!selectedRouteStops.length && (
                <View style={styles.stopArrivalsContainer}>
                  <Text style={styles.stopArrivalsTitle}>Stop Arrival Times</Text>
                  <Text style={styles.stopArrivalsHint}>Set arrival time per stop for this schedule.</Text>
                  {selectedRouteStops.map((stop) => (
                    <Input
                      key={`edit-stop-${stop.stopName}`}
                      label={`${stop.sequence}. ${stop.stopName}`}
                      type="text"
                      value={String(editFields.stopArrivalTimes?.[stop.stopName] || '')}
                      onChangeText={(value) => setEditFields((prev) => ({ ...prev, stopArrivalTimes: { ...(prev.stopArrivalTimes || {}), [stop.stopName]: value } }))}
                      placeholder="HH:MM"
                      containerStyle={{ marginBottom: 8 }}
                    />
                  ))}
                </View>
              )}
            </View>
          </Modal>

          {confirmDeleteId && (
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmCard}>
                <View style={styles.confirmIconWrap}>
                  <Feather name="trash-2" size={24} color="#ef4444" />
                </View>
                <Text style={styles.confirmTitle}>Delete Schedule?</Text>
                <Text style={styles.confirmSub}>This action cannot be undone. The schedule will be permanently removed.</Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity onPress={() => setConfirmDeleteId(null)} style={styles.confirmCancel}>
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteSchedule(confirmDeleteId)} style={styles.confirmDelete}>
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.addContainer}>
            <Picker label="Route" options={routeOptions} value={selectedRouteId} onSelect={(value: string | number) => setSelectedRouteId(String(value))} placeholder="Select route" />

            {selectedRouteId && busOptions.length === 0 && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ No buses are assigned to this route.</Text>
              </View>
            )}

            <Picker label="Day of Week" options={dayOptions} value={editFields.dayOfWeek ?? ''} onSelect={(value: string | number) => setEditFields(s => ({ ...s, dayOfWeek: String(value) as DayOfWeek }))} placeholder="Select day" />

            <Picker label="Bus" options={busOptions} value={editFields.busId ?? ''} onSelect={(value: string | number) => setEditFields(s => ({ ...s, busId: String(value) }))} placeholder={busOptions.length === 0 ? "No buses available for this route" : "Select bus"} disabled={!selectedRouteId || busOptions.length === 0} />

            {editFields.busId && (
              <View style={styles.driverInfoBox}>
                <Text style={styles.driverInfoLabel}>Assigned Driver</Text>
                <Text style={styles.driverInfoValue}>
                  {(() => {
                    const selectedBus = buses.find(b => b._id === editFields.busId);
                    if (!selectedBus?.assignedDriverId) return 'No driver assigned to this bus';
                    const driverId = typeof selectedBus.assignedDriverId === 'string' ? selectedBus.assignedDriverId : selectedBus.assignedDriverId._id;
                    const driver = drivers.find(d => d._id === driverId);
                    return `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim() || 'Unknown';
                  })()}
                </Text>
              </View>
            )}

            <Input label="Start Time (HH:MM)" type="text" value={String(editFields.startTime ?? '')} onChangeText={(t) => setEditFields(s => ({ ...s, startTime: t }))} placeholder="e.g. 06:00" />
            <Input label="End Time (HH:MM)" type="text" value={String(editFields.endTime ?? '')} onChangeText={(t) => setEditFields(s => ({ ...s, endTime: t }))} placeholder="e.g. 08:30" />
            <Input label="Notes (Optional)" type="text" value={String(editFields.notes ?? '')} onChangeText={(t) => setEditFields(s => ({ ...s, notes: t }))} placeholder="Add any notes..." />

            {!!selectedRouteStops.length && (
              <View style={styles.stopArrivalsContainer}>
                <Text style={styles.stopArrivalsTitle}>Stop Arrival Times</Text>
                <Text style={styles.stopArrivalsHint}>Set arrival time per stop for this schedule.</Text>
                {selectedRouteStops.map((stop) => (
                  <Input
                    key={`add-stop-${stop.stopName}`}
                    label={`${stop.sequence}. ${stop.stopName}`}
                    type="text"
                    value={String(editFields.stopArrivalTimes?.[stop.stopName] || '')}
                    onChangeText={(value) => setEditFields((prev) => ({ ...prev, stopArrivalTimes: { ...(prev.stopArrivalTimes || {}), [stop.stopName]: value } }))}
                    placeholder="HH:MM"
                    containerStyle={{ marginBottom: 8 }}
                  />
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
              <Button variant="secondary" onPress={() => { setEditFields({}); setSelectedRouteId(''); }}>Reset</Button>
              <Button
                variant="success"
                onPress={handleAddSchedule}
                loading={isSubmitting}
                disabled={isSubmitting || !selectedRouteId || busOptions.length === 0 || !editFields.dayOfWeek || !editFields.busId || !editFields.startTime || !editFields.endTime}
              >
                Add Schedule
              </Button>
            </View>
          </View>
        </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  routeSelector: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  addContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
    marginTop: 16,
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#6b7280' },
  stopArrivalsContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  stopArrivalsTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  stopArrivalsHint: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  warningBox: {
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningText: { fontSize: 13, color: '#991b1b', fontWeight: '500' },
  driverInfoBox: { padding: 12, backgroundColor: '#f3f4f6', borderRadius: 6 },
  driverInfoLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  driverInfoValue: { fontSize: 14, color: '#1f2937', fontWeight: '500' },
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
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  confirmSub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 6, width: '100%' },
  confirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  confirmDelete: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default Schedules;
