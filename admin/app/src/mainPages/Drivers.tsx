import React, {useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ToastAndroid,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useDriver, DriverRecord } from "../../context/DriverContext";
import {
  Tabs,
  SearchBar,
  Table,
  Button,
  Modal,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  type TableColumn,
} from "../../components/ui";

type DisplayDriver = {
  driverId: string; // This is actually the _id from backend
  name: string;
  phone: string;
  email: string;
  licenseNo: string;
  validationStatus?: string;
  isActive?: boolean;
  profileImgUrl?: string;
  raw: DriverRecord;
};

const Drivers: React.FC = () => {
  const {
    drivers,
    pendingDrivers,
    loading,
    error,
    fetchAllDrivers,
    fetchPendingDrivers,
    approveDriver,
    rejectDriver,
  } = useDriver();

  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DisplayDriver | null>(null);
  const [processingDriverId, setProcessingDriverId] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    driverId: string;
    driverName: string;
  } | null>(null);

  const toDisplayDriver = (drv: DriverRecord): DisplayDriver => {
    const fullName = `${drv.firstName || ""} ${drv.lastName || ""}`.trim();
    return {
      driverId: drv._id || '', // Using _id as the identifier
      name: fullName || drv.email || drv._id || 'Unknown',
      phone: drv.phoneNumber || "-",
      email: drv.email || "-",
      licenseNo: drv.licenseNo || "-",
      validationStatus: drv.validationStatus,
      isActive: drv.isActive,
      profileImgUrl: drv.profileImgUrl,
      raw: drv,
    };
  };

  const normalizedDrivers = useMemo(
    () => drivers.map((drv) => toDisplayDriver(drv)),
    [drivers]
  );

  const filteredDrivers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedDrivers;
    return normalizedDrivers.filter((driver) =>
      [driver.name, driver.phone, driver.email, driver.driverId]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    );
  }, [normalizedDrivers, query]);

  const confirmApprove = (driverId: string, driverName: string) => {
    setConfirmAction({ type: 'approve', driverId, driverName });
    setConfirmModalVisible(true);
  };

  const confirmReject = (driverId: string, driverName: string) => {
    setConfirmAction({ type: 'reject', driverId, driverName });
    setConfirmModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    setConfirmModalVisible(false);
    
    if (confirmAction.type === 'approve') {
      await handleApprove(confirmAction.driverId);
    } else {
      await handleReject(confirmAction.driverId);
    }
    
    setConfirmAction(null);
  };

  // Table columns for all drivers
  const driverColumns: TableColumn<DisplayDriver>[] = [
    {
      key: 'name',
      header: 'Name',
      flex: 1.5,
    },
    {
      key: 'phone',
      header: 'Phone',
      flex: 1,
    },
    {
      key: 'email',
      header: 'Email',
      flex: 1.5,
    },
    {
      key: 'validationStatus',
      header: 'Status',
      flex: 0.8,
      render: (item) => (
        <StatusBadge
          label={item.validationStatus || 'Unknown'}
          variant={item.validationStatus === 'approved' ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'licenseNo',
      header: 'License',
      flex: 1.2,
    },
    {
      key: 'isActive',
      header: 'Active',
      flex: 0.7,
      render: (item) => (item.isActive ? 'Yes' : 'No'),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 100,
      render: (item) => (
        <Button
          onPress={() => {
            setEditingDriver(item);
            setModalVisible(true);
          }}
          variant="outline"
          size="sm"
        >
          View
        </Button>
      ),
    },
  ];

  // Prepare pending drivers for table
  const pendingDriversDisplay = useMemo(() => {
    return pendingDrivers.map((req) => toDisplayDriver(req));
  }, [pendingDrivers]);

  // Table columns for pending requests
  const requestColumns: TableColumn<DisplayDriver>[] = [
    {
      key: 'name',
      header: 'Name',
      flex: 1.5,
    },
    {
      key: 'phone',
      header: 'Phone',
      flex: 1,
    },
    {
      key: 'email',
      header: 'Email',
      flex: 1.5,
    },
    {
      key: 'licenseNo',
      header: 'License',
      flex: 1.2,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (item) => (
        <View style={styles.actionButtons}>
          {processingDriverId === item.driverId ? (
            <ActivityIndicator size="small" />
          ) : (
            <>
              <Button
                onPress={() => confirmApprove(item.driverId, item.name)}
                variant="success"
                size="sm"
                disabled={processingDriverId !== null}
              >
                Accept
              </Button>
              <Button
                onPress={() => confirmReject(item.driverId, item.name)}
                variant="danger"
                size="sm"
                disabled={processingDriverId !== null}
              >
                Reject
              </Button>
            </>
          )}
        </View>
      ),
    },
  ];



  const handleApprove = async (driverId: string) => {
  try {
    setProcessingDriverId(driverId);

    const result = await approveDriver(driverId);

    if (result.success) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          result.message || "Driver approved successfully!",
          ToastAndroid.SHORT
        );
      } else {
        console.log(result.message || "Driver approved successfully!");
      }
    } else {
      console.error("Error:", result.message || "Failed to approve driver");
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          result.message || "Failed to approve driver",
          ToastAndroid.LONG
        );
      }
    }
  } catch (err) {
    console.error("Error:", "Something went wrong");
    if (Platform.OS === 'android') {
      ToastAndroid.show("Something went wrong", ToastAndroid.LONG);
    }
  } finally {
    setProcessingDriverId(null);
  }
};

const handleReject = async (driverId: string) => {
  try {
    setProcessingDriverId(driverId);

    const result = await rejectDriver(driverId);

    if (result.success) {
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          result.message || "Driver rejected successfully!",
          ToastAndroid.SHORT
        );
      } else {
        console.log(result.message || "Driver rejected successfully!");
      }
    } else {
      console.error("Error:", result.message || "Failed to reject driver");
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          result.message || "Failed to reject driver",
          ToastAndroid.LONG
        );
      }
    }
  } catch (err) {
    console.error("Error:", "Something went wrong");
    if (Platform.OS === 'android') {
      ToastAndroid.show("Something went wrong", ToastAndroid.LONG);
    }
  } finally {
    setProcessingDriverId(null);
  }
};

  useFocusEffect(
    React.useCallback(() => {
      fetchAllDrivers();
      fetchPendingDrivers();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Tabs
        tabs={[
          { key: 'all', label: 'All Drivers' },
          { key: 'requests', label: 'Driver Requests', badge: pendingDrivers.length },
        ]}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key as 'all' | 'requests')}
      />

      {activeTab === 'all' ? (
        <>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, phone, or email..."
            onClear={() => setQuery('')}
            showRefresh
            onRefresh={fetchAllDrivers}
          />

          {loading ? (
            <LoadingSpinner message="Loading drivers..." />
          ) : error ? (
            <EmptyState
              title="Failed to load drivers"
              description={error}
              action={
                <Button onPress={fetchAllDrivers} variant="primary">
                  Retry
                </Button>
              }
            />
          ) : (
            <Table
              data={filteredDrivers}
              columns={driverColumns}
              keyExtractor={(item) => item.driverId}
              emptyMessage="No drivers found"
            />
          )}
        </>
      ) : (
        <>
          {loading ? (
            <LoadingSpinner message="Loading requests..." />
          ) : error ? (
            <EmptyState
              title="Failed to load requests"
              description={error}
              action={
                <Button onPress={fetchPendingDrivers} variant="primary">
                  Retry
                </Button>
              }
            />
          ) : pendingDriversDisplay.length === 0 ? (
            <EmptyState
              title="No pending requests"
              description="All driver requests have been processed"
            />
          ) : (
            <Table
              data={pendingDriversDisplay}
              columns={requestColumns}
              keyExtractor={(item) => item.driverId}
              emptyMessage="No pending requests"
            />
          )}
        </>
      )}

      <Modal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingDriver(null);
        }}
        title="Driver Details"
        size="md"
        footer={
          <Button
            onPress={() => {
              setModalVisible(false);
              setEditingDriver(null);
            }}
            variant="secondary"
          >
            Close
          </Button>
        }
      >
        <View style={styles.modalContent}>
          <View style={styles.driverHeader}>
            <Image
              source={
                editingDriver?.profileImgUrl
                  ? { uri: editingDriver.profileImgUrl }
                  : require('../../utils/MainLogo.png')
              }
              style={styles.avatar}
            />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{editingDriver?.name ?? ''}</Text>
              <StatusBadge
                label={editingDriver?.validationStatus || 'Unknown'}
                variant={
                  editingDriver?.validationStatus === 'approved' ? 'success' : 'neutral'
                }
              />
            </View>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{editingDriver?.phone ?? '-'}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{editingDriver?.email ?? '-'}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>License Number</Text>
              <Text style={styles.detailValue}>{editingDriver?.licenseNo ?? '-'}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Active Status</Text>
              <Text style={styles.detailValue}>
                {editingDriver?.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Driver ID</Text>
              <Text style={styles.detailValue}>{editingDriver?.driverId ?? '-'}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        onClose={() => {
          setConfirmModalVisible(false);
          setConfirmAction(null);
        }}
        title={confirmAction?.type === 'approve' ? 'Approve Driver' : 'Reject Driver'}
        size="sm"
        footer={
          <View style={styles.confirmFooter}>
            <Button
              onPress={() => {
                setConfirmModalVisible(false);
                setConfirmAction(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onPress={handleConfirmAction}
              variant={confirmAction?.type === 'approve' ? 'success' : 'danger'}
            >
              {confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </View>
        }
      >
        <Text style={styles.confirmText}>
          {confirmAction?.type === 'approve'
            ? `Are you sure you want to approve ${confirmAction?.driverName}?`
            : `Are you sure you want to reject ${confirmAction?.driverName}?`}
        </Text>
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
  modalContent: {
    gap: 16,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  confirmText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  driverInfo: {
    flex: 1,
    gap: 8,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 15,
    color: '#111827',
  },
});

export default Drivers;