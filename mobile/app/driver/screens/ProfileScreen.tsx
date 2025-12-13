import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import ReviewsSection from '../component/ReviewsSection';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.headerCard, shadow.card]}>
        <View style={styles.avatar}> 
          <Text style={styles.avatarEmoji}>🧑‍✈️</Text>
        </View>
        <View>
          <Text style={styles.name}>James Rodriguez</Text>
          <Text style={styles.sub}>Driver ID: DR-2847</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Stat icon="star" label="Rating" value="4.9" />
        <Stat icon="award" label="Experience" value="5 yrs" />
        <Stat icon="clock" label="Hours" value="1800h" />
      </View>

      <View style={[styles.card, shadow.card]}>
        <Text style={styles.cardTitle}>Documents</Text>
        <View style={styles.docRow}>
          <Feather name="file-text" size={16} color={palette.muted} />
          <Text style={styles.docText}>License · Up to date</Text>
        </View>
        <View style={styles.docRow}>
          <Feather name="shield" size={16} color={palette.muted} />
          <Text style={styles.docText}>Background Check · Cleared</Text>
        </View>
      </View>

      <ReviewsSection />
    </ScrollView>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={[styles.stat, shadow.card]}>
      <Feather name={icon} size={16} color={palette.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  scrollContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  headerCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: '#E0ECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  name: { fontSize: 18, fontWeight: '700', color: palette.text },
  sub: { color: palette.muted },
  infoRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: palette.text },
  statLabel: { color: palette.muted },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardTitle: { fontWeight: '700', color: palette.text },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  docText: { color: palette.muted },
});
