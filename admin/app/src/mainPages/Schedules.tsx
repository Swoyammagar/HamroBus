import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Tabs, SearchBar, Table, Modal, Picker, Button, Input, type TableColumn } from '../../components/ui';
import { useRoute, DayOfWeek, ScheduleRecord, StopArrivalRecord } from '../../context/RouteContext';
import { useBus } from '../../context/BusContext';
import { useDriver } from '../../context/DriverContext';

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

  // Modal / edit state
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRecord | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form fields - use proper typing for form state where IDs are always strings
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
    if (!selectedRouteStops.length) {
      return [] as StopArrivalRecord[];
    }

    return selectedRouteStops
      .map((stop) => ({
        stopName: stop.stopName,
        arrivalTime: String(editFields.stopArrivalTimes?.[stop.stopName] || '').trim(),
      }))
      .filter((entry) => entry.arrivalTime);
  };

  // Load schedules when route is selected
  useEffect(() => {
    if (selectedRouteId) {
      const route = routes.find(r => r._id === selectedRouteId);
      setSchedules(route?.schedules || []);
      // Clear bus selection when route changes to avoid showing invalid bus
      setEditFields(prev => ({ ...prev, busId: undefined, driverId: undefined, stopArrivalTimes: {} }));
    } else {
      setSchedules([]);
    }
  }, [selectedRouteId, routes]);

  // Auto-populate driver when bus is selected (both add and edit modes)
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

  // Options for pickers - filter out undefined values
  const routeOptions = routes
    .filter(r => r._id)
    .map(r => ({ label: r.routeName || r.routeNumber || 'Unknown', value: r._id! }));
  
  // Filter buses to only show those assigned to the selected route
  const busOptions = useMemo(() => {
    if (!selectedRouteId) {
      return buses
        .filter(b => b._id)
        .map(b => ({ label: b.busNumber || 'Unknown', value: b._id! }));
    }
    
    const selectedRoute = routes.find(r => r._id === selectedRouteId);
    const assignedBusIds = selectedRoute?.assignedBusIds || [];
    
    // Extract bus IDs from assignedBusIds (handle both string and object formats)
    const busIdSet = new Set(
      assignedBusIds.map(busId => 
        typeof busId === 'string' ? busId : busId._id
      ).filter(id => id)
    );
    
    return buses
      .filter(b => b._id && busIdSet.has(b._id))
      .map(b => ({ label: b.busNumber || 'Unknown', value: b._id! }));
  }, [buses, selectedRouteId, routes]);
  
  const driverOptions = drivers
    .filter(d => d._id)
    .map(d => ({ label: `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown', value: d._id! }));
  
  const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => ({ label: d, value: d }));

  // Table columns
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
            onPress={() => handleDeleteSchedule(item._id)}
          >
            Delete
          </Button>
        </View>
      ),
    },
  ];

  // Load initial data
  useEffect(() => {
    fetchAllRoutes();
    fetchAllBuses?.();
    fetchAllDrivers?.();
  }, []);

  const handleDeleteSchedule = async (scheduleId?: string) => {
    if (!scheduleId || !selectedRouteId) return;
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const result = await deleteSchedule(selectedRouteId, scheduleId);
      if (result.success) {
        // Refresh schedules for this route
        const route = routes.find(r => r._id === selectedRouteId);
        if (route?.schedules) {
          setSchedules(route.schedules);
        }
        alert('Schedule deleted successfully');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule || !selectedRouteId) return;
    
    if (!editFields.dayOfWeek || !editFields.busId || !editFields.startTime || !editFields.endTime) {
      alert('Please fill all required fields');
      return;
    }

    // Verify that driver was auto-populated from bus
    if (!editFields.driverId) {
      alert('Selected bus must have an assigned driver');
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
        // Refresh schedules for this route
        const route = routes.find(r => r._id === selectedRouteId);
        if (route?.schedules) {
          setSchedules(route.schedules);
        }
        setModalVisible(false);
        setEditingSchedule(null);
        setEditFields({});
        alert('Schedule updated successfully');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Failed to update schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedRouteId) {
      alert('Please select a route first');
      return;
    }

    if (busOptions.length === 0) {
      alert('No buses are assigned to this route. Please assign buses to the route first.');
      return;
    }

    if (!editFields.dayOfWeek || !editFields.busId || !editFields.startTime || !editFields.endTime) {
      alert('Please fill all required fields (Route, Day, Bus, Start Time, End Time)');
      return;
    }

    // Verify that driver was auto-populated from bus
    if (!editFields.driverId) {
      alert('Selected bus must have an assigned driver');
      return;
    }

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
        // Refresh schedules for this route
        const route = routes.find(r => r._id === selectedRouteId);
        if (route?.schedules) {
          setSchedules(route.schedules);
        }
        setEditFields({});
        setActiveTab('all');
        alert('Schedule added successfully');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert('Failed to add schedule');
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
              onSelect={(value) => setSelectedRouteId(String(value))}
              placeholder="Choose a route..."
            />
          </View>

          {selectedRouteId ? (
            <>
              <SearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="Search schedules..."
                onClear={() => setQuery('')}
              />

              {schedules.length > 0 ? (
                <Table
                  data={filteredSchedules}
                  columns={columns}
                  keyExtractor={(item) => item._id || ''}
                  emptyMessage="No schedules found for this route"
                />
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

          {/* Edit Modal */}
          <Modal
            visible={modalVisible}
            onClose={() => {
              setModalVisible(false);
              setEditingSchedule(null);
              setEditFields({});
            }}
            title="Edit Schedule"
            size="md"
            footer={
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setModalVisible(false);
                    setEditingSchedule(null);
                    setEditFields({});
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="success" 
                  onPress={handleSaveEdit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Save
                </Button>
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
                <View style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' }}>
                  <Text style={{ fontSize: 13, color: '#991b1b', fontWeight: '500' }}>
                    ⚠️ No buses are assigned to this route. Please assign buses to the route first.
                  </Text>
                </View>
              )}

              <Picker
                label="Bus"
                options={busOptions}
                value={
                  editFields.busId ||
                  (typeof editingSchedule?.busId === 'string' 
                    ? editingSchedule.busId 
                    : (editingSchedule?.busId as any)?._id) ||
                  ''
                }
                onSelect={(value) => setEditFields(s => ({ ...s, busId: String(value) }))}
                placeholder={busOptions.length === 0 ? "No buses available for this route" : "Select bus"}
                disabled={busOptions.length === 0}
              />

              {/* Display assigned driver automatically */}
              {(editFields.busId || (typeof editingSchedule?.busId === 'string' 
                ? editingSchedule.busId 
                : (editingSchedule?.busId as any)?._id)) && (
                <View style={{ padding: 12, backgroundColor: '#f3f4f6', borderRadius: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Assigned Driver</Text>
                  <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: '500' }}>
                    {(() => {
                      const busId = editFields.busId || (typeof editingSchedule?.busId === 'string' 
                        ? editingSchedule.busId 
                        : (editingSchedule?.busId as any)?._id);
                      const selectedBus = buses.find(b => b._id === busId);
                      if (!selectedBus?.assignedDriverId) return 'No driver assigned to this bus';
                      const driverId = typeof selectedBus.assignedDriverId === 'string' 
                        ? selectedBus.assignedDriverId 
                        : selectedBus.assignedDriverId._id;
                      const driver = drivers.find(d => d._id === driverId);
                      return `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim() || 'Unknown';
                    })()}
                  </Text>
                </View>
              )}

              <Input
                label="Start Time (HH:MM)"
                type="text"
                value={editFields.startTime ?? editingSchedule?.startTime ?? ''}
                onChangeText={(t) => setEditFields(s => ({ ...s, startTime: t }))}
                placeholder="e.g. 06:00"
              />

              <Input
                label="End Time (HH:MM)"
                type="text"
                value={editFields.endTime ?? editingSchedule?.endTime ?? ''}
                onChangeText={(t) => setEditFields(s => ({ ...s, endTime: t }))}
                placeholder="e.g. 08:30"
              />

              <Input
                label="Notes (Optional)"
                type="text"
                value={editFields.notes ?? editingSchedule?.notes ?? ''}
                onChangeText={(t) => setEditFields(s => ({ ...s, notes: t }))}
                placeholder="Add any notes..."
              />

              {!!selectedRouteStops.length && (
                <View style={styles.stopArrivalsContainer}>
                  <Text style={styles.stopArrivalsTitle}>Stop Arrival Times (Optional)</Text>
                  <Text style={styles.stopArrivalsHint}>Set arrival time per stop for this bus schedule.</Text>
                  {selectedRouteStops.map((stop) => (
                    <Input
                      key={`edit-stop-${stop.stopName}`}
                      label={`${stop.sequence}. ${stop.stopName}`}
                      type="text"
                      value={String(editFields.stopArrivalTimes?.[stop.stopName] || '')}
                      onChangeText={(value) => setEditFields((prev) => ({
                        ...prev,
                        stopArrivalTimes: {
                          ...(prev.stopArrivalTimes || {}),
                          [stop.stopName]: value,
                        },
                      }))}
                      placeholder="HH:MM"
                      containerStyle={{ marginBottom: 8 }}
                    />
                  ))}
                </View>
              )}
            </View>
          </Modal>
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.addContainer}>
            <Picker
              label="Route"
              options={routeOptions}
              value={selectedRouteId}
              onSelect={(value: string | number) => setSelectedRouteId(String(value))}
              placeholder="Select route"
            />

            {selectedRouteId && busOptions.length === 0 && (
              <View style={{ padding: 12, backgroundColor: '#fef2f2', borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' }}>
                <Text style={{ fontSize: 13, color: '#991b1b', fontWeight: '500' }}>
                  ⚠️ No buses are assigned to this route. Please assign buses to the route first.
                </Text>
              </View>
            )}

            <Picker
              label="Day of Week"
              options={dayOptions}
              value={editFields.dayOfWeek ?? ''}
              onSelect={(value: string | number) => setEditFields(s => ({ ...s, dayOfWeek: String(value) as DayOfWeek }))}
              placeholder="Select day"
            />

            <Picker
              label="Bus"
              options={busOptions}
              value={editFields.busId ?? ''}
              onSelect={(value: string | number) => setEditFields(s => ({ ...s, busId: String(value) }))}
              placeholder={busOptions.length === 0 ? "No buses available for this route" : "Select bus"}
              disabled={!selectedRouteId || busOptions.length === 0}
            />

            {/* Display assigned driver automatically */}
            {editFields.busId && (
              <View style={{ padding: 12, backgroundColor: '#f3f4f6', borderRadius: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Assigned Driver</Text>
                <Text style={{ fontSize: 14, color: '#1f2937', fontWeight: '500' }}>
                  {(() => {
                    const selectedBus = buses.find(b => b._id === editFields.busId);
                    if (!selectedBus?.assignedDriverId) return 'No driver assigned to this bus';
                    const driverId = typeof selectedBus.assignedDriverId === 'string' 
                      ? selectedBus.assignedDriverId 
                      : selectedBus.assignedDriverId._id;
                    const driver = drivers.find(d => d._id === driverId);
                    return `${driver?.firstName || ''} ${driver?.lastName || ''}`.trim() || 'Unknown';
                  })()}
                </Text>
              </View>
            )}

            <Input
              label="Start Time (HH:MM)"
              type="text"
              value={String(editFields.startTime ?? '')}
              onChangeText={(t) => setEditFields(s => ({ ...s, startTime: t }))}
              placeholder="e.g. 06:00"
            />

            <Input
              label="End Time (HH:MM)"
              type="text"
              value={String(editFields.endTime ?? '')}
              onChangeText={(t) => setEditFields(s => ({ ...s, endTime: t }))}
              placeholder="e.g. 08:30"
            />

            <Input
              label="Notes (Optional)"
              type="text"
              value={String(editFields.notes ?? '')}
              onChangeText={(t) => setEditFields(s => ({ ...s, notes: t }))}
              placeholder="Add any notes..."
            />

            {!!selectedRouteStops.length && (
              <View style={styles.stopArrivalsContainer}>
                <Text style={styles.stopArrivalsTitle}>Stop Arrival Times (Optional)</Text>
                <Text style={styles.stopArrivalsHint}>Set arrival time per stop for this bus schedule.</Text>
                {selectedRouteStops.map((stop) => (
                  <Input
                    key={`add-stop-${stop.stopName}`}
                    label={`${stop.sequence}. ${stop.stopName}`}
                    type="text"
                    value={String(editFields.stopArrivalTimes?.[stop.stopName] || '')}
                    onChangeText={(value) => setEditFields((prev) => ({
                      ...prev,
                      stopArrivalTimes: {
                        ...(prev.stopArrivalTimes || {}),
                        [stop.stopName]: value,
                      },
                    }))}
                    placeholder="HH:MM"
                    containerStyle={{ marginBottom: 8 }}
                  />
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
              <Button 
                variant="secondary" 
                onPress={() => {
                  setEditFields({});
                  setSelectedRouteId('');
                }}
              >
                Reset
              </Button>
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
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 8 
  },
  addContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  stopArrivalsContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  stopArrivalsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  stopArrivalsHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
});

export default Schedules;
