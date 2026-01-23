import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePassenger, type ServiceAlert } from '../context/PassengerContext';
import { formatTime, formatDate } from '../utils/helpers';
import { mockAlertsData } from '../utils/mockData';

const Notifications = () => {
  const { markAlertRead } = usePassenger();
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<ServiceAlert | null>(null);
  const [alertDetailModal, setAlertDetailModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Initialize with mock data if empty
    if (alerts.length === 0) {
      setAlerts(mockAlertsData);
    }
  }, []);

  const filteredAlerts = alerts.filter(alert => {
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
      setAlerts(alerts.map(a => (a.id === alert.id ? { ...a, read: true } : a)));
    }
  };

  const handleClearAll = () => {
    setAlerts(alerts.map(a => ({ ...a, read: true })));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#991b1b';
      case 'warning':
        return '#d97706';
      case 'info':
        return '#0284c7';
      default:
        return '#6b7280';
    }
  };

  const getSeverityBackgroundColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#fee2e2';
      case 'warning':
        return '#fef3c7';
      case 'info':
        return '#e0f2fe';
      default:
        return '#f3f4f6';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'delay':
        return 'time-outline';
      case 'detour':
        return 'navigate-outline';
      case 'accident':
        return 'alert-circle-outline';
      case 'cancellation':
        return 'close-circle-outline';
      case 'maintenance':
        return 'build-outline';
      default:
        return 'information-circle-outline';
    }
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

  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Alerts</Text>
        <Text style={styles.headerSubtitle}>Stay updated with service notifications</Text>
      </View>

      {/* Filter and Actions */}
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

      {/* Alerts List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredAlerts.length > 0 ? (
          <View style={styles.alertsList}>
            {filteredAlerts.map(alert => (
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
              {filterType === 'unread' ? 'All caught up!' : 'No alerts'}
            </Text>
            <Text style={styles.emptyStateText}>
              {filterType === 'unread'
                ? 'You have no unread notifications'
                : 'You will receive alerts about service updates here'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Alert Detail Modal */}
      <Modal visible={alertDetailModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAlertDetailModal(false)}
            >
              <Ionicons name="close" size={24} color="#1f2937" />
            </TouchableOpacity>

            {selectedAlert && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Alert Header */}
                <View
                  style={[
                    styles.modalHeader,
                    { backgroundColor: getSeverityBackgroundColor(selectedAlert.severity) },
                  ]}
                >
                  <Ionicons
                    name={getAlertIcon(selectedAlert.type)}
                    size={40}
                    color={getSeverityColor(selectedAlert.severity)}
                  />
                  <Text style={styles.modalTitle}>{selectedAlert.title}</Text>
                  <View
                    style={[
                      styles.severityBadgeLarge,
                      {
                        backgroundColor: getSeverityColor(selectedAlert.severity),
                      },
                    ]}
                  >
                    <Text style={styles.severityBadgeLargeText}>
                      {selectedAlert.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Alert Details */}
                <View style={styles.detailsSection}>
                  <View style={styles.detailsContent}>
                    <Text style={styles.detailsLabel}>Message</Text>
                    <Text style={styles.detailsText}>{selectedAlert.message}</Text>

                    <View style={styles.detailsDivider} />

                    <Text style={styles.detailsLabel}>Type</Text>
                    <Text style={styles.detailsText}>
                      {selectedAlert.type.charAt(0).toUpperCase() + selectedAlert.type.slice(1)}
                    </Text>

                    <View style={styles.detailsDivider} />

                    <Text style={styles.detailsLabel}>Time</Text>
                    <Text style={styles.detailsText}>
                      {formatDate(selectedAlert.timestamp)} at {formatTime(selectedAlert.timestamp)}
                    </Text>

                    {selectedAlert.routeId && (
                      <>
                        <View style={styles.detailsDivider} />
                        <Text style={styles.detailsLabel}>Affected Route</Text>
                        <Text style={styles.detailsText}>Route {selectedAlert.routeId}</Text>
                      </>
                    )}

                    {selectedAlert.busId && (
                      <>
                        <View style={styles.detailsDivider} />
                        <Text style={styles.detailsLabel}>Affected Bus</Text>
                        <Text style={styles.detailsText}>Bus {selectedAlert.busId}</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity style={styles.actionButtonPrimary}>
                    <Ionicons name="notifications" size={18} color="#ffffff" />
                    <Text style={styles.actionButtonText}>Enable Notifications</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButtonSecondary}>
                    <Ionicons name="share-social" size={18} color="#3b82f6" />
                    <Text style={styles.actionButtonSecondaryText}>Share Alert</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
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
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1d5db',
  },
  controlsContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#dbeafe',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTabTextActive: {
    color: '#1e40af',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
    marginLeft: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  alertsList: {
    marginBottom: 20,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
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
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 10,
    color: '#9ca3af',
  },
  alertRight: {
    marginLeft: 8,
  },
  severityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityText: {
    fontWeight: '700',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  severityBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  severityBadgeLargeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailsContent: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 12,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  actionButtonsContainer: {
    marginBottom: 20,
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonSecondary: {
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButtonSecondaryText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default Notifications;
