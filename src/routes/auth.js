import express from "express";
import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import { body } from "express-validator";

import User from "../models/User.js";
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authenticateUser,
  setTokenCookie,
  clearTokenCookie,
} from "../middleware/auth.js";
import {
  registerValidation,
  loginValidation,
  validate,
} from "../middleware/validation.js";

const router = express.Router();

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post(
  "/register",
  registerValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email address",
      });
    }

    // Create new user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
    });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user with automatic cleanup
    await user.addRefreshToken(refreshToken);

    // Set token cookie
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        token,
        refreshToken,
      },
    });
  })
);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post(
  "/login",
  loginValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findByEmail(email).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated. Please contact support.",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user with automatic cleanup
    await user.addRefreshToken(refreshToken);

    // Set token cookie
    setTokenCookie(res, token);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          lastLogin: user.lastLogin,
        },
        token,
        refreshToken,
      },
    });
  })
);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post(
  "/logout",
  authenticateUser,
  asyncHandler(async (req, res) => {
    // Get refresh token from request body or headers
    const refreshToken =
      req.body.refreshToken || req.headers["x-refresh-token"];

    if (refreshToken) {
      // Remove refresh token from user's tokens array
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }

    // Clear token cookie
    clearTokenCookie(res);

    res.json({
      success: true,
      message: "Logout successful",
    });
  })
);

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken);

      if (decoded.type !== "refresh") {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token type",
        });
      }

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      const tokenExists = user.refreshTokens.some(
        (t) => t.token === refreshToken
      );
      if (!tokenExists) {
        return res.status(401).json({
          success: false,
          message: "Refresh token not found or expired",
        });
      }

      // Generate new tokens
      const newToken = generateToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      // Remove old refresh token and add new one with cleanup
      user.refreshTokens = user.refreshTokens.filter(
        (t) => t.token !== refreshToken
      );
      await user.addRefreshToken(newRefreshToken);

      // Set new token cookie
      setTokenCookie(res, newToken);

      res.json({
        success: true,
        message: "Token refreshed successfully",
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }
  })
);

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get(
  "/me",
  authenticateUser,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          profileImage: req.user.profileImage,
          resumeUrl: req.user.resumeUrl,
          lastLogin: req.user.lastLogin,
          createdAt: req.user.createdAt,
        },
      },
    });
  })
);

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put(
  "/change-password",
  authenticateUser,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6, max: 128 })
      .withMessage("New password must be between 6 and 128 characters"),
    body("confirmPassword")
      .notEmpty()
      .withMessage("Password confirmation is required")
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error("Password confirmation does not match new password");
        }
        return true;
      }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Additional server-side validation for password confirmation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation password do not match",
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Check if new password is different from current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Clear all refresh tokens (force re-login on all devices for security)
    user.refreshTokens = [];
    await user.save();

    res.json({
      success: true,
      message:
        "Password changed successfully. Please login again on all devices.",
    });
  })
);

// @desc    Request password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
router.post(
  "/forgot-password",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    
    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      return res.json({
        success: true,
        message: "If an account exists with this email, an OTP has been sent.",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOTP = await bcrypt.hash(otp, salt);
    
    // Save OTP and expiry (10 minutes)
    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send OTP via email
    try {
      const { sendOTPEmail } = await import("../services/emailService.js");
      await sendOTPEmail(user.email, otp, user.name);
      
      res.json({
        success: true,
        message: "OTP has been sent to your email address. Valid for 10 minutes.",
      });
    } catch (error) {
      // Clear OTP if email fails
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpires = undefined;
      await user.save();
      
      console.error("Email sending error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again later.",
      });
    }
  })
);

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
router.post(
  "/verify-otp",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits")
      .isNumeric()
      .withMessage("OTP must contain only numbers"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    // Find user with OTP fields
    const user = await User.findByEmail(email)
      .select("+resetPasswordOTP +resetPasswordOTPExpires");

    if (!user || !user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please request a new one.",
      });
    }

    // Check if OTP is expired
    if (new Date() > user.resetPasswordOTPExpires) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpires = undefined;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Verify OTP
    const isOTPValid = await bcrypt.compare(otp, user.resetPasswordOTP);
    
    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    // OTP is valid - return success (don't clear OTP yet, needed for reset)
    res.json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
    });
  })
);

// @desc    Reset password with verified OTP
// @route   POST /api/auth/reset-password
// @access  Public
router.post(
  "/reset-password",
  [
    body("email")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits")
      .isNumeric()
      .withMessage("OTP must contain only numbers"),
    body("newPassword")
      .isLength({ min: 6, max: 128 })
      .withMessage("Password must be between 6 and 128 characters"),
    body("confirmPassword")
      .notEmpty()
      .withMessage("Password confirmation is required")
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error("Password confirmation does not match");
        }
        return true;
      }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, otp, newPassword, confirmPassword } = req.body;

    // Additional server-side validation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Find user with OTP and password fields
    const user = await User.findByEmail(email)
      .select("+resetPasswordOTP +resetPasswordOTPExpires +password");

    if (!user || !user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please request a new one.",
      });
    }

    // Check if OTP is expired
    if (new Date() > user.resetPasswordOTPExpires) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpires = undefined;
      await user.save();
      
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Verify OTP
    const isOTPValid = await bcrypt.compare(otp, user.resetPasswordOTP);
    
    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password",
      });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    
    // Clear all refresh tokens for security
    user.refreshTokens = [];
    
    await user.save();

    // Send confirmation email
    try {
      const { sendPasswordResetConfirmation } = await import("../services/emailService.js");
      await sendPasswordResetConfirmation(user.email, user.name);
    } catch (error) {
      console.error("Failed to send confirmation email:", error);
      // Don't fail the request if confirmation email fails
    }

    res.json({
      success: true,
      message: "Password reset successful. Please login with your new password.",
    });
  })
);

export default router;
