import React, {useMemo, useState} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Modal,
  StyleSheet,
} from "react-native";

const BusesDesignOnly: React.FC = () => {
const [activeTab, setActiveTab] = useState<"all" | "add">("all");
const [query, setQuery] = useState<string>("");

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === "all" && styles.tabBtnActive]}
        onPress={() => setActiveTab("all")}>
          <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>All Schedules</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === "add" && styles.tabBtnActive]}
        onPress={() => setActiveTab("add")}>
          <Text style={[styles.tabText, activeTab === "add" && styles.tabTextActive]}>Add Schedule</Text>
        </TouchableOpacity>
      </View>
      {activeTab === "all" ?( 
      <> 
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by bus number, driver or route..."
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
            
        </View>

        {/* Table */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.table}>
            {/* Header Row */}
            <View style={[styles.row, styles.headerRow]}>
              <View style={[styles.cell, styles.colBus]}>
                <Text style={styles.headerText}>Bus Number</Text>
              </View>
              <View style={[styles.cell, styles.colModel]}>
                <Text style={styles.headerText}>Model</Text>
              </View>
              <View style={[styles.cell, styles.colNum]}>
                <Text style={styles.headerText}>Capacity</Text>
              </View>
              <View style={[styles.cell, styles.colStatus]}>
                <Text style={styles.headerText}>Status</Text>
              </View>
              <View style={[styles.cell, styles.colDriver]}>
                <Text style={styles.headerText}>Assigned Driver</Text>
              </View>
              <View style={[styles.cell, styles.colRoute]}>
                <Text style={styles.headerText}>Assigned Route</Text>
              </View>
              <View style={[styles.cell, { minWidth: 140, flex: 1 }]}>
                <Text style={styles.headerText}>Actions</Text>
              </View>
            </View>

            {/* Example Row */}
            <FlatList
              data={[{ id: 1 }, { id: 2 }, { id: 3 }]}
              renderItem={() => (
                <View style={styles.row}>
                  <View style={[styles.cell, styles.colBus]}>
                    <Text style={styles.cellText}>BA 2 KHA 1234</Text>
                  </View>
                  <View style={[styles.cell, styles.colModel]}>
                    <Text style={styles.cellText}>Tata Marcopolo</Text>
                  </View>
                  <View style={[styles.cell, styles.colNum]}>
                    <Text style={styles.cellText}>40</Text>
                  </View>
                  <View style={[styles.cell, styles.colStatus]}>
                    <View
                      style={[styles.statusPill, styles.statusActive]}
                    >
                      <Text style={styles.statusText}>active</Text>
                    </View>
                  </View>
                  <View style={[styles.cell, styles.colDriver]}>
                    <Text style={styles.cellText}>Ramesh Thapa</Text>
                  </View>
                  <View style={[styles.cell, styles.colRoute]}>
                    <Text style={styles.cellText}>Lagankhel - Ratnapark</Text>
                  </View>
                  <View style={[styles.cell, { minWidth: 140, flex: 1 }]}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          backgroundColor: "#dbeafe",
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: "#1d4ed8" }}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          backgroundColor: "#fee2e2",
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: "#b91c1c" }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => (
                <View style={styles.separator} />
              )}
            />
          </View>
        </ScrollView>

        {/* Example Modal (View/Edit Bus) */}
        <Modal visible={false} transparent>
          <View style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 16 }}>
            <View style={{ backgroundColor: "#fff", borderRadius: 8, padding: 16 }}>
              <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 8 }}>
                Edit Bus
              </Text>
              <Text style={{ fontSize: 12, color: "#555" }}>Bus Number</Text>
              <TextInput style={styles.searchInput} placeholder="Enter bus number" />
              <Text style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                Model
              </Text>
              <TextInput style={styles.searchInput} placeholder="Enter model" />
              <Text style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                Capacity
              </Text>
              <TextInput style={styles.searchInput} placeholder="Enter capacity" />
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 12 }}>
                <TouchableOpacity style={{ padding: 8 }}>
                  <Text style={{ color: "#555" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 8, backgroundColor: "#059669", borderRadius: 6, marginLeft: 8 }}
                >
                  <Text style={{ color: "#fff" }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
      ) : (
      <>
        {/* Add Bus Form */}
        <View style={[styles.addContainer, { marginTop: 24 }]}>
          <Text style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>
            Bus Number
          </Text>
          <TextInput style={styles.searchInput} placeholder="Enter bus number" />

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Model
          </Text>
          <TextInput style={styles.searchInput} placeholder="Enter model" />

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Capacity
          </Text>
          <TextInput style={styles.searchInput} placeholder="Enter capacity" />

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Status
          </Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text>Select status</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Assigned Driver
          </Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text>Select driver</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 14, color: "#374151", marginTop: 12, marginBottom: 4 }}>
            Assigned Route
          </Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text>Select route</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16, gap: 8 }}>
            <TouchableOpacity style={{ padding: 8 }}>
              <Text style={{ color: "#374151" }}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ padding: 8, backgroundColor: "#059669", borderRadius: 6 }}
            >
              <Text style={{ color: "#fff" }}>Add Bus</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  tabRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tabBtnActive: {
    backgroundColor: "#10b98122",
    borderColor: "#10b981",
  },
  tabText: { color: "#374151", fontWeight: "600" },
  tabTextActive: { color: "#065f46" },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  searchInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    color: "#111827",
  },
  clearBtn: { marginLeft: 8, padding: 8 },
  clearText: { color: "#374151" },
  table: {
    minWidth: 800,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  headerRow: { backgroundColor: "#f8fafc", paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  cell: { paddingHorizontal: 8, justifyContent: "center" },
  colBus: { minWidth: 200, flex: 2 },
  colModel: { minWidth: 200, flex: 1.5 },
  colNum: { minWidth: 120, flex: 0.8 },
  colStatus: { minWidth: 140, flex: 1 },
  colDriver: { minWidth: 220, flex: 1.6 },
  colRoute: { minWidth: 220, flex: 1.6 },
  headerText: { fontWeight: "700", color: "#374151" },
  cellText: { color: "#111827" },
  separator: { height: 1, backgroundColor: "#eef2f7", marginHorizontal: 6 },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusActive: { backgroundColor: "#ecfdf5" },
  statusText: { color: "#065f46", fontWeight: "600", textTransform: "capitalize" },
  addContainer: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
});

export default BusesDesignOnly;
