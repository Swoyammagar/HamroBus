const mongoose = require('mongoose');
const Booking = require('../models/booking.model');
const Payment = require('../models/payment.model');
const Passenger = require('../models/passenger.model');
const Driver = require('../models/driver.model');
const Bus = require('../models/bus.model');
const Route = require('../models/route.model');
const TripSession = require('../models/tripSession.model');

const getKhaltiSecretKey = () => String(process.env.KHALTI_SECRET_KEY || '').trim();

const getKhaltiBaseUrl = () =>
  String(process.env.KHALTI_API_BASE_URL || 'https://dev.khalti.com').replace(/\/$/, '');

const buildHeaders = () => ({
  Authorization: `Key ${getKhaltiSecretKey()}`,
  'Content-Type': 'application/json',
});

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const isKhaltiSelfUrl = (value) => /(^|\/\/)(www\.)?khalti\.com/i.test(String(value || ''));

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

const lookupKhaltiByPidx = async (pidx) => {
  const response = await fetch(`${getKhaltiBaseUrl()}/api/v2/epayment/lookup/`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ pidx }),
  });

  const data = await safeJson(response);
  return { response, data };
};

const isKhaltiFailedStatus = (status) =>
  ['expired', 'refunded', 'canceled', 'cancelled', 'failed'].includes(
    String(status || '').toLowerCase()
  );

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || '').trim());

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const normalizeDateOnly = (value) => {
  const input = value ? new Date(value) : new Date();
  if (Number.isNaN(input.getTime())) {
    return null;
  }
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
};

const parseBusIdentifier = (reqBody) => {
  const directBusId = String(reqBody?.busId || '').trim();
  if (directBusId) {
    return directBusId;
  }

  const rawQrData = reqBody?.qrData;
  if (!rawQrData) {
    return '';
  }

  if (typeof rawQrData === 'object') {
    return String(rawQrData.busId || rawQrData.id || rawQrData.bus || '').trim();
  }

  if (typeof rawQrData !== 'string') {
    return '';
  }

  try {
    const parsed = JSON.parse(rawQrData);
    return String(parsed?.busId || parsed?.id || parsed?.bus || '').trim();
  } catch (error) {
    return rawQrData.trim();
  }
};

const mapBookingStop = (stop) =>
  stop
    ? {
        stopName: stop.stopName,
        sequence: Number(stop.sequence || 0),
      }
    : null;

const mapPaymentResponse = (payment) => {
  if (!payment) return null;

  const khalti = payment.khalti || {};
  return {
    id: String(payment._id),
    bookingId: String(payment.bookingId || ''),
    bookingCode: payment.bookingCode,
    passengerId: payment.passengerId,
    driverId: payment.driverId || null,
    busId: payment.busId,
    routeId: payment.routeId,
    scheduleId: payment.scheduleId,
    tripSessionId: payment.tripSessionId || null,
    serviceDate: payment.serviceDate,
    boardingStop: payment.boardingStop || null,
    destinationStop: payment.destinationStop || null,
    seatNumbers: payment.seatNumbers || [],
    seatCount: payment.seatCount || 0,
    farePerSeat: payment.farePerSeat || 0,
    totalFare: payment.totalFare || 0,
    discountAmount: payment.discountAmount || 0,
    finalFare: payment.finalFare || 0,
    currency: payment.currency || 'NPR',
    amount: payment.amount || 0,
    providerAmount: payment.providerAmount || 0,
    provider: payment.provider || 'khalti',
    status: payment.status || 'pending',
    attemptNumber: payment.attemptNumber || 1,
    initiatedAt: payment.initiatedAt || payment.createdAt || null,
    completedAt: payment.completedAt || null,
    failedAt: payment.failedAt || null,
    cancelledAt: payment.cancelledAt || null,
    paidAt: payment.paidAt || null,
    expiresAt: payment.expiresAt || null,
    failureReason: payment.failureReason || null,
    khalti: {
      pidx: khalti.pidx || null,
      transactionId: khalti.transactionId || null,
      purchaseOrderId: khalti.purchaseOrderId || null,
      purchaseOrderName: khalti.purchaseOrderName || null,
      paymentUrl: khalti.paymentUrl || null,
      returnUrl: khalti.returnUrl || null,
      lookupStatus: khalti.lookupStatus || null,
    },
    booking: payment.booking || null,
    passenger: payment.passengerId?.firstName ? payment.passengerId : null,
    driver: payment.driverId?.firstName ? payment.driverId : null,
    bus: payment.busId?.busNumber ? payment.busId : null,
    route: payment.routeId?.routeName ? payment.routeId : null,
    tripSession: payment.tripSessionId?._id ? payment.tripSessionId : null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
};

const getScheduleFromRoute = (routeDoc, scheduleId) => {
  if (!routeDoc || !Array.isArray(routeDoc.schedules)) {
    return null;
  }

  return (
    routeDoc.schedules.find((schedule) => String(schedule._id) === String(scheduleId)) || null
  );
};

const getCurrentTripForBus = async ({ busId, routeId = null, scheduleId = null } = {}) => {
  const query = {
    busId: toObjectId(busId),
    status: { $in: ['in-progress', 'on-break'] },
  };

  if (routeId && isValidObjectId(routeId)) {
    query.routeId = toObjectId(routeId);
  }

  if (scheduleId && isValidObjectId(scheduleId)) {
    query.scheduleId = toObjectId(scheduleId);
  }

  return TripSession.findOne(query)
    .sort({ startTime: -1, createdAt: -1 })
    .select('driverId routeId busId scheduleId status startTime endTime startDelayMinutes passengerCount currentStop previousStop notes')
    .lean();
};

const resolveBookingTripContext = async (booking) => {
  const [routeDoc, busDoc, tripDoc] = await Promise.all([
    Route.findById(booking.routeId).select('routeNumber routeName source destination fareInfo stops schedules operatingDays').lean(),
    Bus.findById(booking.busId).select('busNumber capacity status assignedDriverId assignedRouteId').lean(),
    booking.tripSessionId
      ? TripSession.findById(booking.tripSessionId)
          .select('driverId routeId busId scheduleId status startTime endTime startDelayMinutes passengerCount currentStop previousStop')
          .lean()
      : getCurrentTripForBus({ busId: booking.busId, routeId: booking.routeId, scheduleId: booking.scheduleId }),
  ]);

  const scheduleDoc = getScheduleFromRoute(routeDoc, booking.scheduleId);
  const driverId = tripDoc?.driverId || scheduleDoc?.driverId || busDoc?.assignedDriverId || null;

  return {
    routeDoc,
    busDoc,
    scheduleDoc,
    tripDoc,
    driverId,
  };
};

const buildTripStops = (routeDoc, currentStopName) => {
  const stops = Array.isArray(routeDoc?.stops) ? routeDoc.stops : [];
  if (!currentStopName) {
    return stops.map((stop) => ({
      stopName: stop.stopName,
      sequence: Number(stop.sequence || 0),
    }));
  }

  const currentIndex = stops.findIndex(
    (stop) => String(stop.stopName || '').trim().toLowerCase() === String(currentStopName || '').trim().toLowerCase()
  );

  if (currentIndex < 0) {
    return stops.map((stop) => ({
      stopName: stop.stopName,
      sequence: Number(stop.sequence || 0),
    }));
  }

  return stops.slice(currentIndex + 1).map((stop) => ({
    stopName: stop.stopName,
    sequence: Number(stop.sequence || 0),
  }));
};

const resolveRequesterRole = async (req) => {
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
    return 'admin';
  }

  if (req.user?.id && await Passenger.exists({ _id: req.user.id })) {
    return 'passenger';
  }

  if (req.user?.id && await Driver.exists({ _id: req.user.id })) {
    return 'driver';
  }

  return null;
};

const getLatestPaymentForBooking = async (bookingId) =>
  Payment.findOne({ bookingId }).sort({ attemptNumber: -1, createdAt: -1 }).populate([
    { path: 'passengerId', select: 'firstName lastName email phoneNumber profileImgUrl' },
    { path: 'driverId', select: 'firstName lastName email phoneNumber profileImgUrl' },
    { path: 'busId', select: 'busNumber capacity status' },
    { path: 'routeId', select: 'routeNumber routeName source destination fareInfo' },
    { path: 'tripSessionId', select: 'status startTime endTime startDelayMinutes passengerCount currentStop previousStop' },
  ]);

const createPaymentDocument = async ({ booking, tripDoc, driverId, paymentAmount, providerAmount, returnUrl, purchaseOrderId, purchaseOrderName, attemptNumber }) => {
  const payment = await Payment.create({
    bookingId: booking._id,
    bookingCode: booking.bookingCode,
    passengerId: booking.passengerId,
    driverId: driverId || undefined,
    busId: booking.busId,
    routeId: booking.routeId,
    scheduleId: booking.scheduleId,
    tripSessionId: tripDoc?._id || booking.tripSessionId || undefined,
    serviceDate: booking.serviceDate,
    boardingStop: mapBookingStop(booking.boardingStop),
    destinationStop: mapBookingStop(booking.destinationStop),
    seatNumbers: booking.seatNumbers || [],
    seatCount: booking.seatCount || 1,
    farePerSeat: booking.farePerSeat || 0,
    totalFare: booking.totalFare || 0,
    discountAmount: booking.discountAmount || 0,
    finalFare: booking.finalFare || booking.totalFare || 0,
    amount: paymentAmount,
    providerAmount,
    currency: 'NPR',
    provider: 'khalti',
    status: 'pending',
    attemptNumber,
    initiatedAt: new Date(),
    khalti: {
      purchaseOrderId,
      purchaseOrderName,
      returnUrl,
    },
    metadata: {
      bookingStatus: booking.status,
    },
  });

  booking.paymentId = payment._id;
  await booking.save();

  return payment;
};

const khaltiReturnBridge = async (req, res) => {
  try {
    const deepLinkBase = String(process.env.MOBILE_APP_DEEP_LINK || 'mobile://khalti-return').trim();
    const query = new URLSearchParams();

    Object.entries(req.query || {}).forEach(([key, value]) => {
      if (value == null) return;
      query.set(key, String(value));
    });

    const queryString = query.toString();
    const deepLinkUrl = queryString
      ? `${deepLinkBase}${deepLinkBase.includes('?') ? '&' : '?'}${queryString}`
      : deepLinkBase;

    const escapedDeepLink = deepLinkUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

    return res.status(200).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Returning to app...</title>
  </head>
  <body style="font-family: Arial, sans-serif; padding: 24px;">
    <h3>Returning to app...</h3>
    <p>If you are not redirected automatically, tap below:</p>
    <p><a href="${escapedDeepLink}">Back to app</a></p>
    <script>
      window.location.replace(${JSON.stringify(deepLinkUrl)});
    </script>
  </body>
</html>`);
  } catch (error) {
    return res.status(500).send('Unable to redirect back to app.');
  }
};

const scanBusQrAndGetActiveTrip = async (req, res) => {
  try {
    const busId = parseBusIdentifier(req.body || {});

    if (!busId) {
      return res.status(400).json({
        success: false,
        message: 'busId is required',
      });
    }

    if (!isValidObjectId(busId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid busId',
      });
    }

    const bus = await Bus.findById(busId)
      .select('busNumber model capacity status assignedDriverId assignedRouteId lastKnownLocation')
      .lean();

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found',
      });
    }

    const activeTrip = await TripSession.findOne({
      busId: toObjectId(busId),
      status: { $in: ['in-progress', 'on-break'] },
    })
      .sort({ startTime: -1, createdAt: -1 })
      .select('driverId routeId busId scheduleId status startTime endTime startDelayMinutes passengerCount currentStop previousStop notes')
      .lean();

    if (!activeTrip) {
      return res.status(409).json({
        success: false,
        message: 'Bus is not currently operating',
        code: 'BUS_NOT_ACTIVE',
      });
    }

    const route = await Route.findById(activeTrip.routeId)
      .select('routeNumber routeName source destination distance estimatedDuration stops operatingDays schedules fareInfo')
      .lean();

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found for active trip',
      });
    }

    const schedule = getScheduleFromRoute(route, activeTrip.scheduleId);
    const currentStop = buildTripStops(route, activeTrip.currentStop).length > 0 && activeTrip.currentStop
      ? route.stops.find((stop) => String(stop.stopName || '').trim().toLowerCase() === String(activeTrip.currentStop || '').trim().toLowerCase())
      : null;

    const currentStopName = currentStop?.stopName || activeTrip.currentStop || null;
    const availableStops = buildTripStops(route, currentStopName);
    const driver = activeTrip.driverId
      ? await Driver.findById(activeTrip.driverId).select('firstName lastName phoneNumber profileImgUrl licenseNo').lean()
      : null;

    return res.status(200).json({
      success: true,
      message: 'Active trip found',
      bus: {
        id: String(bus._id),
        busNumber: bus.busNumber,
        model: bus.model,
        capacity: bus.capacity,
        status: bus.status,
        assignedDriverId: bus.assignedDriverId || null,
        assignedRouteId: bus.assignedRouteId || null,
      },
      trip: {
        id: String(activeTrip._id),
        status: activeTrip.status,
        startTime: activeTrip.startTime,
        endTime: activeTrip.endTime || null,
        startDelayMinutes: activeTrip.startDelayMinutes || 0,
        passengerCount: activeTrip.passengerCount || 0,
        currentStop: currentStopName,
        previousStop: activeTrip.previousStop || null,
        routeId: String(activeTrip.routeId),
        scheduleId: String(activeTrip.scheduleId),
        driverId: activeTrip.driverId || null,
      },
      route: {
        id: String(route._id),
        routeNumber: route.routeNumber,
        routeName: route.routeName,
        source: route.source,
        destination: route.destination,
        distance: route.distance,
        estimatedDuration: route.estimatedDuration || null,
        fareInfo: route.fareInfo || 0,
        operatingDays: route.operatingDays || [],
      },
      schedule: schedule
        ? {
            id: String(schedule._id),
            dayOfWeek: schedule.dayOfWeek,
            driverId: schedule.driverId || null,
            busId: schedule.busId || null,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            stopArrivals: schedule.stopArrivals || [],
          }
        : null,
      driver: driver
        ? {
            id: String(driver._id),
            firstName: driver.firstName,
            lastName: driver.lastName,
            phoneNumber: driver.phoneNumber,
            profileImgUrl: driver.profileImgUrl || null,
            licenseNo: driver.licenseNo,
          }
        : null,
      currentStop: currentStopName,
      availableStops,
      bookingDefaults: {
        routeId: String(route._id),
        busId: String(bus._id),
        scheduleId: String(activeTrip.scheduleId),
        tripSessionId: String(activeTrip._id),
        serviceDate: normalizeDateOnly(activeTrip.startTime || new Date()) || new Date(),
      },
      fare: {
        farePerSeat: Number(route.fareInfo || 0),
        currency: 'NPR',
      },
    });
  } catch (error) {
    console.error('Error scanning bus QR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve active trip from bus QR',
    });
  }
};

const initiateKhaltiPayment = async (req, res) => {
  const passengerId = req.user.id;
  const { bookingId, returnUrl, websiteUrl } = req.body || {};

  try {
    if (!getKhaltiSecretKey()) {
      return res.status(500).json({ message: 'Khalti is not configured on server' });
    }

    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ message: 'Invalid bookingId' });
    }

    const booking = await Booking.findOne({ _id: bookingId, passengerId }).populate('paymentId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or unauthorized' });
    }

    if (booking.status === 'cancelled' || booking.status === 'no-show') {
      return res.status(409).json({ message: 'Booking is not eligible for payment' });
    }

    const activeTrip = await resolveBookingTripContext(booking);

    if (activeTrip.tripDoc && ['completed', 'cancelled', 'missed'].includes(String(activeTrip.tripDoc.status))) {
      return res.status(409).json({ message: 'The trip has already ended' });
    }

    let currentPayment = booking.paymentId || await getLatestPaymentForBooking(booking._id);
    const nextAttemptNumber = Number(currentPayment?.attemptNumber || 0) + 1;

    if (currentPayment?.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'Booking already paid',
        paymentId: String(currentPayment._id),
        bookingId: String(booking._id),
        paymentStatus: 'completed',
        payment: mapPaymentResponse(currentPayment),
      });
    }

    if (currentPayment?.status === 'pending' && currentPayment?.khalti?.pidx) {
      const { response: lookupResponse, data: lookupData } = await lookupKhaltiByPidx(
        currentPayment.khalti.pidx
      );

      const khaltiStatus = String(lookupData?.status || '').toLowerCase();

      if (lookupResponse.ok && khaltiStatus === 'completed') {
        currentPayment.status = 'completed';
        currentPayment.completedAt = currentPayment.completedAt || new Date();
        currentPayment.paidAt = currentPayment.paidAt || currentPayment.completedAt;
        currentPayment.providerAmount = Number(lookupData?.total_amount || currentPayment.providerAmount || 0);
        currentPayment.amount = Number((currentPayment.providerAmount || 0) / 100) || currentPayment.amount || 0;
        currentPayment.khalti = {
          ...(currentPayment.khalti || {}),
          transactionId: String(
            lookupData?.transaction_id || lookupData?.idx || currentPayment.khalti?.transactionId || ''
          ),
          lookupStatus: khaltiStatus,
          rawVerifyResponse: lookupData,
        };
        await currentPayment.save();

        return res.status(200).json({
          success: true,
          message: 'Booking already paid',
          paymentId: String(currentPayment._id),
          bookingId: String(booking._id),
          paymentStatus: 'completed',
          payment: mapPaymentResponse(currentPayment),
        });
      }

      if (lookupResponse.ok && isKhaltiFailedStatus(khaltiStatus)) {
        currentPayment.status = 'failed';
        currentPayment.failedAt = new Date();
        currentPayment.failureReason = `Khalti payment ${khaltiStatus}`;
        currentPayment.khalti = {
          ...(currentPayment.khalti || {}),
          lookupStatus: khaltiStatus,
          transactionId: String(
            lookupData?.transaction_id || lookupData?.idx || currentPayment.khalti?.transactionId || ''
          ),
          rawVerifyResponse: lookupData,
        };
        await currentPayment.save();

        currentPayment = null;
      } else {
        currentPayment.khalti = {
          ...(currentPayment.khalti || {}),
          lookupStatus: khaltiStatus || 'pending',
        };
        await currentPayment.save();

        return res.status(200).json({
          success: true,
          message: 'Existing Khalti payment is still processing. Please continue with the same payment session.',
          bookingId: String(booking._id),
          paymentId: String(currentPayment._id),
          paymentStatus: 'pending',
          pidx: currentPayment.khalti.pidx,
          paymentUrl: currentPayment.khalti.paymentUrl,
          payment: mapPaymentResponse(currentPayment),
        });
      }
    }

    const chargeAmount = Number(booking.finalFare || booking.totalFare || 0);
    const providerAmount = Math.round(chargeAmount * 100);

    if (providerAmount <= 0) {
      return res.status(400).json({ message: 'Invalid booking amount for payment' });
    }

    const fallbackReturnUrl = String(process.env.KHALTI_RETURN_URL || 'https://example.com/khalti-return').trim();
    const fallbackWebsiteUrl = String(process.env.KHALTI_WEBSITE_URL || 'https://example.com').trim();
    const requestedReturnUrl = String(returnUrl || '').trim();
    const requestedWebsiteUrl = String(websiteUrl || '').trim();

    const resolvedReturnUrl = isHttpUrl(requestedReturnUrl) ? requestedReturnUrl : fallbackReturnUrl;
    const resolvedWebsiteUrl = isHttpUrl(requestedWebsiteUrl) ? requestedWebsiteUrl : fallbackWebsiteUrl;

    if (!isHttpUrl(resolvedReturnUrl) || !isHttpUrl(resolvedWebsiteUrl)) {
      return res.status(400).json({
        message: 'Khalti URL configuration error. return_url and website_url must be valid http/https URLs.',
      });
    }

    if (isKhaltiSelfUrl(resolvedReturnUrl) || isKhaltiSelfUrl(resolvedWebsiteUrl)) {
      return res.status(400).json({
        message: 'Invalid Khalti URL configuration. return_url and website_url must be your app URLs, not khalti.com',
      });
    }

    const paymentDoc =
      currentPayment && currentPayment.status === 'pending'
        ? currentPayment
        : await createPaymentDocument({
            booking,
            tripDoc: activeTrip.tripDoc,
            driverId: activeTrip.driverId,
            paymentAmount: chargeAmount,
            providerAmount,
            returnUrl: resolvedReturnUrl,
            purchaseOrderId: `${String(booking._id)}-${Date.now()}`,
            purchaseOrderName: `Bus booking ${booking.bookingCode}`,
            attemptNumber: nextAttemptNumber,
          });

    const purchaseOrderId = paymentDoc.khalti?.purchaseOrderId || `${String(booking._id)}-${Date.now()}`;
    const purchaseOrderName = paymentDoc.khalti?.purchaseOrderName || `Bus booking ${booking.bookingCode}`;

    const payload = {
      return_url: resolvedReturnUrl,
      website_url: resolvedWebsiteUrl,
      amount: providerAmount,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
    };

    const response = await fetch(`${getKhaltiBaseUrl()}/api/v2/epayment/initiate/`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await safeJson(response);

    if (!response.ok) {
      paymentDoc.status = 'failed';
      paymentDoc.failedAt = new Date();
      paymentDoc.failureReason = data?.detail || data?.message || 'Failed to initiate Khalti payment';
      paymentDoc.khalti = {
        ...(paymentDoc.khalti || {}),
        rawInitiateResponse: data,
      };
      await paymentDoc.save();

      return res.status(response.status).json({
        message: paymentDoc.failureReason,
        paymentId: String(paymentDoc._id),
      });
    }

    paymentDoc.status = 'pending';
    paymentDoc.amount = chargeAmount;
    paymentDoc.providerAmount = providerAmount;
    paymentDoc.initiatedAt = paymentDoc.initiatedAt || new Date();
    paymentDoc.expiresAt = data?.expires_at ? new Date(data.expires_at) : paymentDoc.expiresAt;
    paymentDoc.khalti = {
      ...(paymentDoc.khalti || {}),
      pidx: String(data?.pidx || paymentDoc.khalti?.pidx || ''),
      paymentUrl: String(data?.payment_url || paymentDoc.khalti?.paymentUrl || ''),
      returnUrl: resolvedReturnUrl,
      purchaseOrderId,
      purchaseOrderName,
      lookupStatus: 'pending',
      rawInitiateResponse: data,
    };
    await paymentDoc.save();

    return res.status(200).json({
      success: true,
      message: 'Khalti payment initiated',
      bookingId: String(booking._id),
      paymentId: String(paymentDoc._id),
      amount: chargeAmount,
      providerAmount,
      pidx: paymentDoc.khalti.pidx,
      paymentUrl: paymentDoc.khalti.paymentUrl,
      expiresAt: paymentDoc.expiresAt || data?.expires_at || null,
      expiresIn: data?.expires_in,
    });
  } catch (error) {
    console.error('Error initiating Khalti payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate Khalti payment',
    });
  }
};

const verifyKhaltiPayment = async (req, res) => {
  const passengerId = req.user.id;
  const { bookingId, paymentId, pidx } = req.body || {};

  try {
    if (!getKhaltiSecretKey()) {
      return res.status(500).json({ message: 'Khalti is not configured on server' });
    }

    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ message: 'Invalid bookingId' });
    }

    const booking = await Booking.findOne({ _id: bookingId, passengerId }).populate('paymentId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or unauthorized' });
    }

    if (booking.status === 'cancelled' || booking.status === 'no-show') {
      return res.status(409).json({ message: 'Booking is not eligible for payment verification' });
    }

    const activeTrip = await resolveBookingTripContext(booking);

    if (activeTrip.tripDoc && ['completed', 'cancelled', 'missed'].includes(String(activeTrip.tripDoc.status))) {
      const latestPayment = booking.paymentId || await getLatestPaymentForBooking(booking._id);
      if (latestPayment && latestPayment.status === 'pending') {
        latestPayment.status = 'failed';
        latestPayment.failedAt = new Date();
        latestPayment.failureReason = 'Trip ended before payment verification';
        latestPayment.khalti = {
          ...(latestPayment.khalti || {}),
          lookupStatus: 'trip-ended',
        };
        await latestPayment.save();
      }
      return res.status(409).json({ message: 'The trip has already ended' });
    }

    const latestPayment =
      (paymentId && isValidObjectId(paymentId) ? await Payment.findById(paymentId) : null) ||
      booking.paymentId ||
      (pidx
        ? await Payment.findOne({ bookingId: booking._id, 'khalti.pidx': String(pidx).trim() })
        : await getLatestPaymentForBooking(booking._id));

    if (!latestPayment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    if (latestPayment.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'Payment already completed',
        paymentId: String(latestPayment._id),
        bookingId: String(booking._id),
        paymentStatus: 'completed',
        payment: mapPaymentResponse(latestPayment),
      });
    }

    const lookupPidx = String(pidx || latestPayment.khalti?.pidx || '').trim();
    if (!lookupPidx) {
      return res.status(400).json({ message: 'pidx is required' });
    }

    const { response, data } = await lookupKhaltiByPidx(lookupPidx);

    if (!response.ok) {
      latestPayment.status = 'failed';
      latestPayment.failedAt = new Date();
      latestPayment.failureReason = data?.detail || data?.message || 'Payment verification failed';
      latestPayment.khalti = {
        ...(latestPayment.khalti || {}),
        pidx: lookupPidx,
        lookupStatus: data?.status || 'failed',
        transactionId: String(data?.transaction_id || latestPayment.khalti?.transactionId || ''),
        rawVerifyResponse: data,
      };
      await latestPayment.save();

      return res.status(response.status).json({
        success: false,
        message: latestPayment.failureReason,
        paymentId: String(latestPayment._id),
        paymentStatus: 'failed',
      });
    }

    const khaltiStatus = String(data?.status || '').toLowerCase();
    const isPaid = khaltiStatus === 'completed';
    const isFailed = isKhaltiFailedStatus(khaltiStatus);

    latestPayment.khalti = {
      ...(latestPayment.khalti || {}),
      pidx: lookupPidx,
      transactionId: String(data?.transaction_id || data?.idx || latestPayment.khalti?.transactionId || ''),
      lookupStatus: khaltiStatus || 'pending',
      rawVerifyResponse: data,
    };
    latestPayment.providerAmount = Number(data?.total_amount || latestPayment.providerAmount || 0);
    latestPayment.amount = Number((latestPayment.providerAmount || 0) / 100) || latestPayment.amount || 0;

    if (isPaid) {
      latestPayment.status = 'completed';
      latestPayment.completedAt = latestPayment.completedAt || new Date();
      latestPayment.paidAt = latestPayment.paidAt || latestPayment.completedAt || new Date();
      latestPayment.failureReason = null;
    } else if (isFailed) {
      latestPayment.status = 'failed';
      latestPayment.failedAt = new Date();
      latestPayment.failureReason = `Khalti payment ${khaltiStatus}`;
    } else {
      latestPayment.status = 'pending';
    }

    await latestPayment.save();
    if (!booking.paymentId || String(booking.paymentId._id || booking.paymentId) !== String(latestPayment._id)) {
      booking.paymentId = latestPayment._id;
      await booking.save();
    }

    return res.status(200).json({
      success: isPaid,
      message: isPaid
        ? 'Payment successful'
        : isFailed
          ? 'Payment failed'
          : 'Payment is still processing',
      paymentId: String(latestPayment._id),
      paymentStatus: latestPayment.status,
      payment: mapPaymentResponse(latestPayment),
      khaltiStatus,
    });
  } catch (error) {
    console.error('Error verifying Khalti payment:', error);
    return res.status(400).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({ message: 'Invalid paymentId' });
    }

    const payment = await Payment.findById(paymentId).populate([
      { path: 'bookingId', select: 'bookingCode passengerId routeId busId scheduleId tripSessionId serviceDate status finalFare totalFare boardingStop destinationStop seatNumbers seatCount paymentId' },
      { path: 'passengerId', select: 'firstName lastName email phoneNumber profileImgUrl' },
      { path: 'driverId', select: 'firstName lastName email phoneNumber profileImgUrl' },
      { path: 'busId', select: 'busNumber capacity status' },
      { path: 'routeId', select: 'routeNumber routeName source destination fareInfo' },
      { path: 'tripSessionId', select: 'status startTime endTime startDelayMinutes passengerCount currentStop previousStop' },
    ]);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const role = await resolveRequesterRole(req);
    if (role === 'passenger' && String(payment.passengerId?._id || payment.passengerId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view this payment' });
    }

    if (role === 'driver' && String(payment.driverId?._id || payment.driverId || '') !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to view this payment' });
    }

    if (!role) {
      return res.status(403).json({ message: 'Not authorized to view this payment' });
    }

    return res.status(200).json({
      success: true,
      payment: mapPaymentResponse(payment),
    });
  } catch (error) {
    console.error('Error fetching payment by id:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const buildPaymentQuery = (req, { ownerField = null, ownerId = null } = {}) => {
  const {
    status,
    provider,
    routeId,
    busId,
    driverId,
    tripSessionId,
    passengerId,
    startDate,
    endDate,
    search,
  } = req.query || {};

  const query = {};

  if (ownerField && ownerId) {
    query[ownerField] = ownerId;
  }

  if (status) query.status = String(status).trim();
  if (provider) query.provider = String(provider).trim();
  if (routeId && isValidObjectId(routeId)) query.routeId = toObjectId(routeId);
  if (busId && isValidObjectId(busId)) query.busId = toObjectId(busId);
  if (driverId && isValidObjectId(driverId)) query.driverId = toObjectId(driverId);
  if (tripSessionId && isValidObjectId(tripSessionId)) query.tripSessionId = toObjectId(tripSessionId);
  if (passengerId && isValidObjectId(passengerId)) query.passengerId = toObjectId(passengerId);

  const dateFilter = {};
  const startBoundary = normalizeDateOnly(startDate);
  const endBoundary = normalizeDateOnly(endDate);
  if (startBoundary) dateFilter.$gte = startBoundary;
  if (endBoundary) {
    const end = new Date(endBoundary);
    end.setUTCDate(end.getUTCDate() + 1);
    dateFilter.$lt = end;
  }
  if (Object.keys(dateFilter).length > 0) {
    query.initiatedAt = dateFilter;
  }

  if (search) {
    const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { bookingCode: new RegExp(escaped, 'i') },
      { 'khalti.pidx': new RegExp(escaped, 'i') },
      { 'khalti.transactionId': new RegExp(escaped, 'i') },
    ];
  }

  return query;
};

const buildPaymentListQuery = (req, ownerField = null, ownerId = null) => buildPaymentQuery(req, { ownerField, ownerId });

const populatePaymentRefs = [
  { path: 'passengerId', select: 'firstName lastName email phoneNumber profileImgUrl' },
  { path: 'driverId', select: 'firstName lastName email phoneNumber profileImgUrl' },
  { path: 'busId', select: 'busNumber capacity status' },
  { path: 'routeId', select: 'routeNumber routeName source destination fareInfo' },
  { path: 'tripSessionId', select: 'status startTime endTime startDelayMinutes passengerCount currentStop previousStop' },
  { path: 'bookingId', select: 'bookingCode passengerId routeId busId scheduleId tripSessionId serviceDate status finalFare totalFare boardingStop destinationStop seatNumbers seatCount paymentId' },
];

const getPassengerPaymentHistory = async (req, res) => {
  try {
    const passengerId = req.user.id;
    const { limit = 30, skip = 0 } = req.query || {};
    const parsedLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const parsedSkip = Math.max(Number(skip) || 0, 0);
    const query = buildPaymentListQuery(req, 'passengerId', passengerId);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate(populatePaymentRefs)
        .sort({ initiatedAt: -1, createdAt: -1 })
        .limit(parsedLimit)
        .skip(parsedSkip)
        .lean(),
      Payment.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      payments: payments.map(mapPaymentResponse),
      total,
      hasMore: parsedSkip + payments.length < total,
    });
  } catch (error) {
    console.error('Error fetching passenger payment history:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getDriverPaymentHistory = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { limit = 30, skip = 0 } = req.query || {};
    const parsedLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    const parsedSkip = Math.max(Number(skip) || 0, 0);
    const query = buildPaymentListQuery(req, 'driverId', driverId);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate(populatePaymentRefs)
        .sort({ initiatedAt: -1, createdAt: -1 })
        .limit(parsedLimit)
        .skip(parsedSkip)
        .lean(),
      Payment.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      payments: payments.map(mapPaymentResponse),
      total,
      hasMore: parsedSkip + payments.length < total,
    });
  } catch (error) {
    console.error('Error fetching driver payment history:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAdminPaymentListing = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query || {};
    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const parsedSkip = Math.max(Number(skip) || 0, 0);
    const query = buildPaymentListQuery(req);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate(populatePaymentRefs)
        .sort({ initiatedAt: -1, createdAt: -1 })
        .limit(parsedLimit)
        .skip(parsedSkip)
        .lean(),
      Payment.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      payments: payments.map(mapPaymentResponse),
      total,
      hasMore: parsedSkip + payments.length < total,
    });
  } catch (error) {
    console.error('Error fetching admin payment listing:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const aggregateSum = async (match) => {
  const rows = await Payment.aggregate([
    { $match: match },
    { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
  ]);

  return rows[0] || { count: 0, total: 0 };
};

const aggregateSeriesByField = async (match, fieldName) =>
  Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: `$${fieldName}`,
        revenue: { $sum: '$amount' },
        paymentCount: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1, paymentCount: -1 } },
  ]);

const aggregateRevenueByDay = async (match) =>
  Payment.aggregate([
    { $match: { ...match, status: 'completed', completedAt: { $ne: null } } },
    {
      $group: {
        _id: {
          $dateToString: {
            date: '$completedAt',
            format: '%Y-%m-%d',
            timezone: process.env.APP_TIMEZONE || 'Asia/Kathmandu',
          },
        },
        revenue: { $sum: '$amount' },
        paymentCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

const getAdminPaymentStatistics = async (req, res) => {
  try {
    const query = buildPaymentListQuery(req);
    const completedQuery = { ...query, status: 'completed' };

    const [summary, revenueByDate, revenueByDriver, revenueByBus, revenueByRoute, revenueByTripSession, statusBreakdown] =
      await Promise.all([
        aggregateSum(query),
        aggregateRevenueByDay(query),
        aggregateSeriesByField(completedQuery, 'driverId'),
        aggregateSeriesByField(completedQuery, 'busId'),
        aggregateSeriesByField(completedQuery, 'routeId'),
        aggregateSeriesByField(completedQuery, 'tripSessionId'),
        Payment.aggregate([
          { $match: query },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              total: { $sum: '$amount' },
            },
          },
          { $sort: { count: -1 } },
        ]),
      ]);

    const completedPayments = statusBreakdown.find((row) => row._id === 'completed') || { count: 0, total: 0 };
    const pendingPayments = statusBreakdown.find((row) => row._id === 'pending') || { count: 0, total: 0 };
    const failedPayments = statusBreakdown.find((row) => row._id === 'failed') || { count: 0, total: 0 };
    const cancelledPayments = statusBreakdown.find((row) => row._id === 'cancelled') || { count: 0, total: 0 };

    const khaltiStats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$khalti.lookupStatus',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        totalPayments: summary.count,
        totalRevenue: completedPayments.total || 0,
        completedPayments: completedPayments.count || 0,
        pendingPayments: pendingPayments.count || 0,
        failedPayments: failedPayments.count || 0,
        cancelledPayments: cancelledPayments.count || 0,
      },
      revenueByDate,
      revenueByDriver,
      revenueByBus,
      revenueByRoute,
      revenueByTripSession,
      khaltiStats,
      statusBreakdown,
    });
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  khaltiReturnBridge,
  scanBusQrAndGetActiveTrip,
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  getPaymentById,
  getPassengerPaymentHistory,
  getDriverPaymentHistory,
  getAdminPaymentListing,
  getAdminPaymentStatistics,
};
