import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  buses as initialBuses,
  findDriverById,
  findRouteById,
  drivers as allDrivers,
  routes as allRoutes,
} from '../data/dummyData';
import {
  Tabs,
  SearchBar,
  Table,
  Button,
  Input,
  Picker,
  Modal,
  StatusBadge,
  type TableColumn,
  type PickerOption,
} from '../../components/ui';

type Bus = {
  _id: string;
  busNumber: string;
  capacity: number;
  model: string;
  status: string;
  assignedDriverId?: string | null;
  assignedRouteId?: string | null;
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'maintenance':
      return 'warning';
    case 'inactive':
      return 'neutral';
    default:
      return 'neutral';
  }
};


const Buses: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'add'>('all');
  const [query, setQuery] = useState<string>('');
  const [buses, setBuses] = useState<Bus[]>(initialBuses as Bus[]);

  // Edit modal state
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Bus>>({});

  // Add form state
  const [addFields, setAddFields] = useState<Partial<Bus>>({
    busNumber: '',
    model: '',
    capacity: 0,
    status: 'active',
    assignedDriverId: null,
    assignedRouteId: null,
  });

  // Filter buses
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buses;
    return buses.filter((b: Bus) => {
      return (
        (b.busNumber || '').toLowerCase().includes(q) ||
        String(b.capacity).toLowerCase().includes(q) ||
        (b.status || '').toLowerCase().includes(q) ||
        (b.model || '').toLowerCase().includes(q) ||
        (findDriverById(b.assignedDriverId || '')?.name || '').toLowerCase().includes(q) ||
        (findRouteById(b.assignedRouteId || '')?.name || '').toLowerCase().includes(q)
      );
    });
  }, [query, buses]);

  // Table columns
  const columns: TableColumn<Bus>[] = [
    {
      key: 'busNumber',
      header: 'Bus Number',
      flex: 1.5,
    },
    {
      key: 'model',
      header: 'Model',
      flex: 1.2,
    },
    {
      key: 'capacity',
      header: 'Capacity',
      flex: 0.8,
    },
    {
      key: 'status',
      header: 'Status',
      flex: 1,
      render: (item) => (
        <StatusBadge
          label={item.status}
          variant={getStatusVariant(item.status)}
        />
      ),
    },
    {
      key: 'driver',
      header: 'Assigned Driver',
      flex: 1.5,
      render: (item) => {
        const driver = findDriverById(item.assignedDriverId || '');
        return driver ? driver.name : '-';
      },
    },
    {
      key: 'route',
      header: 'Assigned Route',
      flex: 1.5,
      render: (item) => {
        const route = findRouteById(item.assignedRouteId || '');
        return route ? route.name : '-';
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (item) => (
        <View style={styles.actionButtons}>
          <Button
            onPress={() => {
              setEditingBus(item);
              setEditFields(item);
              setModalVisible(true);
            }}
            variant="outline"
            size="sm"
          >
            View
          </Button>
          <Button onPress={() => handleDelete(item._id)} variant="danger" size="sm">
            Delete
          </Button>
        </View>
      ),
    },
  ];

  // Options for pickers
  const statusOptions: PickerOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Inactive', value: 'inactive' },
  ];

  const driverOptions: PickerOption[] = allDrivers.map((d) => ({
    label: d.name,
    value: d._id,
  }));

  const routeOptions: PickerOption[] = allRoutes.map((r) => ({
    label: r.name,
    value: r._id,
  }));

  const handleDelete = (id: string) => {
    setBuses((prev) => prev.filter((b) => b._id !== id));
  };

  const handleSaveEdit = () => {
    if (!editingBus) return;
    setBuses((prev) =>
      prev.map((b) => (b._id === editingBus._id ? { ...b, ...editFields } : b))
    );
    setModalVisible(false);
    setEditingBus(null);
  };

  const handleAddBus = () => {
    if (!addFields.busNumber || !addFields.model || !addFields.capacity) {
      return;
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
    setAddFields({
      busNumber: '',
      model: '',
      capacity: 0,
      status: 'active',
      assignedDriverId: null,
      assignedRouteId: null,
    });
    setActiveTab('all');
  };

  const resetAddForm = () => {
    setAddFields({
      busNumber: '',
      model: '',
      capacity: 0,
      status: 'active',
      assignedDriverId: null,
      assignedRouteId: null,
    });
  };

  return (
    <View style={styles.container}>
      <Tabs
        tabs={[
          { key: 'all', label: 'All Buses' },
          { key: 'add', label: 'Add Bus' },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as 'all' | 'add')}
      />

      {activeTab === 'all' ? (
        <>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search by bus number, driver or route..."
            onClear={() => setQuery('')}
          />

          <Table
            data={filtered}
            columns={columns}
            keyExtractor={(item) => item._id}
            emptyMessage="No buses found"
          />
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Input
              label="Bus Number"
              placeholder="Enter bus number"
              value={String(addFields.busNumber ?? '')}
              onChangeText={(t) => setAddFields((s) => ({ ...s, busNumber: t }))}
            />

            <Input
              label="Model"
              placeholder="Enter bus model"
              value={String(addFields.model ?? '')}
              onChangeText={(t) => setAddFields((s) => ({ ...s, model: t }))}
            />

            <Input
              label="Capacity"
              type="number"
              placeholder="Number of seats"
              value={addFields.capacity ? String(addFields.capacity) : ''}
              onChangeText={(t) =>
                setAddFields((s) => ({ ...s, capacity: Number(t) || 0 }))
              }
            />

            <Picker
              label="Status"
              value={addFields.status ?? 'active'}
              onSelect={(val) => setAddFields((s) => ({ ...s, status: String(val) }))}
              options={statusOptions}
              placeholder="Select status"
            />

            <Picker
              label="Assigned Driver"
              value={addFields.assignedDriverId ?? ''}
              onSelect={(val) =>
                setAddFields((s) => ({ ...s, assignedDriverId: String(val) }))
              }
              options={driverOptions}
              placeholder="Select driver (optional)"
            />

            <Picker
              label="Assigned Route"
              value={addFields.assignedRouteId ?? ''}
              onSelect={(val) =>
                setAddFields((s) => ({ ...s, assignedRouteId: String(val) }))
              }
              options={routeOptions}
              placeholder="Select route (optional)"
            />

            <View style={styles.formActions}>
              <Button onPress={resetAddForm} variant="secondary">
                Reset
              </Button>
              <Button onPress={handleAddBus} variant="primary">
                Add Bus
              </Button>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingBus(null);
        }}
        title="Edit Bus"
        size="md"
        footer={
          <>
            <Button
              onPress={() => {
                setModalVisible(false);
                setEditingBus(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onPress={handleSaveEdit} variant="primary">
              Save Changes
            </Button>
          </>
        }
      >
        <Input
          label="Bus Number"
          value={String(editFields.busNumber ?? '')}
          onChangeText={(t) => setEditFields((s) => ({ ...s, busNumber: t }))}
        />

        <Input
          label="Model"
          value={String(editFields.model ?? '')}
          onChangeText={(t) => setEditFields((s) => ({ ...s, model: t }))}
        />

        <Input
          label="Capacity"
          type="number"
          value={String(editFields.capacity ?? '')}
          onChangeText={(t) =>
            setEditFields((s) => ({ ...s, capacity: Number(t) || 0 }))
          }
        />

        <Picker
          label="Status"
          value={editFields.status ?? 'active'}
          onSelect={(val) => setEditFields((s) => ({ ...s, status: String(val) }))}
          options={statusOptions}
        />

        <Picker
          label="Assigned Driver"
          value={editFields.assignedDriverId ?? ''}
          onSelect={(val) =>
            setEditFields((s) => ({ ...s, assignedDriverId: String(val) }))
          }
          options={driverOptions}
          placeholder="Select driver"
        />

        <Picker
          label="Assigned Route"
          value={editFields.assignedRouteId ?? ''}
          onSelect={(val) =>
            setEditFields((s) => ({ ...s, assignedRouteId: String(val) }))
          }
          options={routeOptions}
          placeholder="Select route"
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
});

export { Buses };