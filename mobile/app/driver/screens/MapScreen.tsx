import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, spacing, radius, shadow } from '../theme';
import { busStops } from '../data/mock';

interface Props {
  isOnline: boolean;
}

export default function MapScreen({ isOnline }: Props) {
  const [passengerCount, setPassengerCount] = useState(23);
  const [showLog, setShowLog] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#EFF6FF', '#ECFDF3']} style={styles.mapArea}>
        <View style={styles.busBadge}>
          <Text style={styles.busEmoji}>🚌</Text>
          <Text style={styles.busLabel}>Route 42</Text>
        </View>
        <View style={styles.mapOverlay}>
          <Text style={styles.mapText}>Live route visualization placeholder</Text>
        </View>
      </LinearGradient>

      <View style={[styles.passengerCard, shadow.card]}>
        <View style={styles.cardHeader}>
          <View style={styles.metaRow}>
            <Feather name="users" size={16} color={palette.primary} />
            <Text style={styles.metaText}>Passengers Onboard</Text>
          </View>
          <Pressable onPress={() => setShowLog(true)}>
            <Text style={[styles.metaText, { color: palette.primary }]}>Update</Text>
          </Pressable>
        </View>
        <View style={styles.passengerRow}>
          <Text style={styles.passengerCount}>{passengerCount}</Text>
          <View>
            <Text style={styles.metaText}>Capacity</Text>
            <Text style={styles.capacityText}>45 seats</Text>
          </View>
        </View>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${(passengerCount / 45) * 100}%` }]} />
        </View>
      </View>

      <View style={[styles.sheet, shadow.card]}>
        <View style={styles.sheetHeader}>
          <View style={styles.handle} />
          <View style={styles.sheetTopRow}>
            <Text style={styles.sheetTitle}>Route Stops</Text>
            <Pressable style={[styles.statusButton, isPaused && styles.statusPaused]} onPress={() => setIsPaused(!isPaused)}>
              <Feather name={isPaused ? 'play' : 'pause'} size={14} color={isPaused ? palette.warning : palette.success} />
              <Text style={[styles.statusText, { color: isPaused ? palette.warning : palette.success }]}> 
                {isPaused ? 'On Break' : 'Active'}
              </Text>
            </Pressable>
          </View>
        </View>
        <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
          {busStops.map((stop) => (
            <View key={stop.id} style={[styles.stopRow, stop.status === 'active' && styles.activeStop, stop.status === 'completed' && styles.completedStop]}>
              <View style={[styles.stopIndex, stop.status === 'active' && styles.stopIndexActive, stop.status === 'completed' && styles.stopIndexCompleted]}>
                <Text style={styles.stopIndexText}>{stop.status === 'completed' ? '✓' : stop.id}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopTime}>{stop.time}</Text>
              </View>
              {stop.passengers > 0 && (
                <View style={styles.metaRow}>
                  <Feather name="users" size={14} color={palette.muted} />
                  <Text style={styles.stopTime}>+{stop.passengers}</Text>
                </View>
              )}
              {stop.status === 'active' && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>Current</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      <Modal transparent visible={showLog} animationType="slide" onRequestClose={() => setShowLog(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Passengers</Text>
            <View style={styles.counterRow}>
              <Pressable style={styles.counterButton} onPress={() => setPassengerCount(Math.max(0, passengerCount - 1))}>
                <Feather name="minus" size={18} color={palette.text} />
              </Pressable>
              <Text style={styles.counterValue}>{passengerCount}</Text>
              <Pressable style={[styles.counterButton, styles.counterAdd]} onPress={() => setPassengerCount(Math.min(45, passengerCount + 1))}>
                <Feather name="plus" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.quickAddRow}>
              {[5, 10, 15].map((num) => (
                <Pressable key={num} style={styles.quickAdd} onPress={() => setPassengerCount(Math.min(45, passengerCount + num))}>
                  <Text style={styles.quickAddText}>+{num}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.saveButton} onPress={() => setShowLog(false)}>
              <Text style={styles.saveText}>Save Count</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Go online to start sharing live location.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  mapArea: { flex: 1, minHeight: 220, justifyContent: 'center', alignItems: 'center' },
  mapOverlay: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: radius.md,
  },
  mapText: { color: palette.muted },
  busBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadow.card,
    gap: spacing.sm,
  },
  busEmoji: { fontSize: 20 },
  busLabel: { fontWeight: '700', color: palette.text },
  passengerCard: {
    backgroundColor: palette.surface,
    marginHorizontal: spacing.lg,
    marginTop: -40,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { color: palette.muted },
  passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passengerCount: { fontSize: 32, fontWeight: '700', color: palette.text },
  capacityText: { color: palette.text, fontWeight: '700' },
  progressBg: { height: 8, backgroundColor: palette.border, borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: palette.primary },
  sheet: {
    backgroundColor: palette.surface,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sheetHeader: { alignItems: 'center', gap: spacing.md },
  handle: { width: 50, height: 5, backgroundColor: palette.border, borderRadius: 10, marginTop: spacing.sm },
  sheetTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: palette.text },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#ECFDF3',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  statusPaused: { backgroundColor: '#FEF3C7' },
  statusText: { fontWeight: '700' },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  activeStop: { backgroundColor: '#EFF6FF' },
  completedStop: { backgroundColor: '#F8FAFC' },
  stopIndex: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.border,
  },
  stopIndexActive: { backgroundColor: palette.primary },
  stopIndexCompleted: { backgroundColor: palette.success },
  stopIndexText: { color: '#FFFFFF', fontWeight: '700' },
  stopName: { color: palette.text, fontWeight: '600' },
  stopTime: { color: palette.muted },
  activePill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  activePillText: { color: palette.primary, fontWeight: '700', fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: palette.text },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterAdd: { backgroundColor: palette.primary, borderColor: palette.primary },
  counterValue: { fontSize: 28, fontWeight: '700', color: palette.text },
  quickAddRow: { flexDirection: 'row', gap: spacing.sm },
  quickAdd: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  quickAddText: { color: palette.text, fontWeight: '700' },
  saveButton: {
    backgroundColor: palette.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  offlineBanner: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineText: { color: '#92400E' },
});
