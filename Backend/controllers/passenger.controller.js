const User = require('../models/user.model');
const Passenger = require('../models/passenger.model');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken } = require('../utils/authutils');

const registerPassenger = async (req, res) => {
    const { firstName, lastName, address, phoneNumber, gender, dob, email, password, profileImgUrl } = req.body;

    try {
        if (!firstName || !lastName || !email || !password || !phoneNumber) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // ✅ NEW: Check if email is verified
        const tempUser = await User.findOne({ email });
        if (!tempUser || !tempUser.isEmailVerified) {
            return res.status(400).json({ 
                message: "Email must be verified before registration",
                error: 'EMAIL_NOT_VERIFIED'
            });
        }

        // 1️⃣ Check if user already exists
        let user = tempUser; // Use the verified temporary user

        // ✅ Allow existing users (e.g., drivers) to add passenger role
        if (user.roles.includes('passenger')) {
            // User already has passenger role - cannot register twice
            return res.status(400).json({ message: "Passenger with this email already exists" });
        }

        // Check if passenger profile already exists for this user
        const existingPassengerProfile = await Passenger.findOne({ userId: user._id });
        if (existingPassengerProfile) {
            return res.status(400).json({ message: "Passenger profile already exists" });
        }

        // Add passenger role to user
        user.roles.push('passenger');

        // Update user details (only update if not already set or if explicitly provided)
        if (!user.firstName || firstName) user.firstName = firstName;
        if (!user.lastName || lastName) user.lastName = lastName;
        if (!user.address || address) user.address = address;
        if (!user.phoneNumber || phoneNumber) {
            // Check if phone number is already taken by another user
            const existingPhone = await User.findOne({ phoneNumber, _id: { $ne: user._id } });
            if (existingPhone) {
                return res.status(400).json({ message: "Phone number already in use" });
            }
            user.phoneNumber = phoneNumber;
        }
        if (!user.gender || gender) user.gender = gender;
        if (!user.dob || dob) user.dob = dob;
        if (!user.profileImgUrl || profileImgUrl) user.profileImgUrl = profileImgUrl || '';
        
        // Update password only if provided and user doesn't already have one
        if (!user.password || password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        await user.save();

        // 5️⃣ Generate unique passenger ID
        const passengerId = `PSG${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // 6️⃣ Create Passenger profile
        const newPassenger = new Passenger({
            userId: user._id,
            passengerId
        });

        await newPassenger.save();

        res.status(201).json({
            message: "Passenger registered successfully",
            passenger: {
                id: user._id,
                passengerId: passengerId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });

    } catch (error) {
        console.error("Error registering passenger:", error);
        if (error.code === 11000) {
            return res.status(400).json({ message: "Duplicate key error" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

// Passenger Login
const loginPassenger = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user with passenger role
        const user = await User.findOne({ email, roles: { $in: ['passenger'] } });
        if (!user) {
            return res.status(404).json({ message: "Passenger not found" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Get passenger profile
        const passenger = await Passenger.findOne({ userId: user._id });
        if (!passenger) {
            return res.status(404).json({ message: "Passenger profile not found" });
        }

        // Generate tokens
        const accessToken = generateToken(user);
        const refreshToken = generateRefreshToken(user);

        // Save refresh token
        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                roles: user.roles
            },
            passenger: {
                passengerId: passenger.passengerId
            }
        });

    } catch (error) {
        console.error("Error logging in passenger:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Passenger Profile
const getPassengerProfile = async (req, res) => {
    const userId = req.user.id; // From JWT middleware

    try {
        const user = await User.findById(userId).select('-password -refreshToken');
        const passenger = await Passenger.findOne({ userId });

        if (!user || !passenger) {
            return res.status(404).json({ message: "Passenger profile not found" });
        }

        res.status(200).json({
            user,
            passenger
        });

    } catch (error) {
        console.error("Error fetching passenger profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update Passenger Profile
const updatePassengerProfile = async (req, res) => {
    const userId = req.user.id; // From JWT middleware
    const { firstName, lastName, address, phoneNumber } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update fields if provided
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (address) user.address = address;
        if (phoneNumber) {
            // Check if phone number is already taken by another user
            const existingUser = await User.findOne({ phoneNumber, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ message: "Phone number already in use" });
            }
            user.phoneNumber = phoneNumber;
        }

        await user.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                address: user.address
            }
        });

    } catch (error) {
        console.error("Error updating passenger profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    registerPassenger,
    loginPassenger,
    getPassengerProfile,
    updatePassengerProfile
};
