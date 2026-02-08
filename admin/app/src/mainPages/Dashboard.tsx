import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { drivers, buses, routes, schedules, getDriverRatingSummary, notifications } from '../data/dummyData';
import { Card, StatusBadge } from '../../components/ui';

export default function DashboardOverview() {
	const totalDrivers = drivers.length;
	const totalBuses = buses.length;
	const totalRoutes = routes.length;
	const totalSchedules = schedules.length;

	const topDrivers = getDriverRatingSummary().slice(0, 5);
	const latestNotifications = notifications
		.filter(n => n.target === 'admin')
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
		.slice(0, 5);

		useEffect(() => {
			if (Platform.OS === 'web') {
			const id = 'leaflet-css';
			if (!document.getElementById(id)) {
				const link = document.createElement('link');
				link.id = id;
				link.rel = 'stylesheet';
				link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				// avoid integrity/crossorigin to reduce CDN/CSP issues in dev
				document.head.appendChild(link);
			}
			}
		}, []);

	const WebMap: React.FC = () => {
  const mapRef = React.useRef<any>(null);
  const [leaflet, setLeaflet] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const rl = await import("react-leaflet");
        const L = await import("leaflet");

        // Fix Leaflet default icon paths for Webpack/Vite/Next bundlers
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        setLeaflet({ ...rl, L });
      } catch (err) {
        console.log("Leaflet import failed", err);
      }
    })();
  }, []);

  if (!leaflet) {
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={{ color: "#6b7280" }}>Loading map...</Text>
      </View>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = leaflet;

  return (
    <MapContainer
      center={[27.7172, 85.3240]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      whenCreated={(mapInstance: any) => {
        mapRef.current = mapInstance;
      }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* 🚌 Bus markers */}
      {buses.map((bus) => (
  <Marker
    key={bus._id}
    position={[
      bus.currentLocation.latitude,
      bus.currentLocation.longitude
    ]}
    icon={
      new leaflet.L.DivIcon({
        html: `
          <div style="
            display:flex;
            flex-direction:column;
            align-items:center;
            transform:translateY(-10px);
          ">
            <div style="
              background:#1e3a8a;
              color:white;
              padding:2px 6px;
              border-radius:4px;
              font-size:12px;
              margin-bottom:2px;
            ">
              ${bus.busNumber}
            </div>
            <img
              src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png"
              style="width:25px;height:41px;"
            />
          </div>
        `,
        className: "",
      })
    }
  />
))}
    </MapContainer>
  );
};
	

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Top cards */}
			<View style={styles.cardsRow}>
				<Card padding="md" style={styles.statCard}>
					<Text style={styles.cardTitle}>Total Drivers</Text>
					<Text style={styles.cardValue}>{totalDrivers}</Text>
				</Card>
				<Card padding="md" style={styles.statCard}>
					<Text style={styles.cardTitle}>Total Buses</Text>
					<Text style={styles.cardValue}>{totalBuses}</Text>
				</Card>
				<Card padding="md" style={styles.statCard}>
					<Text style={styles.cardTitle}>Total Routes</Text>
					<Text style={styles.cardValue}>{totalRoutes}</Text>
				</Card>
				<Card padding="md" style={styles.statCard}>
					<Text style={styles.cardTitle}>Schedules</Text>
					<Text style={styles.cardValue}>{totalSchedules}</Text>
				</Card>
			</View>

			{/* Main content: map placeholder and sidebar widgets */}
			<View style={styles.mainRow}>
				<Card padding="md" style={styles.mapCard}>
					<Text style={styles.mapTitle}>Live Bus Locations</Text>
					<View style={styles.mapPlaceholder}>
						{Platform.OS === 'web' ? (
                // @ts-ignore
                <WebMap />
              ) : (
                <View style={styles.mapPlaceholder}><Text style={{ color: '#6b7280' }}>Map is available on web only.</Text></View>
              )}
					</View>
				</Card>

				<View style={styles.sideColumn}>
					<Card padding="md">
						<Text style={styles.widgetTitle}>Top Drivers</Text>
						{topDrivers.map((d) => (
							<View key={d._id} style={styles.scoreRow}>
								<View>
									<Text style={styles.driverName}>{d.name}</Text>
									<Text style={styles.driverMeta}>{d.totalReviews} reviews</Text>
								</View>
								<StatusBadge label={d.rating.toFixed(1)} variant="success" />
							</View>
						))}
					</Card>

                    <Card padding="md">
						<Text style={styles.widgetTitle}>Latest Notifications</Text>
						{latestNotifications.map((n) => (
							<View key={n._id} style={styles.notifRow}>
								<View style={{ flex: 1 }}>
									<Text style={styles.driverName} numberOfLines={1} ellipsizeMode="tail">{n.title}</Text>
									<Text style={styles.driverMeta} numberOfLines={2} ellipsizeMode="tail">{n.message}</Text>
								</View>
								<View style={styles.dateWrap}>
									<Text style={styles.dateText} numberOfLines={1}>{new Date(n.createdAt).toLocaleString()}</Text>
								</View>
							</View>
						))}
					</Card>
				</View>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 12 },
	cardsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
	statCard: { flex: 1 },
	cardTitle: { color: '#065f46', fontWeight: '600' },
	cardValue: { fontSize: 28, fontWeight: '800', marginTop: 8, color: '#065f46' },
	mapLoadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
	mainRow: { flexDirection: 'row', gap: 12 },
	mapCard: { flex: 2 },
	mapTitle: { fontWeight: '700', color: '#111827', marginBottom: 8 },
	mapPlaceholder: { flex: 1, minHeight: 260, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
	sideColumn: { flex: 1, gap: 12 },
	widgetTitle: { fontWeight: '700', color: '#111827', marginBottom: 8 },
	scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
	driverName: { fontWeight: '600', color: '#111827' },
	driverMeta: { color: '#6b7280', fontSize: 12 },
	notifRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
	dateWrap: { marginLeft: 8, alignItems: 'flex-end', width: 110 },
	dateText: { fontSize: 12, color: '#6b7280' },
});