import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useBus, useDriver, useRoute, type BusRecord } from '../../context/domains';
import {
  Tabs,
  SearchBar,
  Table,
  Button,
  Input,
  Picker,
  Modal,
  StatusBadge,
  FeedbackModal,
  type TableColumn,
  type PickerOption,
} from '../../components/ui';
import Pagination from '../../components/ui/Pagination';

type Bus = BusRecord;

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'active': return 'success';
    case 'maintenance': return 'warning';
    case 'inactive': return 'neutral';
    default: return 'neutral';
  }
};

const Buses: React.FC = () => {
  const { buses, loading, error, fetchAllBuses, createBus, updateBus, deleteBus } = useBus();
  const { drivers } = useDriver();
  const { routes } = useRoute();

  const [activeTab, setActiveTab] = useState<'all' | 'add'>('all');
  const [query, setQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Bus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRouteChange, setConfirmRouteChange] = useState(false);
  const [pendingEditPayload, setPendingEditPayload] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; title?: string; message: string } | null>(null);

  const [addFields, setAddFields] = useState<Partial<Bus>>({
    busNumber: '',
    model: '',
    capacity: 0,
    status: 'active',
    assignedDriverId: undefined,
    assignedRouteId: undefined,
  });

  useEffect(() => {
    fetchAllBuses();
  }, []);

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

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedBuses = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const columns: TableColumn<Bus>[] = [
    { key: 'busNumber', header: 'Bus Number', flex: 1.5 },
    { key: 'model', header: 'Model', flex: 1.2 },
    { key: 'capacity', header: 'Capacity', flex: 0.8 },
    {
      key: 'status',
      header: 'Status',
      flex: 1,
      render: (item) => <StatusBadge label={item.status || 'unknown'} variant={getStatusVariant(item.status || '')} />,
    },
    {
      key: 'driver',
      header: 'Assigned Driver',
      flex: 1.5,
      render: (item) => {
        if (typeof item.assignedDriverId === 'object' && item.assignedDriverId) {
          const name = `${item.assignedDriverId?.firstName || ''} ${item.assignedDriverId?.lastName || ''}`.trim();
          if (name) return name;
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
          <Button onPress={() => { setEditingBus(item); setEditFields(item); setModalVisible(true); }} variant="outline" size="sm">View</Button>
          <Button onPress={() => setConfirmDeleteId(item._id || '')} variant="danger" size="sm">Delete</Button>
        </View>
      ),
    },
  ];

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

  const getIdValue = (value: any): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && value._id) return value._id;
    return '';
  };

  const handleDelete = async (busId: string) => {
    setConfirmDeleteId(null);
    setIsSubmitting(true);
    const result = await deleteBus(busId);
    setIsSubmitting(false);
    setFeedback({
      type: result.success ? 'success' : 'error',
      title: result.success ? 'Bus Deleted' : 'Delete Failed',
      message: result.message,
    });
  };

  const submitBusEdit = async (payload: any) => {
    if (!editingBus?._id) return;
    setIsSubmitting(true);
    const result = await updateBus(editingBus._id, payload);
    setIsSubmitting(false);

    if (result.success) {
      setModalVisible(false);
      setEditingBus(null);
      setEditFields({});
      setFeedback({ type: 'success', title: 'Bus Updated', message: result.message });
    } else {
      setFeedback({ type: 'error', title: 'Update Failed', message: result.message });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBus?._id) return;

    let driverId: string | undefined;
    let routeId: string | undefined;

    if (editFields.assignedDriverId !== undefined) {
      driverId = typeof editFields.assignedDriverId === 'object'
        ? editFields.assignedDriverId?._id || ''
        : editFields.assignedDriverId || '';
    }
    if (editFields.assignedRouteId !== undefined) {
      routeId = typeof editFields.assignedRouteId === 'object'
        ? editFields.assignedRouteId?._id || ''
        : editFields.assignedRouteId || '';
    }

    const updatePayload: any = { ...editFields };
    if (driverId !== undefined) updatePayload.assignedDriverId = driverId;
    if (routeId !== undefined) updatePayload.assignedRouteId = routeId;

    const originalRouteId = getIdValue(editingBus.assignedRouteId);
    const newRouteId = routeId !== undefined ? routeId : originalRouteId;
    if (originalRouteId !== newRouteId) {
      setPendingEditPayload(updatePayload);
      setConfirmRouteChange(true);
      return;
    }

    await submitBusEdit(updatePayload);
  };

  const handleAddBus = async () => {
    if (!addFields.busNumber || !addFields.model || !addFields.capacity) {
      setFeedback({ type: 'warning', title: 'Missing Details', message: 'Please fill in all required fields.' });
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
      setFeedback({ type: 'success', title: 'Bus Added', message: result.message });
    } else {
      setFeedback({ type: 'error', title: 'Add Failed', message: result.message });
    }
  };

  const resetAddForm = () => {
    setAddFields({ busNumber: '', model: '', capacity: 0, status: 'active', assignedDriverId: undefined, assignedRouteId: undefined });
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
        onTabChange={(key) => { setActiveTab(key as 'all' | 'add'); setCurrentPage(1); }}
      />

      {activeTab === 'all' ? (
        <>
          <SearchBar
            value={query}
            onChangeText={(v) => { setQuery(v); setCurrentPage(1); }}
            placeholder="Search by bus number, driver or route..."
            onClear={() => { setQuery(''); setCurrentPage(1); }}
          />
          <Table data={paginatedBuses} columns={columns} keyExtractor={(item) => item._id || ''} emptyMessage="No buses found" />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Input label="Bus Number *" placeholder="Enter bus number" value={String(addFields.busNumber ?? '')} onChangeText={(t) => setAddFields((s) => ({ ...s, busNumber: t }))} />
            <Input label="Model *" placeholder="Enter bus model" value={String(addFields.model ?? '')} onChangeText={(t) => setAddFields((s) => ({ ...s, model: t }))} />
            <Input label="Capacity *" type="number" placeholder="Number of seats" value={addFields.capacity ? String(addFields.capacity) : ''} onChangeText={(t) => setAddFields((s) => ({ ...s, capacity: Number(t) || 0 }))} />
            <Picker label="Status" value={addFields.status ?? 'active'} onSelect={(val) => setAddFields((s) => ({ ...s, status: String(val) }))} options={statusOptions} placeholder="Select status" />
            <Picker label="Assigned Driver" value={typeof addFields.assignedDriverId === 'string' ? addFields.assignedDriverId : ''} onSelect={(val) => setAddFields((s) => ({ ...s, assignedDriverId: String(val) || undefined }))} options={driverOptions} placeholder="Select driver (optional)" allowClear onClear={() => setAddFields((s) => ({ ...s, assignedDriverId: undefined }))} />
            <Picker label="Assigned Route" value={typeof addFields.assignedRouteId === 'string' ? addFields.assignedRouteId : ''} onSelect={(val) => setAddFields((s) => ({ ...s, assignedRouteId: String(val) || undefined }))} options={routeOptions} placeholder="Select route (optional)" allowClear onClear={() => setAddFields((s) => ({ ...s, assignedRouteId: undefined }))} />
            <View style={styles.formActions}>
              <Button onPress={resetAddForm} variant="secondary" disabled={isSubmitting}>Reset</Button>
              <Button onPress={handleAddBus} variant="primary" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Bus'}</Button>
            </View>
          </View>
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setEditingBus(null); }}
        title="Edit Bus"
        size="md"
        footer={
          <>
            <Button onPress={() => { setModalVisible(false); setEditingBus(null); }} variant="secondary" disabled={isSubmitting}>Cancel</Button>
            <Button onPress={handleSaveEdit} variant="primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
          </>
        }
      >
        <Input label="Bus Number" value={String(editFields.busNumber ?? '')} onChangeText={(t) => setEditFields((s) => ({ ...s, busNumber: t }))} />
        <Input label="Model" value={String(editFields.model ?? '')} onChangeText={(t) => setEditFields((s) => ({ ...s, model: t }))} />
        <Input label="Capacity" type="number" value={String(editFields.capacity ?? '')} onChangeText={(t) => setEditFields((s) => ({ ...s, capacity: Number(t) || 0 }))} />
        <Picker label="Status" value={editFields.status ?? 'active'} onSelect={(val) => setEditFields((s) => ({ ...s, status: String(val) }))} options={statusOptions} />
        <Picker label="Assigned Driver" value={getIdValue(editFields.assignedDriverId)} onSelect={(val) => setEditFields((s) => ({ ...s, assignedDriverId: String(val) || '' }))} options={driverOptions} placeholder="Select driver" allowClear onClear={() => setEditFields((s) => ({ ...s, assignedDriverId: '' }))} />
        <Picker label="Assigned Route" value={getIdValue(editFields.assignedRouteId)} onSelect={(val) => setEditFields((s) => ({ ...s, assignedRouteId: String(val) || '' }))} options={routeOptions} placeholder="Select route" allowClear onClear={() => setEditFields((s) => ({ ...s, assignedRouteId: '' }))} />
      </Modal>

      {confirmDeleteId && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Feather name="trash-2" size={24} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Bus?</Text>
            <Text style={styles.confirmSub}>This action cannot be undone. The bus will be permanently removed.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity onPress={() => setConfirmDeleteId(null)} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(confirmDeleteId)} style={styles.confirmDelete}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {confirmRouteChange && (
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.warningIconWrap}>
              <Feather name="alert-triangle" size={24} color="#d97706" />
            </View>
            <Text style={styles.confirmTitle}>Change Assigned Route?</Text>
            <Text style={styles.confirmSub}>Assigned schedules need to be changed manually after this update.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => {
                  setConfirmRouteChange(false);
                  setPendingEditPayload(null);
                }}
                style={styles.confirmCancel}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const payload = pendingEditPayload;
                  setConfirmRouteChange(false);
                  setPendingEditPayload(null);
                  submitBusEdit(payload);
                }}
                style={styles.confirmProceed}
              >
                <Text style={styles.confirmDeleteText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  form: { backgroundColor: '#ffffff', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  confirmOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  confirmCard: { width: '82%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  confirmIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  confirmSub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 6, width: '100%' },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  confirmDelete: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  confirmProceed: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0f766e', alignItems: 'center' },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  warningIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});

export { Buses };
