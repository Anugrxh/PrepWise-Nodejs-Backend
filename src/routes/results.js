import express from "express";
import asyncHandler from "express-async-handler";

import FinalResult from "../models/FinalResult.js";
import Interview from "../models/Interview.js";
import Answer from "../models/Answer.js";
import { authenticateUser } from "../middleware/auth.js";
import { param, query, validationResult } from "express-validator";
import { generateFinalResult } from "../config/gemini.js";
import { aggregateFacialAnalysis } from "../services/facialAnalysis.js";

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

// @desc    Generate final result for completed interview
// @route   POST /api/results/generate/:interviewId
// @access  Private
router.post(
  "/generate/:interviewId",
  authenticateUser,
  [param("interviewId").isMongoId().withMessage("Invalid interview ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { interviewId } = req.params;
    const userId = req.user._id;

    // Verify interview exists and belongs to user
    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Check if interview is completed
    if (interview.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Interview must be completed before generating results",
      });
    }

    // Check if result already exists
    const existingResult = await FinalResult.findOne({ interviewId, userId });
    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "Final result already exists for this interview",
      });
    }

    try {
      // Get all answers for the interview
      const answers = await Answer.getInterviewAnswers(interviewId, userId);

      if (answers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No answers found for this interview",
        });
      }

      // Aggregate facial analysis results
      const facialAnalysisResults = answers
        .map((answer) => answer.facialAnalysis)
        .filter((analysis) => analysis && analysis.overallScore > 0);

      const aggregatedFacialAnalysis = aggregateFacialAnalysis(
        facialAnalysisResults
      );

      // Generate final result using AI
      const startTime = Date.now();
      const aiResult = await generateFinalResult({
        answers,
        interview,
        facialAnalysisResults: aggregatedFacialAnalysis,
      });
      const processingTime = Date.now() - startTime;

      // Calculate completion metrics
      const completionTime = interview.duration || 0;
      const questionsAnswered = answers.length;
      const totalQuestions = interview.numberOfQuestions;

      // Create final result
      const finalResult = await FinalResult.create({
        interviewId,
        userId,
        overallScore: aiResult.overallScore,
        categoryScores: aiResult.categoryScores,
        strengths: aiResult.strengths,
        weaknesses: aiResult.weaknesses,
        recommendations: aiResult.recommendations,
        detailedFeedback: aiResult.detailedFeedback,
        completionTime,
        questionsAnswered,
        totalQuestions,
        metadata: {
          aiModel: "gemini-2.0-flash-001",
          facialAnalysisModel: "django-facial-analysis",
          processingTime,
        },
      });

      await finalResult.populate([
        {
          path: "interviewId",
          select: "techStack hardnessLevel experienceLevel numberOfQuestions",
        },
        { path: "userId", select: "name email" },
      ]);

      res.status(201).json({
        success: true,
        message: "Final result generated successfully",
        data: {
          result: finalResult,
          facialAnalysisSummary: aggregatedFacialAnalysis,
        },
      });
    } catch (error) {
      console.error("Error generating final result:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate final result. Please try again.",
      });
    }
  })
);

// @desc    Get final result for an interview
// @route   GET /api/results/interview/:interviewId
// @access  Private
router.get(
  "/interview/:interviewId",
  authenticateUser,
  [param("interviewId").isMongoId().withMessage("Invalid interview ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { interviewId } = req.params;
    const userId = req.user._id;

    const result = await FinalResult.findOne({ interviewId, userId })
      .populate(
        "interviewId",
        "techStack hardnessLevel experienceLevel numberOfQuestions duration"
      )
      .populate("userId", "name email");

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Final result not found for this interview",
      });
    }

    // Get detailed answers for context
    const answers = await Answer.getInterviewAnswers(interviewId, userId);

    // Aggregate facial analysis for summary
    const facialAnalysisResults = answers
      .map((answer) => answer.facialAnalysis)
      .filter((analysis) => analysis && analysis.overallScore > 0);

    const facialAnalysisSummary = aggregateFacialAnalysis(
      facialAnalysisResults
    );

    res.json({
      success: true,
      data: {
        result,
        answersCount: answers.length,
        facialAnalysisSummary,
      },
    });
  })
);

// @desc    Get user's all results
// @route   GET /api/results
// @access  Private
router.get(
  "/",
  authenticateUser,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("sort")
      .optional()
      .isIn(["createdAt", "-createdAt", "overallScore", "-overallScore"])
      .withMessage("Invalid sort parameter"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sort = "-createdAt" } = req.query;
    const userId = req.user._id;

    const results = await FinalResult.find({ userId })
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate(
        "interviewId",
        "techStack hardnessLevel experienceLevel numberOfQuestions"
      )
      .populate("userId", "name email");

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
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// @desc    Get single result
// @route   GET /api/results/:id
// @access  Private
router.get(
  "/:id",
  authenticateUser,
  [param("id").isMongoId().withMessage("Invalid result ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await FinalResult.findOne({ _id: id, userId })
      .populate(
        "interviewId",
        "techStack hardnessLevel experienceLevel numberOfQuestions duration"
      )
      .populate("userId", "name email");

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    res.json({
      success: true,
      data: {
        result,
      },
    });
  })
);

// @desc    Delete result
// @route   DELETE /api/results/:id
// @access  Private
router.delete(
  "/:id",
  authenticateUser,
  [param("id").isMongoId().withMessage("Invalid result ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await FinalResult.findOneAndDelete({ _id: id, userId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    res.json({
      success: true,
      message: "Result deleted successfully",
    });
  })
);

// @desc    Get performance analytics
// @route   GET /api/results/analytics/performance
// @access  Private
router.get(
  "/analytics/performance",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const analytics = await FinalResult.getPerformanceAnalytics(userId);

    // Get additional insights
    const results = await FinalResult.find({ userId }).sort({ createdAt: 1 });

    // Calculate category trends
    const categoryTrends = {};
    const categories = [
      "technicalKnowledge",
      "communication",
      "problemSolving",
      "confidence",
      "facialAnalysis",
    ];

    categories.forEach((category) => {
      const scores = results
        .map((r) => r.categoryScores[category])
        .filter((s) => s > 0);
      if (scores.length > 0) {
        categoryTrends[category] = {
          average: Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length
          ),
          best: Math.max(...scores),
          latest: scores[scores.length - 1] || 0,
          trend: scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0,
        };
      }
    });

    // Calculate grade distribution
    const gradeDistribution = results.reduce((acc, result) => {
      acc[result.grade] = (acc[result.grade] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        ...analytics,
        categoryTrends,
        gradeDistribution,
        insights: {
          mostImprovedCategory: Object.keys(categoryTrends).reduce(
            (a, b) =>
              categoryTrends[a]?.trend > categoryTrends[b]?.trend ? a : b,
            "technicalKnowledge"
          ),
          strongestCategory: Object.keys(categoryTrends).reduce(
            (a, b) =>
              categoryTrends[a]?.average > categoryTrends[b]?.average ? a : b,
            "technicalKnowledge"
          ),
          needsImprovement: Object.keys(categoryTrends).filter(
            (cat) => categoryTrends[cat]?.average < 70
          ),
        },
      },
    });
  })
);

// @desc    Compare results
// @route   GET /api/results/compare/:id1/:id2
// @access  Private
router.get(
  "/compare/:id1/:id2",
  authenticateUser,
  [
    param("id1").isMongoId().withMessage("Invalid first result ID"),
    param("id2").isMongoId().withMessage("Invalid second result ID"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id1, id2 } = req.params;
    const userId = req.user._id;

    const [result1, result2] = await Promise.all([
      FinalResult.findOne({ _id: id1, userId }).populate(
        "interviewId",
        "techStack hardnessLevel experienceLevel"
      ),
      FinalResult.findOne({ _id: id2, userId }).populate(
        "interviewId",
        "techStack hardnessLevel experienceLevel"
      ),
    ]);

    if (!result1 || !result2) {
      return res.status(404).json({
        success: false,
        message: "One or both results not found",
      });
    }

    // Calculate improvements/changes
    const overallScoreChange = result2.overallScore - result1.overallScore;

    const categoryChanges = {};
    Object.keys(result1.categoryScores).forEach((category) => {
      categoryChanges[category] =
        result2.categoryScores[category] - result1.categoryScores[category];
    });

    // Determine improvement areas
    const improvements = Object.keys(categoryChanges).filter(
      (cat) => categoryChanges[cat] > 0
    );
    const declines = Object.keys(categoryChanges).filter(
      (cat) => categoryChanges[cat] < 0
    );

    res.json({
      success: true,
      data: {
        result1,
        result2,
        comparison: {
          overallScoreChange,
          categoryChanges,
          improvements,
          declines,
          timeDifference:
            new Date(result2.createdAt) - new Date(result1.createdAt),
          gradeChange: result1.grade !== result2.grade,
        },
      },
    });
  })
);

export default router;
