const jwt = require("jsonwebtoken");
const User = require("../models/admin.model");


async function authenticateUser(req, res, next) {
  let token = req.headers["authorization"];

  if (!token) {
    return res
      .status(401) // Unauthorized
      .json({ error: "Token not provided" });
  }

  token = token.substring(7); // Remove 'Bearer ' prefix

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = data.id;

    const user = await User.findById(req.userId);
    if (!user) {
      return res
        .status(401)
        .json({ error: "User not found" });
    }

    req.user = {
      id: user._id,
      permissions: user.permissions,
      role: user.role,
      fullname: user.fullname,
      email: user.email,
    };

    req.decodedToken = data;

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });// forbidden
  }
}

module.exports = authenticateUser;
