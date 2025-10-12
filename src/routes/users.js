import express from "express";
import asyncHandler from "express-async-handler";
import multer from "multer";
import { body } from "express-validator";

import User from "../models/User.js";
import Interview from "../models/Interview.js";
import Answer from "../models/Answer.js";
import FinalResult from "../models/FinalResult.js";
import { authenticateUser } from "../middleware/auth.js";
import { updateProfileValidation, validate } from "../middleware/validation.js";

const router = express.Router();

// Configure multer for profile image uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for profile images
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for profile pictures"), false);
    }
  },
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get(
  "/profile",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const user = req.user;

    // Get user statistics
    const [interviewCount, resultsCount, avgScore] = await Promise.all([
      Interview.countDocuments({ userId: user._id }),
      FinalResult.countDocuments({ userId: user._id }),
      FinalResult.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, avgScore: { $avg: "$overallScore" } } },
      ]),
    ]);

    const averageScore =
      avgScore.length > 0 ? Math.round(avgScore[0].avgScore) : 0;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
          resumeUrl: user.resumeUrl,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
        stats: {
          interviewsCreated: interviewCount,
          interviewsTaken: resultsCount,
          averageScore,
        },
      },
    });
  })
);

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put(
  "/profile",
  authenticateUser,
  updateProfileValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    const user = req.user;

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already taken by another user",
        });
      }
    }

    // Update user fields
    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (email) updateFields.email = email.toLowerCase();

    const updatedUser = await User.findByIdAndUpdate(user._id, updateFields, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          profileImage: updatedUser.profileImage,
          resumeUrl: updatedUser.resumeUrl,
          lastLogin: updatedUser.lastLogin,
          createdAt: updatedUser.createdAt,
        },
      },
    });
  })
);

// @desc    Get user dashboard stats
// @route   GET /api/users/stats
// @access  Private
router.get(
  "/stats",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Get comprehensive user statistics
    const [interviewStats, resultStats, recentActivity] = await Promise.all([
      // Interview statistics
      Interview.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            generated: {
              $sum: { $cond: [{ $eq: ["$status", "generated"] }, 1, 0] },
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
            },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            abandoned: {
              $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] },
            },
            byHardness: { $push: "$hardnessLevel" },
            byExperience: { $push: "$experienceLevel" },
          },
        },
      ]),

      // Results statistics
      FinalResult.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgScore: { $avg: "$overallScore" },
            maxScore: { $max: "$overallScore" },
            minScore: { $min: "$overallScore" },
            passed: { $sum: { $cond: ["$passed", 1, 0] } },
            categoryAvgs: { $push: "$categoryScores" },
          },
        },
      ]),

      // Recent activity (last 5 interviews and results)
      Promise.all([
        Interview.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("techStack hardnessLevel experienceLevel status createdAt"),
        FinalResult.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("interviewId", "techStack hardnessLevel experienceLevel")
          .select("overallScore grade passed createdAt"),
      ]),
    ]);

    // Process interview stats
    const interviewData = interviewStats[0] || {
      total: 0,
      generated: 0,
      inProgress: 0,
      completed: 0,
      abandoned: 0,
      byHardness: [],
      byExperience: [],
    };

    // Process hardness distribution
    const hardnessDistribution = interviewData.byHardness.reduce(
      (acc, level) => {
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {}
    );

    // Process experience distribution
    const experienceDistribution = interviewData.byExperience.reduce(
      (acc, level) => {
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {}
    );

    // Process result stats
    const resultData = resultStats[0] || {
      total: 0,
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      passed: 0,
      categoryAvgs: [],
    };

    // Calculate category averages
    const categoryAverages = {};
    if (resultData.categoryAvgs.length > 0) {
      const categories = [
        "technicalKnowledge",
        "communication",
        "problemSolving",
        "confidence",
        "facialAnalysis",
      ];
      categories.forEach((category) => {
        const scores = resultData.categoryAvgs
          .map((cat) => cat[category])
          .filter((score) => score > 0);
        categoryAverages[category] =
          scores.length > 0
            ? Math.round(
                scores.reduce((sum, score) => sum + score, 0) / scores.length
              )
            : 0;
      });
    }

    // Process recent activity
    const [recentInterviews, recentResults] = recentActivity;

    // Calculate pass rate
    const passRate =
      resultData.total > 0
        ? Math.round((resultData.passed / resultData.total) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        overview: {
          interviewsCreated: interviewData.total,
          interviewsTaken: resultData.total,
          averageScore: Math.round(resultData.avgScore || 0),
          passRate,
        },
        interviews: {
          total: interviewData.total,
          statusDistribution: {
            generated: interviewData.generated,
            inProgress: interviewData.inProgress,
            completed: interviewData.completed,
            abandoned: interviewData.abandoned,
          },
          hardnessDistribution,
          experienceDistribution,
        },
        performance: {
          totalResults: resultData.total,
          averageScore: Math.round(resultData.avgScore || 0),
          bestScore: resultData.maxScore || 0,
          lowestScore: resultData.minScore || 0,
          passRate,
          categoryAverages,
        },
        recentActivity: {
          interviews: recentInterviews,
          results: recentResults,
        },
      },
    });
  })
);

// @desc    Get user's interview history
// @route   GET /api/users/interviews
// @access  Private
router.get(
  "/interviews",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sort = "-createdAt" } = req.query;
    const userId = req.user._id;

    const interviews = await Interview.find({ userId })
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Interview.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        interviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// @desc    Get user's results history
// @route   GET /api/users/results
// @access  Private
router.get(
  "/results",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const results = await FinalResult.getUserResults(userId, limit);
    const total = await FinalResult.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// @desc    Update user profile image
// @route   PUT /api/users/profile-image
// @access  Private
router.put(
  "/profile-image",
  authenticateUser,
  upload.single("profileImage"),
  [
    body("profileImageUrl")
      .optional()
      .isURL()
      .withMessage("Profile image URL must be a valid URL"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { profileImageUrl } = req.body;

    let imageUrl = null;

    // Handle file upload
    if (req.file) {
      // Convert uploaded file to base64 data URL for storage
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      imageUrl = base64Image;
    } 
    // Handle URL provided in request body
    else if (profileImageUrl) {
      imageUrl = profileImageUrl;
    } 
    // Handle removal of profile image
    else if (req.body.hasOwnProperty('profileImageUrl') && profileImageUrl === null) {
      imageUrl = null;
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide either a profile image file or a valid image URL, or set profileImageUrl to null to remove the image",
      });
    }

    try {
      // Update user's profile image
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { profileImage: imageUrl },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: imageUrl 
          ? "Profile image updated successfully" 
          : "Profile image removed successfully",
        data: {
          user: {
            id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            profileImage: updatedUser.profileImage,
            resumeUrl: updatedUser.resumeUrl,
            lastLogin: updatedUser.lastLogin,
            createdAt: updatedUser.createdAt,
          },
        },
      });
    } catch (error) {
      console.error("Error updating profile image:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update profile image. Please try again.",
      });
    }
  })
);

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
router.delete(
  "/account",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Delete user's interviews, answers, results, and user account
    await Promise.all([
      Interview.deleteMany({ userId }),
      Answer.deleteMany({ userId }),
      FinalResult.deleteMany({ userId }),
      User.findByIdAndDelete(userId),
    ]);

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  })
);

export default router;
