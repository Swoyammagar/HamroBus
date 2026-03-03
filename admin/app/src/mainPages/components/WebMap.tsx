// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WebMapProps {
  route: any | null;
  routes: any[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

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

  const mapRef = useRef<any>(null);

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
      let fullPath: any[] = [];

      for (let i = 0; i < route.stops.length - 1; i++) {
        const start = route.stops[i];
        const end = route.stops[i + 1];

        const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.routes?.length > 0) {
          const coords = data.routes[0].geometry.coordinates;

          const formatted = coords.map((c: any) => [
            c[1], // lat
            c[0], // lon
          ]);

          fullPath = [...fullPath, ...formatted];
        }
      }

      setRoutePath(fullPath);
    } catch (err) {
      console.error('Routing failed:', err);
    }
  };

  fetchRoute();
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

  const positions =
    route?.stops
      ?.filter((s: any) => s.latitude && s.longitude)
      .map((s: any) => [
        parseFloat(s.latitude),
        parseFloat(s.longitude),
      ]) ?? [];

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
          key={route?._id ?? 'map'}
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

          {positions.map((pos: any, idx: number) => (
            <Marker key={idx} position={pos}>
              <Tooltip>
                {route?.stops[idx]?.stopName || `Stop ${idx + 1}`}
              </Tooltip>
              <Popup>
                {route?.stops[idx]?.stopName || `Stop ${idx + 1}`}
              </Popup>
            </Marker>
          ))}

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
});

export default WebMap;