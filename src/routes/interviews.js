import express from "express";
import asyncHandler from "express-async-handler";

import Interview from "../models/Interview.js";
import { authenticateUser } from "../middleware/auth.js";
import { body, query, param, validationResult } from "express-validator";
import { generateInterviewQuestions } from "../config/gemini.js";

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// @desc    Generate new interview
// @route   POST /api/interviews/generate
// @access  Private
router.post(
  "/generate",
  authenticateUser,
  [
    body("techStack")
      .isArray({ min: 1, max: 10 })
      .withMessage("Tech stack must be an array with 1-10 technologies"),
    body("techStack.*")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Each technology must be between 1 and 50 characters"),
    body("hardnessLevel")
      .isIn(["Easy", "Medium", "Hard"])
      .withMessage("Hardness level must be one of: Easy, Medium, Hard"),
    body("experienceLevel")
      .isIn(["Fresher", "Junior", "Mid", "Senior", "Lead"])
      .withMessage(
        "Experience level must be one of: Fresher, Junior, Mid, Senior, Lead"
      ),
    body("numberOfQuestions")
      .isInt({ min: 3, max: 20 })
      .withMessage("Number of questions must be between 3 and 20"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { techStack, hardnessLevel, experienceLevel, numberOfQuestions } =
      req.body;
    const userId = req.user._id;

    try {
      // Generate questions using AI
      const questions = await generateInterviewQuestions({
        techStack,
        hardnessLevel,
        experienceLevel,
        numberOfQuestions: parseInt(numberOfQuestions),
      });

      // Create interview record
      const interview = await Interview.create({
        userId,
        techStack: techStack.map((tech) => tech.trim()),
        hardnessLevel,
        experienceLevel,
        numberOfQuestions: parseInt(numberOfQuestions),
        questions,
        status: "generated",
        metadata: {
          generatedBy: "AI",
          aiModel: "gemini-2.0-flash-001",
          generationPrompt: `${techStack.join(
            ", "
          )} - ${experienceLevel} - ${hardnessLevel}`,
        },
      });

      await interview.populate("userId", "name email");

      res.status(201).json({
        success: true,
        message: "Interview generated successfully",
        data: {
          interview,
        },
      });
    } catch (error) {
      console.error("Error generating interview:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate interview. Please try again.",
      });
    }
  })
);

// @desc    Get user's interviews
// @route   GET /api/interviews
// @access  Private
router.get(
  "/",
  authenticateUser,
  [
    query("status")
      .optional()
      .isIn(["generated", "in_progress", "completed", "abandoned"])
      .withMessage("Invalid status"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (status) query.status = status;

    const interviews = await Interview.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("userId", "name email");

    const total = await Interview.countDocuments(query);

    res.json({
      success: true,
      data: {
        interviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// @desc    Get single interview
// @route   GET /api/interviews/:id
// @access  Private
router.get(
  "/:id",
  authenticateUser,
  [param("id").isMongoId().withMessage("Invalid interview ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const interview = await Interview.findOne({ _id: id, userId }).populate(
      "userId",
      "name email"
    );

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    res.json({
      success: true,
      data: {
        interview,
      },
    });
  })
);

// @desc    Start interview
// @route   POST /api/interviews/:id/start
// @access  Private
router.post(
  "/:id/start",
  authenticateUser,
  [param("id").isMongoId().withMessage("Invalid interview ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const interview = await Interview.findOne({ _id: id, userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (interview.status !== "generated") {
      return res.status(400).json({
        success: false,
        message: "Interview has already been started or completed",
      });
    }

    await interview.startInterview();

    res.json({
      success: true,
      message: "Interview started successfully",
      data: {
        interview,
      },
    });
  })
);

// @desc    Complete interview
// @route   POST /api/interviews/:id/complete
// @access  Private
router.post(
  "/:id/complete",
  authenticateUser,
  [param("id").isMongoId().withMessage("Invalid interview ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const interview = await Interview.findOne({ _id: id, userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    if (interview.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Interview is not in progress",
      });
    }

    await interview.completeInterview();

    res.json({
      success: true,
      message: "Interview completed successfully",
      data: {
        interview,
      },
    });
  })
);

// @desc    Delete interview
// @route   DELETE /api/interviews/:id
// @access  Private
router.delete(
  "/:id",
  authenticateUser,
  [param("id").isMongoId().withMessage("Invalid interview ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const interview = await Interview.findOneAndDelete({ _id: id, userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Also delete related answers and results
    const Answer = (await import("../models/Answer.js")).default;
    const FinalResult = (await import("../models/FinalResult.js")).default;

    await Promise.all([
      Answer.deleteMany({ interviewId: id }),
      FinalResult.deleteOne({ interviewId: id, userId }),
    ]);

    res.json({
      success: true,
      message: "Interview deleted successfully",
    });
  })
);

// @desc    Get interview statistics
// @route   GET /api/interviews/stats/overview
// @access  Private
router.get(
  "/stats/overview",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const stats = await Interview.aggregate([
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
          byHardness: {
            $push: "$hardnessLevel",
          },
          byExperience: {
            $push: "$experienceLevel",
          },
          avgQuestions: { $avg: "$numberOfQuestions" },
        },
      },
    ]);

    const result = stats[0] || {
      total: 0,
      generated: 0,
      inProgress: 0,
      completed: 0,
      abandoned: 0,
      byHardness: [],
      byExperience: [],
      avgQuestions: 0,
    };

    // Process hardness distribution
    const hardnessDistribution = result.byHardness.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    // Process experience distribution
    const experienceDistribution = result.byExperience.reduce((acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total: result.total,
        statusDistribution: {
          generated: result.generated,
          inProgress: result.inProgress,
          completed: result.completed,
          abandoned: result.abandoned,
        },
        hardnessDistribution,
        experienceDistribution,
        averageQuestions: Math.round(result.avgQuestions || 0),
      },
    });
  })
);

export default router;
