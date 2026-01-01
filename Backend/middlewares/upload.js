const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = 'general';
    if (file.fieldname === 'profileImg') folder = 'profile_images';
    if (file.fieldname === 'licenseImg') folder = 'driver_licenses';

    // Create unique public ID to prevent collisions
    const uniqueId = `${file.fieldname}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png'],
      public_id: uniqueId,
      resource_type: 'auto',
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`));
    }
  },
});

module.exports = upload;
