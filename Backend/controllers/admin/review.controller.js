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
        .populate({
          path: 'bookingId',
          select: 'bookingCode status completedAt busId',
          populate: {
            path: 'busId',
            select: 'busNumber',
          },
        })
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

const deleteReviewById = async (req, res) => {
  const { id } = req.params;

  try {
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid review ID' });
    }

    const deletedReview = await Review.findByIdAndDelete(id).select('_id driverId');

    if (!deletedReview) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (deletedReview.driverId) {
      const rows = await Review.aggregate([
        { $match: { driverId: new mongoose.Types.ObjectId(String(deletedReview.driverId)) } },
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

      await Driver.findByIdAndUpdate(deletedReview.driverId, {
        $set: {
          ratingAverage: Number(avg.toFixed(2)),
          ratingCount: count,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      deletedReviewId: String(deletedReview._id),
    });
  } catch (error) {
    console.error('Delete admin review error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
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

const getDriverLeaderboard = async (req, res) => {
  const {
    limit = 20,
    skip = 0,
    offset,
    minReviews = 1,
    mode = 'bayesian', // 'bayesian' | 'average'
  } = req.query;

  try {
    const parsedLimit = Math.min(Math.max(toInt(limit, 20), 1), 100);
    const parsedSkip = Math.max(toInt(skip ?? offset, 0), 0);
    const parsedMinReviews = Math.max(toInt(minReviews, 1), 1);

    // Global average rating C (used for Bayesian smoothing)
    const avgRows = await Review.aggregate([
      { $group: { _id: null, globalAvg: { $avg: '$rating' } } },
    ]);
    const C = Number(avgRows[0]?.globalAvg || 0);

    // m = confidence constant (bigger m -> stronger smoothing)
    const m = 5;

    const basePipeline = [
      {
        $group: {
          _id: '$driverId',
          averageRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
          latestReviewAt: { $max: '$createdAt' },
        },
      },
      { $match: { ratingCount: { $gte: parsedMinReviews } } },
      {
        $lookup: {
          from: 'drivers',
          localField: '_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      { $unwind: '$driver' },
      {
        $addFields: {
          bayesianScore: {
            $divide: [
              {
                $add: [
                  { $multiply: ['$averageRating', '$ratingCount'] },
                  { $multiply: [C, m] },
                ],
              },
              { $add: ['$ratingCount', m] },
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          driverId: '$driver._id',
          firstName: '$driver.firstName',
          lastName: '$driver.lastName',
          email: '$driver.email',
          phoneNumber: '$driver.phoneNumber',
          profileImgUrl: '$driver.profileImgUrl',
          validationStatus: '$driver.validationStatus',
          isActive: '$driver.isActive',
          averageRating: { $round: ['$averageRating', 2] },
          ratingCount: 1,
          latestReviewAt: 1,
          bayesianScore: { $round: ['$bayesianScore', 3] },
        },
      },
    ];

    const sortStage =
      String(mode).toLowerCase() === 'average'
        ? { $sort: { averageRating: -1, ratingCount: -1, latestReviewAt: -1 } }
        : { $sort: { bayesianScore: -1, averageRating: -1, ratingCount: -1, latestReviewAt: -1 } };

    const dataPipeline = [
      ...basePipeline,
      sortStage,
      { $skip: parsedSkip },
      { $limit: parsedLimit },
    ];

    const countPipeline = [...basePipeline, { $count: 'total' }];

    const [rows, countRows] = await Promise.all([
      Review.aggregate(dataPipeline),
      Review.aggregate(countPipeline),
    ]);

    const total = countRows[0]?.total || 0;

    const leaderboard = rows.map((row, index) => ({
      rank: parsedSkip + index + 1,
      ...row,
    }));

    return res.status(200).json({
      leaderboard,
      total,
      hasMore: parsedSkip + leaderboard.length < total,
      rankingMode: String(mode).toLowerCase() === 'average' ? 'average' : 'bayesian',
      minReviews: parsedMinReviews,
      globalAverage: Number(C.toFixed(2)),
    });
  } catch (error) {
    console.error('Get driver leaderboard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getAdminReviews,
  getAdminReviewSummary,
  getDriverLeaderboard,
  deleteReviewById
};
