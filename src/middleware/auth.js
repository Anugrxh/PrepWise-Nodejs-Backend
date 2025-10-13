import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "express-async-handler";

// Utility function to parse duration strings
const parseDuration = (duration) => {
  if (!duration) return "7d";
  
  // If it's already a number (seconds), convert to string format
  if (!isNaN(duration)) {
    const days = Math.floor(parseInt(duration) / (24 * 60 * 60));
    return days > 0 ? `${days}d` : "7d";
  }
  
  // Return as-is if it's already in string format
  return duration;
};

// Generate JWT token
export const generateToken = (userId) => {
  const duration = parseDuration(process.env.SESSION_DURATION);
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: duration,
  });
};

// Generate refresh token
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId, type: "refresh" }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid token");
  }
};

// Middleware to authenticate user
export const authenticateUser = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is valid but user not found.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is deactivated.",
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    // Clear invalid token cookie
    res.clearCookie("token");

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
});

// Optional authentication middleware (doesn't fail if no auth)
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select("-password");

      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Continue without authentication
      console.log("Optional auth failed:", error.message);
    }
  }

  next();
});

// Middleware to check if user is admin (if you plan to add admin features)
export const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  next();
});

// Middleware to check if user owns the resource
export const checkResourceOwnership = (
  resourceModel,
  resourceIdParam = "id"
) => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[resourceIdParam];

    try {
      const resource = await resourceModel.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Resource not found.",
        });
      }

      // Check if user owns the resource
      if (resource.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not own this resource.",
        });
      }

      // Add resource to request object for use in route handler
      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error checking resource ownership.",
      });
    }
  });
};

// Set token cookie
export const setTokenCookie = (res, token) => {
  // Parse SESSION_DURATION to get expiration time in milliseconds
  const getExpirationTime = () => {
    const sessionDuration = process.env.SESSION_DURATION || "7d";
    
    // If it's a number (seconds), convert to milliseconds
    if (!isNaN(sessionDuration)) {
      return parseInt(sessionDuration) * 1000;
    }
    
    // Parse string format like "7d", "24h", "60m"
    const match = sessionDuration.match(/^(\d+)([dhm])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      
      switch (unit) {
        case 'd': return value * 24 * 60 * 60 * 1000; // days to milliseconds
        case 'h': return value * 60 * 60 * 1000; // hours to milliseconds
        case 'm': return value * 60 * 1000; // minutes to milliseconds
        default: return 7 * 24 * 60 * 60 * 1000; // default 7 days
      }
    }
    
    // Default fallback
    return 7 * 24 * 60 * 60 * 1000; // 7 days
  };

  const cookieOptions = {
    expires: new Date(Date.now() + getExpirationTime()),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };

  res.cookie("token", token, cookieOptions);
};

// Clear token cookie
export const clearTokenCookie = (res) => {
  res.cookie("token", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
};
