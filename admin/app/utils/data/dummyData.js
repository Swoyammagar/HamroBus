// Dummy data representing database-like schema for the admin dashboard

export const drivers = [
  {
    _id: 'drv_1',
    name: 'Ram Bahadur',
    phone: '9800000001',
    licenseNumber: 'LN-12345',
    rating: 4.8,
    totalReviews: 120,
    reviews: [
      { _id: 'rev_1', passengerName: 'Sita', rating: 5, comment: 'Very polite and safe driving', date: '2025-09-15' },
      { _id: 'rev_2', passengerName: 'Gita', rating: 4, comment: 'On time and helpful', date: '2025-09-14' },
    ],
  },
  {
    _id: 'drv_2',
    name: 'Shyam Prasad',
    phone: '9800000002',
    licenseNumber: 'LN-67890',
    rating: 4.5,
    totalReviews: 95,
    reviews: [
      { _id: 'rev_3', passengerName: 'Kiran', rating: 5, comment: 'Smooth ride', date: '2025-09-12' },
      { _id: 'rev_4', passengerName: 'Rita', rating: 4, comment: 'Clean bus', date: '2025-09-10' },
    ],
  },
  {
    _id: 'drv_3',
    name: 'Hari Thapa',
    phone: '9800000003',
    licenseNumber: 'LN-22222',
    rating: 4.2,
    totalReviews: 60,
    reviews: [
      { _id: 'rev_5', passengerName: 'Mina', rating: 4, comment: 'Good driving', date: '2025-09-11' },
    ],
  },
];

export const buses = [
  {
    _id: 'bus_1',
    busNumber: 'BA 3 KHA 1234',
    capacity: 40,
    status: 'active', // active | maintenance | inactive
    crowdLevel: 'medium', // low | medium | high | full
    assignedDriverId: 'drv_1',
    assignedRouteId: 'rte_1',
    features: ['AC', 'WiFi', 'CCTV'],
    passengerCount: { current: 18, max: 40 },
    currentLocation: { latitude: 27.7172, longitude: 85.324 },
  },
  {
    _id: 'bus_2',
    busNumber: 'BA 2 KHA 5678',
    capacity: 32,
    status: 'maintenance',
    crowdLevel: 'low',
    assignedDriverId: 'drv_2',
    assignedRouteId: 'rte_2',
    features: ['CCTV'],
    passengerCount: { current: 0, max: 32 },
    currentLocation: { latitude: 27.705, longitude: 85.33 },
  },
  {
    _id: 'bus_3',
    busNumber: 'BA 1 PA 4321',
    capacity: 28,
    status: 'inactive',
    crowdLevel: 'low',
    assignedDriverId: null,
    assignedRouteId: null,
    features: ['AC'],
    passengerCount: { current: 0, max: 28 },
    currentLocation: { latitude: 27.72, longitude: 85.31 },
  },
];

export const routes = [
  {
    _id: 'rte_1',
    routeNumber: 'R1',
    name: 'Kathmandu Ring Road',
    stops: [
      { name: 'Kalanki', lat: 27.694, lng: 85.281 },
      { name: 'Satdobato', lat: 27.658, lng: 85.329 },
      { name: 'Koteshwor', lat: 27.678, lng: 85.35 },
      { name: 'Chabahil', lat: 27.718, lng: 85.35 },
    ],
    assignedBusIds: ['bus_1'],
    assignedDriverIds: ['drv_1'],
    color: '#1890ff',
  },
  {
    _id: 'rte_2',
    routeNumber: 'R2',
    name: 'Airport Express',
    stops: [
      { name: 'Ratnapark', lat: 27.706, lng: 85.312 },
      { name: 'Airport', lat: 27.698, lng: 85.359 },
    ],
    assignedBusIds: ['bus_2'],
    assignedDriverIds: ['drv_2'],
    color: '#52c41a',
  },
];

export const schedules = [
  {
    _id: 'sch_1',
    routeId: 'rte_1',
    busId: 'bus_1',
    driverId: 'drv_1',
    departureTime: new Date().toISOString(),
    arrivalTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: 'scheduled', // scheduled | enroute | completed | cancelled
  },
];

export const notifications = [
  { _id: 'ntf_1', title: 'Maintenance Reminder', message: 'Bus BA 2 KHA 5678 scheduled maintenance at 3 PM', target: 'drivers', createdAt: new Date().toISOString() },
];

export function findDriverById(id) {
  return drivers.find(d => d._id === id) || null;
}

export function findBusById(id) {
  return buses.find(b => b._id === id) || null;
}

export function findRouteById(id) {
  return routes.find(r => r._id === id) || null;
}

export function getDriverRatingSummary() {
  return drivers
    .map(d => ({ _id: d._id, name: d.name, rating: d.rating, totalReviews: d.totalReviews }))
    .sort((a, b) => b.rating - a.rating);
}


