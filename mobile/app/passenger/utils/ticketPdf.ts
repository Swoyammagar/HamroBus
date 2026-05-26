import type { BookingResponse } from '../services/bookingService';
import type { Booking, Bus, Route } from '../context/PassengerContext';
import { bookingService } from '../services/bookingService';
import { formatDate } from './helpers';

type TicketBooking = BookingResponse | Booking;

type PassengerDetails = {
  name?: string;
  email?: string;
  phoneNumber?: string;
};

type TicketPdfInput = {
  booking: TicketBooking;
  bus?: Partial<Bus> | null;
  route?: Partial<Route> | null;
  passenger?: PassengerDetails | null;
  qrCodeDataUrl?: string | null;
};

type NormalizedTicket = {
  id: string;
  bookingCode: string;
  passengerId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  busNumber: string;
  routeName: string;
  from: string;
  to: string;
  seats: string;
  seatCount: number;
  travelDate: string;
  departure: string;
  arrival: string;
  status: string;
  paymentStatus: boolean;
  paymentMethod: string;
  originalFare: number;
  discountAmount: number;
  discountPercentage: number;
  finalFare: number;
  rewardApplied: boolean;
  createdAt: string;
};

const money = (value: unknown) => {
  const amount = Number(value || 0);
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getBookingField = (booking: TicketBooking, apiKey: keyof BookingResponse, contextKey?: keyof Booking) =>
  (booking as BookingResponse)[apiKey] ?? (contextKey ? (booking as Booking)[contextKey] : undefined);

const normalizeTicket = ({ booking, bus, route, passenger }: TicketPdfInput): NormalizedTicket => {
  const apiBooking = booking as BookingResponse;
  const contextBooking = booking as Booking;
  const seatNumbers = Array.isArray(apiBooking.seatNumbers)
    ? apiBooking.seatNumbers.join(', ')
    : contextBooking.seatNumber || '';
  const seatCount = Number(apiBooking.seatCount || seatNumbers.split(',').filter(Boolean).length || 1);
  const originalFare = Number(apiBooking.totalFare ?? contextBooking.totalFare ?? contextBooking.price ?? 0);
  const discountAmount = Number(apiBooking.discountAmount ?? contextBooking.discountAmount ?? 0);
  const finalFare = Number(apiBooking.finalFare ?? contextBooking.finalFare ?? contextBooking.price ?? originalFare);
  const rewardApplied = Boolean(apiBooking.rewardPointsRedeemed || contextBooking.rewardPointsRedeemed || discountAmount > 0);
  const payment = apiBooking.payment;
  const passengerName = String(passenger?.name || '').trim() || 'Passenger';

  return {
    id: String(getBookingField(booking, 'id') || ''),
    bookingCode: String(apiBooking.bookingCode || contextBooking.bookingId || contextBooking.token || ''),
    passengerId: String(apiBooking.passengerId || contextBooking.passengerId || ''),
    passengerName,
    passengerEmail: String(passenger?.email || ''),
    passengerPhone: String(passenger?.phoneNumber || ''),
    busNumber: String(apiBooking.busNumber || contextBooking.busNumber || bus?.busNumber || ''),
    routeName: String(route?.name || `${apiBooking.boardingStop?.stopName || contextBooking.boardingStop || ''} - ${apiBooking.destinationStop?.stopName || contextBooking.alightingStop || ''}`),
    from: String(apiBooking.boardingStop?.stopName || contextBooking.boardingStop || ''),
    to: String(apiBooking.destinationStop?.stopName || contextBooking.alightingStop || ''),
    seats: seatNumbers,
    seatCount,
    travelDate: String(apiBooking.serviceDate || contextBooking.travelDate || ''),
    departure: String(apiBooking.scheduleStartTime || 'As per schedule'),
    arrival: String(apiBooking.scheduleEndTime || ''),
    status: String(apiBooking.status || contextBooking.status || 'confirmed'),
    paymentStatus: Boolean(apiBooking.paymentStatus || payment?.status === 'paid' || contextBooking.paymentStatus),
    paymentMethod: String(payment?.method || (apiBooking.paymentStatus || contextBooking.paymentStatus ? 'Khalti' : 'Pending')),
    originalFare,
    discountAmount,
    discountPercentage: Number(apiBooking.discountPercentage ?? contextBooking.discountPercentage ?? 0),
    finalFare,
    rewardApplied,
    createdAt: String(apiBooking.createdAt || contextBooking.bookingDate || new Date().toISOString()),
  };
};

const buildTicketHtml = (ticket: NormalizedTicket, qrCodeDataUrl?: string | null) => {
  const rewardRows = ticket.rewardApplied
    ? `
      <div class="line"><span>Ticket Price</span><strong>Rs. ${money(ticket.originalFare)}</strong></div>
      <div class="line discount"><span>Reward Discount${ticket.discountPercentage ? ` (${money(ticket.discountPercentage)}%)` : ''}</span><strong>-Rs. ${money(ticket.discountAmount)}</strong></div>
      <div class="line final"><span>Final Paid</span><strong>Rs. ${money(ticket.finalFare)}</strong></div>
    `
    : `<div class="line final"><span>Final Paid</span><strong>Rs. ${money(ticket.finalFare || ticket.originalFare)}</strong></div>`;

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @page { margin: 24px; }
        body { margin: 0; background: #f3f4f6; color: #1f2937; font-family: Arial, Helvetica, sans-serif; }
        .ticket { max-width: 640px; margin: 0 auto; background: #ffffff; border: 2px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
        .header { background: #1f2937; color: #ffffff; padding: 22px 24px; }
        .brand { font-size: 13px; letter-spacing: 1.6px; text-transform: uppercase; color: #d1d5db; }
        .title { margin-top: 8px; font-size: 28px; font-weight: 800; }
        .route { margin-top: 8px; font-size: 15px; color: #d1d5db; }
        .status { display: inline-block; margin-top: 14px; padding: 6px 10px; border-radius: 6px; background: ${ticket.paymentStatus ? '#dcfce7' : '#fee2e2'}; color: ${ticket.paymentStatus ? '#166534' : '#991b1b'}; font-size: 12px; font-weight: 700; }
        .body { padding: 22px 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .section { margin-top: 18px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .section:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
        .section-title { margin-bottom: 10px; font-size: 13px; font-weight: 800; text-transform: uppercase; color: #4b5563; letter-spacing: 0.7px; }
        .field { background: #f9fafb; border-radius: 8px; padding: 10px 12px; }
        .label { display: block; font-size: 11px; color: #6b7280; margin-bottom: 4px; }
        .value { display: block; font-size: 14px; font-weight: 700; color: #111827; }
        .mono { font-family: "Courier New", monospace; letter-spacing: 1px; }
        .line { display: flex; justify-content: space-between; gap: 16px; padding: 9px 0; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .line.discount { color: #059669; }
        .line.final { border-bottom: 0; font-size: 17px; color: #2563eb; font-weight: 800; }
        .qr-wrap { margin-top: 16px; padding: 16px; text-align: center; background: #f8fafc; border-radius: 12px; border: 1px solid #e5e7eb; }
        .qr { width: 180px; height: 180px; object-fit: contain; background: #ffffff; border-radius: 8px; }
        .footer { padding: 14px 24px 20px; color: #6b7280; font-size: 11px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">
          <div class="brand">Hamro Bus E-Ticket</div>
          <div class="title">${escapeHtml(ticket.busNumber || 'Bus Ticket')}</div>
          <div class="route">${escapeHtml(ticket.routeName)}</div>
          <div class="status">${ticket.paymentStatus ? 'PAID' : 'UNPAID'}${ticket.paymentMethod ? ` via ${escapeHtml(ticket.paymentMethod)}` : ''}</div>
        </div>
        <div class="body">
          <div class="section">
            <div class="section-title">Passenger</div>
            <div class="grid">
              <div class="field"><span class="label">Name</span><span class="value">${escapeHtml(ticket.passengerName)}</span></div>
              <div class="field"><span class="label">Passenger ID</span><span class="value mono">${escapeHtml(ticket.passengerId || '-')}</span></div>
              <div class="field"><span class="label">Email</span><span class="value">${escapeHtml(ticket.passengerEmail || '-')}</span></div>
              <div class="field"><span class="label">Phone</span><span class="value">${escapeHtml(ticket.passengerPhone || '-')}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Trip Details</div>
            <div class="grid">
              <div class="field"><span class="label">Booking ID</span><span class="value mono">${escapeHtml(ticket.bookingCode)}</span></div>
              <div class="field"><span class="label">Bus</span><span class="value">${escapeHtml(ticket.busNumber || '-')}</span></div>
              <div class="field"><span class="label">From</span><span class="value">${escapeHtml(ticket.from)}</span></div>
              <div class="field"><span class="label">To</span><span class="value">${escapeHtml(ticket.to)}</span></div>
              <div class="field"><span class="label">Seats</span><span class="value">${escapeHtml(ticket.seats)}</span></div>
              <div class="field"><span class="label">Date / Time</span><span class="value">${escapeHtml(formatDate(ticket.travelDate))} ${escapeHtml(ticket.departure)}${ticket.arrival ? ` - ${escapeHtml(ticket.arrival)}` : ''}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Payment Details</div>
            ${rewardRows}
          </div>
          <div class="qr-wrap">
            <div class="section-title">Boarding QR</div>
            ${qrCodeDataUrl ? `<img class="qr" src="${qrCodeDataUrl}" />` : '<div class="field">QR code unavailable</div>'}
          </div>
        </div>
        <div class="footer">Show this PDF or scan the QR at boarding. Generated ${escapeHtml(new Date().toLocaleString())}.</div>
      </div>
    </body>
  </html>`;
};

export const getTicketPriceBreakdown = (booking: TicketBooking) => {
  const originalFare = Number((booking as BookingResponse).totalFare ?? (booking as Booking).totalFare ?? (booking as Booking).price ?? 0);
  const discountAmount = Number((booking as BookingResponse).discountAmount ?? (booking as Booking).discountAmount ?? 0);
  const finalFare = Number((booking as BookingResponse).finalFare ?? (booking as Booking).finalFare ?? (booking as Booking).price ?? originalFare);
  const rewardApplied = Boolean((booking as BookingResponse).rewardPointsRedeemed || (booking as Booking).rewardPointsRedeemed || discountAmount > 0);
  const discountPercentage = Number((booking as BookingResponse).discountPercentage ?? (booking as Booking).discountPercentage ?? 0);

  return { originalFare, discountAmount, finalFare, rewardApplied, discountPercentage };
};

export const fetchTicketQrCode = async (bookingId: string, existingQr?: string | null) => {
  if (existingQr) return existingQr;
  const qrData = await bookingService.getBookingQr(bookingId);
  return qrData.qrCodeDataUrl || null;
};

export const generateTicketPdf = async (input: TicketPdfInput) => {
  const Print = await import('expo-print');
  const qrCodeDataUrl = await fetchTicketQrCode(String(getBookingField(input.booking, 'id') || ''), input.qrCodeDataUrl);
  const ticket = normalizeTicket(input);
  const html = buildTicketHtml(ticket, qrCodeDataUrl);
  const result = await Print.printToFileAsync({ html, width: 612, height: 792 });
  return result.uri;
};

export const shareTicketPdf = async (input: TicketPdfInput) => {
  const Sharing = await import('expo-sharing');
  const uri = await generateTicketPdf(input);
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Share Hamro Bus Ticket',
  });
  return uri;
};

export const downloadTicketPdf = async (input: TicketPdfInput) => {
  const Sharing = await import('expo-sharing');
  const uri = await generateTicketPdf(input);
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Save Hamro Bus Ticket PDF',
    });
  }
  return uri;
};
