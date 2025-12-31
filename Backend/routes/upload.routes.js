const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');

// Single image upload for profile/license/etc.
router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ message: 'No image uploaded' });
  }
  return res.status(200).json({ url: req.file.path });
});

module.exports = router;
