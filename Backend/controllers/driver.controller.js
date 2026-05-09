const Driver = require('../models/driver.model');
const Location = require('../models/location.model');
const Notification = require('../models/notification.model');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken, isPhoneNumberUnique, isLicenseNumberUnique, hashPassword, comparePassword } = require('../utils/authutils');
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

        // 📧 Send email notification to admin
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            const adminEmailContent = `
                <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                    <div style="background-color: #fff; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #0f172a; margin-bottom: 16px;">🚨 New Driver Registration Request</h2>
                        <p style="color: #374151; line-height: 1.6;">A new user has applied to register as a driver and requires your approval.</p>
                        
                        <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0; border-radius: 4px;">
                            <p style="margin: 8px 0;"><strong>Driver Name:</strong> ${newDriver.firstName} ${newDriver.lastName}</p>
                            <p style="margin: 8px 0;"><strong>Email:</strong> ${newDriver.email}</p>
                            <p style="margin: 8px 0;"><strong>Phone:</strong> ${newDriver.phoneNumber}</p>
                            <p style="margin: 8px 0;"><strong>License No:</strong> ${newDriver.licenseNo}</p>
                            <p style="margin: 8px 0;"><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        
                        <p style="color: #374151; line-height: 1.6;">Please visit the admin dashboard to review and approve/reject this driver request.</p>
                        
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                            <p style="margin: 0;">HamroBus Admin System</p>
                            <p style="margin: 0;">This is an automated notification. Do not reply to this email.</p>
                        </div>
                    </div>
                </div>
            `;
            
            await sendEmail(
                adminEmail,
                adminEmailContent,
                `🚨 New Driver Registration: ${newDriver.firstName} ${newDriver.lastName}`
            );
        }

        // 💾 Create in-app notification for admins
        const notificationId = `admin-driver-reg-${newDriver._id}-${Date.now()}`;
        const adminNotification = new Notification({
            notificationId,
            title: `New Driver Registration: ${newDriver.firstName} ${newDriver.lastName}`,
            message: `Driver ${newDriver.firstName} ${newDriver.lastName} has registered and is awaiting approval. License: ${newDriver.licenseNo}`,
            sentBy: 'system',
            targetAudience: 'admins',
            status: 'sent',
            read: false,
            metadata: {
                driverId: newDriver._id.toString(),
                driverName: `${newDriver.firstName} ${newDriver.lastName}`,
                driverEmail: newDriver.email,
                driverPhone: newDriver.phoneNumber,
                licenseNo: newDriver.licenseNo,
                profileImgUrl: newDriver.profileImgUrl,
                licenseImgUrl: newDriver.licenseImgUrl,
                actionRequired: 'approve_reject_driver'
            }
        });
        
        await adminNotification.save();

        // 🔔 Socket logic for real-time admin notification
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
                notificationId: notificationId,
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

/**
 * Update driver profile (firstName, lastName, phoneNumber, profileImgUrl, licenseNo, licenseImgUrl)
 */
const updateDriverProfile = async (req, res) => {
    const driverId = req.user.id; // From JWT middleware
    const { firstName, lastName, phoneNumber, profileImgUrl, licenseNo, licenseImgUrl, address } = req.body;

    try {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        // Validate and update firstName
        if (firstName !== undefined && firstName !== null && firstName.trim() !== '') {
            driver.firstName = firstName.trim();
        } else if (firstName === '') {
            return res.status(400).json({ message: "First name cannot be empty" });
        }

        // Validate and update lastName
        if (lastName !== undefined && lastName !== null && lastName.trim() !== '') {
            driver.lastName = lastName.trim();
        } else if (lastName === '') {
            return res.status(400).json({ message: "Last name cannot be empty" });
        }

        // Update address
        if (address !== undefined) {
            driver.address = address || '';
        }

        // Validate and update phone number
        if (phoneNumber) {
            const isUnique = await isPhoneNumberUnique(Driver, phoneNumber, driverId);
            if (!isUnique) {
                return res.status(400).json({ message: "Phone number already in use by another user" });
            }
            driver.phoneNumber = phoneNumber;
        }

        // Validate and update license number
        if (licenseNo) {
            const isLicenseUnique = await isLicenseNumberUnique(licenseNo, driverId);
            if (!isLicenseUnique) {
                return res.status(400).json({ message: "License number already registered" });
            }
            driver.licenseNo = licenseNo;
        }

        // Update profile image
        if (profileImgUrl !== undefined) {
            driver.profileImgUrl = profileImgUrl || '';
        }

        // Update license image
        if (licenseImgUrl !== undefined) {
            driver.licenseImgUrl = licenseImgUrl || '';
        }

        await driver.save();

        res.status(200).json({
            message: "Profile updated successfully",
            user: {
                id: driver._id,
                email: driver.email,
                firstName: driver.firstName,
                lastName: driver.lastName,
                phoneNumber: driver.phoneNumber,
                address: driver.address,
                profileImgUrl: driver.profileImgUrl
            },
            driver: {
                id: driver._id,
                licenseNo: driver.licenseNo,
                licenseImgUrl: driver.licenseImgUrl
            }
        });

    } catch (error) {
        console.error("Error updating driver profile:", error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ message: `${field} already exists` });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Change driver password
 * Requires: currentPassword, newPassword, confirmPassword
 */
const changeDriverPassword = async (req, res) => {
    const driverId = req.user.id; // From JWT middleware
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

        // Find driver
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        // Verify current password
        const isPasswordValid = await comparePassword(currentPassword, driver.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Hash and save new password
        const hashedPassword = await hashPassword(newPassword);
        driver.password = hashedPassword;
        await driver.save();

        res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Error changing driver password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Check phone number availability for drivers
 * Public endpoint to check if a phone number is available during signup/update
 */
const checkPhoneNumberAvailability = async (req, res) => {
    try {
        const { phoneNumber, driverId } = req.query;

        if (!phoneNumber) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        const isUnique = await isPhoneNumberUnique(Driver, phoneNumber, driverId || null);

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
 * Check license number availability for drivers
 * Public endpoint to check if a license number is available during signup/update
 */
const checkLicenseNumberAvailability = async (req, res) => {
    try {
        const { licenseNo, driverId } = req.query;

        if (!licenseNo) {
            return res.status(400).json({ message: "License number is required" });
        }

        const isUnique = await isLicenseNumberUnique(licenseNo, driverId || null);

        res.status(200).json({
            available: isUnique,
            licenseNo,
            message: isUnique ? "License number is available" : "License number is already registered"
        });

    } catch (error) {
        console.error("Error checking license number availability:", error);
        res.status(500).json({ message: "Internal server error" });
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
    getAllDrivers,
    updateDriverProfile,
    changeDriverPassword,
    checkPhoneNumberAvailability,
    checkLicenseNumberAvailability
};
