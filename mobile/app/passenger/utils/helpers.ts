import { Booking, Stop, Bus } from '../context/PassengerContext';

export const generateBookingToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const calculateCrowdPercentage = (bus: Bus): number => {
  const currentPassengers = bus.currentPassengers ?? bus.currentOccupancy ?? 0;
  const totalCapacity = bus.totalCapacity ?? bus.capacity ?? 0;
  if (totalCapacity <= 0) return 0;
  return Math.round((currentPassengers / totalCapacity) * 100);
};

export const getCrowdLevel = (percentage: number): string => {
  if (percentage < 30) return 'Low';
  if (percentage < 60) return 'Moderate';
  if (percentage < 85) return 'High';
  return 'Very High';
};

export const getCrowdColor = (percentage: number): string => {
  if (percentage < 30) return '#10b981'; // Green
  if (percentage < 60) return '#f59e0b'; // Amber
  if (percentage < 85) return '#ef4444'; // Red
  return '#991b1b'; // Dark Red
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getStopName = (stops: Stop[], stopId: string): string => {
  const stop = stops.find(s => s.id === stopId);
  return stop ? stop.name : 'Unknown Stop';
};

export const getSeatsAvailable = (bus: Bus): number => {
  const totalCapacity = bus.totalCapacity ?? bus.capacity ?? 0;
  const currentPassengers = bus.currentPassengers ?? bus.currentOccupancy ?? 0;
  return totalCapacity - currentPassengers;
};

export const generateTicketHTML = (booking: Booking, bus: Bus, stops: Stop[]): string => {
  const boardingStop = stops.find(s => s.id === booking.boardingStop);
  const alightingStop = stops.find(s => s.id === booking.alightingStop);

  return `
    <div style="padding: 20px; font-family: Arial; max-width: 400px; margin: 0 auto; border: 2px solid #333;">
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        <h2 style="margin: 0; color: #1f2937;">🚌 Hamro Bus</h2>
        <p style="margin: 5px 0; color: #666;">Travel Ticket</p>
      </div>
      
      <div style="margin-bottom: 15px;">
        <p style="margin: 5px 0; font-size: 12px; color: #666;">
          <strong>Booking ID:</strong> ${booking.bookingId}
        </p>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">
          <strong>Token:</strong> ${booking.token}
        </p>
      </div>

      <div style="background: #f3f4f6; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
        <p style="margin: 5px 0; font-weight: bold;">Bus ${bus.busNumber}</p>
        <p style="margin: 5px 0; font-size: 12px;">Seat: ${booking.seatNumber}</p>
        <p style="margin: 5px 0; font-size: 12px;">Driver: ${bus.driverName}</p>
      </div>

      <div style="margin-bottom: 15px;">
        <p style="margin: 5px 0; font-size: 12px;">
          <strong>From:</strong> ${boardingStop?.name || 'Unknown'}
        </p>
        <p style="margin: 5px 0; font-size: 12px;">
          ${formatTime(boardingStop?.estimatedArrival || new Date().toISOString())}
        </p>
        
        <div style="text-align: center; margin: 10px 0; color: #999;">↓</div>
        
        <p style="margin: 5px 0; font-size: 12px;">
          <strong>To:</strong> ${alightingStop?.name || 'Unknown'}
        </p>
        <p style="margin: 5px 0; font-size: 12px;">
          ${formatTime(alightingStop?.estimatedArrival || new Date().toISOString())}
        </p>
      </div>

      <div style="background: #e0e7ff; padding: 10px; margin-bottom: 15px; border-radius: 8px; text-align: center;">
        <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">Rs. ${booking.price}</p>
      </div>

      <div style="border: 2px dashed #999; padding: 10px; text-align: center; margin-bottom: 15px;">
        <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">
          ${booking.token}
        </p>
        <p style="margin: 5px 0; font-size: 10px; color: #999;">Present this code to driver</p>
      </div>

      <div style="border-top: 2px solid #333; padding-top: 10px; text-align: center;">
        <p style="margin: 5px 0; font-size: 11px; color: #666;">
          Date: ${formatDate(booking.bookingDate)}
        </p>
        <p style="margin: 5px 0; font-size: 11px; color: #666;">
          Travel Date: ${formatDate(booking.travelDate)}
        </p>
        <p style="margin: 5px 0; font-size: 10px; color: #999;">
          Keep this ticket safe. Show to driver at boarding.
        </p>
      </div>
    </div>
  `;
};
