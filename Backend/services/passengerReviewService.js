const Review = require('../models/review.model');
const Booking = require('../models/booking.model');
const Driver = require('../models/driver.model');
const Route = require('../models/route.model');
const Bus = require('../models/bus.model');

/**
 * Get all reviews given by a specific passenger
 */
const getPassengerReviews = async (passengerId, options = {}) => {
    try {
        const { 
            page = 1, 
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        const skip = (page - 1) * limit;
        const sortObject = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Get reviews with pagination
        const reviews = await Review.find({ passengerId })
            .populate({
                path: 'driverId',
                select: 'firstName lastName profileImgUrl ratingAverage ratingCount email phoneNumber'
            })
            .populate({
                path: 'bookingId',
                select: 'bookingCode serviceDate scheduleStartTime scheduleEndTime boardingStop destinationStop totalFare status',
                populate: [
                    { path: 'routeId', select: 'name source destination' },
                    { path: 'busId', select: 'busNumber busType' }
                ]
            })
            .sort(sortObject)
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination info
        const totalReviews = await Review.countDocuments({ passengerId });
        const totalPages = Math.ceil(totalReviews / limit);

        // Format reviews data
        const formattedReviews = reviews.map(review => ({
            id: review._id,
            reviewId: review._id,
            driverId: review.driverId?._id,
            driverName: review.driverId ? `${review.driverId.firstName} ${review.driverId.lastName}` : 'Unknown Driver',
            driverImage: review.driverId?.profileImgUrl || null,
            driverRating: review.driverId?.ratingAverage || 0,
            driverRatingCount: review.driverId?.ratingCount || 0,
            rating: review.rating,
            comment: review.comment,
            isEdited: review.isEdited,
            reviewedAt: review.reviewedAt,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
            booking: review.bookingId ? {
                id: review.bookingId._id,
                bookingCode: review.bookingId.bookingCode,
                serviceDate: review.bookingId.serviceDate,
                scheduleStartTime: review.bookingId.scheduleStartTime,
                scheduleEndTime: review.bookingId.scheduleEndTime,
                route: review.bookingId.routeId ? {
                    id: review.bookingId.routeId._id,
                    name: review.bookingId.routeId.name,
                    source: review.bookingId.routeId.source,
                    destination: review.bookingId.routeId.destination
                } : null,
                bus: review.bookingId.busId ? {
                    id: review.bookingId.busId._id,
                    busNumber: review.bookingId.busId.busNumber,
                    busType: review.bookingId.busId.busType
                } : null,
                boardingStop: review.bookingId.boardingStop,
                destinationStop: review.bookingId.destinationStop,
                totalFare: review.bookingId.totalFare,
                status: review.bookingId.status
            } : null
        }));

        return {
            success: true,
            data: {
                reviews: formattedReviews,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalReviews,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1
                }
            }
        };
    } catch (error) {
        console.error('Error getting passenger reviews:', error);
        return {
            success: false,
            message: 'Error retrieving reviews',
            error: error.message
        };
    }
};

/**
 * Get summary statistics of passenger's reviews
 */
const getPassengerReviewStats = async (passengerId) => {
    try {
        const reviews = await Review.find({ passengerId });

        if (reviews.length === 0) {
            return {
                success: true,
                data: {
                    totalReviews: 0,
                    averageRating: 0,
                    ratingDistribution: {
                        5: 0,
                        4: 0,
                        3: 0,
                        2: 0,
                        1: 0
                    }
                }
            };
        }

        // Calculate stats
        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let totalRating = 0;

        reviews.forEach(review => {
            totalRating += review.rating;
            ratingDistribution[review.rating]++;
        });

        const averageRating = (totalRating / reviews.length).toFixed(2);

        return {
            success: true,
            data: {
                totalReviews: reviews.length,
                averageRating: parseFloat(averageRating),
                ratingDistribution
            }
        };
    } catch (error) {
        console.error('Error getting passenger review stats:', error);
        return {
            success: false,
            message: 'Error retrieving review statistics',
            error: error.message
        };
    }
};

module.exports = {
    getPassengerReviews,
    getPassengerReviewStats
};
