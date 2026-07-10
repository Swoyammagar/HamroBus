const Payment = require('../models/payment.model');

const toPaymentStop = (stop) => {
  if (!stop?.stopName || !stop?.sequence) return undefined;
  return {
    stopName: String(stop.stopName),
    sequence: Number(stop.sequence),
  };
};

const mirrorBookingPayment = async ({ booking, khaltiData } = {}) => {
  if (!booking || !(booking.paymentStatus || booking.payment?.status === 'paid')) {
    return null;
  }

  const khaltiPidx = String(booking.payment?.khaltiIdx || khaltiData?.pidx || '').trim();
  const transactionId = String(
    khaltiData?.transaction_id || khaltiData?.idx || booking.payment?.khaltiIdx || ''
  ).trim();

  return Payment.findOneAndUpdate(
    {
      bookingId: booking._id,
      paymentType: 'booking',
    },
    {
      $set: {
        paymentType: 'booking',
        bookingId: booking._id,
        passengerId: booking.passengerId,
        driverId: booking.boardedByDriverId || null,
        busId: booking.busId,
        tripSessionId: booking.tripSessionId || booking.boardedTripSessionId || null,
        routeId: booking.routeId,
        boardingStop: toPaymentStop(booking.boardingStop),
        destinationStop: toPaymentStop(booking.destinationStop),
        fare: Number(booking.finalFare || booking.totalFare || booking.payment?.amount || 0),
        paymentMethod: booking.payment?.method || 'khalti',
        paymentStatus: 'paid',
        khaltiPidx,
        khaltiTransactionId: transactionId,
        paidAt: booking.payment?.paidAt || new Date(),
        metadata: {
          source: 'booking-khalti-mirror',
          bookingCode: booking.bookingCode,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const createQrPaymentRecord = async ({
  passengerId,
  trip,
  route,
  bus,
  boardingStop,
  destinationStop,
  fare,
  khaltiPidx,
  khaltiData,
  purchaseOrderId,
}) => {
  return Payment.findOneAndUpdate(
    {
      khaltiPidx: String(khaltiPidx || '').trim(),
      paymentType: 'qr',
    },
    {
      $set: {
        paymentType: 'qr',
        bookingId: null,
        passengerId,
        driverId: trip.driverId || null,
        busId: bus._id,
        tripSessionId: trip._id,
        routeId: route._id,
        boardingStop: toPaymentStop(boardingStop),
        destinationStop: toPaymentStop(destinationStop),
        fare: Number(fare || 0),
        paymentMethod: 'khalti',
        paymentStatus: 'paid',
        khaltiPidx: String(khaltiPidx || '').trim(),
        khaltiTransactionId: String(khaltiData?.transaction_id || khaltiData?.idx || '').trim(),
        purchaseOrderId,
        paidAt: new Date(),
        metadata: {
          source: 'bus-qr-payment',
          khaltiStatus: khaltiData?.status,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = {
  mirrorBookingPayment,
  createQrPaymentRecord,
};
