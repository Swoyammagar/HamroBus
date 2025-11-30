import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView} from "react-native-safe-area-context";
const sampleHistory = [
    { id: 1, title: "Trip to Ratna Park", date: "2025-11-18", status: "Completed" },
    { id: 2, title: "Morning Shuttle", date: "2025-11-17", status: "Completed" },
    { id: 3, title: "Evening Route", date: "2025-11-16", status: "Cancelled" },
];

const History = () => {
    return (
        <SafeAreaView>
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Trip History</Text>
            {sampleHistory.map((h) => (
                <View key={h.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{h.title}</Text>
                    <Text style={styles.cardMeta}>{h.date} · {h.status}</Text>
                </View>
            ))}
        </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
    card: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 10 },
    cardTitle: { fontSize: 15, fontWeight: "600" },
    cardMeta: { color: "#6b7280", marginTop: 6 },
});

export default History;