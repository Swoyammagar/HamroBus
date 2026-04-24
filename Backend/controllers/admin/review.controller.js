const mongoose = require('mongoose');
const Review = require('../../models/review.model');
const Driver = require('../../models/driver.model');

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || '').trim());

const toInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getAdminReviews = async (req, res) => {
  const {
    driverId,
    rating,
    limit = 20,
    skip = 0,
    offset,
    hasComment,
    sort = 'desc',
  } = req.query;

  try {
    const parsedLimit = Math.min(Math.max(toInt(limit, 20), 1), 100);
    const parsedSkip = Math.max(toInt(skip ?? offset, 0), 0);

    const filter = {};

    if (driverId) {
      if (!isValidObjectId(driverId)) {
        return res.status(400).json({ message: 'Invalid driverId' });
      }
      filter.driverId = new mongoose.Types.ObjectId(String(driverId));
    }

    if (rating !== undefined && rating !== '') {
      const parsedRating = toInt(rating, NaN);
      if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ message: 'rating must be an integer between 1 and 5' });
      }
      filter.rating = parsedRating;
    }

    if (hasComment === 'true') {
      filter.comment = { $exists: true, $ne: '' };
    } else if (hasComment === 'false') {
      filter.$or = [{ comment: { $exists: false } }, { comment: '' }];
    }

    const sortDir = String(sort).toLowerCase() === 'asc' ? 1 : -1;

    const [rows, total] = await Promise.all([
      Review.find(filter)
        .populate('driverId', 'firstName lastName profileImgUrl ratingAverage ratingCount')
        .populate('passengerId', 'firstName lastName profileImgUrl')
        .populate('bookingId', 'bookingCode status completedAt')
        .sort({ createdAt: sortDir })
        .limit(parsedLimit)
        .skip(parsedSkip)
        .select('driverId passengerId bookingId rating comment reviewedAt createdAt isEdited'),
      Review.countDocuments(filter),
    ]);

    return res.status(200).json({
      reviews: rows,
      total,
      hasMore: parsedSkip + rows.length < total,
      filtersApplied: {
        driverId: driverId || null,
        rating: rating !== undefined && rating !== '' ? Number(rating) : null,
        hasComment: hasComment === 'true' ? true : hasComment === 'false' ? false : null,
      },
    });
  } catch (error) {
    console.error('Get admin reviews error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAdminReviewSummary = async (req, res) => {
  const { driverId } = req.query;

  try {
    const match = {};
    if (driverId) {
      if (!isValidObjectId(driverId)) {
        return res.status(400).json({ message: 'Invalid driverId' });
      }
      match.driverId = new mongoose.Types.ObjectId(String(driverId));
    }

    const [distributionRows, totalRows, avgRows] = await Promise.all([
      Review.aggregate([
        { $match: match },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Review.aggregate([{ $match: match }, { $count: 'total' }]),
      Review.aggregate([
        { $match: match },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionRows.forEach((row) => {
      distribution[String(row._id)] = row.count;
    });

    const total = totalRows[0]?.total || 0;
    const average = Number((avgRows[0]?.avgRating || 0).toFixed(2));

    return res.status(200).json({
      driverId: driverId || null,
      total,
      average,
      distribution,
    });
  } catch (error) {
    console.error('Get admin review summary error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAdminReviews,
  getAdminReviewSummary,
};