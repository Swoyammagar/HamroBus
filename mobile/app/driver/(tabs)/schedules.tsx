import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";

const sampleSchedules = [
    { id: 1, route: "Bus Park → Ring Road", time: "07:30 AM" },
    { id: 2, route: "Lazimpat → New Bus Stand", time: "09:00 AM" },
    { id: 3, route: "Kirtipur → Patan", time: "01:15 PM" },
];

const Schedules = () => {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Scheduled Trips</Text>
            {sampleSchedules.map((s) => (
                <View key={s.id} style={styles.card}>
                    <Text style={styles.route}>{s.route}</Text>
                    <Text style={styles.time}>{s.time}</Text>
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
    card: { backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 10 },
    route: { fontSize: 15, fontWeight: "600" },
    time: { color: "#6b7280", marginTop: 6 },
});

export default Schedules;