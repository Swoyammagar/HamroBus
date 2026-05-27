import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Card, StatusBadge } from '../../components/ui';
import WebMap from './Maps/WebMap';
import { useDriver, useNotification, useRoute } from '../../context/domains';
import { useAdminDashboard } from '../hooks/useAdminDashboard';
import type { DriverLeaderboardRow } from '../hooks/useAdminDrivers';
import type { NotificationRecord, NotificationSeverity } from '../hooks/useAdminNotifications';

export default function DashboardOverview() {
	const { routes, fetchAllRoutes } = useRoute();
	const { getDriverLeaderboard } = useDriver();
	const {
		notifications,
		loading: notificationsLoading,
		error: notificationsError,
	} = useNotification();
	const { summary, loading: dashboardLoading, error: dashboardError, fetchDashboardData } = useAdminDashboard();
	const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
	const [leaderboard, setLeaderboard] = useState<DriverLeaderboardRow[]>([]);
	const [leaderboardLoading, setLeaderboardLoading] = useState(false);
	const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
	const { width } = useWindowDimensions();

	const totalDrivers = summary.totalDrivers;
	const totalBuses = summary.totalBuses;
	const totalRoutes = summary.totalRoutes;
	const totalSchedules = summary.totalSchedules;
	const isWide = width >= 1100;
	const isCompact = width < 760;

	const statCardStyle = isCompact
		? { ...styles.statCard, ...styles.statCardCompact }
		: styles.statCard;
	const widgetCardStyle = !isWide ? styles.widgetCardStacked : undefined;

	const latestNotifications = useMemo(() => notifications
		.slice()
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 5), [notifications]);

	const severityVariant = (severity?: NotificationSeverity) => {
		if (severity === 'critical' || severity === 'high') return 'danger';
		if (severity === 'medium') return 'warning';
		if (severity === 'low') return 'info';
		return 'neutral';
	};

	useEffect(() => {
		if (Platform.OS === 'web') {
			const id = 'leaflet-css';
			if (!document.getElementById(id)) {
				const link = document.createElement('link');
				link.id = id;
				link.rel = 'stylesheet';
				link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				document.head.appendChild(link);
			}
		}
	}, []);

	useEffect(() => {
		fetchAllRoutes();
		fetchDashboardData();
	}, [fetchAllRoutes, fetchDashboardData]);

	useEffect(() => {
		let active = true;
		const fetchLeaderboard = async () => {
			setLeaderboardLoading(true);
			setLeaderboardError(null);
			try {
				const result = await getDriverLeaderboard({ limit: 5, minReviews: 1, mode: 'bayesian' });
				if (active) setLeaderboard(result.leaderboard || []);
			} catch (err: any) {
				if (active) setLeaderboardError(err?.response?.data?.message || 'Failed to load driver leaderboard');
			} finally {
				if (active) setLeaderboardLoading(false);
			}
		};
		fetchLeaderboard();
		return () => { active = false; };
	}, [getDriverLeaderboard]);

	useEffect(() => {
		if (routes.length > 0 && !selectedRouteId) {
			setSelectedRouteId(routes[0]._id ?? null);
		}
	}, [routes, selectedRouteId]);

	const selectedRoute = useMemo(
		() => routes.find(r => r._id === selectedRouteId) ?? null,
		[routes, selectedRouteId]
	);

	return (
		<View style={styles.container}>
			{dashboardError && (
				<View style={styles.errorBanner}>
					<Text style={styles.errorText}>{dashboardError}</Text>
				</View>
			)}

			<View style={[styles.cardsRow, isCompact && styles.cardsRowCompact]}>
				<Card padding="md" style={statCardStyle}>
					<Text style={styles.cardTitle}>Total Drivers</Text>
					{dashboardLoading
						? <ActivityIndicator color="#065f46" style={styles.cardLoader} />
						: <Text style={styles.cardValue}>{totalDrivers}</Text>}
				</Card>
				<Card padding="md" style={statCardStyle}>
					<Text style={styles.cardTitle}>Total Buses</Text>
					{dashboardLoading
						? <ActivityIndicator color="#065f46" style={styles.cardLoader} />
						: <Text style={styles.cardValue}>{totalBuses}</Text>}
				</Card>
				<Card padding="md" style={statCardStyle}>
					<Text style={styles.cardTitle}>Total Routes</Text>
					{dashboardLoading
						? <ActivityIndicator color="#065f46" style={styles.cardLoader} />
						: <Text style={styles.cardValue}>{totalRoutes}</Text>}
				</Card>
				<Card padding="md" style={statCardStyle}>
					<Text style={styles.cardTitle}>Schedules</Text>
					{dashboardLoading
						? <ActivityIndicator color="#065f46" style={styles.cardLoader} />
						: <Text style={styles.cardValue}>{totalSchedules}</Text>}
				</Card>
			</View>

			<View style={[styles.mainRow, !isWide && styles.mainRowStacked]}>

				<Card padding="md" style={styles.mapCard}>
					{Platform.OS === 'web' ? (
						// @ts-ignore
						<WebMap
							route={selectedRoute}
							routes={routes}
							selectedRouteId={selectedRouteId}
							onSelectRoute={setSelectedRouteId}
						/>
					) : (
						<View style={styles.mapPlaceholder}>
							<Text style={{ color: '#6b7280' }}>Map is available on web only.</Text>
						</View>
					)}
				</Card>

				<View style={[styles.sideColumn, !isWide && styles.sideColumnStacked]}>
					<Card padding="md" style={widgetCardStyle}>
						<Text style={styles.widgetTitle}>Top Drivers</Text>
						{leaderboardLoading && <ActivityIndicator color="#065f46" style={styles.widgetLoader} />}
						{leaderboardError && <Text style={styles.widgetError}>{leaderboardError}</Text>}
						{!leaderboardLoading && !leaderboardError && leaderboard.length === 0 && (
							<Text style={styles.emptyText}>No rated drivers yet.</Text>
						)}
						{leaderboard.map((driver) => (
							<View key={driver.driverId} style={styles.scoreRow}>
								<View>
									<Text style={styles.driverName} numberOfLines={1}>
										#{driver.rank} {driver.firstName || ''} {driver.lastName || ''}
									</Text>
									<Text style={styles.driverMeta}>{driver.ratingCount} reviews</Text>
								</View>
								<StatusBadge label={driver.averageRating.toFixed(1)} variant="success" />
							</View>
						))}
					</Card>

					<Card padding="md" style={widgetCardStyle}>
						<Text style={styles.widgetTitle}>Latest Notifications</Text>
						{notificationsLoading && <ActivityIndicator color="#065f46" style={styles.widgetLoader} />}
						{notificationsError && <Text style={styles.widgetError}>{notificationsError}</Text>}
						{!notificationsLoading && !notificationsError && latestNotifications.length === 0 && (
							<Text style={styles.emptyText}>No notifications yet.</Text>
						)}
						{latestNotifications.map((notification: NotificationRecord) => (
							<View key={notification._id} style={styles.notifRow}>
								<View style={{ flex: 1 }}>
									<Text style={styles.driverName} numberOfLines={1} ellipsizeMode="tail">
										{notification.title}
									</Text>
									<Text style={styles.driverMeta} numberOfLines={2} ellipsizeMode="tail">
										{notification.message}
									</Text>
								</View>
								<View style={styles.dateWrap}>
									<StatusBadge label={notification.severity} variant={severityVariant(notification.severity)} />
									<Text style={styles.dateText} numberOfLines={1}>
										{new Date(notification.createdAt).toLocaleString()}
									</Text>
								</View>
							</View>
						))}
					</Card>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
		backgroundColor: '#f8fafc',
		padding: 16,
	},
	cardsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		marginBottom: 16,
	},
	cardsRowCompact: { gap: 10 },
	statCard: { flex: 1, minWidth: 180 },
	statCardCompact: { minWidth: 150, flexBasis: '47%' },
	cardTitle: { color: '#065f46', fontWeight: '600' },
	cardValue: { fontSize: 28, fontWeight: '800', marginTop: 8, color: '#065f46' },
	cardLoader: { alignSelf: 'flex-start', marginTop: 12 },
	errorBanner: { backgroundColor: '#fee2e2', borderRadius: 8, padding: 12, marginBottom: 12 },
	errorText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
	mainRow: {
		flex: 1,
		flexDirection: 'row',
		gap: 12,
	},
	mainRowStacked: { flexDirection: 'column' },
	mapCard: {
		flex: 1,
	},
	mapPlaceholder: {
		flex: 1,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		backgroundColor: '#f8fafc',
		alignItems: 'center',
		justifyContent: 'center',
	},
	sideColumn: {
		width: 340,
		gap: 12,
	},
	sideColumnStacked: {
		width: '100%',
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	widgetCardStacked: { flex: 1, minWidth: 320 },
	widgetTitle: { fontWeight: '700', color: '#111827', marginBottom: 8 },
	widgetLoader: { alignSelf: 'flex-start', marginVertical: 10 },
	widgetError: { color: '#dc2626', fontSize: 13 },
	emptyText: { color: '#6b7280', fontSize: 13, paddingVertical: 8 },
	scoreRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	driverName: { fontWeight: '600', color: '#111827', maxWidth: 220 },
	driverMeta: { color: '#6b7280', fontSize: 12 },
	notifRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	dateWrap: { marginLeft: 8, alignItems: 'flex-end', width: 130, gap: 4 },
	dateText: { fontSize: 11, color: '#6b7280' },
});
