// @ts-nocheck
import React, { useEffect, useState } from "react";
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
  } = leaflet;

  const center =
    stops.length > 0
      ? [stops[0].latitude, stops[0].longitude]
      : [27.7172, 85.324];

  // LEFT CLICK → ADD
  const MapClickHandler = () => {
    useMapEvents({
      click(e: any) {
        const { lat, lng } = e.latlng;
        onMapClick(lat, lng);
      },
    });
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: "100%", width: "100%", cursor: "crosshair" }}
        >
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
                  e.originalEvent.preventDefault(); // prevent browser menu
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

export default AddMap;