const Passenger = require('../models/passenger.model');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken, isPhoneNumberUnique, hashPassword, comparePassword } = require('../utils/authutils');
const { getRewardInfo, redeemPoints } = require('../services/rewardService');
const { getPassengerReviews, getPassengerReviewStats } = require('../services/passengerReviewService');
const { requestPassengerProfileDeletion, cancelPassengerProfileDeletion, checkPassengerDeletionStatusOnLogin } = require('../services/deleteAccountService');

const registerPassenger = async (req, res) => {
    const { firstName, lastName, address, phoneNumber, gender, dob, email, password, profileImgUrl } = req.body;

    try {
        if (!firstName || !lastName || !email || !password || !phoneNumber) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if email already exists
        const existingPassenger = await Passenger.findOne({ email });
        if (existingPassenger) {
            return res.status(400).json({ 
                message: "Passenger with this email already exists"
            });
        }

        // Check if phone number already exists
        const existingPhone = await Passenger.findOne({ phoneNumber });
        if (existingPhone) {
            return res.status(400).json({ message: "Phone number already in use" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new passenger
        const newPassenger = new Passenger({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber,
            address: address || '',
            gender: gender || '',
            dob: dob || null,
            profileImgUrl: profileImgUrl || '',
            isEmailVerified: true // Since they completed OTP verification during signup
        });

        await newPassenger.save();

        res.status(201).json({
            message: "Passenger registered successfully",
            passenger: {
                id: newPassenger._id,
                email: newPassenger.email,
                firstName: newPassenger.firstName,
                lastName: newPassenger.lastName,
                phoneNumber: newPassenger.phoneNumber
            }
        });

    } catch (error) {
        console.error("Error registering passenger:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ message: `${field} already exists` });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

// Passenger Login
const loginPassenger = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find passenger by email
        const passenger = await Passenger.findOne({ email });
        if (!passenger) {
            return res.status(404).json({ message: "Passenger not found" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, passenger.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Generate tokens
        const accessToken = generateToken(passenger);
        const refreshToken = generateRefreshToken(passenger);

        // Save refresh token
        passenger.refreshToken = refreshToken;
        await passenger.save();

        res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken,
            user: {
                id: passenger._id,
                email: passenger.email,
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                phoneNumber: passenger.phoneNumber,
                profileImgUrl: passenger.profileImgUrl
            },
            passenger: {
                id: passenger._id
            }
        });

    } catch (error) {
        console.error("Error logging in passenger:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Passenger Profile
const getPassengerProfile = async (req, res) => {
    const passengerId = req.user.id; // From JWT middleware

    try {
        const passenger = await Passenger.findById(passengerId).select('-password -refreshToken');

        if (!passenger) {
            return res.status(404).json({ message: "Passenger not found" });
        }

        res.status(200).json({
            user: {
                id: passenger._id,
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                email: passenger.email,
                phoneNumber: passenger.phoneNumber,
                address: passenger.address,
                gender: passenger.gender,
                dob: passenger.dob,
                profileImgUrl: passenger.profileImgUrl,
                isEmailVerified: passenger.isEmailVerified,
                passwordResetVerified: passenger.passwordResetVerified
            },
            passenger: {
                id: passenger._id
            }
        });

    } catch (error) {
        console.error("Error fetching passenger profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update Passenger Profile (firstName, lastName, phoneNumber, profileImgUrl)
const updatePassengerProfile = async (req, res) => {
    const passengerId = req.user.id; // From JWT middleware
    const { firstName, lastName, address, phoneNumber, profileImgUrl } = req.body;

    try {
        const passenger = await Passenger.findById(passengerId);
        if (!passenger) {
            return res.status(404).json({ message: "Passenger not found" });
        }

        // Validate and update firstName
        if (firstName !== undefined && firstName !== null && firstName.trim() !== '') {
            passenger.firstName = firstName.trim();
        } else if (firstName === '') {
            return res.status(400).json({ message: "First name cannot be empty" });
        }

        // Validate and update lastName
        if (lastName !== undefined && lastName !== null && lastName.trim() !== '') {
            passenger.lastName = lastName.trim();
        } else if (lastName === '') {
            return res.status(400).json({ message: "Last name cannot be empty" });
        }

        // Update address
        if (address !== undefined) {
            passenger.address = address || '';
        }

        // Validate and update phone number
        if (phoneNumber) {
            const isUnique = await isPhoneNumberUnique(Passenger, phoneNumber, passengerId);
            if (!isUnique) {
                return res.status(400).json({ message: "Phone number already in use by another user" });
            }
            passenger.phoneNumber = phoneNumber;
        }

        // Update profile image
        if (profileImgUrl !== undefined) {
            passenger.profileImgUrl = profileImgUrl || '';
        }

        await passenger.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: passenger._id,
                email: passenger.email,
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                phoneNumber: passenger.phoneNumber,
                address: passenger.address,
                profileImgUrl: passenger.profileImgUrl
            }
        });

    } catch (error) {
        console.error("Error updating passenger profile:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ message: `${field} already exists` });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Change passenger password
 * Requires: currentPassword, newPassword, confirmPassword
 */
const changePassengerPassword = async (req, res) => {
    const passengerId = req.user.id; // From JWT middleware
    const { currentPassword, newPassword, confirmPassword } = req.body;

    try {
        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "Current password, new password, and confirmation are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: "New password must be at least 8 characters long" });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different from current password" });
        }

        // Find passenger
        const passenger = await Passenger.findById(passengerId);
        if (!passenger) {
            return res.status(404).json({ message: "Passenger not found" });
        }

        // Verify current password
        const isPasswordValid = await comparePassword(currentPassword, passenger.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Hash and save new password
        const hashedPassword = await hashPassword(newPassword);
        passenger.password = hashedPassword;
        await passenger.save();

        res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Error changing passenger password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Get phone number availability for checking
 * Public endpoint to check if a phone number is available during signup/update
 */
const checkPhoneNumberAvailability = async (req, res) => {
    try {
        const { phoneNumber, userId } = req.query;

        if (!phoneNumber) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        const isUnique = await isPhoneNumberUnique(Passenger, phoneNumber, userId || null);

        res.status(200).json({
            available: isUnique,
            phoneNumber,
            message: isUnique ? "Phone number is available" : "Phone number is already in use"
        });

    } catch (error) {
        console.error("Error checking phone number availability:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Get passenger reward points and information
 */
const getRewardPoints = async (req, res) => {
    const passengerId = req.user.id;

    try {
        const rewardInfo = await getRewardInfo(passengerId);

        if (!rewardInfo.success) {
            return res.status(404).json({ message: "Passenger not found" });
        }

        res.status(200).json({
            success: true,
            data: rewardInfo
        });

    } catch (error) {
        console.error("Error fetching reward points:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Redeem reward points for a discount on booking
 */
const redeemPointsForDiscount = async (req, res) => {
    const passengerId = req.user.id;
    const { bookingAmount } = req.body;

    try {
        if (!bookingAmount || bookingAmount <= 0) {
            return res.status(400).json({ message: "Valid booking amount is required" });
        }

        const redeemResult = await redeemPoints(passengerId, bookingAmount);

        if (!redeemResult.success) {
            return res.status(400).json({
                success: false,
                message: redeemResult.message,
                pointsNeeded: redeemResult.pointsNeeded || null,
                currentPoints: redeemResult.rewardPoints || null
            });
        }

        return res.status(200).json({
            success: true,
            message: redeemResult.message,
            data: {
                discountCode: redeemResult.discountCode,
                discountPercentage: redeemResult.discountPercentage,
                originalAmount: redeemResult.originalAmount,
                discountAmount: redeemResult.discountAmount,
                finalAmount: redeemResult.finalAmount,
                pointsUsed: redeemResult.message.split(' ')[1], // Extract points from message
                remainingPoints: redeemResult.rewardPoints
            }
        });

    } catch (error) {
        console.error("Error redeeming points:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Get all reviews given by the passenger
 */
const getMyReviews = async (req, res) => {
    try {
        const passengerId = req.user?.id || req.body?.passengerId;

        if (!passengerId) {
            return res.status(400).json({ 
                success: false,
                message: "Passenger ID is required" 
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder || 'desc';

        const result = await getPassengerReviews(passengerId, {
            page,
            limit,
            sortBy,
            sortOrder
        });

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Reviews retrieved successfully",
            data: result.data
        });
    } catch (error) {
        console.error("Error getting passenger reviews:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

/**
 * Get review statistics for the passenger
 */
const getMyReviewStats = async (req, res) => {
    try {
        const passengerId = req.user?.id || req.body?.passengerId;

        if (!passengerId) {
            return res.status(400).json({ 
                success: false,
                message: "Passenger ID is required" 
            });
        }

        const result = await getPassengerReviewStats(passengerId);

        if (!result.success) {
            return res.status(500).json(result);
        }

        return res.status(200).json({
            success: true,
            message: "Review statistics retrieved successfully",
            data: result.data
        });
    } catch (error) {
        console.error("Error getting review stats:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

/**
 * Request profile deletion (7-day grace period)
 */
const requestDeleteProfile = async (req, res) => {
    try {
        const passengerId = req.user?.id || req.body?.passengerId;

        if (!passengerId) {
            return res.status(400).json({ 
                success: false,
                message: "Passenger ID is required" 
            });
        }

        const result = await requestPassengerProfileDeletion(passengerId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: result.message,
            deleteScheduledFor: result.deleteScheduledFor
        });
    } catch (error) {
        console.error("Error requesting profile deletion:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

/**
 * Cancel profile deletion
 */
const cancelDeleteProfile = async (req, res) => {
    try {
        const passengerId = req.user?.id || req.body?.passengerId;

        if (!passengerId) {
            return res.status(400).json({ 
                success: false,
                message: "Passenger ID is required" 
            });
        }

        const result = await cancelPassengerProfileDeletion(passengerId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error("Error cancelling profile deletion:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

/**
 * Check deletion status (called during login or profile access)
 */
const checkDeletionStatus = async (req, res) => {
    try {
        const passengerId = req.user?.id || req.body?.passengerId;

        if (!passengerId) {
            return res.status(400).json({ 
                success: false,
                message: "Passenger ID is required" 
            });
        }

        const result = await checkPassengerDeletionStatusOnLogin(passengerId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Error checking deletion status:", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error" 
        });
    }
};

module.exports = {
    registerPassenger,
    loginPassenger,
    getPassengerProfile,
    updatePassengerProfile,
    changePassengerPassword,
    checkPhoneNumberAvailability,
    getRewardPoints,
    redeemPointsForDiscount,
    getMyReviews,
    getMyReviewStats,
    requestDeleteProfile,
    cancelDeleteProfile,
    checkDeletionStatus,
}
