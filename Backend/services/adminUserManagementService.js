const Passenger = require('../models/passenger.model');
const Driver = require('../models/driver.model');
const Booking = require('../models/booking.model');
const Review = require('../models/review.model');
const TripSession = require('../models/tripsession.model');
const nodemailer = require('nodemailer');

// Configure email transporter (update with your email config)
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send deletion notification email to user
 */
const sendDeletionNotificationEmail = async (email, name, userType) => {
  try {
    const subject = 'Your Hamro Bus Account Has Been Deleted';
    const message = `
      <h2>Account Deletion Notice</h2>
      <p>Dear ${name},</p>
      <p>We are writing to inform you that your ${userType} account on Hamro Bus has been permanently deleted by the administration team.</p>
      <p>This action was taken according to our terms of service and platform policies.</p>
      <p><strong>What this means:</strong></p>
      <ul>
        <li>Your profile and personal data have been anonymized</li>
        <li>Your booking/trip history will show your account as "Deleted User"</li>
        <li>You will no longer be able to access any Hamro Bus services with this account</li>
        <li>If you believe this is a mistake, please contact our support team immediately</li>
      </ul>
      <p>If you have any questions or concerns, please contact our support team at support@hamrobus.com</p>
      <p>Thank you for using Hamro Bus.</p>
      <p>Best regards,<br/>Hamro Bus Admin Team</p>
    `;

    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html: message,
    });

    return { success: true, message: 'Deletion notification email sent' };
  } catch (error) {
    console.error('Error sending deletion email:', error);
    return { success: false, message: 'Failed to send email notification' };
  }
};

/**
 * Get all passengers with their details, bookings, and reviews
 * Admin only - requires authentication
 */
const getAllPassengers = async (page = 1, limit = 10, search = '') => {
  try {
    const skip = (page - 1) * limit;
    const query = search 
      ? { 
          $or: [
            { firstName: new RegExp(search, 'i') },
            { lastName: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') },
            { phoneNumber: new RegExp(search, 'i') }
          ]
        }
      : {};

    const passengers = await Passenger.find(query)
      .select('_id firstName lastName email phoneNumber profileImgUrl totalTrips averageRating rewardPoints createdAt deleteRequestedAt')
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const total = await Passenger.countDocuments(query);

    // Fetch booking count and review count for each passenger
    const enrichedPassengers = await Promise.all(
      passengers.map(async (passenger) => {
        const bookingCount = await Booking.countDocuments({ passengerId: passenger._id });
        const reviewCount = await Review.countDocuments({ passengerId: passenger._id });

        return {
          ...passenger,
          bookingCount,
          reviewCount,
          fullName: `${passenger.firstName} ${passenger.lastName}`,
        };
      })
    );

    return {
      success: true,
      data: enrichedPassengers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error fetching all passengers:', error);
    return {
      success: false,
      message: 'Error fetching passengers',
      error: error.message,
    };
  }
};

/**
 * Get detailed passenger information including booking history and reviews
 */
const getPassengerDetails = async (passengerId) => {
  try {
    const passenger = await Passenger.findById(passengerId)
      .select('firstName lastName email phoneNumber profileImgUrl totalTrips averageRating rewardPoints consecutiveCancellations isBanned banUntil createdAt deleteRequestedAt')
      .lean()
      .exec();

    if (!passenger) {
      return {
        success: false,
        message: 'Passenger not found',
      };
    }

    // Get booking history
    const bookings = await Booking.find({ passengerId })
      .select('_id bookingCode status journeyDate paymentStatus totalAmount createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec();

    // Get reviews given by passenger
    const reviews = await Review.find({ passengerId })
      .select('_id driverId driverName rating comment createdAt isEdited')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec();

    // Get count totals
    const totalBookings = await Booking.countDocuments({ passengerId });
    const totalReviews = await Review.countDocuments({ passengerId });

    return {
      success: true,
      data: {
        ...passenger,
        fullName: `${passenger.firstName} ${passenger.lastName}`,
        bookingHistory: bookings,
        reviews,
        stats: {
          totalBookings,
          totalReviews,
          rewardPoints: passenger.rewardPoints,
          averageRating: passenger.averageRating || 0,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching passenger details:', error);
    return {
      success: false,
      message: 'Error fetching passenger details',
      error: error.message,
    };
  }
};

/**
 * Delete a passenger profile immediately by admin
 * Anonymizes all related data
 */
const adminDeletePassenger = async (passengerId, adminId) => {
  try {
    const passenger = await Passenger.findById(passengerId);

    if (!passenger) {
      return {
        success: false,
        message: 'Passenger not found',
      };
    }

    const passengerEmail = passenger.email;
    const passengerName = `${passenger.firstName} ${passenger.lastName}`;

    // Update all bookings by this passenger
    await Booking.updateMany(
      { passengerId },
      {
        $set: {
          passengerId: null,
          passengerName: 'Deleted User',
          passengerEmail: null,
          passengerPhoneNumber: null,
        },
      }
    );

    // Update all reviews given by this passenger
    await Review.updateMany(
      { passengerId },
      {
        $set: {
          passengerId: null,
          passengerName: 'Deleted User',
        },
      }
    );

    // Delete the passenger profile
    await Passenger.findByIdAndDelete(passengerId);

    // Send deletion notification email
    const emailResult = await sendDeletionNotificationEmail(passengerEmail, passengerName, 'passenger');

    return {
      success: true,
      message: `Passenger ${passengerName} has been permanently deleted by admin`,
      emailSent: emailResult.success,
      deletedPassenger: {
        name: passengerName,
        email: passengerEmail,
      },
    };
  } catch (error) {
    console.error('Error deleting passenger by admin:', error);
    return {
      success: false,
      message: 'Error deleting passenger',
      error: error.message,
    };
  }
};

/**
 * Get all drivers with their details, trips, and reviews
 * Admin only - requires authentication
 */
const getAllDrivers = async (page = 1, limit = 10, search = '') => {
  try {
    const skip = (page - 1) * limit;
    const query = search 
      ? { 
          $or: [
            { firstName: new RegExp(search, 'i') },
            { lastName: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') },
            { phoneNumber: new RegExp(search, 'i') },
            { 'driver.licenseNo': new RegExp(search, 'i') }
          ]
        }
      : {};

    const drivers = await Driver.find(query)
      .select('_id firstName lastName email phoneNumber profileImgUrl licenseNo totalTrips averageRating createdAt deleteRequestedAt')
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const total = await Driver.countDocuments(query);

    // Fetch trip count and review count for each driver
    const enrichedDrivers = await Promise.all(
      drivers.map(async (driver) => {
        const tripCount = await TripSession.countDocuments({ driverId: driver._id });
        const reviewCount = await Review.countDocuments({ driverId: driver._id });

        return {
          ...driver,
          tripCount,
          reviewCount,
          fullName: `${driver.firstName} ${driver.lastName}`,
        };
      })
    );

    return {
      success: true,
      data: enrichedDrivers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error fetching all drivers:', error);
    return {
      success: false,
      message: 'Error fetching drivers',
      error: error.message,
    };
  }
};

/**
 * Get detailed driver information including trip history and reviews
 */
const getDriverDetails = async (driverId) => {
  try {
    const driver = await Driver.findById(driverId)
      .select('firstName lastName email phoneNumber profileImgUrl licenseNo totalTrips averageRating createdAt deleteRequestedAt')
      .lean()
      .exec();

    if (!driver) {
      return {
        success: false,
        message: 'Driver not found',
      };
    }

    // Get trip history
    const trips = await TripSession.find({ driverId })
      .select('_id busId routeId status departureTime arrivalTime passengersCount createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec();

    // Get reviews received by driver
    const reviews = await Review.find({ driverId })
      .select('_id passengerName rating comment createdAt isEdited')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec();

    // Get count totals
    const totalTrips = await TripSession.countDocuments({ driverId });
    const totalReviews = await Review.countDocuments({ driverId });

    return {
      success: true,
      data: {
        ...driver,
        fullName: `${driver.firstName} ${driver.lastName}`,
        tripHistory: trips,
        reviews,
        stats: {
          totalTrips,
          totalReviews,
          averageRating: driver.averageRating || 0,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching driver details:', error);
    return {
      success: false,
      message: 'Error fetching driver details',
      error: error.message,
    };
  }
};

/**
 * Delete a driver profile immediately by admin
 * Anonymizes all related data
 */
const adminDeleteDriver = async (driverId, adminId) => {
  try {
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return {
        success: false,
        message: 'Driver not found',
      };
    }

    const driverEmail = driver.email;
    const driverName = `${driver.firstName} ${driver.lastName}`;

    // Update all trips by this driver
    await TripSession.updateMany(
      { driverId },
      {
        $set: {
          driverId: null,
          driverName: 'Deleted User',
        },
      }
    );

    // Update all reviews received by this driver
    await Review.updateMany(
      { driverId },
      {
        $set: {
          driverId: null,
          driverName: 'Deleted User',
        },
      }
    );

    // Delete the driver profile
    await Driver.findByIdAndDelete(driverId);

    // Send deletion notification email
    const emailResult = await sendDeletionNotificationEmail(driverEmail, driverName, 'driver');

    return {
      success: true,
      message: `Driver ${driverName} has been permanently deleted by admin`,
      emailSent: emailResult.success,
      deletedDriver: {
        name: driverName,
        email: driverEmail,
      },
    };
  } catch (error) {
    console.error('Error deleting driver by admin:', error);
    return {
      success: false,
      message: 'Error deleting driver',
      error: error.message,
    };
  }
};

module.exports = {
  getAllPassengers,
  getPassengerDetails,
  adminDeletePassenger,
  getAllDrivers,
  getDriverDetails,
  adminDeleteDriver,
  sendDeletionNotificationEmail,
};
