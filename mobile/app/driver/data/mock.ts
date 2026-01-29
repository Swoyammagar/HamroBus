export const currentTrip = {
  route: 'Route 42 - Downtown Express',
  startTime: '2:30 PM',
  endTime: '4:15 PM',
  currentStop: 'Central Station',
  nextStop: 'City Mall',
  progress: 45,
  passengersOnboard: 23,
  expectedPassengers: 35,
};

export const upcomingTrip = {
  route: 'Route 15 - Airport Link',
  time: '5:00 PM',
  duration: '1h 20m',
};

export const stats = [
  { label: "Today's Trips", value: '3', icon: 'activity', color: '#2563EB' },
  { label: 'Active Hours', value: '6.5h', icon: 'clock', color: '#22C55E' },
  { label: 'Total Passengers', value: '142', icon: 'users', color: '#7C3AED' },
];

// UPDATED: Now includes lat/lng coordinates
export const busStops = [
  { id: 1, name: 'Central Station', status: 'completed', passengers: 8, time: '2:30 PM', latitude: 40.7489, longitude: -73.9680 },
  { id: 2, name: 'Market Square', status: 'completed', passengers: 5, time: '2:42 PM', latitude: 40.7505, longitude: -73.9776 },
  { id: 3, name: 'City Library', status: 'active', passengers: 0, time: '2:55 PM', latitude: 40.7532, longitude: -73.9822 },
  { id: 4, name: 'City Mall', status: 'upcoming', passengers: 0, time: '3:08 PM', latitude: 40.7614, longitude: -73.9776 },
  { id: 5, name: 'Hospital', status: 'upcoming', passengers: 0, time: '3:20 PM', latitude: 40.7689, longitude: -73.9642 },
  { id: 6, name: 'University', status: 'upcoming', passengers: 0, time: '3:35 PM', latitude: 40.8075, longitude: -73.9626 },
  { id: 7, name: 'Downtown Hub', status: 'upcoming', passengers: 0, time: '4:15 PM', latitude: 40.7128, longitude: -74.0060 },
];

// Route polyline coordinates connecting all stops
export const routePolyline = [
  { latitude: 40.7489, longitude: -73.9680 },
  { latitude: 40.7505, longitude: -73.9776 },
  { latitude: 40.7532, longitude: -73.9822 },
  { latitude: 40.7614, longitude: -73.9776 },
  { latitude: 40.7689, longitude: -73.9642 },
  { latitude: 40.8075, longitude: -73.9626 },
  { latitude: 40.7128, longitude: -74.0060 },
];

export const schedules = {
  today: [
    {
      id: 1,
      route: 'Route 42 - Downtown Express',
      startTime: '8:00 AM',
      endTime: '9:45 AM',
      startPoint: 'North Terminal',
      endPoint: 'Downtown Hub',
      status: 'completed',
      passengers: 32,
    },
    {
      id: 2,
      route: 'Route 42 - Downtown Express',
      startTime: '10:30 AM',
      endTime: '12:15 PM',
      startPoint: 'Downtown Hub',
      endPoint: 'North Terminal',
      status: 'completed',
      passengers: 28,
    },
    {
      id: 3,
      route: 'Route 42 - Downtown Express',
      startTime: '2:30 PM',
      endTime: '4:15 PM',
      startPoint: 'North Terminal',
      endPoint: 'Downtown Hub',
      status: 'active',
      passengers: 23,
      delay: '5 min behind',
    },
    {
      id: 4,
      route: 'Route 15 - Airport Link',
      startTime: '5:00 PM',
      endTime: '6:20 PM',
      startPoint: 'Central Station',
      endPoint: 'Airport Terminal 2',
      status: 'upcoming',
      estimatedPassengers: 35,
    },
  ],
  tomorrow: [
    {
      id: 5,
      route: 'Route 42 - Downtown Express',
      startTime: '8:00 AM',
      endTime: '9:45 AM',
      startPoint: 'North Terminal',
      endPoint: 'Downtown Hub',
      status: 'scheduled',
      estimatedPassengers: 35,
    },
    {
      id: 6,
      route: 'Route 42 - Downtown Express',
      startTime: '10:30 AM',
      endTime: '12:15 PM',
      startPoint: 'Downtown Hub',
      endPoint: 'North Terminal',
      status: 'scheduled',
      estimatedPassengers: 30,
    },
  ],
};

export const historyTrips = [
  {
    id: 1,
    route: 'Route 42 - Downtown Express',
    startTime: '8:00 AM',
    endTime: '9:45 AM',
    duration: '1h 45m',
    distance: '28km',
    passengers: 32,
    earnings: '$48',
    status: 'completed',
    rating: 4.8,
    startPoint: 'North Terminal',
    endPoint: 'Downtown Hub',
    stops: ['Central Station', 'Market Square', 'City Library', 'Hospital'],
    issues: [],
  },
  {
    id: 2,
    route: 'Route 42 - Downtown Express',
    startTime: '10:30 AM',
    endTime: '12:15 PM',
    duration: '1h 45m',
    distance: '28km',
    passengers: 28,
    earnings: '$42',
    status: 'completed',
    rating: 4.9,
    startPoint: 'Downtown Hub',
    endPoint: 'North Terminal',
    stops: ['University', 'City Mall', 'Library', 'Market Square'],
    issues: [],
  },
  {
    id: 3,
    route: 'Route 42 - Downtown Express',
    startTime: '2:30 PM',
    endTime: '4:15 PM',
    duration: '1h 45m',
    distance: '28km',
    passengers: 23,
    earnings: '$52',
    status: 'in-progress',
    startPoint: 'North Terminal',
    endPoint: 'Downtown Hub',
    stops: ['Central Station', 'Market Square', 'City Library'],
    currentStop: 'City Library',
    issues: ['5 min delay at Market Square'],
  },
];