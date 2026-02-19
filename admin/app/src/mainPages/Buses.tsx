import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useBus, type BusRecord } from '../../context/BusContext';
import { useDriver } from '../../context/DriverContext';
import { useRoute } from '../../context/RouteContext';
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

type Bus = BusRecord;

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
  const { buses, loading, error, fetchAllBuses, createBus, updateBus, deleteBus } = useBus();
  const { drivers } = useDriver();
  const { routes } = useRoute();
  
  const [activeTab, setActiveTab] = useState<'all' | 'add'>('all');
  const [query, setQuery] = useState<string>('');
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Bus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add form state
  const [addFields, setAddFields] = useState<Partial<Bus>>({
    busNumber: '',
    model: '',
    capacity: 0,
    status: 'active',
    assignedDriverId: undefined,
    assignedRouteId: undefined,
  });

  // Fetch buses on mount
  useEffect(() => {
    fetchAllBuses();
  }, []);

  // Filter buses
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return buses;
    return buses.filter((b: Bus) => {
      const driverName = typeof b.assignedDriverId === 'object' 
        ? `${b.assignedDriverId?.firstName} ${b.assignedDriverId?.lastName}`
        : '';
      const routeName = typeof b.assignedRouteId === 'object' 
        ? (b.assignedRouteId?.routeName || '') 
        : '';
      
      return (
        (b.busNumber || '').toLowerCase().includes(q) ||
        String(b.capacity).toLowerCase().includes(q) ||
        (b.status || '').toLowerCase().includes(q) ||
        (b.model || '').toLowerCase().includes(q) ||
        driverName.toLowerCase().includes(q) ||
        routeName.toLowerCase().includes(q)
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
          label={item.status || 'unknown'}
          variant={getStatusVariant(item.status || '')}
        />
      ),
    },
    {
      key: 'driver',
      header: 'Assigned Driver',
      flex: 1.5,
      render: (item) => {
        if (typeof item.assignedDriverId === 'object' && item.assignedDriverId) {
          const firstName = item.assignedDriverId?.firstName || '';
          const lastName = item.assignedDriverId?.lastName || '';
          if (firstName || lastName) {
            return `${firstName} ${lastName}`.trim();
          }
        }
        return '-';
      },
    },
    {
      key: 'route',
      header: 'Assigned Route',
      flex: 1.5,
      render: (item) => {
        if (typeof item.assignedRouteId === 'object' && item.assignedRouteId) {
          return item.assignedRouteId?.routeName || '-';
        }
        return '-';
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
          <Button 
            onPress={() => handleDelete(item._id || '')} 
            variant="danger" 
            size="sm"
          >
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

  const driverOptions: PickerOption[] = drivers.map((d) => ({
    label: `${d.firstName} ${d.lastName}`,
    value: d._id || '',
  }));

  const routeOptions: PickerOption[] = routes.map((r) => ({
    label: r.routeName || '',
    value: r._id || '',
  }));

  // Helper to extract ID from object or return string ID
  const getIdValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && value._id) return value._id;
    return '';
  };

  const handleDelete = async (busId: string) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;
    
    setIsSubmitting(true);
    const result = await deleteBus(busId);
    setIsSubmitting(false);
    
    if (!result.success) {
      alert(`Error: ${result.message}`);
    }
  };

  const handleSaveEdit = async () => {
  if (!editingBus?._id) return;
  
  // Extract IDs if they are objects, or use empty string for undefined/null
  let driverId: string | undefined = undefined;
  let routeId: string | undefined = undefined;

  if (editFields.assignedDriverId !== undefined) {
    if (typeof editFields.assignedDriverId === 'object') {
      driverId = editFields.assignedDriverId?._id || '';
    } else {
      driverId = editFields.assignedDriverId || '';
    }
  }

  if (editFields.assignedRouteId !== undefined) {
    if (typeof editFields.assignedRouteId === 'object') {
      routeId = editFields.assignedRouteId?._id || '';
    } else {
      routeId = editFields.assignedRouteId || '';
    }
  }

  const updatePayload: any = {
    ...editFields,
  };

  // Only include driver/route if they were explicitly modified
  if (driverId !== undefined) {
    updatePayload.assignedDriverId = driverId;
  }
  
  if (routeId !== undefined) {
    updatePayload.assignedRouteId = routeId;
  }
  
  setIsSubmitting(true);
  const result = await updateBus(editingBus._id, updatePayload);
  setIsSubmitting(false);
  
  if (result.success) {
    setModalVisible(false);
    setEditingBus(null);
    setEditFields({});
  } else {
    alert(`Error: ${result.message}`);
  }
};

  const handleAddBus = async () => {
    if (!addFields.busNumber || !addFields.model || !addFields.capacity) {
      alert('Please fill in all required fields');
      return;
    }

    const driverId = getIdValue(addFields.assignedDriverId);
    const routeId = getIdValue(addFields.assignedRouteId);

    setIsSubmitting(true);
    const result = await createBus({
      busNumber: String(addFields.busNumber),
      model: String(addFields.model),
      capacity: Number(addFields.capacity),
      assignedDriverId: driverId || undefined,
      assignedRouteId: routeId || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      resetAddForm();
      setActiveTab('all');
    } else {
      alert(`Error: ${result.message}`);
    }
  };

  const resetAddForm = () => {
    setAddFields({
      busNumber: '',
      model: '',
      capacity: 0,
      status: 'active',
      assignedDriverId: undefined,
      assignedRouteId: undefined,
    });
  };

  if (loading && buses.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

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
            keyExtractor={(item) => item._id || ''}
            emptyMessage="No buses found"
          />
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Input
              label="Bus Number *"
              placeholder="Enter bus number"
              value={String(addFields.busNumber ?? '')}
              onChangeText={(t) => setAddFields((s) => ({ ...s, busNumber: t }))}
            />

            <Input
              label="Model *"
              placeholder="Enter bus model"
              value={String(addFields.model ?? '')}
              onChangeText={(t) => setAddFields((s) => ({ ...s, model: t }))}
            />

            <Input
              label="Capacity *"
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
              value={typeof addFields.assignedDriverId === 'string' ? addFields.assignedDriverId : ''}
              onSelect={(val) =>
                setAddFields((s) => ({ ...s, assignedDriverId: String(val) || undefined }))
              }
              options={driverOptions}
              placeholder="Select driver (optional)"
              allowClear={true}
              onClear={() => setAddFields((s) => ({ ...s, assignedDriverId: undefined }))}
            />

            <Picker
              label="Assigned Route"
              value={typeof addFields.assignedRouteId === 'string' ? addFields.assignedRouteId : ''}
              onSelect={(val) =>
                setAddFields((s) => ({ ...s, assignedRouteId: String(val) || undefined }))
              }
              options={routeOptions}
              placeholder="Select route (optional)"
              allowClear={true}
              onClear={() => setAddFields((s) => ({ ...s, assignedRouteId: undefined }))}
            />

            <View style={styles.formActions}>
              <Button 
                onPress={resetAddForm} 
                variant="secondary"
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button 
                onPress={handleAddBus} 
                variant="primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Bus'}
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onPress={handleSaveEdit} 
              variant="primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
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
          value={getIdValue(editFields.assignedDriverId)}
          onSelect={(val) =>
            setEditFields((s) => ({ ...s, assignedDriverId: String(val) || '' }))
          }
          options={driverOptions}
          placeholder="Select driver"
          allowClear={true}
          onClear={() => setEditFields((s) => ({ ...s, assignedDriverId: '' }))}
        />
        <Picker
          label="Assigned Route"
          value={getIdValue(editFields.assignedRouteId)}
          onSelect={(val) =>
            setEditFields((s) => ({ ...s, assignedRouteId: String(val) || '' }))
          }
          options={routeOptions}
          placeholder="Select route"
          allowClear={true}
          onClear={() => setEditFields((s) => ({ ...s, assignedRouteId: '' }))}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
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