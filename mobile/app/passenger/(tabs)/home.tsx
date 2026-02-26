import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePassenger, type Route } from '../context/PassengerContext';
import { useRoutes } from '../hooks/useRoutes';

const Home = () => {
  const router = useRouter();
  const { routes, setRoutes, setSelectedRoute } = usePassenger();
  const { routes: fetchedRoutes, loading, refreshing, refreshRoutes, searchRoutes } = useRoutes();
  const [searchText, setSearchText] = useState('');
  const [filteredRoutes, setFilteredRoutes] = useState(routes);

  useEffect(() => {
    if (fetchedRoutes.length > 0) {
      setRoutes(fetchedRoutes);
      setFilteredRoutes(fetchedRoutes);
    }
  }, [fetchedRoutes, setRoutes]);

  useEffect(() => {
    const query = searchText.trim();
    if (query.length > 0) {
      const debounceId = setTimeout(() => {
        searchRoutes(query);
      }, 350);
      return () => clearTimeout(debounceId);
    }
  }, [searchText, searchRoutes]);

  useEffect(() => {
    const filtered = routes.filter(
      route =>
        route.name.toLowerCase().includes(searchText.toLowerCase()) ||
        route.stops.some(stop =>
          stop.name.toLowerCase().includes(searchText.toLowerCase())
        )
    );
    setFilteredRoutes(filtered);
  }, [searchText, routes]);

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    router.push({
      pathname: './map',
      params: { routeId: route._id || route.id },
    });
  };

  const RouteCard = ({ route }: { route: Route }) => {
    const startStop = route.stops[0]?.name || 'Start';
    const endStop = route.stops[route.stops.length - 1]?.name || 'End';
    const distanceLabel = route.distance ? `${route.distance} km` : `${route.stops.length} stops`;
    const busesCount = route.busesCount ?? 0;

    return (
    <TouchableOpacity
      style={styles.routeCard}
      onPress={() => handleRouteSelect(route)}
      activeOpacity={0.7}
    >
      <View style={styles.routeHeader}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeName}>{route.name}</Text>
          <Text style={styles.routeDistance}>{distanceLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#3b82f6" />
      </View>

      <View style={styles.routeRoute}>
        <View style={styles.routeStop}>
          <View style={styles.stopDot} />
          <Text style={styles.stopText}>{startStop}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeStop}>
          <View style={[styles.stopDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.stopText}>{endStop}</Text>
        </View>
      </View>

      <View style={styles.routeStats}>
        <View style={styles.statItem}>
          <Ionicons name="location" size={16} color="#666" />
          <Text style={styles.statText}>{route.stops.length} stops</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="bus" size={16} color="#3b82f6" />
          <Text style={styles.statText}>{busesCount} buses</Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  if (loading && routes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Routes</Text>
        <Text style={styles.headerSubtitle}>Tap a route to explore</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search routes, stops..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#d1d5db"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshRoutes} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredRoutes.length > 0 ? (
          <View style={styles.routesList}>
            {filteredRoutes.map(route => (
              <RouteCard key={route._id || route.id} route={route} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No routes found</Text>
            <Text style={styles.emptyStateText}>Try searching with different keywords</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d1d5db',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -10,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1f2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  routesList: {
    marginBottom: 20,
  },
  routeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  routeDistance: {
    fontSize: 12,
    color: '#6b7280',
  },
  routeRoute: {
    marginBottom: 12,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    marginRight: 10,
  },
  stopText: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
  },
  routeLine: {
    height: 20,
    width: 2,
    backgroundColor: '#d1d5db',
    marginLeft: 5,
    marginVertical: 2,
  },
  routeStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});

export default Home;
