const Driver = require('../models/driver.model');
const Location = require('../models/location.model');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken } = require('../utils/authutils');
const { sendEmail } = require('../utils/sendEmail');
const { generateOTP } = require('../utils/OTPutils');
const { sendVerificationEmail } = require('../utils/OTPutils');

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
        profileImgUrl,
        licenseImgUrl
    } = req.body;

    console.log("👉 DRIVER REGISTER HIT");
    console.log("BODY:", req.body);

    try {
        // Validate required fields
        if (!firstName || !lastName || !email || !password || !phoneNumber || !licenseNo) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if email already exists
        const existingDriver = await Driver.findOne({ email });
        if (existingDriver) {
            return res.status(400).json({ 
                message: "Driver with this email already exists"
            });
        }

        // Check if phone number already exists
        const existingPhone = await Driver.findOne({ phoneNumber });
        if (existingPhone) {
            return res.status(400).json({ message: "Phone number already in use" });
        }

        // Check if license already exists
        const existingLicense = await Driver.findOne({ licenseNo });
        if (existingLicense) {
            return res.status(400).json({ message: "License number already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new driver
        const newDriver = new Driver({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phoneNumber,
            address: address || '',
            gender: gender || '',
            dob: dob || null,
            profileImgUrl: profileImgUrl || '',
            licenseNo,
            licenseImgUrl: licenseImgUrl || '',
            validationStatus: 'pending',
            isActive: false,
            isEmailVerified: true // Since they completed OTP verification during signup
        });

        await newDriver.save();

        // Socket logic for admin notification
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('new-driver-request', {
                driverId: newDriver._id.toString(),
                name: `${newDriver.firstName} ${newDriver.lastName}`,
                email: newDriver.email,
                phoneNumber: newDriver.phoneNumber,
                licenseNo: newDriver.licenseNo,
                profileImg: newDriver.profileImgUrl,
                licenseImg: newDriver.licenseImgUrl,
                timestamp: new Date(),
            });
        }

        res.status(201).json({
            message: "Driver registered successfully. Awaiting validation.",
            driver: {
                id: newDriver._id,
                email: newDriver.email,
                firstName: newDriver.firstName,
                lastName: newDriver.lastName,
                phoneNumber: newDriver.phoneNumber,
                profileImgUrl: newDriver.profileImgUrl,
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
        // Find driver by email
        const driver = await Driver.findOne({ email });
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, driver.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Check validation status
        if (driver.validationStatus !== 'approved') {
            return res.status(403).json({ 
                message: "Driver account is not approved yet",
                validationStatus: driver.validationStatus
            });
        }

        // Generate tokens
        const accessToken = generateToken(driver);
        const refreshToken = generateRefreshToken(driver);

        // Save refresh token
        driver.refreshToken = refreshToken;
        await driver.save();

        res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken,
            user: {
                id: driver._id,
                email: driver.email,
                firstName: driver.firstName,
                lastName: driver.lastName,
                phoneNumber: driver.phoneNumber,
                profileImgUrl: driver.profileImgUrl
            },
            driver: {
                id: driver._id,
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
    const driverId = req.user.id; // From JWT middleware (now driver._id)

    try {
        // Get driver
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
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
                driverId: driver._id,
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
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        const locations = await Location.find({ driverId: driver._id })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.status(200).json({
            driverId: driver._id,
            locations
        });

    } catch (error) {
        console.error("Error fetching driver location history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Driver Profile
const getDriverProfile = async (req, res) => {
    const driverId = req.user.id; // From JWT middleware

    try {
        const driver = await Driver.findById(driverId).select('-password -refreshToken');

        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        res.status(200).json({
            user: {
                id: driver._id,
                firstName: driver.firstName,
                lastName: driver.lastName,
                email: driver.email,
                phoneNumber: driver.phoneNumber,
                address: driver.address,
                gender: driver.gender,
                dob: driver.dob,
                profileImgUrl: driver.profileImgUrl,
                isEmailVerified: driver.isEmailVerified,
                passwordResetVerified: driver.passwordResetVerified
            },
            driver: {
                id: driver._id,
                licenseNo: driver.licenseNo,
                licenseImgUrl: driver.licenseImgUrl,
                assignedBus: driver.assignedBus,
                assignedRoute: driver.assignedRoute,
                validationStatus: driver.validationStatus,
                isActive: driver.isActive
            }
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
            .select('-password -refreshToken');

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
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        driver.validationStatus = 'approved';
        driver.isActive = true;
        driver.isEmailVerified = true;
        await driver.save();

        // Send approval email
        if (driver.email) {
            await sendEmail(
                driver.email,
                `<p>Hello ${driver.firstName},</p><p>Your driver signup request has been approved. You can now log in to the app.</p>`,
                'Driver Verification Approved'
            );
        }

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('driver-approved', {
                driverId: driver._id.toString(),
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
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        driver.validationStatus = 'rejected';
        await driver.save();

        // Send rejection email
        if (driver.email) {
            await sendEmail(
                driver.email,
                `<p>Hello ${driver.firstName},</p><p>Your driver signup request was not approved. Please contact support for details.</p>`,
                'Driver Verification Update'
            );
        }

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('driver-rejected', {
                driverId: driver._id.toString(),
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
        const drivers = await Driver.find().select('-password -refreshToken');
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
