import React from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

export interface TableColumn<T> {
  key: string;
  header: string;
  width?: number;
  flex?: number;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
  headerStyle?: ViewStyle;
  rowStyle?: ViewStyle;
  cellStyle?: ViewStyle;
  headerTextStyle?: TextStyle;
  cellTextStyle?: TextStyle;
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  headerStyle,
  rowStyle,
  cellStyle,
  headerTextStyle,
  cellTextStyle,
}: TableProps<T>) {
  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow, headerStyle]}>
      {columns.map((col) => (
        <View
          key={col.key}
          style={[
            styles.cell,
            col.width ? { width: col.width } : undefined,
            col.flex ? { flex: col.flex } : undefined,
            cellStyle,
          ]}
        >
          <Text style={[styles.headerText, headerTextStyle]}>{col.header}</Text>
        </View>
      ))}
    </View>
  );

  const renderRow = ({ item }: { item: T }) => (
    <View style={[styles.row, rowStyle]}>
      {columns.map((col) => {
        const value = col.render
          ? col.render(item)
          : (item as any)[col.key]?.toString() || '-';

        return (
          <View
            key={col.key}
            style={[
              styles.cell,
              col.width ? { width: col.width } : undefined,
              col.flex ? { flex: col.flex } : undefined,
              cellStyle,
            ]}
          >
            {typeof value === 'string' ? (
              <Text style={[styles.cellText, cellTextStyle]}>{value}</Text>
            ) : (
              value
            )}
          </View>
        );
      })}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{emptyMessage}</Text>
    </View>
  );

  return (
    <View style={styles.tableWrapper}>
      <ScrollView 
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        contentContainerStyle={styles.verticalScrollContent}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          <View style={styles.tableContainer}>
            {renderHeader()}
            <FlatList
              data={data}
              renderItem={renderRow}
              keyExtractor={keyExtractor}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={renderEmpty}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tableWrapper: {
    flex: 1,
    width: '100%',
  },
  verticalScrollContent: {
    flexGrow: 1,
  },
  horizontalScroll: {
    width: '100%',
  },
  horizontalScrollContent: {
    minWidth: '100%',
  },
  tableContainer: {
    flex: 1,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },

  row: {
  flexDirection: 'row',
  alignItems: 'center',
  minHeight: 52,
},

headerRow: {
  backgroundColor: '#f9fafb',
  borderBottomWidth: 1,
  borderBottomColor: '#e5e7eb',
},

cell: {
  paddingHorizontal: 14,
  paddingVertical: 10,
  justifyContent: 'center',
},

headerText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#374151',
},

cellText: {
  fontSize: 14,
  color: '#111827',
},

separator: {
  height: 1,
  backgroundColor: '#f1f5f9',
},

emptyContainer: {
  padding: 40,
  alignItems: 'center',
},

emptyText: {
  fontSize: 14,
  color: '#9ca3af',
},
});

