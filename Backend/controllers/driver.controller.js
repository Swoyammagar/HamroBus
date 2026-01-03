const User = require('../models/user.model');
const Driver = require('../models/driver.model');
const Location = require('../models/location.model');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken } = require('../utils/authutils');
const { sendEmail } = require('../utils/sendEmail');

// Driver Registration
const registerDriver = async (req, res) => {
    const {
        firstName,
        lastName,
        address,
        phoneNumber,
        gender,
        dob,
        email,
        password,
        licenseNo,
        profileImgUrl,   // ✅ NEW (Cloudinary URL)
        licenseImgUrl    // ✅ NEW (Cloudinary URL)
    } = req.body;

    console.log("👉 DRIVER REGISTER HIT");
    console.log("BODY:", req.body);

    try {
        // Validate required fields
        if (!firstName || !lastName || !email || !password || !phoneNumber || !licenseNo) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // 1️⃣ Check if license already exists
        const existingLicense = await Driver.findOne({ licenseNo });
        if (existingLicense) {
            return res.status(400).json({ message: "License number already registered" });
        }

        // 2️⃣ Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { phoneNumber }] });

        if (!user) {
            // 2a. Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // 2b. Create User
            user = new User({
                firstName,
                lastName,
                address,
                phoneNumber,
                gender,
                dob,
                email,
                password: hashedPassword,
                profileImgUrl: profileImgUrl || '', // ✅ URL from mobile
                roles: ['driver'],
                isVerified: false
            });
            await user.save();
        } else {
            if (user.roles.includes('driver')) {
                return res.status(400).json({
                    message: "Driver with this email or phone number already exists",
                });
            }

            if (profileImgUrl) {
                user.profileImgUrl = profileImgUrl; // ✅ URL from mobile
            }

            user.roles.push('driver');
            await user.save();
        }

        // 3️⃣ Check if driver profile already exists
        const existingDriverProfile = await Driver.findOne({ userId: user._id });
        if (existingDriverProfile) {
            return res.status(400).json({ message: "Driver profile already exists for this user" });
        }

        // 4️⃣ Generate unique driver ID
        const driverId = `DRV${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // 5️⃣ Create Driver profile
        const newDriver = new Driver({
            userId: user._id,
            driverId,
            licenseNo,
            licenseImgUrl: licenseImgUrl || '', // ✅ URL from mobile
            validationStatus: 'pending',
            isActive: false
        });

        await newDriver.save();

        // 6️⃣ Socket logic (UNCHANGED)
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('new-driver-request', {
                driverId: newDriver.driverId,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email,
                phoneNumber: user.phoneNumber,
                licenseNo: newDriver.licenseNo,
                profileImg: user.profileImgUrl,
                licenseImg: newDriver.licenseImgUrl,
                timestamp: new Date(),
            });
        }

        res.status(201).json({
            message: "Driver registered successfully. Awaiting validation.",
            driver: {
                id: user._id,
                driverId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                profileImgUrl: user.profileImgUrl,
                validationStatus: 'pending',
                licenseImgUrl: newDriver.licenseImgUrl
            }
        });

    } catch (error) {
        console.error("Error registering driver:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ message: `${field} already exists` });
        }
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};


// Driver Login
const loginDriver = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user with driver role
        const user = await User.findOne({ email, roles: { $in: ['driver'] } });
        if (!user) {
            return res.status(404).json({ message: "Driver not found" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Get driver profile
        const driver = await Driver.findOne({ userId: user._id });
        if (!driver) {
            return res.status(404).json({ message: "Driver profile not found" });
        }

        // Check validation status
        if (driver.validationStatus !== 'approved') {
            return res.status(403).json({ 
                message: "Driver account is not approved yet",
                validationStatus: driver.validationStatus
            });
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
            driver: {
                driverId: driver.driverId,
                licenseNo: driver.licenseNo,
                assignedBus: driver.assignedBus,
                assignedRoute: driver.assignedRoute,
                isActive: driver.isActive
            }
        });

    } catch (error) {
        console.error("Error logging in driver:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// Update Driver Location
const updateDriverLocation = async (req, res) => {
    const { longitude, latitude, tripId } = req.body;
    const userId = req.user.id; // From JWT middleware

    try {
        // Get driver profile
        const driver = await Driver.findOne({ userId });
        if (!driver) {
            return res.status(404).json({ message: "Driver profile not found" });
        }

        // Create location entry
        const location = new Location({
            driverId: driver._id,
            tripId: tripId || null,
            longitude,
            latitude,
            timestamp: Date.now()
        });

        await location.save();

        res.status(200).json({
            message: "Location updated successfully",
            location: {
                driverId: driver.driverId,
                longitude,
                latitude,
                timestamp: location.timestamp
            }
        });

    } catch (error) {
        console.error("Error updating driver location:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Driver Location History
const getDriverLocationHistory = async (req, res) => {
    const { driverId } = req.params;
    const { limit = 100 } = req.query;

    try {
        const driver = await Driver.findOne({ driverId });
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        const locations = await Location.find({ driverId: driver._id })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.status(200).json({
            driverId: driver.driverId,
            locations
        });

    } catch (error) {
        console.error("Error fetching driver location history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Driver Profile
const getDriverProfile = async (req, res) => {
    const userId = req.user.id; // From JWT middleware

    try {
        const user = await User.findById(userId).select('-password -refreshToken');
        const driver = await Driver.findOne({ userId });

        if (!user || !driver) {
            return res.status(404).json({ message: "Driver profile not found" });
        }

        res.status(200).json({
            user,
            driver
        });

    } catch (error) {
        console.error("Error fetching driver profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get pending drivers (admin)
const getPendingDrivers = async (req, res) => {
    try {
        const pendingDrivers = await Driver.find({ validationStatus: 'pending' })
            .populate('userId', 'firstName lastName email phoneNumber address profileImgUrl');

        res.status(200).json({ drivers: pendingDrivers });
    } catch (error) {
        console.error('Error fetching pending drivers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Approve driver (admin)
const approveDriver = async (req, res) => {
    const { driverId } = req.params;

    try {
        const driver = await Driver.findOne({ driverId }).populate('userId');
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        driver.validationStatus = 'approved';
        driver.isActive = true;
        await driver.save();

        if (driver.userId) {
            driver.userId.isVerified = true;
            await driver.userId.save();
        }

        if (driver.userId?.email) {
            await sendEmail(
                driver.userId.email,
                `<p>Hello ${driver.userId.firstName},</p><p>Your driver signup request has been approved. You can now log in to the app.</p>`,
                'Driver Verification Approved'
            );
        }

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('driver-approved', {
                driverId: driver.driverId,
                userId: driver.userId?._id,
            });
        }

        res.status(200).json({ message: 'Driver approved', driver });
    } catch (error) {
        console.error('Error approving driver:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Reject driver (admin)
const rejectDriver = async (req, res) => {
    const { driverId } = req.params;

    try {
        const driver = await Driver.findOne({ driverId }).populate('userId');
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        driver.validationStatus = 'rejected';
        await driver.save();

        if (driver.userId?.email) {
            await sendEmail(
                driver.userId.email,
                `<p>Hello ${driver.userId.firstName},</p><p>Your driver signup request was not approved. Please contact support for details.</p>`,
                'Driver Verification Update'
            );
        }

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('driver-rejected', {
                driverId: driver.driverId,
                userId: driver.userId?._id,
            });
        }

        res.status(200).json({ message: 'Driver rejected', driver });
    } catch (error) {
        console.error('Error rejecting driver:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// List all drivers (admin)
const getAllDrivers = async (req, res) => {
    try {
        const drivers = await Driver.find().populate('userId', 'firstName lastName email phoneNumber address profileImgUrl');
        res.status(200).json({ drivers });
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    registerDriver,
    loginDriver,
    updateDriverLocation,
    getDriverLocationHistory,
    getDriverProfile,
    getPendingDrivers,
    approveDriver,
    rejectDriver,
    getAllDrivers
};
