// @ts-nocheck
import React, { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";

interface AddMapProps {
  stops: Array<{
    stopName: string;
    latitude: number;
    longitude: number;
    sequence: number;
  }>;
  onMapClick: (lat: number, lng: number) => void;
  onRemoveStop: (index: number) => void;
}

const AddMap: React.FC<AddMapProps> = ({
  stops,
  onMapClick,
  onRemoveStop,
}) => {
  const [leaflet, setLeaflet] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchMarker, setSearchMarker] = useState<[number, number] | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const rl = await import("react-leaflet");
      const L = await import("leaflet");

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mounted) setLeaflet({ ...rl, L });
    })();

    return () => {
      mounted = false;
    };
  }, []);

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

  if (!leaflet) {
    return (
      <View style={styles.placeholder}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  const {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMapEvents,
    useMap, // ← added
  } = leaflet;

  const center =
    stops.length > 0
      ? [stops[0].latitude, stops[0].longitude]
      : [27.7172, 85.324];

  const MapClickHandler = () => {
    useMapEvents({
      click(e: any) {
        const { lat, lng } = e.latlng;
        onMapClick(lat, lng);
      },
    });
    return null;
  };

  // ← NEW: captures map instance into mapRef via useMap hook
  const MapRefCapture = () => {
    const map = useMap();
    mapRef.current = map;
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <div style={s.searchContainer}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search location..."
          style={s.searchInput as any}
        />

        {searchResults.length > 0 && (
          <div style={s.resultsContainer}>
            {searchResults.map((result, index) => (
              <div
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
                <Text style={{ fontSize: 12 }}>
                  {result.display_name}
                </Text>
              </div>
            ))}
          </div>
        )}
      </div>

      <View style={styles.mapContainer}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%", cursor: "crosshair" }}
        >
          <MapRefCapture /> {/* ← added */}
          <MapClickHandler />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {stops.map((stop, index) => (
            <Marker
              key={`${stop.latitude}-${stop.longitude}-${index}`}
              position={[stop.latitude, stop.longitude]}
              eventHandlers={{
                contextmenu: (e: any) => {
                  e.originalEvent.preventDefault();
                  onRemoveStop(index);
                },
              }}
            >
              <Popup>
                <div>
                  <strong>{stop.stopName}</strong>
                  <br />
                  Seq: {stop.sequence}
                  <br />
                  <small>(Right click to remove)</small>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* ← right-click on search marker now removes it */}
          {searchMarker && (
            <Marker
              position={searchMarker}
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
        </MapContainer>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

const s: any = {
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    width: '100%',
    padding: 8,
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 14,
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
};

export default AddMap;