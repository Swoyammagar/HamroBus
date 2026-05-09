import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { spacing } from '../theme';
import driverService from '../services/driverService';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type SosCategory = 'vehicle-accident' | 'medical-emergency' | 'vehicle-breakdown' | 'security-issue' | 'passenger-issue' | 'other-emergency';

const SOS_CATEGORIES: Array<{
  id: SosCategory;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  helper: string;
}> = [
  { id: 'vehicle-accident', title: 'Vehicle Accident', icon: 'alert-triangle', helper: 'Crash / collision' },
  { id: 'medical-emergency', title: 'Medical Emergency', icon: 'plus-square', helper: 'Passenger or driver health issue' },
  { id: 'vehicle-breakdown', title: 'Vehicle Breakdown', icon: 'tool', helper: 'Mechanical failure' },
  { id: 'security-issue', title: 'Security Issue', icon: 'shield', helper: 'Threat / unsafe situation' },
  { id: 'passenger-issue', title: 'Passenger Issue', icon: 'users', helper: 'Conflict / disruptive passenger' },
  { id: 'other-emergency', title: 'Other Emergency', icon: 'help-circle', helper: 'Any other urgent case' },
];

export default function EmergencySOSModal({ visible, onClose }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<SosCategory>('vehicle-accident');
  const [details, setDetails] = useState('');
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [sending, setSending] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let mounted = true;

    const loadTripAndLocation = async () => {
      setSelectedCategory('vehicle-accident');
      setDetails('');
      setSosSent(false);
      setCurrentTrip(null);
      setCurrentLocation(null);

      try {
        const trip = await driverService.getCurrentTrip();
        if (mounted) setCurrentTrip(trip);
      } catch (error) {
        console.warn('Could not load current trip for SOS modal', error);
      }

      try {
        setLoadingLocation(true);
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (mounted) {
            Alert.alert('Location Required', 'Please allow location access so SOS can share your exact position.');
          }
          return;
        }

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (mounted) {
          setCurrentLocation(pos.coords);
        }
      } catch (error) {
        console.warn('Could not get SOS location', error);
      } finally {
        if (mounted) setLoadingLocation(false);
      }
    };

    loadTripAndLocation();

    return () => {
      mounted = false;
    };
  }, [visible]);

  const tripBusId = String(currentTrip?.busId?._id || currentTrip?.busId || '').trim();
  const tripId = String(currentTrip?._id || '').trim();
  const locationText = currentLocation
    ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`
    : 'Fetching live location...';

  const openPhoneDialer = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Could not open dialer', `Please dial ${phone} manually.`);
    });
  };

  const handlePrimaryAction = async () => {
    if (sosSent) {
      try {
        if (tripBusId) {
          await driverService.clearSosAlert({ busId: tripBusId, tripId: tripId || undefined });
        }
        setSosSent(false);
        onClose();
      } catch (error) {
        Alert.alert('Error', 'Could not clear SOS. Please try again.');
      }
      return;
    }

    if (!tripBusId) {
      Alert.alert('No Active Trip', 'We could not determine the active bus for this SOS alert.');
      return;
    }

    try {
      setSending(true);
      const payload = {
        busId: tripBusId,
        tripId: tripId || undefined,
        category: selectedCategory,
        details: details.trim(),
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
      };

      await driverService.sendSosAlert(payload);
      setSosSent(true);
      Alert.alert('SOS Sent', 'Admin has been notified immediately. Continue the trip only when safe.');
    } catch (error: any) {
      Alert.alert('Send Failed', error?.response?.data?.message || 'Unable to send SOS alert.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={sosSent ? handlePrimaryAction : onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <View style={styles.alertBadge}>
                <Feather name="alert-circle" size={18} color="#fff" />
              </View>
              <View style={styles.titleTextWrap}>
                <Text style={styles.title}>Emergency SOS</Text>
                <Text style={styles.subtitle}>Select emergency type</Text>
              </View>
            </View>
            <Pressable onPress={sosSent ? handlePrimaryAction : onClose} hitSlop={8} style={styles.closeButton}>
              <Feather name="x" size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={14} color="#fff" />
              <Text style={styles.locationText}>{locationText}</Text>
            </View>
            <View style={styles.locationRow}>
              <Feather name="clock" size={14} color="#fff" />
              <Text style={styles.locationText}>{new Date().toLocaleTimeString()}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.grid}>
              {SOS_CATEGORIES.map((item) => {
                const selected = item.id === selectedCategory;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedCategory(item.id)}
                    style={[styles.categoryCard, selected && styles.categoryCardSelected]}
                  >
                    <View style={[styles.categoryIconWrap, selected && styles.categoryIconWrapSelected]}>
                      <Feather name={item.icon} size={22} color={selected ? '#ef4444' : '#6b7280'} />
                    </View>
                    <Text style={[styles.categoryTitle, selected && styles.categoryTitleSelected]}>{item.title}</Text>
                    <Text style={styles.categoryHelper}>{item.helper}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.detailsWrap}>
              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Add additional details (optional)..."
                placeholderTextColor="#9ca3af"
                style={styles.detailsInput}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>This will notify:</Text>
              <Text style={styles.noticeItem}>• Control Center Operators</Text>
              <Text style={styles.noticeItem}>• System Administrators</Text>
              <Text style={styles.noticeItem}>• Emergency Services (if needed)</Text>
            </View>

            <View style={styles.quickActionsRow}>
              <Pressable style={styles.quickAction} onPress={() => openPhoneDialer('100')}>
                <Ionicons name="call" size={16} color="#b91c1c" />
                <Text style={styles.quickActionText}>Call Police 100</Text>
              </Pressable>
              <Pressable style={styles.quickAction} onPress={() => openPhoneDialer('102')}>
                <MaterialCommunityIcons name="ambulance" size={16} color="#b91c1c" />
                <Text style={styles.quickActionText}>Call Ambulance</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.primary, (sending || loadingLocation) && styles.primaryDisabled]}
              onPress={handlePrimaryAction}
              disabled={sending || loadingLocation}
            >
              <Text style={styles.primaryText}>
                {sosSent ? 'Continue Trip' : sending ? 'Sending Alert...' : 'Send Emergency Alert'}
              </Text>
            </Pressable>
            {!sosSent ? (
              <Pressable style={styles.secondary} onPress={onClose}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  header: {
    backgroundColor: '#ef1111',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextWrap: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
  },
  locationCard: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 18,
    paddingTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryCard: {
    width: '48.5%',
    minHeight: 104,
    borderWidth: 1,
    borderColor: '#dbe1ea',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  categoryCardSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
    shadowColor: '#ef4444',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryIconWrapSelected: {
    backgroundColor: '#fee2e2',
  },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  categoryTitleSelected: {
    color: '#dc2626',
  },
  categoryHelper: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  detailsWrap: {
    marginTop: 14,
  },
  detailsInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#dbe1ea',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 14,
  },
  noticeCard: {
    marginTop: 14,
    backgroundColor: '#fff8e7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f0d38a',
    padding: 14,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 6,
  },
  noticeItem: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  quickAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff5f5',
  },
  quickActionText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 6,
    gap: 10,
  },
  primary: {
    backgroundColor: '#ef1111',
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryDisabled: {
    opacity: 0.75,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  secondary: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe1ea',
  },
  secondaryText: {
    color: '#111827',
    fontWeight: '700',
  },
});
