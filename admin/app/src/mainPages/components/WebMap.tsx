// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'https://hamrobus-auos.onrender.com';

interface DriverLocation {
  busId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: string;
}

interface DriverOffline {
  busId?: string;
  driverId: string;
  timestamp: string;
}

interface WebMapProps {
  route: any | null;
  routes: any[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

const normalizeEntityId = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
};

const extractRouteBusIds = (route: any | null): Set<string> => {
  const ids = new Set<string>();
  if (!route) return ids;

  (route.assignedBusIds || []).forEach((bus: any) => {
    const id = normalizeEntityId(bus);
    if (id) ids.add(id);
  });

  (route.schedules || []).forEach((schedule: any) => {
    const id = normalizeEntityId(schedule?.busId);
    if (id) ids.add(id);
  });

  return ids;
};

const WebMap: React.FC<WebMapProps> = ({
  route,
  routes,
  selectedRouteId,
  onSelectRoute,
}) => {
  const [leaflet, setLeaflet] = useState<any>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchMarker, setSearchMarker] = useState<[number, number] | null>(null);
  const [routePath, setRoutePath] = useState<any[]>([]);
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocation>>(new Map());

  const mapRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  /* ---------------- Load Leaflet ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rl = await import('react-leaflet');
        const L = await import('leaflet');

        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if (mounted) setLeaflet({ ...rl, L });
      } catch (e) {
        console.error('Leaflet load failed', e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------- Socket Connection for Driver Locations ---------------- */
  useEffect(() => {
    console.log('🔌 Initializing socket connection to:', SOCKET_URL);
    
    // Connect to socket server
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Admin socket connected:', socket.id);
      console.log('🔑 Joining admin-room...');
      // Join admin room to receive driver location updates
      socket.emit('join-admin');
      console.log('✅ Emitted join-admin');
    });

    socket.on('driver:location-update', (data: DriverLocation) => {
      console.log('📍 [ADMIN] Received driver location update:', {
        driverId: data.driverId,
        busId: data.busId,
        lat: data.latitude,
        lng: data.longitude,
        speed: data.speed,
        timestamp: data.timestamp
      });
      setDriverLocations((prev) => {
        const updated = new Map(prev);
        updated.set(data.driverId, data);
        console.log('✅ Updated driver locations map, total drivers:', updated.size);
        return updated;
      });
    });

    socket.on('driver:location-offline', (data: DriverOffline) => {
      console.log('🛑 [ADMIN] Driver offline received:', data);
      setDriverLocations((prev) => {
        const updated = new Map(prev);
        updated.delete(data.driverId);
        return updated;
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ Admin socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* ---------------- Resize Fix ---------------- */
  useEffect(() => {
    const onResize = () => {
      mapRef.current?.invalidateSize?.();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ---------------- Recenter on Route Change ---------------- */
  useEffect(() => {
    if (!mapRef.current) return;

    const center =
      route?.stops?.length > 0
        ? [
            parseFloat(route.stops[0].latitude),
            parseFloat(route.stops[0].longitude),
          ]
        : [27.7172, 85.324];

    mapRef.current.setView(center, 12);
  }, [route]);

  /* ---------------- Search While Typing ---------------- */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}`
        );
        const data = await res.json();
        setSearchResults(data.slice(0, 5));
      } catch (err) {
        console.error('Search failed', err);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  useEffect(() => {
  if (!route?.stops || route.stops.length < 2) {
    setRoutePath([]);
    return;
  }

  const fetchRoute = async () => {
    try {
      const coords = route.stops
        .map((s: any) => `${s.longitude},${s.latitude}`)
        .join(';');

      const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.routes?.length > 0) {
        const formatted = data.routes[0].geometry.coordinates.map((c: any) => [
          c[1],
          c[0],
        ]);

        setRoutePath(formatted);
      }
    } catch (err) {
      console.error('Routing failed:', err);
    }
  };

  fetchRoute();
}, [route]);;

  const positions = React.useMemo(() => {
    return route?.stops
      ?.filter((s: any) => s.latitude && s.longitude)
      .map((s: any) => [
        parseFloat(s.latitude),
        parseFloat(s.longitude),
      ]) ?? [];
  }, [route]);

  /* ---------------- Loading State ---------------- */
  if (!leaflet)
    return (
      <View style={s.mapPlaceholder}>
        <Text style={{ color: '#6b7280' }}>Loading map...</Text>
      </View>
    );

  const { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } =
    leaflet;

  const center =
    route?.stops?.length > 0
      ? [
          parseFloat(route.stops[0].latitude),
          parseFloat(route.stops[0].longitude),
        ]
      : [27.7172, 85.324];

  

  const selectedRouteBusIds = extractRouteBusIds(route);
  const visibleDriverLocations = Array.from(driverLocations.values()).filter((driver) => {
    if (selectedRouteBusIds.size === 0) return false;
    return selectedRouteBusIds.has(String(driver.busId));
  });

  return (
    <View style={s.container}>
      {/* Route Dropdown */}
      <View style={s.dropdownContainer}>
        <select
          value={selectedRouteId ?? ''}
          onChange={(e) => onSelectRoute(e.target.value)}
          style={s.webSelect as any}
        >
          <option value="" disabled>
            Select a Route
          </option>
          {(routes ?? []).map((r) => (
            <option key={r._id} value={r._id}>
              {r.routeName} ({r.routeNumber})
            </option>
          ))}
        </select>
      </View>

      {/* Search Bar */}
      <View style={s.searchContainer}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search location..."
          style={s.searchInput as any}
        />

        {searchResults.length > 0 && (
          <View style={s.resultsContainer}>
            {searchResults.map((result, index) => (
              <View
                key={index}
                style={s.resultItem}
                onClick={() => {
                  const lat = parseFloat(result.lat);
                  const lon = parseFloat(result.lon);

                  mapRef.current?.flyTo([lat, lon], 15);
                  setSearchMarker([lat, lon]);
                  setSearchResults([]);
                  setSearchQuery(result.display_name);
                }}
              >
                <Text style={{ fontSize: 12 }}>
                  {result.display_name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Map */}
      <View style={s.mapContainer}>
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          whenCreated={(mapInstance: any) => {
            mapRef.current = mapInstance;
            setTimeout(() => mapInstance.invalidateSize(), 200);
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              load: () => setTilesLoaded(true),
              tileerror: () => setTilesLoaded(true),
            }}
          />

          {/* Route Stop Markers */}
          {positions.map((pos: any, idx: number) => (
            <Marker key={`stop-${idx}`} position={pos}>
              <Tooltip>
                {route?.stops[idx]?.stopName || `Stop ${idx + 1}`}
              </Tooltip>
              <Popup>
                {route?.stops[idx]?.stopName || `Stop ${idx + 1}`}
              </Popup>
            </Marker>
          ))}

          {/* Driver Location Markers */}
          {visibleDriverLocations.map((driver) => {
            if (!leaflet?.L) return null;
            
            const driverIcon = leaflet.L.divIcon({
              className: 'custom-driver-marker',
              html: `
                <div style="
                  position: relative;
                  width: 40px;
                  height: 40px;
                  background: #10b981;
                  border: 3px solid white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  transform: rotate(${driver.heading}deg);
                ">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            });

            return (
              <Marker 
                key={`driver-${driver.driverId}`}
                position={[driver.latitude, driver.longitude]}
                icon={driverIcon}
              >
                <Tooltip permanent direction="top" offset={[0, -20]}>
                  <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    🚌 Bus {driver.busId.slice(-4)}
                  </div>
                </Tooltip>
                <Popup>
                  <div style={{ fontSize: '12px' }}>
                    <strong>Driver ID:</strong> {driver.driverId.slice(0, 8)}...<br/>
                    <strong>Bus ID:</strong> {driver.busId.slice(-8)}<br/>
                    <strong>Speed:</strong> {driver.speed.toFixed(1)} km/h<br/>
                    <strong>Heading:</strong> {driver.heading}°<br/>
                    <strong>Last Update:</strong> {new Date(driver.timestamp).toLocaleTimeString()}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {searchMarker && (
            <Marker position={searchMarker}>
              <Popup>Searched Location</Popup>
            </Marker>
          )}

          {routePath.length > 0 && (
            <Polyline positions={routePath} color="#2563eb" weight={5} />
          )}
        </MapContainer>

        {!tilesLoaded && (
          <View style={s.mapLoadingOverlay}>
            <Text style={{ color: '#fff' }}>Loading tiles...</Text>
          </View>
        )}

        {/* Live Driver Status Panel */}
        {visibleDriverLocations.length > 0 && (
          <View style={s.driverStatusPanel}>
            <View style={s.panelHeader}>
              <Text style={s.panelTitle}>🚌 Live Drivers ({visibleDriverLocations.length})</Text>
            </View>
            <View style={s.driverList}>
              {visibleDriverLocations.map((driver) => (
                <View key={driver.driverId} style={s.driverItem}>
                  <View style={s.driverDot} />
                  <Text style={s.driverText}>
                    Bus {driver.busId.slice(-4)} • {driver.speed.toFixed(0)} km/h
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  webSelect: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
  },
  resultsContainer: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
  },
  resultItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    cursor: 'pointer',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverStatusPanel: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    minWidth: 200,
    maxHeight: 300,
    overflow: 'auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  panelHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    marginBottom: 8,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  driverList: {
    gap: 6,
  },
  driverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  driverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  driverText: {
    fontSize: 12,
    color: '#4b5563',
  },
});

export default WebMap;