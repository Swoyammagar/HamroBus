import React from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView} from "react-native-safe-area-context";
const Profile = () => {
    return (
        <SafeAreaView>
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.avatar} />
                <View style={{ marginLeft: 12 }}>
                    <Text style={styles.name}>Ram Thapa</Text>
                    <Text style={styles.email}>ram.thapa@example.com</Text>
                </View>
            </View>

            <View style={styles.section}>
                <TouchableOpacity style={styles.item}>
                    <Text style={styles.itemText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.item}>
                    <Text style={styles.itemText}>Vehicle Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.item}>
                    <Text style={styles.itemText}>Payments & Earnings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.item, { backgroundColor: '#f87171' }]}>
                    <Text style={[styles.itemText, { color: '#fff' }]}>Logout</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ddd' },
    name: { fontSize: 18, fontWeight: '700' },
    email: { color: '#6b7280' },
    section: { marginTop: 8 },
    item: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10 },
    itemText: { fontSize: 15, fontWeight: '600' },
});

export default Profile;