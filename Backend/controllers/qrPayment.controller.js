const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Bus = require('../models/bus.model');
const Driver = require('../models/driver.model');
const Route = require('../models/route.model');
const TripSession = require('../models/tripSession.model');
const { calculateRouteFare, getStopByName } = require('../services/fare.service');
const {
  getKhaltiSecretKey,
  initiateKhalti,
  lookupKhaltiByPidx,
  isKhaltiFailedStatus,
  resolveKhaltiUrls,
} = require('../services/khalti.service');
const { createQrPaymentRecord } = require('../services/paymentRecord.service');

const QR_SCHEMA_VERSION = 1;
const QR_TYPE = 'bus-payment';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || '').trim());

const buildBusQrPayload = (bus) =>
  JSON.stringify({
    v: QR_SCHEMA_VERSION,
    type: QR_TYPE,
    busId: String(bus._id),
  });

const parseQrPayload = (qrData) => {
  try {
    const parsed = JSON.parse(String(qrData || ''));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    return null;
  }
};

const generateQrDataUrl = (payload) =>
  QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360,
  });

const getDriverAssignedBus = async (driverId) => {
  const driver = await Driver.findById(driverId).select('assignedBus assignedRoute').lean();
  if (!driver) return null;

  if (driver.assignedBus) {
    return Bus.findById(driver.assignedBus)
      .select('busNumber model capacity assignedDriverId assignedRouteId status')
      .lean();
  }

  return Bus.findOne({ assignedDriverId: driverId })
    .select('busNumber model capacity assignedDriverId assignedRouteId status')
    .lean();
};

const findActiveTripByBus = (busId) =>
  TripSession.findOne({
    busId,
    status: { $in: ['in-progress', 'on-break'] },
  })
    .sort({ updatedAt: -1 })
    .populate('routeId', 'routeNumber routeName source destination stops fareInfo schedules')
    .populate('busId', 'busNumber model capacity status')
    .populate('driverId', 'firstName lastName')
    .lean();

const resolveBoardingStop = (trip, route) => {
  const currentStop = getStopByName(route, trip.currentStop);
  if (currentStop) return currentStop;

  const completedSequences = (trip.completedStops || [])
    .map((stop) => Number(getStopByName(route, stop?.stopId)?.sequence || 0))
    .filter((sequence) => sequence > 0);
  const lastCompleted = completedSequences.length ? Math.max(...completedSequences) : 0;

  return (route.stops || [])
    .filter((stop) => Number(stop.sequence || 0) > lastCompleted)
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))[0] || route.stops?.[0] || null;
};

const mapTripResponse = ({ trip, route, bus, boardingStop }) => {
  const boardingSequence = Number(boardingStop?.sequence || 0);
  const destinations = (route.stops || [])
    .filter((stop) => Number(stop.sequence || 0) > boardingSequence)
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))
    .map((stop) => ({
      stopName: stop.stopName,
      sequence: stop.sequence,
      latitude: stop.latitude,
      longitude: stop.longitude,
    }));

  const schedule = trip.scheduleId
    ? (route.schedules || []).find((item) => String(item._id) === String(trip.scheduleId))
    : null;

  return {
    tripSessionId: String(trip._id),
    status: trip.status,
    startedAt: trip.startTime,
    currentStop: trip.currentStop || null,
    previousStop: trip.previousStop || null,
    passengerCount: trip.passengerCount || 0,
    bus: {
      _id: String(bus._id),
      busNumber: bus.busNumber,
      model: bus.model,
      capacity: bus.capacity,
    },
    driver: trip.driverId
      ? {
          _id: String(trip.driverId._id || trip.driverId),
          name: [trip.driverId.firstName, trip.driverId.lastName].filter(Boolean).join(' '),
        }
      : null,
    route: {
      _id: String(route._id),
      routeNumber: route.routeNumber,
      routeName: route.routeName,
      source: route.source,
      destination: route.destination,
      fareInfo: route.fareInfo,
      stops: (route.stops || []).map((stop) => ({
        stopName: stop.stopName,
        sequence: stop.sequence,
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
    },
    schedule: schedule
      ? {
          _id: String(schedule._id),
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          stopArrivals: schedule.stopArrivals || [],
        }
      : null,
    boardingStop: boardingStop
      ? {
          stopName: boardingStop.stopName,
          sequence: boardingStop.sequence,
        }
      : null,
    destinations,
  };
};

const getDriverBusQr = async (req, res) => {
  try {
    const bus = await getDriverAssignedBus(req.user.id);
    if (!bus) {
      return res.status(404).json({ message: 'No assigned bus found for this driver' });
    }

    const qrPayload = buildBusQrPayload(bus);
    const qrCodeDataUrl = await generateQrDataUrl(qrPayload);

    return res.status(200).json({
      bus: {
        _id: String(bus._id),
        busNumber: bus.busNumber,
        model: bus.model,
        capacity: bus.capacity,
      },
      qrPayload,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error('Get driver bus QR error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const resolveTripFromQr = async (req, res) => {
  try {
    const { qrData } = req.body || {};
    const payload = parseQrPayload(qrData);

    if (!payload || payload.type !== QR_TYPE || !isValidObjectId(payload.busId)) {
      return res.status(400).json({ message: 'Invalid bus QR code' });
    }

    const bus = await Bus.findById(payload.busId).select('busNumber model capacity status').lean();
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    const trip = await findActiveTripByBus(bus._id);
    if (!trip) {
      return res.status(409).json({ message: 'No active TripSession found for this bus' });
    }

    const route = trip.routeId;
    if (!route) {
      return res.status(404).json({ message: 'Active trip route not found' });
    }

    const boardingStop = resolveBoardingStop(trip, route);
    if (!boardingStop) {
      return res.status(409).json({ message: 'No valid boarding stop found for this trip' });
    }

    return res.status(200).json(mapTripResponse({ trip, route, bus, boardingStop }));
  } catch (error) {
    console.error('Resolve bus QR trip error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const calculateQrFare = async (req, res) => {
  try {
    const { tripSessionId, boardingStopName, destinationStopName } = req.body || {};

    if (!isValidObjectId(tripSessionId) || !destinationStopName) {
      return res.status(400).json({ message: 'tripSessionId and destinationStopName are required' });
    }

    const trip = await TripSession.findById(tripSessionId).lean();
    if (!trip || !['in-progress', 'on-break'].includes(String(trip.status))) {
      return res.status(409).json({ message: 'TripSession is not active' });
    }

    const route = await Route.findById(trip.routeId).select('stops fareInfo').lean();
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    const boardingStop = getStopByName(route, boardingStopName) || resolveBoardingStop(trip, route);
    const destinationStop = getStopByName(route, destinationStopName);

    if (!boardingStop || !destinationStop) {
      return res.status(400).json({ message: 'Boarding or destination stop not found' });
    }

    if (Number(destinationStop.sequence) <= Number(boardingStop.sequence)) {
      return res.status(400).json({ message: 'Destination stop must be after boarding stop' });
    }

    return res.status(200).json({
      fare: calculateRouteFare({ route, boardingStop, destinationStop }),
      boardingStop: {
        stopName: boardingStop.stopName,
        sequence: boardingStop.sequence,
      },
      destinationStop: {
        stopName: destinationStop.stopName,
        sequence: destinationStop.sequence,
      },
    });
  } catch (error) {
    console.error('Calculate QR fare error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const initiateQrPayment = async (req, res) => {
  try {
    const { tripSessionId, boardingStopName, destinationStopName, returnUrl, websiteUrl } = req.body || {};
    const passengerId = req.user.id;

    if (!getKhaltiSecretKey()) {
      return res.status(500).json({ message: 'Khalti is not configured on server' });
    }

    if (!isValidObjectId(tripSessionId) || !destinationStopName) {
      return res.status(400).json({ message: 'tripSessionId and destinationStopName are required' });
    }

    const trip = await TripSession.findById(tripSessionId).lean();
    if (!trip || !['in-progress', 'on-break'].includes(String(trip.status))) {
      return res.status(409).json({ message: 'TripSession is not active' });
    }

    const [route, bus] = await Promise.all([
      Route.findById(trip.routeId).select('routeName routeNumber stops fareInfo').lean(),
      Bus.findById(trip.busId).select('busNumber model capacity').lean(),
    ]);

    if (!route || !bus) {
      return res.status(404).json({ message: 'Trip route or bus not found' });
    }

    const boardingStop = getStopByName(route, boardingStopName) || resolveBoardingStop(trip, route);
    const destinationStop = getStopByName(route, destinationStopName);

    if (!boardingStop || !destinationStop) {
      return res.status(400).json({ message: 'Boarding or destination stop not found' });
    }

    if (Number(destinationStop.sequence) <= Number(boardingStop.sequence)) {
      return res.status(400).json({ message: 'Destination stop must be after boarding stop' });
    }

    const fare = calculateRouteFare({ route, boardingStop, destinationStop });
    const amount = Math.round(fare * 100);
    if (amount <= 0) {
      return res.status(400).json({ message: 'Invalid fare for payment' });
    }

    const khaltiUrls = resolveKhaltiUrls({ returnUrl, websiteUrl });
    if (!khaltiUrls.valid) {
      return res.status(400).json({
        message: 'Khalti URL configuration error. return_url and website_url must be valid http/https URLs.',
      });
    }

    if (khaltiUrls.usesKhaltiSelfUrl) {
      return res.status(400).json({
        message: 'Invalid Khalti URL configuration. return_url and website_url must be your app URLs, not khalti.com',
      });
    }

    const purchaseOrderId = `QR-${String(trip._id)}-${Date.now()}`;
    const payload = {
      return_url: khaltiUrls.resolvedReturnUrl,
      website_url: khaltiUrls.resolvedWebsiteUrl,
      amount,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: `Bus QR payment ${bus.busNumber}`,
    };

    const { response, data } = await initiateKhalti(payload);
    if (!response.ok) {
      return res.status(response.status).json({
        message: data?.detail || data?.message || 'Failed to initiate Khalti payment',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'QR Khalti payment initiated',
      tripSessionId: String(trip._id),
      amount,
      fare,
      pidx: data?.pidx,
      paymentUrl: data?.payment_url,
      expiresAt: data?.expires_at,
      expiresIn: data?.expires_in,
      purchaseOrderId,
      boardingStop: {
        stopName: boardingStop.stopName,
        sequence: boardingStop.sequence,
      },
      destinationStop: {
        stopName: destinationStop.stopName,
        sequence: destinationStop.sequence,
      },
    });
  } catch (error) {
    console.error('Initiate QR payment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate QR payment' });
  }
};

const verifyQrPayment = async (req, res) => {
  try {
    const { tripSessionId, pidx, boardingStopName, destinationStopName, purchaseOrderId } = req.body || {};
    const passengerId = req.user.id;

    if (!getKhaltiSecretKey()) {
      return res.status(500).json({ message: 'Khalti is not configured on server' });
    }

    if (!isValidObjectId(tripSessionId) || !pidx || !destinationStopName) {
      return res.status(400).json({
        message: 'tripSessionId, pidx and destinationStopName are required',
      });
    }

    const { response, data } = await lookupKhaltiByPidx(pidx);
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: data?.detail || data?.message || 'Payment verification failed',
      });
    }

    const khaltiStatus = String(data?.status || '').toLowerCase();
    const isPaid = khaltiStatus === 'completed';
    const isFailed = isKhaltiFailedStatus(khaltiStatus);

    if (!isPaid) {
      return res.status(200).json({
        success: false,
        message: isFailed ? 'Payment failed' : 'Payment is still processing',
        paymentStatus: false,
        khaltiStatus,
      });
    }

    const trip = await TripSession.findById(tripSessionId).lean();
    if (!trip || !['in-progress', 'on-break'].includes(String(trip.status))) {
      return res.status(409).json({ message: 'TripSession is not active' });
    }

    const [route, bus] = await Promise.all([
      Route.findById(trip.routeId).select('routeName routeNumber stops fareInfo').lean(),
      Bus.findById(trip.busId).select('busNumber model capacity').lean(),
    ]);

    if (!route || !bus) {
      return res.status(404).json({ message: 'Trip route or bus not found' });
    }

    const boardingStop = getStopByName(route, boardingStopName) || resolveBoardingStop(trip, route);
    const destinationStop = getStopByName(route, destinationStopName);

    if (!boardingStop || !destinationStop) {
      return res.status(400).json({ message: 'Boarding or destination stop not found' });
    }

    if (Number(destinationStop.sequence) <= Number(boardingStop.sequence)) {
      return res.status(400).json({ message: 'Destination stop must be after boarding stop' });
    }

    const fare = calculateRouteFare({ route, boardingStop, destinationStop });
    const payment = await createQrPaymentRecord({
      passengerId,
      trip,
      route,
      bus,
      boardingStop,
      destinationStop,
      fare,
      khaltiPidx: pidx,
      khaltiData: data,
      purchaseOrderId,
    });

    return res.status(200).json({
      success: true,
      message: 'Payment successful',
      paymentStatus: true,
      khaltiStatus,
      paymentId: String(payment._id),
      payment: {
        paymentType: payment.paymentType,
        fare: payment.fare,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        paidAt: payment.paidAt,
      },
    });
  } catch (error) {
    console.error('Verify QR payment error:', error);
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
};

module.exports = {
  getDriverBusQr,
  resolveTripFromQr,
  calculateQrFare,
  initiateQrPayment,
  verifyQrPayment,
};
