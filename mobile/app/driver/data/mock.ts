type BusStopStatus = 'completed' | 'active' | 'upcoming';

interface BusStop {
  id: number;
  name: string;
  status: BusStopStatus;
  passengers: number;
  time: string;
  latitude: number;
  longitude: number;
}
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
export const busStops: BusStop[] = [
  { id: 1, name: 'Naya Bus Park (Gongabu)', status: 'completed', passengers: 12, time: '08:00 AM', latitude: 27.7260, longitude: 85.3310 },
  { id: 2, name: 'Syuchatar Stop', status: 'completed', passengers: 7, time: '08:15 AM', latitude: 27.6991, longitude: 85.2814 },
  { id: 3, name: 'Bafal Stop', status: 'completed', passengers: 5, time: '08:25 AM', latitude: 27.7002, longitude: 85.2818 },
  { id: 4, name: 'Kalanki Bus Stop', status: 'active', passengers: 10, time: '08:40 AM', latitude: 27.7160, longitude: 85.2760 },
  { id: 5, name: 'Satdobato Stop', status: 'upcoming', passengers: 0, time: '08:55 AM', latitude: 27.6662, longitude: 85.3080 },
  { id: 6, name: 'Koteshwor Stop', status: 'upcoming', passengers: 0, time: '09:10 AM', latitude: 27.7150, longitude: 85.3230 },
  { id: 7, name: 'Sinamangal Stop', status: 'upcoming', passengers: 0, time: '09:25 AM', latitude: 27.7062, longitude: 85.3278 },
  { id: 8, name: 'Chabahil Bus Stop', status: 'upcoming', passengers: 0, time: '09:40 AM', latitude: 27.7103, longitude: 85.3272 },
];

// Route polyline coordinates connecting all stops
export const routePolyline = [
  // Naya Bus Park (Gongabu)
  { latitude: 27.7260, longitude: 85.3310 },

  // Balaju area
  { latitude: 27.7215, longitude: 85.3050 },

  // Kalanki
  { latitude: 27.7160, longitude: 85.2760 },

  // Satdobato
  { latitude: 27.6662, longitude: 85.3080 },

  // Koteshwor
  { latitude: 27.7150, longitude: 85.3230 },

  // Sinamangal
  { latitude: 27.7062, longitude: 85.3278 },

  // Chabahil
  { latitude: 27.7103, longitude: 85.3272 },
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