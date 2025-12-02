import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";

interface Home {
  onSOSClick: () => void;
  isOnline: boolean;
}

const Home = ({ onSOSClick, isOnline }: Home) => {
  const [showStartTrip, setShowStartTrip] = useState(false);

  const currentTrip = {
    route: "Route 42 - Downtown Express",
    startTime: "2:30 PM",
    endTime: "4:15 PM",
    nextStop: "City Mall",
    passengersOnboard: 23,
    expectedPassengers: 35,
    progress: 45,
  };

  const upcomingTrip = {
    route: "Route 15 - Airport Link",
    time: "5:00 PM",
    duration: "1h 20m",
  };

  const stats = [
    { label: "Today's Trips", value: "3", icon: "activity" as const },
    { label: "Active Hours", value: "6.5h", icon: "clock" as const },
    { label: "Total Passengers", value: "142", icon: "users" as const },
  ];

  return (
    <View style={styles.container}>
      {/* SOS Button */}
      <TouchableOpacity style={styles.sosButton} onPress={onSOSClick}>
        <Feather name="alert-circle" size={24} color="white" />
        <Text style={styles.sosText}>EMERGENCY SOS</Text>
      </TouchableOpacity>

      {/* Offline Warning */}
      {!isOnline && (
        <View style={styles.warningBox}>
          <Feather name="alert-circle" size={20} color="#b7791f" />
          <View>
            <Text style={styles.warningTitle}>You're currently offline</Text>
            <Text style={styles.warningDesc}>
              Turn online to start receiving trip assignments
            </Text>
          </View>
        </View>
      )}

      {/* Current Trip */}
      {isOnline && (
        <View style={styles.currentTripCard}>
          <View style={styles.currentTopRow}>
            <View>
              <Text style={styles.currentLabel}>Current Trip</Text>
              <Text style={styles.currentRoute}>{currentTrip.route}</Text>
            </View>
            <Text style={styles.activeBadge}>Active</Text>
          </View>

          <View style={{ gap: 8 }}>
            <View style={styles.row}>
              <Feather name="clock" size={16} color="white" />
              <Text style={styles.rowText}>
                {currentTrip.startTime} - {currentTrip.endTime}
              </Text>
            </View>

            <View style={styles.row}>
              <Feather name="activity" size={16} color="white" />
              <Text style={styles.rowText}>
                Next: {currentTrip.nextStop}
              </Text>
            </View>

            <View style={styles.row}>
              <Feather name="users" size={16} color="white" />
              <Text style={styles.rowText}>
                {currentTrip.passengersOnboard}/
                {currentTrip.expectedPassengers} passengers
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Trip Progress</Text>
              <Text style={styles.progressLabel}>{currentTrip.progress}%</Text>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${currentTrip.progress}%` },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        {stats.map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Feather name={stat.icon} size={24} color="#4F46E5" />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Upcoming Trip */}
      <View style={styles.upcomingCard}>
        <View style={styles.upcomingHeader}>
          <Text style={styles.upcomingTitle}>Next Assignment</Text>
          <Text style={styles.upcomingTime}>{upcomingTrip.time}</Text>
        </View>

        <Text style={styles.upcomingRoute}>{upcomingTrip.route}</Text>
        <Text style={styles.upcomingDuration}>
          Duration: {upcomingTrip.duration}
        </Text>

        <TouchableOpacity
          style={styles.startTripButton}
          onPress={() => setShowStartTrip(true)}
        >
          <Feather name="activity" size={20} color="white" />
          <Text style={styles.startTripText}>Start Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickBox}>
          <View style={styles.quickIconBlue}>
            <Feather name="clock" size={22} color="#2563EB" />
          </View>
          <Text style={styles.quickTitle}>Take Break</Text>
          <Text style={styles.quickSubtitle}>Pause location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickBox}>
          <View style={styles.quickIconGreen}>
            <Feather name="users" size={22} color="#16A34A" />
          </View>
          <Text style={styles.quickTitle}>Log Passengers</Text>
          <Text style={styles.quickSubtitle}>Update count</Text>
        </TouchableOpacity>
      </View>

      {/* Start Trip Modal */}
      <Modal visible={showStartTrip} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start Trip</Text>
            <Text style={styles.modalRoute}>{upcomingTrip.route}</Text>

            <TouchableOpacity
              style={styles.modalStartButton}
              onPress={() => {
                console.log("Trip started");
                setShowStartTrip(false);
              }}
            >
              <Text style={styles.modalStartText}>Confirm Start</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowStartTrip(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },

  sosButton: {
    backgroundColor: "#dc2626",
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  sosText: { color: "white", fontWeight: "bold" },

  warningBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 10,
  },
  warningTitle: {
    fontWeight: "600",
    color: "#78350F",
  },
  warningDesc: {
    fontSize: 12,
    color: "#78350F",
    marginTop: 2,
  },

  currentTripCard: {
    backgroundColor: "#3B82F6",
    padding: 18,
    borderRadius: 16,
  },
  currentTopRow: { flexDirection: "row", justifyContent: "space-between" },
  currentLabel: { color: "#Dbeafe", fontSize: 12 },
  currentRoute: { color: "white", fontSize: 18, fontWeight: "600", marginTop: 4 },
  activeBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    color: "white",
    fontSize: 12,
  },

  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowText: { color: "white", fontSize: 14 },

  progressSection: { marginTop: 12 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { color: "white", fontSize: 14 },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 4,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statValue: { fontSize: 20, fontWeight: "bold", marginTop: 6 },
  statLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },

  upcomingCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  upcomingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  upcomingTitle: { fontWeight: "600" },
  upcomingTime: { color: "#6B7280" },
  upcomingRoute: { fontSize: 14, fontWeight: "500" },
  upcomingDuration: { fontSize: 12, color: "#6B7280", marginBottom: 12 },

  startTripButton: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  startTripText: { color: "white", fontWeight: "600" },

  quickRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickBox: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickIconBlue: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickIconGreen: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickTitle: { fontSize: 14, fontWeight: "600" },
  quickSubtitle: { fontSize: 11, color: "#6B7280", marginTop: 4 },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "80%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalRoute: { marginVertical: 10, fontSize: 14 },

  modalStartButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  modalStartText: { color: "white", fontWeight: "bold" },

  modalCancelButton: { marginTop: 8 },
  modalCancelText: { color: "#6B7280" },
});

export default Home;