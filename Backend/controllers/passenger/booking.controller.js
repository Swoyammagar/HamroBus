const mongoose = require('mongoose');
const Route = require('../../models/route.model');
const Bus = require('../../models/bus.model');
const Booking = require('../../models/booking.model');
const TripSession = require('../../models/tripSession.model');
const Driver = require('../../models/driver.model');
const Passenger = require('../../models/passenger.model');
const Notification = require('../../models/notification.model');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { getCurrentStopSequence } = require('../../services/distanceUtils');
const { getIoInstance } = require('../../services/ioManager');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Seats are considered taken only for confirmed or in-progress bookings.
// Completed bookings should free up seats so new passengers can book them.
const BOOKING_ACTIVE_STATUSES = ['confirmed', 'in-progress'];
const BOOKING_CANCELLABLE_STATUS = 'confirmed';
const QR_SCHEMA_VERSION = 1;

const normalizeDateOnly = (value) => {
  const input = value ? new Date(value) : new Date();
  if (Number.isNaN(input.getTime())) {
    return null;
  }
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
};

const dayOfWeekFromDate = (dateValue) => DAYS[new Date(dateValue).getUTCDay()];

const buildUtcDayRange = (serviceDate) => {
  const start = normalizeDateOnly(serviceDate);
  if (!start) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || '').trim());

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const extractSchedule = (route, scheduleId) => {
  const schedule = route.schedules.id(scheduleId);
  if (!schedule) return null;
  return schedule;
};

const getStopByName = (route, stopName) => {
  const normalized = String(stopName || '').trim().toLowerCase();
  if (!normalized) return null;
  return route.stops.find((stop) => String(stop.stopName || '').trim().toLowerCase() === normalized) || null;
};

const buildSeatLabelMap = (capacity) => {
  const labels = [];
  const seatsPerRow = 4;
  for (let i = 1; i <= capacity; i += 1) {
    const rowLabel = String.fromCharCode(65 + Math.floor((i - 1) / seatsPerRow));
    const seatInRow = ((i - 1) % seatsPerRow) + 1;
    labels.push(`${rowLabel}${seatInRow}`);
  }
  return labels;
};

const makeBookingCode = () => `BK${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 9999)
  .toString()
  .padStart(4, '0')}`;

const makeQrToken = () => crypto.randomBytes(16).toString('hex');

const buildBookingQrRawPayload = (booking) => ({
  v: QR_SCHEMA_VERSION,
  type: 'passenger-booking',
  bookingId: String(booking._id),
  bookingCode: booking.bookingCode,
  qrToken: booking.qrToken,
  trip: {
    routeId: String(booking.routeId),
    busId: String(booking.busId),
    scheduleId: String(booking.scheduleId),
    serviceDate: new Date(booking.serviceDate).toISOString(),
  },
  seats: (booking.seatNumbers || []).map((seat) => String(seat).trim().toUpperCase()),
  status: booking.status,
});

const encodeBookingQrPayload = (rawPayload) => JSON.stringify(rawPayload);

const generateQrDataUrlFromPayload = async (payloadString) =>
  QRCode.toDataURL(payloadString, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
  });

const getTakenSeats = async ({ routeId, busId, scheduleId, serviceDate }) => {
  const bookings = await Booking.find({
    routeId,
    busId,
    scheduleId,
    serviceDate,
    status: { $in: BOOKING_ACTIVE_STATUSES },
  }).select('seatNumbers');

  return new Set(
    bookings.flatMap((booking) => booking.seatNumbers || []).map((seat) => String(seat).trim().toUpperCase())
  );
};

const mapBookingResponse = (booking) => ({
  id: booking._id,
  bookingCode: booking.bookingCode,
  passengerId: booking.passengerId,
  routeId: booking.routeId,
  busId: booking.busId,
  scheduleId: booking.scheduleId,
  tripSessionId: booking.tripSessionId,
  serviceDate: booking.serviceDate,
  dayOfWeek: booking.dayOfWeek,
  scheduleStartTime: booking.scheduleStartTime,
  scheduleEndTime: booking.scheduleEndTime,
  boardingStop: booking.boardingStop,
  destinationStop: booking.destinationStop,
  seatNumbers: booking.seatNumbers,
  seatCount: booking.seatCount,
  farePerSeat: booking.farePerSeat,
  totalFare: booking.totalFare,
  paymentStatus: Boolean(booking.paymentStatus || booking.payment?.status === 'paid'),
  status: booking.status,
  cancelledAt: booking.cancelledAt,
  cancellationReason: booking.cancellationReason,
  startedAt: booking.startedAt,
  completedAt: booking.completedAt,
  createdAt: booking.createdAt,
  updatedAt: booking.updatedAt,
  payment: booking.payment,
  qrToken: booking.qrToken,
  qrPayload: booking.qrPayload,
  qrGeneratedAt: booking.qrGeneratedAt,
});

const createBooking = async (req, res) => {
  const passengerId = req.user.id;
  const {
    routeId,
    busId,
    scheduleId,
    serviceDate,
    boardingStopName,
    destinationStopName,
    seatCount,
    preferredSeatNumbers,
  } = req.body;

  try {
    if (!routeId || !busId || !scheduleId || !boardingStopName || !destinationStopName || !seatCount) {
      return res.status(400).json({ message: 'routeId, busId, scheduleId, boardingStopName, destinationStopName and seatCount are required' });
    }

    const parsedSeatCount = Number(seatCount);
    if (!Number.isInteger(parsedSeatCount) || parsedSeatCount < 1 || parsedSeatCount > 4) {
      return res.status(400).json({ message: 'seatCount must be an integer between 1 and 4' });
    }

    if (!isValidObjectId(routeId) || !isValidObjectId(busId) || !isValidObjectId(scheduleId)) {
      return res.status(400).json({ message: 'routeId, busId or scheduleId is invalid' });
    }

    const normalizedServiceDate = normalizeDateOnly(serviceDate);
    if (!normalizedServiceDate) {
      return res.status(400).json({ message: 'serviceDate is invalid' });
    }

    const dayRange = buildUtcDayRange(normalizedServiceDate);
    const existingTrip = await TripSession.findOne({
      routeId: routeId,
      busId: busId,
      scheduleId: scheduleId,
      startTime: {
        $gte: dayRange.start,
        $lt: dayRange.end,
      },
      // include on-break as an active trip so mid-trip bookings are considered
      status: { $in: ['in-progress', 'on-break', 'completed'] },
    }).select('_id status startTime currentStop driverId');

    // NEW: Allow mid-trip booking if bus hasn't reached destination yet
    if (existingTrip && existingTrip.status === 'completed') {
      return res.status(409).json({
        message: `Booking closed. This trip is already completed.`,
      });
    }

    let isMidTripBooking = false;
    let tripSessionId = null;

    if (existingTrip && existingTrip.status === 'in-progress') {
      // Mid-trip booking: check if bus has already passed boarding or destination
      tripSessionId = existingTrip._id;
      isMidTripBooking = true;
      
      // Validate destination: bus cannot have already passed it
      // Fetch route to get stop sequences
      let route_for_validation = await Route.findById(routeId).select('stops').lean();
      if (route_for_validation) {
        const currentStopSeq = getCurrentStopSequence(existingTrip.currentStop, { stops: route_for_validation.stops });
        const boardingStopSeq = Number(getStopByName({ stops: route_for_validation.stops }, boardingStopName)?.sequence || -1);
        const destinationStopSeq = Number(getStopByName({ stops: route_for_validation.stops }, destinationStopName)?.sequence || -1);

        // If boarding or destination stop not found for validation
        if (boardingStopSeq <= 0 || destinationStopSeq <= 0) {
          return res.status(400).json({ message: 'Boarding or destination stop not found for validation' });
        }

        // If boarding stop already reached or passed, disallow booking
        if (currentStopSeq >= boardingStopSeq) {
          return res.status(409).json({
            message: `Cannot book. Bus has already reached or passed your boarding stop (${boardingStopName}).`,
          });
        }

        if (currentStopSeq >= destinationStopSeq) {
          return res.status(409).json({
            message: `Cannot book. Bus has already reached or passed your destination stop (${destinationStopName}).`,
          });
        }
      }
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    if (!bus.assignedRouteId || String(bus.assignedRouteId) !== String(route._id)) {
      return res.status(400).json({ message: 'Selected bus is not assigned to this route' });
    }

    const schedule = extractSchedule(route, scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: 'Schedule not found on this route' });
    }

    if (String(schedule.busId) !== String(bus._id)) {
      return res.status(400).json({ message: 'Schedule does not belong to selected bus' });
    }

    const expectedDay = dayOfWeekFromDate(normalizedServiceDate);
    if (schedule.dayOfWeek !== expectedDay) {
      return res.status(400).json({ message: `Schedule is for ${schedule.dayOfWeek}. Pick a ${schedule.dayOfWeek} service date.` });
    }

    const boardingStop = getStopByName(route, boardingStopName);
    const destinationStop = getStopByName(route, destinationStopName);

    if (!boardingStop || !destinationStop) {
      return res.status(400).json({ message: 'Boarding or destination stop not found on route' });
    }

    if (Number(boardingStop.sequence) >= Number(destinationStop.sequence)) {
      return res.status(400).json({ message: 'Destination stop must be after boarding stop' });
    }

    const seatsCatalog = buildSeatLabelMap(bus.capacity);
    const takenSeats = await getTakenSeats({
      routeId: route._id,
      busId: bus._id,
      scheduleId: schedule._id,
      serviceDate: normalizedServiceDate,
    });

    const preferred = Array.isArray(preferredSeatNumbers)
      ? preferredSeatNumbers.map((seat) => String(seat).trim().toUpperCase()).filter(Boolean)
      : [];

    if (preferred.length > 4) {
      return res.status(400).json({ message: 'preferredSeatNumbers cannot exceed 4 seats' });
    }

    const invalidPreferred = preferred.filter((seat) => !seatsCatalog.includes(seat));
    if (invalidPreferred.length > 0) {
      return res.status(400).json({ message: `Invalid preferred seats: ${invalidPreferred.join(', ')}` });
    }

    const preferredTaken = preferred.filter((seat) => takenSeats.has(seat));
    if (preferredTaken.length > 0) {
      return res.status(409).json({ message: `Preferred seats already booked: ${preferredTaken.join(', ')}` });
    }

    const selectedSeats = [];

    for (const seat of preferred) {
      if (selectedSeats.length < parsedSeatCount) {
        selectedSeats.push(seat);
      }
    }

    for (const seat of seatsCatalog) {
      if (selectedSeats.length >= parsedSeatCount) break;
      if (takenSeats.has(seat)) continue;
      if (selectedSeats.includes(seat)) continue;
      selectedSeats.push(seat);
    }

    if (selectedSeats.length !== parsedSeatCount) {
      return res.status(409).json({ message: 'Not enough seats available for this trip' });
    }

    const farePerSeat = Number(route.fareInfo || 0);
    const totalFare = farePerSeat * parsedSeatCount;
    const bookingId = new mongoose.Types.ObjectId();
    const bookingCode = makeBookingCode();
    const qrToken = makeQrToken();
    const bookingStatus = 'confirmed';
    const qrRawPayload = buildBookingQrRawPayload({
      _id: bookingId,
      bookingCode,
      qrToken,
      routeId: route._id,
      busId: bus._id,
      scheduleId: schedule._id,
      serviceDate: normalizedServiceDate,
      seatNumbers: selectedSeats,
      status: bookingStatus,
    });
    const qrPayload = encodeBookingQrPayload(qrRawPayload);

    const booking = await Booking.create({
      _id: bookingId,
      bookingCode,
      passengerId: toObjectId(passengerId),
      routeId: route._id,
      busId: bus._id,
      scheduleId: schedule._id,
      tripSessionId: tripSessionId, // NEW: Include trip session for mid-trip bookings
      serviceDate: normalizedServiceDate,
      dayOfWeek: schedule.dayOfWeek,
      scheduleStartTime: schedule.startTime,
      scheduleEndTime: schedule.endTime,
      boardingStop: {
        stopName: boardingStop.stopName,
        sequence: boardingStop.sequence,
      },
      destinationStop: {
        stopName: destinationStop.stopName,
        sequence: destinationStop.sequence,
      },
      seatNumbers: selectedSeats,
      seatCount: parsedSeatCount,
      farePerSeat,
      totalFare,
      status: bookingStatus,
      qrToken,
      qrPayload,
      qrGeneratedAt: new Date(),
    });

    const qrCodeDataUrl = await generateQrDataUrlFromPayload(qrPayload);

    // ========== MID-TRIP NOTIFICATIONS ==========
    if (isMidTripBooking && existingTrip) {
      try {
        const io = getIoInstance();
        if (io && existingTrip.driverId) {
          // Get passenger and driver details
          const [passengerDoc, driverDoc, tripDoc, scheduleDoc] = await Promise.all([
            Passenger.findById(passengerId).select('firstName lastName').lean(),
            Driver.findById(existingTrip.driverId).select('firstName lastName').lean(),
            TripSession.findById(existingTrip._id).select('startDelayMinutes startTime endTime').lean(),
            Route.findById(routeId)
              .select('schedules')
              .lean()
              .then((r) => {
                if (!r) return null;
                const sched = r.schedules?.id(scheduleId);
                return sched;
              }),
          ]);

          const passengerName = [passengerDoc?.firstName, passengerDoc?.lastName].filter(Boolean).join(' ').trim() || 'Passenger';
          const driverName = [driverDoc?.firstName, driverDoc?.lastName].filter(Boolean).join(' ').trim() || 'Driver';
          const seatDisplay = selectedSeats.join(', ');
          const startDelayMinutes = tripDoc?.startDelayMinutes || 0;

          // 1. Send notification to DRIVER about new booking
          const driverNotifMessage = `New booking for ${seatDisplay} by ${passengerName} to ${destinationStop.stopName}. Trip: ${schedule.startTime}-${schedule.endTime}.`;
          const driverNotif = await Notification.create({
            notificationId: `notif_${uuidv4()}`,
            title: 'New Booking - Mid-Trip',
            message: driverNotifMessage,
            sentBy: 'system',
            targetAudience: 'specific_user',
            targetUserId: existingTrip.driverId,
            status: 'sent',
            type: 'alert',
            severity: 'medium',
          });

          // Emit to driver socket room
          io.to(`driver:${existingTrip.driverId}`).emit('booking:created', {
            _id: String(driverNotif._id),
            notificationId: driverNotif.notificationId,
            title: driverNotif.title,
            message: driverNotifMessage,
            type: 'alert',
            severity: 'medium',
            sentBy: 'system',
            bookingCode,
            passengerName,
            seatNumbers: selectedSeats,
            destinationStop: destinationStop.stopName,
            tripDate: normalizedServiceDate.toISOString().split('T')[0],
            tripStartTime: schedule.startTime,
            tripEndTime: schedule.endTime,
            createdAt: new Date(),
          });

          console.log(`✅ [BOOKING NOTIF] Driver ${existingTrip.driverId} notified:`, driverNotifMessage);

          // 2. Send trip reminder to PASSENGER about arrival time and delay
          const arrivalTimeObj = scheduleDoc?.stopArrivals?.find((s) =>
            String(s.stopName || '').trim().toLowerCase() === String(destinationStop.stopName || '').trim().toLowerCase()
          );
          const eta = arrivalTimeObj?.arrivalTime || schedule.endTime || 'N/A';
          const delayText = startDelayMinutes > 0 ? ` (${startDelayMinutes} min late)` : '';

          const passengerNotifMessage = `Your trip started${delayText}. Expected arrival at ${destinationStop.stopName} is ${eta}. (Booking ${bookingCode})`;
          const passengerNotif = await Notification.create({
            notificationId: `notif_${uuidv4()}`,
            title: 'Trip Started',
            message: passengerNotifMessage,
            sentBy: 'system',
            targetAudience: 'specific_user',
            targetUserIds: [toObjectId(passengerId)],
            status: 'sent',
            type: 'info',
            severity: 'medium',
          });

          // Emit to passenger socket room
          io.to(`passenger:${passengerId}`).emit('trip:reminder', {
            _id: String(passengerNotif._id),
            notificationId: passengerNotif.notificationId,
            title: 'Trip Started',
            message: passengerNotifMessage,
            type: 'info',
            severity: 'medium',
            sentBy: 'system',
            tripDate: normalizedServiceDate.toISOString().split('T')[0],
            tripStartTime: schedule.startTime,
            actualDelay: startDelayMinutes,
            destinationStop: destinationStop.stopName,
            eta,
            bookingCode,
            createdAt: new Date(),
          });

          console.log(`✅ [TRIP REMINDER] Passenger ${passengerId} notified:`, passengerNotifMessage);

          // 3. Emit seat:booked event to driver's seat modal
          io.to(`bus:${busId}`).emit('seat:booked', {
            busId: String(busId),
            routeId: String(routeId),
            scheduleId: String(scheduleId),
            serviceDate: normalizedServiceDate,
            seatNumbers: selectedSeats,
            bookingCode,
          });

          console.log(`✅ [SEAT UPDATE] Emitted seat:booked for bus ${busId}:`, selectedSeats);
        }
      } catch (notifError) {
        console.error('Error sending mid-trip notifications:', notifError);
        // Don't fail the booking if notifications fail
      }
    }
    // ========== END MID-TRIP NOTIFICATIONS ==========

    return res.status(201).json({
      message: 'Booking created successfully',
      booking: mapBookingResponse(booking),
      qrCodeDataUrl,
      qrPayload,
      qrRawPayload,
    });
  } catch (error) {
    console.error('Create booking error:', error);

    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'Could not reserve seats. Please try again.' });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

const cancelBooking = async (req, res) => {
  const passengerId = req.user.id;
  const { bookingId } = req.params;
  const { reason } = req.body || {};

  try {
    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ message: 'Invalid bookingId' });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      passengerId,
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.status !== BOOKING_CANCELLABLE_STATUS) {
      return res.status(409).json({ message: `Only ${BOOKING_CANCELLABLE_STATUS} bookings can be cancelled` });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = String(reason || '').trim();
    await booking.save();

    return res.status(200).json({
      message: 'Booking cancelled successfully',
      booking: mapBookingResponse(booking),
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getMyBookings = async (req, res) => {
  const passengerId = req.user.id;
  const { status, limit = 30, skip = 0 } = req.query;

  try {
    const query = { passengerId };
    if (status) {
      query.status = status;
    }

    const parsedLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const parsedSkip = Math.max(Number(skip) || 0, 0);

    const [bookingRows, total] = await Promise.all([
      Booking.find(query)
        .populate('routeId', 'routeNumber routeName source destination')
        .populate('busId', 'busNumber capacity')
        .sort({ serviceDate: -1, createdAt: -1 })
        .limit(parsedLimit)
        .skip(parsedSkip),
      Booking.countDocuments(query),
    ]);

    const bookings = bookingRows.map(mapBookingResponse);

    return res.status(200).json({
      bookings,
      total,
      hasMore: parsedSkip + bookings.length < total,
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getSeatAvailability = async (req, res) => {
  const { routeId, busId, scheduleId, serviceDate } = req.query;

  try {
    if (!routeId || !busId || !scheduleId || !serviceDate) {
      return res.status(400).json({ message: 'routeId, busId, scheduleId and serviceDate are required' });
    }

    if (!isValidObjectId(routeId) || !isValidObjectId(busId) || !isValidObjectId(scheduleId)) {
      return res.status(400).json({ message: 'routeId, busId or scheduleId is invalid' });
    }

    const normalizedServiceDate = normalizeDateOnly(serviceDate);
    if (!normalizedServiceDate) {
      return res.status(400).json({ message: 'serviceDate is invalid' });
    }

    const bus = await Bus.findById(busId).select('capacity busNumber');
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const allSeats = buildSeatLabelMap(bus.capacity);
    const takenSeatsSet = await getTakenSeats({
      routeId: toObjectId(routeId),
      busId: toObjectId(busId),
      scheduleId: toObjectId(scheduleId),
      serviceDate: normalizedServiceDate,
    });

    const takenSeats = Array.from(takenSeatsSet).sort();
    const availableSeats = allSeats.filter((seat) => !takenSeatsSet.has(seat));

    return res.status(200).json({
      busId,
      routeId,
      scheduleId,
      serviceDate: normalizedServiceDate,
      totalSeats: allSeats.length,
      availableSeatCount: availableSeats.length,
      takenSeats,
      availableSeats,
    });
  } catch (error) {
    console.error('Seat availability error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getBookingQr = async (req, res) => {
  const passengerId = req.user.id;
  const { bookingId } = req.params;
  try {    
    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ message: 'Invalid bookingId' });
    }
    const booking = await Booking.findOne({
      _id: bookingId,
      passengerId,
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!booking.qrToken) {
      booking.qrToken = makeQrToken();
    }
    if (!booking.qrPayload) {
      const qrRawPayload = buildBookingQrRawPayload(booking);
      booking.qrPayload = encodeBookingQrPayload(qrRawPayload);
      booking.qrGeneratedAt = new Date();
      await booking.save();
    }
    const qrCodeDataUrl = await generateQrDataUrlFromPayload(booking.qrPayload);
    return res.status(200).json({
      bookingId: String(booking._id),
      bookingCode: booking.bookingCode,
      qrToken: booking.qrToken,
      qrPayload: booking.qrPayload,
      qrGeneratedAt: booking.qrGeneratedAt,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error('Get booking QR error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createBooking,
  cancelBooking,
  getMyBookings,
  getSeatAvailability,
  getBookingQr,
};
