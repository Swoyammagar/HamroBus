
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(
      (p) =>
        p === 1 ||
        p === totalPages ||
        Math.abs(p - currentPage) <= 1
    )
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        style={[styles.btn, currentPage <= 1 && styles.btnDisabled]}
      >
        <Feather
          name="chevron-left"
          size={16}
          color={currentPage <= 1 ? "#cbd5e1" : "#334155"}
        />
      </TouchableOpacity>

      {pages.map((p, i) =>
        p === "…" ? (
          <Text key={`dots-${i}`} style={styles.dots}>…</Text>
        ) : (
          <TouchableOpacity
            key={p}
            onPress={() => onPageChange(p as number)}
            style={[styles.btn, currentPage === p && styles.btnActive]}
          >
            <Text style={[styles.btnText, currentPage === p && styles.btnTextActive]}>
              {p}
            </Text>
          </TouchableOpacity>
        )
      )}

      <TouchableOpacity
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        style={[styles.btn, currentPage >= totalPages && styles.btnDisabled]}
      >
        <Feather
          name="chevron-right"
          size={16}
          color={currentPage >= totalPages ? "#cbd5e1" : "#334155"}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: {
    backgroundColor: "#0d9488",
    borderColor: "#0d9488",
  },
  btnDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: "#f1f5f9",
  },
  btnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  btnTextActive: {
    color: "#fff",
  },
  dots: {
    fontSize: 14,
    color: "#94a3b8",
    paddingHorizontal: 2,
  },
});

export default Pagination;
