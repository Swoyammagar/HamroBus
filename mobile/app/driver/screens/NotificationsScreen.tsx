import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  notificationService,
  type DriverNotificationApiRecord,
} from '../services/notificationService';
import {
  notifyNotificationAllRead,
  notifyNotificationReadChange,
  subscribeIncomingNotification,
} from '../services/notificationEvents';

interface ServiceAlert {
  id: string;
  type: 'alert' | 'info' | 'maintenance' | 'announcement' | 'emergency';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  read: boolean;
}

const NotificationsScreen = () => {
  const { user, driver } = useAuth();
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<ServiceAlert | null>(null);
  const [alertDetailModal, setAlertDetailModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const currentDriverId = String(driver?.id || (user as any)?.id || user?._id || '').trim();

  const mapApiToAlert = (
    item: DriverNotificationApiRecord,
    driverId?: string
  ): ServiceAlert | null => {
    const id = String(item?._id || item?.id || '').trim();
    if (!id) return null;

    const isRead = (item.readBy || []).some((entry) => {
      const readUserId = String(entry?.userId || '').trim();
      return driverId ? readUserId === String(driverId) : false;
    });

    return {
      id,
      type: (item.type || 'info') as 'alert' | 'info' | 'maintenance' | 'announcement' | 'emergency',
      title: item.title || 'Notification',
      message: item.message || '',
      severity: (item.severity || 'medium') as 'low' | 'medium' | 'high' | 'critical',
      timestamp: item.createdAt || new Date().toISOString(),
      read: isRead,
    };
  };

  const fetchDriverNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getDriverNotifications();
      const mapped = data
        .map((item) => mapApiToAlert(item, currentDriverId))
        .filter(Boolean) as ServiceAlert[];
      setAlerts(mapped);
    } catch (error) {
      console.error('Failed to load driver notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverNotifications();
  }, [currentDriverId]);

  useEffect(() => {
    if (!currentDriverId) return;

    const unsubscribe = subscribeIncomingNotification((payload: DriverNotificationApiRecord) => {
      const mapped = mapApiToAlert(payload, currentDriverId);
      if (!mapped) return;

      setAlerts((prev) => {
        const exists = prev.some((a) => a.id === mapped.id);
        return exists ? prev : [mapped, ...prev];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [currentDriverId]);

  const filteredAlerts = alerts.filter((alert) => {
    if (filterType === 'unread') {
      return !alert.read;
    }
    return true;
  });

  const handleAlertPress = (alert: ServiceAlert) => {
    setSelectedAlert(alert);
    setAlertDetailModal(true);

    if (!alert.read) {
      markAlertRead(alert.id);
      notifyNotificationReadChange();
      notificationService.markNotificationRead(alert.id).catch((error) => {
        console.error('Failed to mark notification read:', error);
      });
    }
  };

  const markAlertRead = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
    );
  };

  const handleClearAll = async () => {
    const unread = alerts.filter((a) => !a.read);
    setAlerts(alerts.map((a) => ({ ...a, read: true })));
    notifyNotificationAllRead();

    try {
      await Promise.all(unread.map((a) => notificationService.markNotificationRead(a.id)));
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#991b1b';
      case 'high':
        return '#d97706';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getSeverityBackgroundColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#fee2e2';
      case 'high':
        return '#fef3c7';
      case 'medium':
        return '#f3f4f6';
      case 'low':
        return '#f0fdf4';
      default:
        return '#f3f4f6';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return 'alert-circle-outline';
      case 'info':
        return 'information-circle-outline';
      case 'maintenance':
        return 'build-outline';
      case 'announcement':
        return 'megaphone-outline';
      case 'emergency':
        return 'warning-outline';
      default:
        return 'information-circle-outline';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const AlertCard = ({ alert, onPress }: { alert: ServiceAlert; onPress: () => void }) => (
    <TouchableOpacity style={styles.alertCard} onPress={onPress}>
      <View
        style={[
          styles.alertIcon,
          { backgroundColor: getSeverityBackgroundColor(alert.severity) },
        ]}
      >
        <Ionicons
          name={getAlertIcon(alert.type)}
          size={24}
          color={getSeverityColor(alert.severity)}
        />
      </View>

      <View style={styles.alertContent}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertTitle}>{alert.title}</Text>
          {!alert.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.alertMessage} numberOfLines={2}>
          {alert.message}
        </Text>
        <Text style={styles.alertTime}>{formatTime(alert.timestamp)}</Text>
      </View>

      <View style={styles.alertRight}>
        <View
          style={[
            styles.severityBadge,
            { backgroundColor: getSeverityBackgroundColor(alert.severity) },
          ]}
        >
          <Text
            style={[styles.severityText, { color: getSeverityColor(alert.severity) }]}
          >
            {alert.severity.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Stay updated with important alerts</Text>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
            onPress={() => setFilterType('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === 'all' && styles.filterTabTextActive,
              ]}
            >
              All ({alerts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'unread' && styles.filterTabActive]}
            onPress={() => setFilterType('unread')}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === 'unread' && styles.filterTabTextActive,
              ]}
            >
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Ionicons name="checkmark-done" size={16} color="#3b82f6" />
            <Text style={styles.clearButtonText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : filteredAlerts.length > 0 ? (
          <View style={styles.alertsList}>
            {filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onPress={() => handleAlertPress(alert)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name={filterType === 'unread' ? 'checkmark-done' : 'notifications-outline'}
              size={48}
              color="#d1d5db"
            />
            <Text style={styles.emptyStateTitle}>
              {filterType === 'unread' ? 'All caught up!' : 'No notifications'}
            </Text>
            <Text style={styles.emptyStateMessage}>
              {filterType === 'unread'
                ? 'You have read all notifications'
                : 'No notifications at the moment'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={alertDetailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertDetailModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAlertDetailModal(false)}
        >
          <View style={styles.modalContent}>
            {selectedAlert && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIcon,
                      {
                        backgroundColor: getSeverityBackgroundColor(selectedAlert.severity),
                      },
                    ]}
                  >
                    <Ionicons
                      name={getAlertIcon(selectedAlert.type)}
                      size={32}
                      color={getSeverityColor(selectedAlert.severity)}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setAlertDetailModal(false)}
                  >
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{selectedAlert.title}</Text>
                <Text style={styles.modalMessage}>{selectedAlert.message}</Text>

                <View style={styles.modalMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Type</Text>
                    <Text style={styles.metaValue}>{selectedAlert.type}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Severity</Text>
                    <Text
                      style={[
                        styles.metaValue,
                        { color: getSeverityColor(selectedAlert.severity) },
                      ]}
                    >
                      {selectedAlert.severity.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Time</Text>
                    <Text style={styles.metaValue}>{formatTime(selectedAlert.timestamp)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setAlertDetailModal(false)}
                >
                  <Text style={styles.modalCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  filterTabActive: {
    backgroundColor: '#dbeafe',
  },
  filterTabText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#3b82f6',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 8,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  alertsList: {
    gap: 8,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  alertMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  alertRight: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  severityBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
  },
  emptyStateMessage: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalMeta: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  metaItem: {
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default NotificationsScreen;
