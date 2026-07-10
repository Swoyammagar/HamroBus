const Booking = require('../models/booking.model');
const {
  getKhaltiSecretKey,
  lookupKhaltiByPidx,
  initiateKhalti,
  isKhaltiFailedStatus,
  resolveKhaltiUrls,
} = require('../services/khalti.service');
const { mirrorBookingPayment } = require('../services/paymentRecord.service');

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

module.exports = {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  khaltiReturnBridge,
};
