const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ========================================
// MIDDLEWARE: Verify JWT Token from Cookie
// ========================================
const protect = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("❌ FATAL: JWT_SECRET is missing from env!");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: JWT_SECRET missing",
      });
    }

    const cookies = req.cookies || {};
    let token = cookies.token || cookies.authToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: user not found",
      });
    }

    req.user = user;
    console.log(`✅ Auth Success: ${user.username}`);
    next();
  } catch (error) {
    console.error("❌ Auth Middleware Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// ========================================
// MIDDLEWARE: Restrict Access by Role
// ========================================
const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `🚫 Access denied. This action requires ${allowedRoles.join(" or ")} privileges.`,
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
