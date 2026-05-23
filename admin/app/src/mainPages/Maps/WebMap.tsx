// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_BASE?.replace('/api', '') || 'https://hamrobus-auos.onrender.com';

interface DriverLocation {
  busId: string;
  busNumber?: string;
  driverId: string;
  driverName?: string;
  driverProfileImgUrl?: string;
  tripStatus?: string;
  isOnBreak?: boolean;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: string;
  isOffline?: boolean;
  sosActive?: boolean;
  sosCategory?: string;
}

interface DriverOffline {
  busId?: string;
  busNumber?: string;
  driverId: string;
  driverName?: string;
  driverProfileImgUrl?: string;
  tripStatus?: string;
  isOnBreak?: boolean;
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
  const [activeSosBusIds, setActiveSosBusIds] = useState<Set<string>>(new Set());

  const mapRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);

  /* ---------------- Load Leaflet ---------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rl = await import('react-leaflet');
        const L = await import('leaflet');

        const stopIcon = L.divIcon({
          className: '',
          html: `
            <div style="
              width: 28px;
              height: 28px;
              background: #2563eb;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 8px;
                height: 8px;
                background: white;
                border-radius: 50%;
              "></div>
            </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });

        const searchIcon = L.divIcon({
          className: '',
          html: `
            <div style="
              position: relative;
              width: 30px;
              height: 40px;
            ">
              <div style="
                width: 30px;
                height: 30px;
                background: #ef4444;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              </div>
              <div style="
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 4px;
                height: 12px;
                background: #ef4444;
                border-radius: 0 0 2px 2px;
              "></div>
            </div>`,
          iconSize: [30, 40],
          iconAnchor: [15, 40],
          popupAnchor: [0, -42],
        });

        if (mounted) setLeaflet({ ...rl, L, stopIcon, searchIcon });
      } catch (e) {
        console.error('Leaflet load failed', e);
      }
    })();

    return () => { mounted = false; };
  }, []);

  /* ---------------- Socket Connection ---------------- */
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-admin');
    });

    socket.on('driver:location-update', (data: DriverLocation) => {
      setDriverLocations((prev) => {
        const updated = new Map(prev);
        updated.set(data.driverId, {
          ...(updated.get(data.driverId) || {}),
          ...data,
          isOffline: false,
          tripStatus: data.tripStatus && data.tripStatus !== 'offline' ? data.tripStatus : 'in-progress',
        });
        return updated;
      });
    });

    socket.on('sos:alert', (data: any) => {
      if (!data?.busId) return;
      setActiveSosBusIds((prev) => {
        const next = new Set(prev);
        next.add(String(data.busId));
        return next;
      });
      setDriverLocations((prev) => {
        const updated = new Map(prev);
        const existing = Array.from(updated.entries()).find(([, value]) => String(value.busId) === String(data.busId));
        if (existing) {
          const [driverId, current] = existing;
          updated.set(driverId, {
            ...current,
            sosActive: true,
            sosCategory: data.category,
            tripStatus: 'sos-active',
            isOffline: false,
          });
        }
        return updated;
      });
    });

    socket.on('sos:cleared', (data: any) => {
      if (!data?.busId) return;
      setActiveSosBusIds((prev) => {
        const next = new Set(prev);
        next.delete(String(data.busId));
        return next;
      });
      setDriverLocations((prev) => {
        const updated = new Map(prev);
        for (const [driverId, value] of updated.entries()) {
          if (String(value.busId) === String(data.busId)) {
            updated.set(driverId, {
              ...value,
              sosActive: false,
              sosCategory: undefined,
              tripStatus: 'in-progress',
            });
          }
        }
        return updated;
      });
    });

    socket.on('driver:status-update', (data: Partial<DriverLocation> & { driverId: string }) => {
      if (!data?.driverId) return;
      setDriverLocations((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(data.driverId);
        if (!existing) return updated;
        updated.set(data.driverId, {
          ...existing,
          ...data,
          isOffline: data.tripStatus === 'offline',
        } as DriverLocation);
        return updated;
      });
    });

    socket.on('driver:location-offline', (data: DriverOffline) => {
      setDriverLocations((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(data.driverId);
        if (existing) {
          updated.set(data.driverId, {
            ...existing,
            isOffline: true,
            tripStatus: 'offline',
          });
        }
        return updated;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* ---------------- SOS Hydration on Route Change ---------------- */
  useEffect(() => {
    let active = true;

    const hydrateSosStateForRoute = async () => {
      const routeBusIds = extractRouteBusIds(route);
      if (routeBusIds.size === 0) {
        if (active) setActiveSosBusIds(new Set());
        return;
      }

      try {
        const sosStates = await Promise.all(
          Array.from(routeBusIds).map((busId) =>
            fetch(`${SOCKET_URL}/api/bus/${busId}/sos-state`)
              .then((res) => res.json())
              .then((data) => ({ busId, sosActive: data?.sosActive || false, sosCategory: data?.sosCategory }))
              .catch(() => ({ busId, sosActive: false, sosCategory: undefined }))
          )
        );

        if (!active) return;

        const nextActiveSosBusIds = new Set<string>();
        sosStates.forEach((state) => { if (state.sosActive) nextActiveSosBusIds.add(state.busId); });
        setActiveSosBusIds(nextActiveSosBusIds);

        setDriverLocations((prev) => {
          const updated = new Map(prev);
          for (const [driverId, value] of updated.entries()) {
            const busId = String(value.busId || '');
            if (!busId || !routeBusIds.has(busId)) continue;
            const isSos = nextActiveSosBusIds.has(busId);
            updated.set(driverId, { ...value, sosActive: isSos, tripStatus: isSos ? 'sos-active' : value.tripStatus });
          }
          return updated;
        });
      } catch (error) {
        console.error('Error hydrating SOS state:', error);
      }
    };

    hydrateSosStateForRoute();
    return () => { active = false; };
  }, [route]);

  /* ---------------- Resize Fix ---------------- */
  useEffect(() => {
    const onResize = () => mapRef.current?.invalidateSize?.();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ---------------- Recenter on Route Change ---------------- */
  useEffect(() => {
    if (!mapRef.current) return;
    const center = route?.stops?.length > 0
      ? [parseFloat(route.stops[0].latitude), parseFloat(route.stops[0].longitude)]
      : [27.7172, 85.324];
    mapRef.current.setView(center, 12);
  }, [route]);

  /* ---------------- Location Search ---------------- */
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }

    const debounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        setSearchResults(data.slice(0, 5));
      } catch (err) {
        console.error('Search failed', err);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  /* ---------------- OSRM Route Path ---------------- */
  useEffect(() => {
    if (!route?.stops || route.stops.length < 2) { setRoutePath([]); return; }

    const fetchRoute = async () => {
      try {
        const coords = route.stops.map((s: any) => `${s.longitude},${s.latitude}`).join(';');
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        const data = await res.json();
        if (data.routes?.length > 0) {
          setRoutePath(data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]));
        }
      } catch (err) {
        console.error('Routing failed:', err);
      }
    };

    fetchRoute();
  }, [route]);

  const positions = React.useMemo(() => {
    return route?.stops
      ?.filter((s: any) => s.latitude && s.longitude)
      .map((s: any) => [parseFloat(s.latitude), parseFloat(s.longitude)]) ?? [];
  }, [route]);

  /* ---------------- Loading State ---------------- */
  if (!leaflet)
    return (
      <View style={s.mapPlaceholder}>
        <Text style={{ color: '#6b7280' }}>Loading map...</Text>
      </View>
    );

  const { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } = leaflet; // ← added useMap

  const center = route?.stops?.length > 0
    ? [parseFloat(route.stops[0].latitude), parseFloat(route.stops[0].longitude)]
    : [27.7172, 85.324];

  const selectedRouteBusIds = extractRouteBusIds(route);
  const visibleDriverLocations = Array.from(driverLocations.values()).filter((driver) => {
    if (selectedRouteBusIds.size === 0) return false;
    return selectedRouteBusIds.has(String(driver.busId));
  });

  // ← NEW: captures map instance into mapRef via useMap hook
  const MapRefCapture = () => {
    const map = useMap();
    mapRef.current = map;
    return null;
  };

  return (
    <View style={s.container}>
      {/* Route Dropdown */}
      <View style={s.dropdownContainer}>
        <select
          value={selectedRouteId ?? ''}
          onChange={(e) => onSelectRoute(e.target.value)}
          style={s.webSelect as any}
        >
          <option value="" disabled>Select a Route</option>
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
                  mapRef.current?.flyTo([lat, lon], 15); // ← now works correctly
                  setSearchMarker([lat, lon]);
                  setSearchResults([]);
                  setSearchQuery(result.display_name);
                }}
              >
                <Text style={{ fontSize: 12 }}>{result.display_name}</Text>
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
          // ← removed whenCreated; MapRefCapture handles this now
        >
          <MapRefCapture /> {/* ← added */}

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              load: () => setTilesLoaded(true),
              tileerror: () => setTilesLoaded(true),
            }}
          />

          {positions.map((pos: any, idx: number) => (
            <Marker key={`stop-${idx}`} position={pos} icon={leaflet.stopIcon}>
              <Tooltip>{route?.stops[idx]?.stopName || `Stop ${idx + 1}`}</Tooltip>
              <Popup>{route?.stops[idx]?.stopName || `Stop ${idx + 1}`}</Popup>
            </Marker>
          ))}

          {visibleDriverLocations.map((driver) => {
            if (!leaflet?.L) return null;
            const isSos = Boolean(driver.sosActive || activeSosBusIds.has(String(driver.busId)));
            const isOnBreak = Boolean(driver.isOnBreak || driver.tripStatus === 'on-break');
            const isOffline = Boolean(driver.isOffline || driver.tripStatus === 'offline');
            const markerColor = isSos ? '#dc2626' : isOffline ? '#6b7280' : isOnBreak ? '#f59e0b' : '#10b981';
            const driverLabel = String(driver.driverName || '').trim() || `Driver ${String(driver.driverId || '').slice(-4)}`;
            const busLabel = String(driver.busNumber || '').trim() || String(driver.busId || '').slice(-4);

            const driverIcon = leaflet.L.divIcon({
              className: '',
              html: `
                <div style="
                  position: relative;
                  width: 40px;
                  height: 40px;
                  background: ${markerColor};
                  border: 3px solid white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  transform: rotate(${driver.heading}deg);
                  ${isSos ? 'animation: sos-pulse 1s infinite;' : ''}
                ">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M18 11H6.83l3.58-3.59L9 6l-6 6 6 6 1.41-1.41L6.83 13H18v-2z"/>
                  </svg>
                </div>
                ${isSos ? `
                <style>
                  @keyframes sos-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.6); }
                    50% { box-shadow: 0 0 0 10px rgba(220,38,38,0); }
                  }
                </style>` : ''}
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              popupAnchor: [0, -22],
            });

            return (
              <Marker
                key={`driver-${driver.driverId}`}
                position={[driver.latitude, driver.longitude]}
                icon={driverIcon}
              >
                <Tooltip permanent direction="top" offset={[0, -24]}>
                  <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    🚌 {busLabel}
                  </div>
                </Tooltip>
                <Popup>
                  <div style={{ fontSize: '12px', minWidth: '160px' }}>
                    {driver.driverProfileImgUrl && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                        <img
                          src={driver.driverProfileImgUrl}
                          alt="Driver"
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }}
                        />
                      </div>
                    )}
                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '6px' }}>{driverLabel}</div>
                    <div><strong>Bus:</strong> {busLabel}</div>
                    <div><strong>Status:</strong> {isSos ? `🚨 SOS${driver.sosCategory ? ` (${driver.sosCategory})` : ''}` : isOffline ? '⚫ Offline' : isOnBreak ? '🟡 On Break' : '🟢 In Trip'}</div>
                    <div><strong>Speed:</strong> {driver.speed.toFixed(1)} km/h</div>
                    <div><strong>Heading:</strong> {driver.heading}°</div>
                    <div><strong>Updated:</strong> {new Date(driver.timestamp).toLocaleTimeString()}</div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ← right-click on search marker now removes it */}
          {searchMarker && (
            <Marker
              position={searchMarker}
              icon={leaflet.searchIcon}
              eventHandlers={{
                contextmenu: (e: any) => {
                  e.originalEvent.preventDefault();
                  setSearchMarker(null);
                },
              }}
            >
              <Popup>Searched Location<br /><small>(Right click to remove)</small></Popup>
            </Marker>
          )}

          {routePath.length > 0 && (
            <Polyline positions={routePath} color="#2563eb" weight={5} opacity={0.8} />
          )}
        </MapContainer>

        {!tilesLoaded && (
          <View style={s.mapLoadingOverlay}>
            <Text style={{ color: '#fff' }}>Loading tiles...</Text>
          </View>
        )}

        {visibleDriverLocations.length > 0 && (
          <View style={s.driverStatusPanel}>
            <View style={s.panelHeader}>
              <Text style={s.panelTitle}>🚌 Live Drivers ({visibleDriverLocations.length})</Text>
            </View>
            <View style={s.driverList}>
              {visibleDriverLocations.map((driver) => {
                const isSos = Boolean(driver.sosActive || activeSosBusIds.has(String(driver.busId)));
                const isOffline = Boolean(driver.isOffline || driver.tripStatus === 'offline');
                const isOnBreak = Boolean(driver.isOnBreak || driver.tripStatus === 'on-break');
                const dotColor = isSos ? '#dc2626' : isOffline ? '#6b7280' : isOnBreak ? '#f59e0b' : '#10b981';
                const busLabel = String(driver.busNumber || '').trim() || String(driver.busId || '').slice(-4);
                return (
                  <View key={driver.driverId} style={s.driverItem}>
                    <View style={[s.driverDot, { backgroundColor: dotColor }]} />
                    <Text style={s.driverText}>
                      Bus {busLabel} • {driver.speed.toFixed(0)} km/h
                      {isSos ? ' 🚨' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { flex: 1, position: 'relative' },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dropdownContainer: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  webSelect: { width: '100%', padding: '8px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db' },
  searchContainer: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchInput: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' },
  resultsContainer: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6 },
  resultItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', cursor: 'pointer' },
  mapLoadingOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  driverStatusPanel: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 12, minWidth: 200, maxHeight: 300, overflow: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' },
  panelHeader: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 8, marginBottom: 8 },
  panelTitle: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' },
  driverList: { gap: 6 },
  driverItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  driverDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  driverText: { fontSize: 12, color: '#4b5563' },
});

export default WebMap;