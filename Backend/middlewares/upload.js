const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    let folder = 'general';
    if (file.fieldname === 'profileImg') folder = 'profile_images';
    if (file.fieldname === 'licenseImg') folder = 'driver_licenses';

    return {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png'],
      public_id: `${file.fieldname}_${Date.now()}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = upload;
