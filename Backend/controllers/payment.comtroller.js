const Booking = require('../models/booking.model');
const Payment = require('../models/payment.model');
const TripSession = require('../models/tripSession.model');
const {
  getKhaltiSecretKey,
  lookupKhaltiByPidx,
  initiateKhalti,
  isKhaltiFailedStatus,
  resolveKhaltiUrls,
} = require('../services/khalti.service');
const { mirrorBookingPayment } = require('../services/paymentRecord.service');

const NEPAL_TIME_OFFSET_MINUTES = 5 * 60 + 45;
const VALID_PAYMENT_STATUSES = new Set(['pending', 'paid', 'failed']);
const VALID_PAYMENT_TYPE_FILTERS = new Set(['cash', 'online', 'wallet']);

const fullName = (user, fallback = 'N/A') => {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return name || user?.fullname || user?.name || fallback;
};

const parsePositiveInt = (value, fallback, max = 100) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

const parseNepalDateBoundary = (value, boundary) => {
  if (!value || typeof value !== 'string') return null;

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateOnlyMatch) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, yearRaw, monthRaw, dayRaw] = dateOnlyMatch;
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const day = Number(dayRaw);
  const parsedDateOnly = new Date(Date.UTC(year, monthIndex, day));

  if (
    parsedDateOnly.getUTCFullYear() !== year ||
    parsedDateOnly.getUTCMonth() !== monthIndex ||
    parsedDateOnly.getUTCDate() !== day
  ) {
    return null;
  }

  const utcStartMs = Date.UTC(year, monthIndex, day) - (NEPAL_TIME_OFFSET_MINUTES * 60 * 1000);
  const utcMs = boundary === 'end'
    ? utcStartMs + (24 * 60 * 60 * 1000) - 1
    : utcStartMs;

  const date = new Date(utcMs);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getNepalTodayRange = () => {
  const now = new Date();
  const nepalNowMs = now.getTime() + (NEPAL_TIME_OFFSET_MINUTES * 60 * 1000);
  const nepalNow = new Date(nepalNowMs);
  const y = nepalNow.getUTCFullYear();
  const m = String(nepalNow.getUTCMonth() + 1).padStart(2, '0');
  const d = String(nepalNow.getUTCDate()).padStart(2, '0');
  const iso = `${y}-${m}-${d}`;

  return {
    start: parseNepalDateBoundary(iso, 'start'),
    end: parseNepalDateBoundary(iso, 'end'),
  };
};

const getPaymentTypeLabel = (payment) => {
  const method = String(payment?.paymentMethod || '').toLowerCase();
  if (method === 'cash') return 'Cash';
  if (method === 'wallet') return 'Wallet';
  return 'Online';
};

const buildPaymentTypeQuery = (paymentType) => {
  const normalized = String(paymentType || '').trim().toLowerCase();
  if (!VALID_PAYMENT_TYPE_FILTERS.has(normalized)) return null;
  if (normalized === 'online') return { paymentMethod: { $in: ['khalti', 'online'] } };
  return { paymentMethod: normalized };
};

const mapPassengerPayment = (payment) => ({
  paymentId: String(payment._id),
  bookingId: payment.bookingId?._id ? String(payment.bookingId._id) : payment.bookingId ? String(payment.bookingId) : null,
  bookingCode: payment.bookingId?.bookingCode || null,
  tripId: payment.tripSessionId?._id ? String(payment.tripSessionId._id) : payment.tripSessionId ? String(payment.tripSessionId) : null,
  totalFare: Number(payment.fare || 0),
  paymentType: getPaymentTypeLabel(payment),
  paymentStatus: payment.paymentStatus,
  paymentDate: payment.paidAt || payment.createdAt,
  pickupLocation: payment.boardingStop?.stopName || payment.bookingId?.boardingStop?.stopName || 'N/A',
  dropoffLocation: payment.destinationStop?.stopName || payment.bookingId?.destinationStop?.stopName || 'N/A',
  driverName: fullName(payment.driverId, null),
});

const mapAdminPayment = (payment) => ({
  paymentId: String(payment._id),
  passenger: {
    id: payment.passengerId?._id ? String(payment.passengerId._id) : null,
    name: fullName(payment.passengerId),
  },
  driver: payment.driverId
    ? {
        id: payment.driverId?._id ? String(payment.driverId._id) : null,
        name: fullName(payment.driverId),
      }
    : null,
  booking: payment.bookingId
    ? {
        id: payment.bookingId?._id ? String(payment.bookingId._id) : String(payment.bookingId),
        code: payment.bookingId?.bookingCode || null,
      }
    : null,
  totalFare: Number(payment.fare || 0),
  paymentType: getPaymentTypeLabel(payment),
  paymentStatus: payment.paymentStatus,
  paymentDate: payment.paidAt || payment.createdAt,
});

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

const initiateKhaltiPayment = async (req, res) => {
  const { bookingId, returnUrl, websiteUrl } = req.body || {};
  const passengerId = req.user.id;

  try {
    if (!getKhaltiSecretKey()) {
      return res.status(500).json({ message: 'Khalti is not configured on server' });
    }

    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    const booking = await Booking.findOne({ _id: bookingId, passengerId });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found or unauthorized' });
    }

    if (booking.payment?.status === 'paid' || booking.paymentStatus === true) {
      return res.status(400).json({ message: 'Booking already paid' });
    }

    if (booking.payment?.status === 'pending' && booking.payment?.khaltiIdx) {
      const { response: lookupResponse, data: lookupData } = await lookupKhaltiByPidx(
        booking.payment.khaltiIdx
      );

      const khaltiStatus = String(lookupData?.status || '').toLowerCase();

      if (lookupResponse.ok && khaltiStatus === 'completed') {
        booking.payment = {
          ...(booking.payment || {}),
          status: 'paid',
          method: 'khalti',
          khaltiIdx: String(
            lookupData?.transaction_id || lookupData?.idx || booking.payment.khaltiIdx || ''
          ),
          amount: Number(lookupData?.total_amount || booking.payment?.amount || 0),
          paidAt: booking.payment?.paidAt || new Date(),
        };
        booking.paymentStatus = true;
        await booking.save();
        await mirrorBookingPayment({ booking, khaltiData: lookupData }).catch((error) => {
          console.error('Failed to mirror booking payment:', error);
        });

        return res.status(200).json({
          success: true,
          message: 'Booking already paid',
          bookingId: booking._id,
          paymentStatus: true,
          payment: booking.payment,
        });
      }

      if (lookupResponse.ok && isKhaltiFailedStatus(khaltiStatus)) {
        booking.payment = {
          ...(booking.payment || {}),
          status: 'failed',
          khaltiIdx: String(booking.payment?.khaltiIdx || ''),
          paidAt: booking.payment?.paidAt,
        };
        booking.paymentStatus = false;
        await booking.save();
      } else {
        return res.status(200).json({
          success: true,
          message: 'Existing Khalti payment is still processing. Please continue with the same payment session.',
          bookingId: booking._id,
          paymentStatus: false,
          pidx: booking.payment.khaltiIdx,
          paymentUrl: booking.payment?.paymentUrl,
        });
      }
    }

    const chargeAmount = Number(booking.finalFare || booking.totalFare || 0);
    const amount = Math.round(chargeAmount * 100);
    if (amount <= 0) {
      return res.status(400).json({ message: 'Invalid booking amount for payment' });
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

    const purchaseOrderId = `${String(booking._id)}-${Date.now()}`;
    const payload = {
      return_url: khaltiUrls.resolvedReturnUrl,
      website_url: khaltiUrls.resolvedWebsiteUrl,
      amount,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: `Bus booking ${booking.bookingCode}`,
    };

    const { response, data } = await initiateKhalti(payload);

    if (!response.ok) {
      return res.status(response.status).json({
        message: data?.detail || data?.message || 'Failed to initiate Khalti payment',
      });
    }

    booking.payment = {
      ...(booking.payment || {}),
      status: 'pending',
      method: 'khalti',
      amount,
      khaltiIdx: String(data?.pidx || ''),
      paymentUrl: String(data?.payment_url || ''),
      returnUrl: String(payload.return_url || ''),
    };
    booking.paymentStatus = false;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Khalti payment initiated',
      bookingId: booking._id,
      amount,
      pidx: data?.pidx,
      paymentUrl: data?.payment_url,
      expiresAt: data?.expires_at,
      expiresIn: data?.expires_in,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate Khalti payment',
    });
  }
};

const verifyKhaltiPayment = async (req, res) => {
  const { bookingId, pidx } = req.body || {};
  const passengerId = req.user.id;

  try {
    if (!getKhaltiSecretKey()) {
      return res.status(500).json({ message: 'Khalti is not configured on server' });
    }

    if (!bookingId || !pidx) {
      return res.status(400).json({
        message: 'bookingId and pidx are required',
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      passengerId,
    });

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found or unauthorized',
      });
    }

    if (booking.payment?.status === 'paid' || booking.paymentStatus === true) {
      await mirrorBookingPayment({ booking }).catch((error) => {
        console.error('Failed to mirror booking payment:', error);
      });
      return res.status(200).json({
        success: true,
        message: 'Booking already paid',
        paymentStatus: true,
        payment: booking.payment,
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
    const isFailed = ['expired', 'refunded', 'canceled', 'cancelled', 'failed'].includes(khaltiStatus);

    booking.payment = {
      ...(booking.payment || {}),
      status: isPaid ? 'paid' : isFailed ? 'failed' : 'pending',
      method: 'khalti',
      khaltiIdx: String(data?.transaction_id || data?.idx || pidx || ''),
      amount: Number(data?.total_amount || booking.payment?.amount || 0),
      paidAt: isPaid ? booking.payment?.paidAt || new Date() : booking.payment?.paidAt,
    };
    booking.paymentStatus = isPaid;

    await booking.save();
    if (isPaid) {
      await mirrorBookingPayment({ booking, khaltiData: data }).catch((error) => {
        console.error('Failed to mirror booking payment:', error);
      });
    }

    return res.status(200).json({
      success: isPaid,
      message: isPaid ? 'Payment successful' : isFailed ? 'Payment failed' : 'Payment is still processing',
      paymentStatus: isPaid,
      payment: booking.payment,
      khaltiStatus,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
};

const getPassengerPaymentHistory = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query?.page, 1);
    const limit = parsePositiveInt(req.query?.limit, 10, 50);
    const skip = (page - 1) * limit;

    const query = { passengerId: req.user.id };
    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('bookingId', 'bookingCode boardingStop destinationStop')
        .populate('tripSessionId', '_id')
        .populate('driverId', 'firstName lastName')
        .sort({ paidAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: payments.map(mapPassengerPayment),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching passenger payment history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  }
};

const getAdminPaymentRecords = async (req, res) => {
  try {
    const {
      page: pageRaw,
      limit: limitRaw,
      status,
      paymentStatus,
      paymentType,
      startDate,
      endDate,
      search,
    } = req.query || {};

    const page = parsePositiveInt(pageRaw, 1);
    const limit = parsePositiveInt(limitRaw, 10, 100);
    const skip = (page - 1) * limit;
    const query = {};

    const requestedStatus = String(paymentStatus || status || '').trim().toLowerCase();
    if (requestedStatus) {
      if (!VALID_PAYMENT_STATUSES.has(requestedStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid payment status filter' });
      }
      query.paymentStatus = requestedStatus;
    }

    const paymentTypeQuery = buildPaymentTypeQuery(paymentType);
    if (paymentType && !paymentTypeQuery) {
      return res.status(400).json({ success: false, message: 'Invalid payment type filter' });
    }
    if (paymentTypeQuery) Object.assign(query, paymentTypeQuery);

    if (startDate || endDate) {
      const dateRange = {};
      const startBoundary = parseNepalDateBoundary(startDate, 'start');
      const endBoundary = parseNepalDateBoundary(endDate, 'end');
      if (startBoundary) dateRange.$gte = startBoundary;
      if (endBoundary) dateRange.$lte = endBoundary;
      if (Object.keys(dateRange).length > 0) {
        query.$or = [
          { paidAt: dateRange },
          { paidAt: { $exists: false }, createdAt: dateRange },
          { paidAt: null, createdAt: dateRange },
        ];
      }
    }

    const searchValue = String(search || '').trim();
    if (searchValue) {
      const regex = new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const [passengers, drivers] = await Promise.all([
        require('../models/passenger.model')
          .find({ $or: [{ firstName: regex }, { lastName: regex }] })
          .select('_id')
          .lean(),
        require('../models/driver.model')
          .find({ $or: [{ firstName: regex }, { lastName: regex }] })
          .select('_id')
          .lean(),
      ]);

      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { passengerId: { $in: passengers.map((p) => p._id) } },
            { driverId: { $in: drivers.map((d) => d._id) } },
          ],
        },
      ];
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('passengerId', 'firstName lastName')
        .populate('driverId', 'firstName lastName')
        .populate('bookingId', 'bookingCode')
        .sort({ paidAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: payments.map(mapAdminPayment),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching admin payment records:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment records' });
  }
};

const getDriverTodayIncome = async (req, res) => {
  try {
    const { start, end } = getNepalTodayRange();
    const completedTrips = await TripSession.find({
      driverId: req.user.id,
      status: 'completed',
      endTime: { $gte: start, $lte: end },
    })
      .select('_id')
      .lean();

    const tripIds = completedTrips.map((trip) => trip._id);
    const paymentTotals = tripIds.length
      ? await Payment.aggregate([
          {
            $match: {
              tripSessionId: { $in: tripIds },
              paymentStatus: 'paid',
            },
          },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: '$fare' },
              bookingIds: { $addToSet: '$bookingId' },
            },
          },
        ])
      : [];
    const mirroredBookingIds = (paymentTotals[0]?.bookingIds || []).filter(Boolean);
    const bookingTotals = tripIds.length
      ? await Booking.aggregate([
          {
            $match: {
              _id: { $nin: mirroredBookingIds },
              $and: [
                {
                  $or: [
                    { tripSessionId: { $in: tripIds } },
                    { boardedTripSessionId: { $in: tripIds } },
                  ],
                },
                {
                  $or: [
                    { paymentStatus: true },
                    { 'payment.status': 'paid' },
                  ],
                },
              ],
            },
          },
          {
            $group: {
              _id: null,
              totalIncome: {
                $sum: {
                  $cond: [
                    { $gt: ['$finalFare', 0] },
                    '$finalFare',
                    '$totalFare',
                  ],
                },
              },
            },
          },
        ])
      : [];

    return res.status(200).json({
      success: true,
      totalIncome: Number(paymentTotals[0]?.totalIncome || 0) + Number(bookingTotals[0]?.totalIncome || 0),
      completedTrips: completedTrips.length,
      dateRange: { start, end },
    });
  } catch (error) {
    console.error("Error fetching driver's today's income:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch today's income" });
  }
};

module.exports = {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  khaltiReturnBridge,
  getPassengerPaymentHistory,
  getAdminPaymentRecords,
  getDriverTodayIncome,
};
