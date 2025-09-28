const jwt = require('jsonwebtoken');

const generateToken = (admin) => {
    const payload = { id: admin._id, email: admin.email  };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

module.exports = { generateToken };