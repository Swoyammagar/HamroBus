const mongoose = require('mongoose');
const Route = require('../../models/route.model');
const Bus = require('../../models/bus.model');
const Booking = require('../../models/booking.model');
const SeatLock = require('../../models/seatLock.model');
const TripSession = require('../../models/tripSession.model');
const Driver = require('../../models/driver.model');
const Passenger = require('../../models/passenger.model');
const Notification = require('../../models/notification.model');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { getCurrentStopSequence } = require('../../services/distanceUtils');
const { getIoInstance } = require('../../services/ioManager');
const { deductPoints, checkBanStatus } = require('../../services/rewardService');
const { sendPushToUsers } = require('../../services/pushNotificationService');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BOOKING_ACTIVE_STATUSES = ['confirmed', 'in-progress'];
const BOOKING_CANCELLABLE_STATUS = 'confirmed';
const QR_SCHEMA_VERSION = 1;

const normalizeDateOnly = (value) => {
  const input = value ? new Date(value) : new Date();
  if (Number.isNaN(input.getTime())) {
    return null;
  }
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate())); // time remove only date
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
  const schedule = route.schedules?.id
    ? route.schedules.id(scheduleId)
    : route.schedules?.find((row) => String(row._id) === String(scheduleId));
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
  .padStart(4, '0')}`; //add characters at the beginning of a string until it reaches a certain length.

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

const buildSeatLockKey = ({ routeId, busId, scheduleId, serviceDate, seatNumber }) => {
  const dateKey = normalizeDateOnly(serviceDate).toISOString().slice(0, 10);
  return [routeId, busId, scheduleId, dateKey, String(seatNumber).trim().toUpperCase()].join(':');
};

const releaseSeatLocksForBooking = async (bookingId) => {
  if (!bookingId) return;
  await SeatLock.deleteMany({ bookingId });
};

const acquireSeatLocks = async ({ bookingId, routeId, busId, scheduleId, serviceDate, seatNumbers }) => {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const lockDocs = seatNumbers.map((seatNumber) => ({
    seatKey: buildSeatLockKey({ routeId, busId, scheduleId, serviceDate, seatNumber }),
    bookingId,
    routeId,
    busId,
    scheduleId,
    serviceDate,
    seatNumber,
    expiresAt,
  }));

  try {
    await SeatLock.insertMany(lockDocs, { ordered: true });
  } catch (error) {
    await releaseSeatLocksForBooking(bookingId);
    if (error?.code === 11000 || error?.writeErrors?.some((row) => row?.code === 11000)) {
      return {
        success: false,
        message: 'One or more selected seats were just booked by another passenger. Please choose again.',
      };
    }
    throw error;
  }

  return { success: true };
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
  rewardPointsRedeemed: booking.rewardPointsRedeemed || false,
  discountCode: booking.discountCode || null,
  discountPercentage: booking.discountPercentage || 0,
  discountAmount: booking.discountAmount || 0,
  finalFare: booking.finalFare || booking.totalFare,
  paymentStatus: Boolean(booking.paymentStatus || booking.payment?.status === 'paid'),
  status: booking.status,
  cancelledAt: booking.cancelledAt,
  cancellationReason: booking.cancellationReason,
  noShowAt: booking.noShowAt,
  noShowReason: booking.noShowReason,
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
  let lockedBookingId = null;
  const {
    routeId,
    busId,
    scheduleId,
    serviceDate,
    boardingStopName,
    destinationStopName,
    seatCount,
    preferredSeatNumbers,
    redeemRewardPoints,
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

    // Check if passenger is banned from booking
    const banStatus = await checkBanStatus(passengerId);
    if (banStatus.isBanned) {
      return res.status(403).json({
        message: `You are temporarily banned from booking due to multiple cancellations. Please try again after ${banStatus.minutesRemaining} minute(s).`,
        banUntil: banStatus.banUntil,
        minutesRemaining: banStatus.minutesRemaining,
      });
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
      status: { $in: ['in-progress', 'on-break', 'completed'] },
    }).select('_id status startTime currentStop driverId');

    if (existingTrip && existingTrip.status === 'completed') {
      return res.status(409).json({
        message: `Booking closed. This trip is already completed.`,
      });
    }

    let isMidTripBooking = false;
    let tripSessionId = null;

    if (existingTrip && existingTrip.status === 'in-progress') {
      tripSessionId = existingTrip._id;
      isMidTripBooking = true;

      let route_for_validation = await Route.findById(routeId).select('stops').lean();
      if (route_for_validation) {
        const currentStopSeq = getCurrentStopSequence(existingTrip.currentStop, { stops: route_for_validation.stops });
        const boardingStopSeq = Number(getStopByName({ stops: route_for_validation.stops }, boardingStopName)?.sequence || -1);
        const destinationStopSeq = Number(getStopByName({ stops: route_for_validation.stops }, destinationStopName)?.sequence || -1);

        if (boardingStopSeq <= 0 || destinationStopSeq <= 0) {
          return res.status(400).json({ message: 'Boarding or destination stop not found for validation' });
        }

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

    const lockResult = await acquireSeatLocks({
      bookingId,
      routeId: route._id,
      busId: bus._id,
      scheduleId: schedule._id,
      serviceDate: normalizedServiceDate,
      seatNumbers: selectedSeats,
    });

    if (!lockResult.success) {
      return res.status(409).json({ message: lockResult.message });
    }
    lockedBookingId = bookingId;

    let discountCode = null;
    let discountPercentage = 0;
    let discountAmount = 0;
    let finalFare = totalFare;
    let rewardPointsRedeemed = false;

    if (redeemRewardPoints === true) {
      try {
        const passenger = await Passenger.findById(passengerId).select('rewardPoints totalPointsRedeemed pointsHistory firstName lastName');

        if (passenger && passenger.rewardPoints >= 500) {
          discountPercentage = 10;
          discountAmount = Math.round((totalFare * discountPercentage) / 100 * 100) / 100; // Round to 2 decimals
          finalFare = Math.round((totalFare - discountAmount) * 100) / 100;
          discountCode = `HAMRO-${Date.now()}-${String(passengerId).slice(-6).toUpperCase()}`;
          rewardPointsRedeemed = true;

          passenger.rewardPoints -= 500;
          passenger.totalPointsRedeemed += 500;

          if (!passenger.pointsHistory) {
            passenger.pointsHistory = [];
          }

          passenger.pointsHistory.push({
            action: 'redeemed',
            points: 500,
            description: `Redeemed 10% discount on booking (${discountCode})`,
            bookingId: bookingId,
            timestamp: new Date(),
          });
          await passenger.save();

        }
      } catch (err) {
        console.error('Error processing reward points redemption:', err);
      }
    }
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
      rewardPointsRedeemed,
      discountCode,
      discountPercentage,
      discountAmount,
      finalFare,
      status: bookingStatus,
      qrToken,
      qrPayload,
      qrGeneratedAt: new Date(),
    });
    lockedBookingId = null;

    const qrCodeDataUrl = await generateQrDataUrlFromPayload(qrPayload);

    try {
      const io = getIoInstance();

      let driverIdToNotify = null;
      if (isMidTripBooking && existingTrip) {
        driverIdToNotify = existingTrip.driverId;
      } else {
        driverIdToNotify = (schedule && schedule.driverId) || bus.assignedDriverId || null;
      }

      if (io && driverIdToNotify) {
        const passengerDoc = await Passenger.findById(passengerId).select('firstName lastName').lean();
        const passengerName = [passengerDoc?.firstName, passengerDoc?.lastName].filter(Boolean).join(' ').trim() || 'Passenger';
        const driverNotifMessage = `New booking for ${selectedSeats.join(', ')} by ${passengerName} to ${destinationStop.stopName}. Service: ${schedule.startTime}-${schedule.endTime}.`;

        const driverNotif = await Notification.create({
          notificationId: `notif_${uuidv4()}`,
          title: isMidTripBooking ? 'New Booking - Mid-Trip' : 'New Booking',
          message: driverNotifMessage,
          sentBy: 'system',
          targetAudience: 'specific_user',
          targetUserIds: [toObjectId(driverIdToNotify)],
          status: 'sent',
          type: 'alert',
          severity: 'medium',
        });

        const notificationPayload = {
          _id: String(driverNotif._id),
          id: String(driverNotif._id),
          notificationId: driverNotif.notificationId,
          title: driverNotif.title,
          message: driverNotifMessage,
          type: driverNotif.type,
          severity: driverNotif.severity,
          sentBy: driverNotif.sentBy,
          targetAudience: driverNotif.targetAudience,
          bookingCode,
          passengerName,
          seatNumbers: selectedSeats,
          destinationStop: destinationStop.stopName,
          tripDate: normalizedServiceDate.toISOString().split('T')[0],
          tripStartTime: schedule.startTime,
          tripEndTime: schedule.endTime,
          isMidTripBooking,
          createdAt: driverNotif.createdAt,
        };

        io.to(`driver:${String(driverIdToNotify)}`).emit('notification:new', notificationPayload);
        io.to('admin-room').emit('notification:new', notificationPayload);

        io.to(`driver:${String(driverIdToNotify)}`).emit('booking:created', notificationPayload);

        sendPushToUsers({
          userType: 'driver',
          userIds: [driverIdToNotify],
          title: driverNotif.title,
          body: driverNotifMessage,
          data: {
            notificationId: driverNotif.notificationId,
            bookingId: String(booking._id),
            bookingCode,
            type: 'booking_created',
            url: '/driver/screens/NotificationsScreen',
          },
          priority: 'high',
        }).catch((pushError) => {
          console.error('Driver new booking push failed:', pushError);
        });
      }
    } catch (driverNotifErr) {
      console.error('Error sending driver booking notification:', driverNotifErr);
    }

    if (isMidTripBooking && existingTrip) {
      try {
        const io = getIoInstance();
        if (io) {
          const [tripDoc, scheduleDoc] = await Promise.all([
            TripSession.findById(existingTrip._id).select('startDelayMinutes startTime endTime').lean(),
            Route.findById(routeId)
              .select('schedules')
              .lean()
              .then((r) => {
                if (!r) return null;
                return extractSchedule(r, scheduleId);
              }),
          ]);

          const startDelayMinutes = tripDoc?.startDelayMinutes || 0;

          const arrivalTimeObj = scheduleDoc?.stopArrivals?.find((s) =>
            String(s.stopName || '').trim().toLowerCase() === String(destinationStop.stopName || '').trim().toLowerCase()
          );
          const eta = arrivalTimeObj?.arrivalTime || schedule.endTime || 'N/A';
          const delayText = startDelayMinutes > 0 ? ` ${startDelayMinutes} minutes late` : ' on time';

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

          io.to(`passenger:${String(passengerId)}`).emit('trip:reminder', {
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

          sendPushToUsers({
            userType: 'passenger',
            userIds: [passengerId],
            title: passengerNotif.title,
            body: passengerNotifMessage,
            data: {
              notificationId: passengerNotif.notificationId,
              bookingId: String(booking._id),
              bookingCode,
              type: 'trip_started',
              url: '/passenger/notifications',
            },
            priority: 'high',
          }).catch((pushError) => {
            console.error('Passenger mid-trip started push failed:', pushError);
          });
        }
      } catch (passengerNotifErr) {
        console.error('Error sending passenger trip reminder:', passengerNotifErr);
      }
    }

    try {
      const io = getIoInstance();
      if (io) {
        io.to(`bus:${String(busId)}`).emit('seat:booked', {
          busId: String(busId),
          routeId: String(routeId),
          scheduleId: String(scheduleId),
          serviceDate: normalizedServiceDate,
          seatNumbers: selectedSeats,
          bookingCode,
        });

      }
    } catch (seatUpdateErr) {
      console.error('Error broadcasting seat update:', seatUpdateErr);
    }

    return res.status(201).json({
      message: 'Booking created successfully',
      booking: mapBookingResponse(booking),
      qrCodeDataUrl,
      qrPayload,
      qrRawPayload,
    });
  } catch (error) {
    console.error('Create booking error:', error);

    if (lockedBookingId) {
      await releaseSeatLocksForBooking(lockedBookingId).catch((cleanupError) => {
        console.error('Seat lock cleanup failed after booking error:', cleanupError);
      });
    }

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

    const banStatus = await checkBanStatus(passengerId);
    if (banStatus.isBanned) {
      return res.status(403).json({
        message: `You are temporarily banned from cancelling bookings. Please try again in ${banStatus.minutesRemaining} minutes.`,
        isBanned: true,
        banUntil: banStatus.banUntil,
        minutesRemaining: banStatus.minutesRemaining,
      });
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
    await releaseSeatLocksForBooking(booking._id);

    try {
      const io = getIoInstance();
      const [routeDoc, busDoc] = await Promise.all([
        Route.findById(booking.routeId).select('schedules routeName routeNumber').lean(),
        Bus.findById(booking.busId).select('assignedDriverId busNumber').lean(),
      ]);

      const scheduleDoc = routeDoc?.schedules?.find((schedule) => String(schedule._id) === String(booking.scheduleId));
      const driverIdToNotify = scheduleDoc?.driverId || busDoc?.assignedDriverId || null;

      if (driverIdToNotify) {
        const passengerDoc = await Passenger.findById(passengerId).select('firstName lastName').lean();
        const passengerName = [passengerDoc?.firstName, passengerDoc?.lastName].filter(Boolean).join(' ').trim() || 'Passenger';
        const title = 'Booking Cancelled';
        const message = `${passengerName} cancelled booking ${booking.bookingCode} for bus ${busDoc?.busNumber || ''}.`;

        const driverNotif = await Notification.create({
          notificationId: `notif_${uuidv4()}`,
          title,
          message,
          sentBy: 'system',
          targetAudience: 'specific_user',
          targetUserIds: [toObjectId(driverIdToNotify)],
          status: 'sent',
          type: 'alert',
          severity: 'medium',
        });

        const payload = {
          _id: String(driverNotif._id),
          notificationId: driverNotif.notificationId,
          title,
          message,
          type: driverNotif.type,
          severity: driverNotif.severity,
          sentBy: driverNotif.sentBy,
          bookingId: String(booking._id),
          bookingCode: booking.bookingCode,
          status: booking.status,
          createdAt: driverNotif.createdAt,
        };

        if (io) {
          io.to(`driver:${String(driverIdToNotify)}`).emit('notification:new', payload);
          io.to(`driver:${String(driverIdToNotify)}`).emit('booking:cancelled', payload);
        }

        sendPushToUsers({
          userType: 'driver',
          userIds: [driverIdToNotify],
          title,
          body: message,
          data: {
            notificationId: driverNotif.notificationId,
            bookingId: String(booking._id),
            bookingCode: booking.bookingCode,
            type: 'booking_cancelled',
            url: '/driver/screens/NotificationsScreen',
          },
          priority: 'high',
        }).catch((pushError) => {
          console.error('Driver booking cancellation push failed:', pushError);
        });
      }
    } catch (notificationError) {
      console.error('Error notifying driver about booking cancellation:', notificationError);
    }

    try {
      const deductResult = await deductPoints(passengerId, bookingId);
      if (deductResult.success) {

        if (deductResult.isBanned) {
          return res.status(200).json({
            message: 'Booking cancelled successfully',
            warning: `You have cancelled bookings ${deductResult.cancellationStreak} times consecutively. You are now temporarily banned from cancelling for 30 minutes.`,
            booking: mapBookingResponse(booking),
            rewardPoints: deductResult.rewardPoints,
            isBanned: true,
            banUntil: deductResult.banUntil,
          });
        }

        return res.status(200).json({
          message: 'Booking cancelled successfully',
          booking: mapBookingResponse(booking),
          rewardPoints: deductResult.rewardPoints,
          pointsDeducted: deductResult.message,
          cancellationStreak: deductResult.cancellationStreak,
        });
      }
    } catch (err) {
      console.error('Error deducting reward points:', err);
    }

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
