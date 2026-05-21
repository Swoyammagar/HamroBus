    const FAQ = require('../models/faq.model');
    const Notification = require('../models/notification.model');
    const { sendEmail } = require('../utils/sendEmail');
    const { faqSubmissionEmail } = require('../utils/emailTemplates');
    const { getAdminEmailRecipients } = require('../utils/adminEmailRecipients');
    const { v4: uuidv4 } = require('uuid');

    /**
     * Submit a new FAQ from driver or passenger
     */
    const submitFAQ = async (req, res, io) => {
        try {
            const { name, phoneNumber, email, title, message, role } = req.body;
            
            // Debug logging
            console.log('\n=== FAQ SUBMIT CONTROLLER ===');
            console.log('req.user full object:', JSON.stringify(req.user, null, 2));
            console.log('req.user?.id:', req.user?.id);
            console.log('typeof req.user?.id:', typeof req.user?.id);
            console.log('req.userId:', req.userId);
            console.log('req.headers.authorization present:', !!req.headers.authorization);
            console.log('===========================\n');
            
            const userId = req.user?.id; // Captured from authenticatePassenger middleware

            if (!userId) {
                console.log('[FAQ Submit] ERROR: No userId found. req.user:', req.user);
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required to submit FAQ',
                    debug: { req_user: req.user, userId }
                });
            }
            
            console.log('[FAQ Submit] userId captured:', userId);

            if (!name || !phoneNumber || !title || !message || !role) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, phone number, title, message, and role are required'
                });
            }

            if (!['driver', 'passenger'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Role must be either "driver" or "passenger"'
                });
            }

            const newFAQ = new FAQ({
                faqId: `faq_${uuidv4()}`,
                name: name.trim(),
                phoneNumber: phoneNumber.trim(),
                email: email?.trim() || '',
                title: title.trim(),
                message: message.trim(),
                role,
                userId: userId,  // Now guaranteed from authenticated middleware
            });

            const savedFAQ = await newFAQ.save();

            // Notify admin via email
            try {
                const adminEmails = await getAdminEmailRecipients();
                if (adminEmails.length > 0) {
                    await sendEmail(
                        adminEmails,
                        faqSubmissionEmail({
                            name,
                            role,
                            phoneNumber,
                            email,
                            title,
                            message,
                            faqId: savedFAQ.faqId
                        }),
                        `New FAQ from ${role}: ${title}`
                    );
                }
            } catch (emailError) {
                console.error('Error sending FAQ email:', emailError.message);
            }

            // Save notification + emit to admin panel
            try {
                const notification = new Notification({
                    notificationId: `faq-${savedFAQ.faqId}-${Date.now()}`,
                    title: `New FAQ from ${role.toUpperCase()}`,
                    message: `${name} submitted a FAQ: "${title}"`,
                    type: 'info',
                    sentBy: 'system',
                    targetAudience: 'admins',
                    status: 'sent',
                    metadata: {
                        faqId: savedFAQ._id.toString(),
                        faqIdentifier: savedFAQ.faqId,
                        submitterName: name,
                        role,
                        actionRequired: 'review_faq'
                    }
                });

                await notification.save();

                if (io) {
                    io.to('admin-room').emit('faq:submitted', {
                        _id: savedFAQ._id,
                        faqId: savedFAQ.faqId,
                        name: savedFAQ.name,
                        title: savedFAQ.title,
                        role: savedFAQ.role,
                        createdAt: savedFAQ.createdAt
                    });

                    io.to('admin-room').emit('notification:new', {
                        _id: notification._id,
                        notificationId: notification.notificationId,
                        title: notification.title,
                        message: notification.message,
                        type: notification.type,
                        createdAt: notification.createdAt,
                        metadata: notification.metadata
                    });
                }
            } catch (notificationError) {
                console.error('Error creating FAQ notification:', notificationError.message);
            }

            res.status(201).json({
                success: true,
                message: 'FAQ submitted successfully. Our team will review it shortly.',
                faq: {
                    id: savedFAQ._id,
                    faqId: savedFAQ.faqId,
                    name: savedFAQ.name,
                    title: savedFAQ.title,
                    createdAt: savedFAQ.createdAt
                }
            });

        } catch (error) {
            console.error('Error submitting FAQ:', error);
            res.status(500).json({ success: false, message: 'Error submitting FAQ.', error: error.message });
        }
    };

    /**
     * Get all FAQs (admin only)
     */
    const getAllFAQs = async (req, res) => {
        try {
            const { role, page = 1, limit = 10 } = req.query;

            const filter = {};
            if (role) filter.role = role;

            const faqs = await FAQ.find(filter)
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            const total = await FAQ.countDocuments(filter);

            res.status(200).json({
                success: true,
                data: faqs,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Error fetching FAQs:', error);
            res.status(500).json({ success: false, message: 'Error fetching FAQs.', error: error.message });
        }
    };

    /**
     * Get single FAQ by ID (admin only)
     */
    const getFAQById = async (req, res) => {
        try {
            const faq = await FAQ.findById(req.params.faqId);

            if (!faq) {
                return res.status(404).json({ success: false, message: 'FAQ not found' });
            }

            res.status(200).json({ success: true, data: faq });

        } catch (error) {
            console.error('Error fetching FAQ:', error);
            res.status(500).json({ success: false, message: 'Error fetching FAQ.', error: error.message });
        }
    };

    /**
     * Get FAQs submitted by the current user
     */
    const getUserFAQs = async (req, res) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            const { page = 1, limit = 10 } = req.query;

            const faqs = await FAQ.find({ userId })
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit));

            const total = await FAQ.countDocuments({ userId });

            res.status(200).json({
                success: true,
                data: faqs,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Error fetching user FAQs:', error);
            res.status(500).json({ success: false, message: 'Error fetching FAQs.', error: error.message });
        }
    };

    /**
     * Delete FAQ (admin only)
     */
    const deleteFAQ = async (req, res, io) => {
        try {
            const deleted = await FAQ.findByIdAndDelete(req.params.faqId);

            if (!deleted) {
                return res.status(404).json({ success: false, message: 'FAQ not found' });
            }

            if (io) {
                io.to('admin-room').emit('faq:deleted', { _id: req.params.faqId });
            }

            res.status(200).json({ success: true, message: 'FAQ deleted successfully' });

        } catch (error) {
            console.error('Error deleting FAQ:', error);
            res.status(500).json({ success: false, message: 'Error deleting FAQ.', error: error.message });
        }
    };

    module.exports = {
        submitFAQ,
        getAllFAQs,
        getFAQById,
        getUserFAQs,
        deleteFAQ
    };
