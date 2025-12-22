const jwt = require("jsonwebtoken");
const User = require("../models/admin.model");


async function authenticateUser(req, res, next) {
  try {
    // 1️⃣ Read token from cookies
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({ error: "Access token missing" });
    }

    // 2️⃣ Verify token
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = data.id;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      id: user._id,
      role: user.role,
      permissions: user.permissions,
      fullname: user.fullname,
      email: user.email,
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}


module.exports = authenticateUser;
