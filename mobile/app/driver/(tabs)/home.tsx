import React from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView} from "react-native-safe-area-context";
const Home = () => {
    const stats = [
        { label: "Today Trips", value: 3 },
        { label: "Completed", value: 24 },
        { label: "Earnings", value: "$128" },
    ];

    return (
        <SafeAreaView>
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.welcome}>Good Morning, Driver</Text>

            <View style={styles.statsRow}>
                {stats.map((s, i) => (
                    <View key={i} style={styles.statCard}>
                        <Text style={styles.statValue}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Next Trip</Text>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Kathmandu Bus Park → Ratna Park</Text>
                    <Text style={styles.cardSub}>Depart: 09:30 AM</Text>
                    <TouchableOpacity style={styles.primaryBtn}>
                        <Text style={styles.btnText}>Start Trip</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16},
    welcome: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
    statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: "#fff", marginHorizontal: 6, padding: 12, borderRadius: 8, alignItems: "center" },
    statValue: { fontSize: 18, fontWeight: "700" },
    statLabel: { fontSize: 12, color: "#6b7280" },
    section: { marginTop: 8 },
    sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
    card: { backgroundColor: "#fff", padding: 12, borderRadius: 8 },
    cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
    cardSub: { color: "#6b7280", marginBottom: 8 },
    primaryBtn: { backgroundColor: "#0ea5e9", paddingVertical: 10, borderRadius: 6, alignItems: "center" },
    btnText: { color: "#fff", fontWeight: "700" },
});

export default Home;