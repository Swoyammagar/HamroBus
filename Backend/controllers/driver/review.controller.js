const mongoose = require('mongoose');
const Review = require('../../models/review.model');
const Driver = require('../../models/driver.model');

const getMyRatingSummary = async (req, res) => {
  const driverId = req.user.id;

  try {
    const [driver, distRows, latestReviews] = await Promise.all([
      Driver.findById(driverId).select('firstName lastName ratingAverage ratingCount'),
      Review.aggregate([
        { $match: { driverId: new mongoose.Types.ObjectId(String(driverId)) } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Review.find({ driverId })
        .populate('bookingId', 'bookingCode')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('rating comment createdAt bookingId'),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distRows) {
      distribution[String(row._id)] = row.count;
    }

    return res.status(200).json({
      driverId,
      firstName: driver?.firstName || '',
      lastName: driver?.lastName || '',
      ratingAverage: driver?.ratingAverage || 0,
      ratingCount: driver?.ratingCount || 0,
      distribution,
      latestReviews,
    });
  } catch (error) {
    console.error('Get driver rating summary error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getMyRatingSummary,
};