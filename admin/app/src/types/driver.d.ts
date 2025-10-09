export type Review = {
  _id: string;
  passengerName: string;
  rating: number;
  comment: string;
  date: string; // ISO date string (e.g. '2025-09-15')
};


export type EmergencyContact = {
  name: string;
  phone: string;
  relation: string;
};

export type Location = {
  lat: number;
  lng: number;
};

export type Driver = {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  assignedVehicle: string;
  assignedRouteId: string;
  hireDate: string;
  status: 'Active' | 'On Leave' | 'Inactive'; // restrict to possible statuses
  rating: number;
  totalReviews: number;
  reviews: Review[];
  emergencyContact: EmergencyContact;
  currentLocation: Location;
};
