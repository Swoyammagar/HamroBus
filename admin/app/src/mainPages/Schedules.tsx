import React, {useMemo, useState} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { schedules as allSchedules, findBusById, findDriverById, findRouteById, buses as allBuses, drivers as allDrivers, routes as allRoutes } from "../data/dummyData";
import type { Schedule } from "../types/schedules";
import { Tabs, SearchBar, Table, Modal, Picker, Button, Input, type TableColumn } from '../../components/ui';

const BusesDesignOnly: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "add">("all");
  const [query, setQuery] = useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>(allSchedules as Schedule[]);

  // modal / edit state
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Schedule>>({});

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

  // Bus, Driver, Route options for pickers
  const busOptions = allBuses.map(b => ({ label: b.busNumber, value: b._id }));
  const driverOptions = allDrivers.map(d => ({ label: d.name, value: d._id }));
  const routeOptions = allRoutes.map(r => ({ label: r.name, value: r._id }));

  // Table columns
  const columns: TableColumn<Schedule>[] = [
    {
      key: 'routeId',
      header: 'Route',
      flex: 2,
      render: (item) => findRouteById(item.routeId)?.name ?? '-',
    },
    {
      key: 'busId',
      header: 'Bus Number',
      flex: 1.5,
      render: (item) => findBusById(item.busId)?.busNumber ?? '-',
    },
    {
      key: 'driverId',
      header: 'Driver',
      flex: 1.5,
      render: (item) => findDriverById(item.driverId)?.name ?? '-',
    },
    {
      key: 'date',
      header: 'Date',
      flex: 1,
    },
    {
      key: 'departureTime',
      header: 'Departure',
      flex: 1.2,
      render: (item) => formatTimeForInput(item.departureTime),
    },
    {
      key: 'arrivalTime',
      header: 'Arrival',
      flex: 1.2,
      render: (item) => formatTimeForInput(item.arrivalTime),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (item) => (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            variant="primary"
            size="sm"
            onPress={() => {
              setEditingSchedule(item);
              setEditFields({
                ...item,
                departureTime: item.departureTime ? formatTimeForInput(item.departureTime) : item.departureTime,
                arrivalTime: item.arrivalTime ? formatTimeForInput(item.arrivalTime) : item.arrivalTime,
              });
              setModalVisible(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onPress={() => setSchedules(s => s.filter(x => x._id !== item._id))}
          >
            Delete
          </Button>
        </View>
      ),
    },
  ];

  const handleSaveEdit = () => {
    if (!editingSchedule) return;
    const merged: Schedule = {
      ...editingSchedule,
      ...(editFields as Schedule),
      departureTime: editFields.departureTime ?? editingSchedule.departureTime,
      arrivalTime: editFields.arrivalTime ?? editingSchedule.arrivalTime,
    } as Schedule;
    setSchedules(s => s.map(x => x._id === editingSchedule._id ? merged : x));
    setModalVisible(false);
    setEditingSchedule(null);
    setEditFields({});
  };

  const handleAddSchedule = () => {
    const busId = editFields.busId as string | undefined;
    const driverId = editFields.driverId as string | undefined;
    const routeId = editFields.routeId as string | undefined;
    const date = editFields.date as string | undefined;
    const departureTime = editFields.departureTime as string | undefined;
    const arrivalTime = editFields.arrivalTime as string | undefined;
    if (!busId || !driverId || !routeId || !date || !departureTime || !arrivalTime) {
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
      departureTime,
      arrivalTime,
    } as Schedule;
    setSchedules(s => [newSchedule, ...s]);
    setEditFields({});
    setActiveTab('all');
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
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search by bus number, driver or route..."
            onClear={() => setQuery('')}
          />

          <Table
            data={filteredSchedules}
            columns={columns}
            keyExtractor={(item) => item._id}
            emptyMessage="No schedules found"
          />

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
                <Button variant="success" onPress={handleSaveEdit}>
                  Save
                </Button>
              </View>
            }
          >
            <View style={{ gap: 12 }}>
              <Picker
                label="Bus"
                options={busOptions}
                value={editFields.busId ?? editingSchedule?.busId ?? ''}
                onSelect={(value) => setEditFields(s => ({ ...s, busId: String(value) }))}
                placeholder="Select bus"
              />

              <Picker
                label="Driver"
                options={driverOptions}
                value={editFields.driverId ?? editingSchedule?.driverId ?? ''}
                onSelect={(value) => setEditFields(s => ({ ...s, driverId: String(value) }))}
                placeholder="Select driver"
              />

              <Picker
                label="Route"
                options={routeOptions}
                value={editFields.routeId ?? editingSchedule?.routeId ?? ''}
                onSelect={(value) => setEditFields(s => ({ ...s, routeId: String(value) }))}
                placeholder="Select route"
              />

              <Input
                label="Date"
                type="text"
                value={editFields.date ?? editingSchedule?.date ?? ''}
                onChangeText={(t) => setEditFields(s => ({ ...s, date: t }))}
                placeholder="YYYY-MM-DD"
              />

              <Input
                label="Departure Time"
                type="text"
                value={String(editFields.departureTime ?? (editingSchedule?.departureTime ? formatTimeForInput(editingSchedule.departureTime) : ''))}
                onChangeText={(t) => setEditFields(s => ({ ...s, departureTime: t }))}
                placeholder="e.g. 08:30 AM"
              />

              <Input
                label="Arrival Time"
                type="text"
                value={String(editFields.arrivalTime ?? (editingSchedule?.arrivalTime ? formatTimeForInput(editingSchedule.arrivalTime) : ''))}
                onChangeText={(t) => setEditFields(s => ({ ...s, arrivalTime: t }))}
                placeholder="e.g. 09:45 AM"
              />
            </View>
          </Modal>
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.addContainer}>
            <Picker
              label="Bus"
              options={busOptions}
              value={editFields.busId ?? ''}
              onSelect={(value: string | number) => setEditFields(s => ({ ...s, busId: String(value) }))}
              placeholder="Select bus"
            />

            <Picker
              label="Driver"
              options={driverOptions}
              value={editFields.driverId ?? ''}
              onSelect={(value: string | number) => setEditFields(s => ({ ...s, driverId: String(value) }))}
              placeholder="Select driver"
            />

            <Picker
              label="Route"
              options={routeOptions}
              value={editFields.routeId ?? ''}
              onSelect={(value: string | number) => setEditFields(s => ({ ...s, routeId: String(value) }))}
              placeholder="Select route"
            />

            <Input
              label="Date"
              type="text"
              value={editFields.date ?? ''}
              onChangeText={(t) => setEditFields(s => ({ ...s, date: t }))}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Departure Time"
              type="text"
              value={String(editFields.departureTime ?? '')}
              onChangeText={(t) => setEditFields(s => ({ ...s, departureTime: t }))}
              placeholder="e.g. 08:30 AM"
            />

            <Input
              label="Arrival Time"
              type="text"
              value={String(editFields.arrivalTime ?? '')}
              onChangeText={(t) => setEditFields(s => ({ ...s, arrivalTime: t }))}
              placeholder="e.g. 09:45 AM"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
              <Button variant="secondary" onPress={() => setEditFields({})}>
                Reset
              </Button>
              <Button variant="success" onPress={handleAddSchedule}>
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
  addContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
    marginTop: 16,
  },
});

export default BusesDesignOnly;
