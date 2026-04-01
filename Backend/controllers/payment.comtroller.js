const Booking = require('../models/booking.model');

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

      if (lookupResponse.ok && String(lookupData?.status || '').toLowerCase() === 'completed') {
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

        return res.status(200).json({
          success: true,
          message: 'Booking already paid',
          bookingId: booking._id,
          paymentStatus: true,
          payment: booking.payment,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Existing Khalti payment is still processing. Please continue with the same payment session.',
        bookingId: booking._id,
        paymentStatus: false,
        pidx: booking.payment.khaltiIdx,
        paymentUrl: booking.payment?.paymentUrl,
      });
    }

    const amount = Math.round(Number(booking.totalFare || 0) * 100);
    if (amount <= 0) {
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

    const payload = {
      return_url: resolvedReturnUrl,
      website_url: resolvedWebsiteUrl,
      amount,
      purchase_order_id: String(booking._id),
      purchase_order_name: `Bus booking ${booking.bookingCode}`,
    };

    const response = await fetch(`${getKhaltiBaseUrl()}/api/v2/epayment/initiate/`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await safeJson(response);
    console.log('Khalti initiate response:', { status: response.status, data });

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
    console.log('Khalti initiate error:', error.message);
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

    return res.status(200).json({
      success: isPaid,
      message: isPaid ? 'Payment successful' : isFailed ? 'Payment failed' : 'Payment is still processing',
      paymentStatus: isPaid,
      payment: booking.payment,
      khaltiStatus,
    });
  } catch (error) {
    console.log('Khalti verify error:', error.message);

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