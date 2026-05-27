const mongoose = require('mongoose');
const Booking = require('../../models/booking.model');
const Review = require('../../models/review.model');
const TripSession = require('../../models/tripSession.model');
const Driver = require('../../models/driver.model');
const { canReviewBooking, REVIEWABLE_BOOKING_STATUS } = require('../../utils/bookingStatus');

const REVIEW_WINDOW_HOURS = 72;

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id || '').trim());

const recalcDriverRating = async (driverId) => {
  const rows = await Review.aggregate([
    { $match: { driverId: new mongoose.Types.ObjectId(String(driverId)) } },
    {
      $group: {
        _id: '$driverId',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = rows[0]?.avgRating || 0;
  const count = rows[0]?.count || 0;

  await Driver.findByIdAndUpdate(driverId, {
    $set: {
      ratingAverage: Number(avg.toFixed(2)),
      ratingCount: count,
    },
  });

  return { ratingAverage: Number(avg.toFixed(2)), ratingCount: count };
};

const createBookingReview = async (req, res) => {
  const passengerId = req.user.id;
  const { bookingId } = req.params;
  const { rating, comment } = req.body || {};

  try {
    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ message: 'Invalid bookingId' });
    }

    const parsedRating = Number(rating);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'rating must be an integer between 1 and 5' });
    }

    const cleanComment = String(comment || '').trim();
    if (cleanComment.length > 500) {
      return res.status(400).json({ message: 'comment must be <= 500 characters' });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      passengerId,
    }).select('_id status completedAt tripSessionId updatedAt isBoarded');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (!canReviewBooking(booking)) {
      return res.status(409).json({ message: 'Review allowed only for completed boarded bookings' });
    }

    const completedAnchor = booking.completedAt || booking.updatedAt;
    const cutoff = new Date(completedAnchor);
    cutoff.setHours(cutoff.getHours() + REVIEW_WINDOW_HOURS);
    if (new Date() > cutoff) {
      return res.status(410).json({ message: 'Review window has expired' });
    }

    const existing = await Review.findOne({ bookingId: booking._id }).select('_id');
    if (existing) {
      return res.status(409).json({ message: 'Review already submitted for this booking' });
    }

    if (!booking.tripSessionId) {
      return res.status(409).json({ message: 'Cannot resolve trip session for this booking' });
    }

    const trip = await TripSession.findById(booking.tripSessionId).select('driverId');
    if (!trip || !trip.driverId) {
      return res.status(409).json({ message: 'Cannot resolve driver for this booking' });
    }

    const review = await Review.create({
      bookingId: booking._id,
      passengerId,
      driverId: trip.driverId,
      rating: parsedRating,
      comment: cleanComment,
    });

    const summary = await recalcDriverRating(trip.driverId);

    return res.status(201).json({
      message: 'Review submitted successfully',
      review: {
        id: review._id,
        bookingId: review.bookingId,
        passengerId: review.passengerId,
        driverId: review.driverId,
        rating: review.rating,
        comment: review.comment,
        reviewedAt: review.reviewedAt,
        createdAt: review.createdAt,
      },
      driverRating: summary,
    });
  } catch (error) {
    console.error('Create booking review error:', error);
    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'Review already exists for this booking' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getMyReviewableBookings = async (req, res) => {
  const passengerId = req.user.id;

  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - REVIEW_WINDOW_HOURS);

    const completedBookings = await Booking.find({
      passengerId,
      status: REVIEWABLE_BOOKING_STATUS,
      isBoarded: true,
      completedAt: { $gte: cutoffDate },
    })
      .select('_id bookingCode busId routeId boardingStop destinationStop seatNumbers totalFare completedAt')
      .sort({ completedAt: -1 });

    const bookingIds = completedBookings.map((b) => b._id);
    if (bookingIds.length === 0) {
      return res.status(200).json({ reviewableBookings: [] });
    }

    const submitted = await Review.find({
      passengerId,
      bookingId: { $in: bookingIds },
    }).select('bookingId');

    const reviewedSet = new Set(submitted.map((r) => String(r.bookingId)));

    const reviewableBookings = completedBookings
      .filter((b) => !reviewedSet.has(String(b._id)))
      .map((b) => ({
        bookingId: b._id,
        bookingCode: b.bookingCode,
        busId: b.busId,
        routeId: b.routeId,
        boardingStop: b.boardingStop,
        destinationStop: b.destinationStop,
        seatNumbers: b.seatNumbers,
        totalFare: b.totalFare,
        completedAt: b.completedAt,
      }));

    return res.status(200).json({ reviewableBookings });
  } catch (error) {
    console.error('Get reviewable bookings error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getMyReviews = async (req, res) => {
  const passengerId = req.user.id;
  const { limit = 20, skip = 0 } = req.query;

  try {
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const parsedSkip = Math.max(Number(skip) || 0, 0);

    const [rows, total] = await Promise.all([
      Review.find({ passengerId })
        .populate('bookingId', 'bookingCode')
        .populate('driverId', 'firstName lastName ratingAverage ratingCount')
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip(parsedSkip),
      Review.countDocuments({ passengerId }),
    ]);

    return res.status(200).json({
      reviews: rows,
      total,
      hasMore: parsedSkip + rows.length < total,
    });
  } catch (error) {
    console.error('Get my reviews error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createBookingReview,
  getMyReviewableBookings,
  getMyReviews,
};
