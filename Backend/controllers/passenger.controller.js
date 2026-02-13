const Passenger = require('../models/passenger.model');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken } = require('../utils/authutils');

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

// Update Passenger Profile
const updatePassengerProfile = async (req, res) => {
    const passengerId = req.user.id; // From JWT middleware
    const { firstName, lastName, address, phoneNumber } = req.body;

    try {
        const passenger = await Passenger.findById(passengerId);
        if (!passenger) {
            return res.status(404).json({ message: "Passenger not found" });
        }

        // Update fields if provided
        if (firstName) passenger.firstName = firstName;
        if (lastName) passenger.lastName = lastName;
        if (address) passenger.address = address;
        if (phoneNumber) {
            // Check if phone number is already taken by another passenger
            const existingPassenger = await Passenger.findOne({ phoneNumber, _id: { $ne: passengerId } });
            if (existingPassenger) {
                return res.status(400).json({ message: "Phone number already in use" });
            }
            passenger.phoneNumber = phoneNumber;
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
                address: passenger.address
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
