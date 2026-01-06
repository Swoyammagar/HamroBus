const User = require('../models/user.model');
const Passenger = require('../models/passenger.model');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken } = require('../utils/authutils');

const registerPassenger = async (req, res) => {
    const { firstName, lastName, address, phoneNumber,gender, dob, email, password, profileImgUrl } = req.body;

    try {

        if (!firstName || !lastName || !email || !password || !phoneNumber) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        // 1️⃣ Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { phoneNumber }] });

        if (!user) {
            // 2a. Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // 2b. Create new User with roles array
            user = new User({
                firstName,
                lastName,
                address,
                phoneNumber,
                gender,
                dob,
                email,
                password: hashedPassword,
                profileImgUrl: profileImgUrl,
                roles: ['passenger'],
                isVerified: false
            });

            await user.save();
        } else {
            // 3️⃣ User exists → add passenger role if not already present
            if (!user.roles.includes('passenger')) {
                user.roles.push('passenger');
                await user.save();
            } else {
                return res.status(400).json({ message: "Passenger with this email or phone number already exists" });
            }
        }

        // 4️⃣ Check if passenger profile already exists
        const existingPassengerProfile = await Passenger.findOne({ userId: user._id });
        if (existingPassengerProfile) {
            return res.status(400).json({ message: "Passenger profile already exists for this user" });
        }

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
