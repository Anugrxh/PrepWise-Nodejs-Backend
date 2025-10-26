import express from "express";
import asyncHandler from "express-async-handler";

import Answer from "../models/Answer.js";
import Interview from "../models/Interview.js";
import { authenticateUser } from "../middleware/auth.js";
import { param, query, validationResult } from "express-validator";

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

// @desc    Get facial analysis data for an interview
// @route   GET /api/facial-analysis/interview/:interviewId
// @access  Private
router.get(
  "/interview/:interviewId",
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

    // Get all answers with facial analysis for this interview
    const answers = await Answer.find({
      interviewId,
      userId,
      facialAnalysis: { $exists: true, $ne: null },
    })
      .sort({ questionNumber: 1 })
      .select("questionNumber questionText facialAnalysis answerDuration submittedAt");

    if (answers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No facial analysis data found for this interview",
      });
    }

    // Calculate overall facial analysis metrics
    const facialAnalysisData = answers.map((answer) => answer.facialAnalysis);
    
    // Calculate averages
    const averageConfidence = Math.round(
      facialAnalysisData.reduce((sum, fa) => sum + (fa.confidence || 0), 0) /
        facialAnalysisData.length
    );

    const averageEyeContact = Math.round(
      facialAnalysisData.reduce((sum, fa) => sum + (fa.eyeContact || 0), 0) /
        facialAnalysisData.length
    );

    const averageSpeechClarity = Math.round(
      facialAnalysisData.reduce((sum, fa) => sum + (fa.speechClarity || 0), 0) /
        facialAnalysisData.length
    );

    const averageOverallScore = Math.round(
      facialAnalysisData.reduce((sum, fa) => sum + (fa.overallScore || 0), 0) /
        facialAnalysisData.length
    );

    // Calculate emotion averages
    const emotionKeys = ["happy", "sad", "angry", "fear", "surprise", "disgust", "neutral"];
    const averageEmotions = {};

    emotionKeys.forEach((emotion) => {
      const emotionScores = facialAnalysisData
        .map((fa) => fa.emotions?.[emotion] || 0)
        .filter((score) => score > 0);
      
      averageEmotions[emotion] = emotionScores.length > 0
        ? Math.round(emotionScores.reduce((sum, score) => sum + score, 0) / emotionScores.length)
        : 0;
    });

    // Find dominant emotion
    const dominantEmotion = Object.keys(averageEmotions).reduce((a, b) =>
      averageEmotions[a] > averageEmotions[b] ? a : b
    );

    // Create question-by-question breakdown
    const questionBreakdown = answers.map((answer) => ({
      questionNumber: answer.questionNumber,
      questionText: answer.questionText,
      answerDuration: answer.answerDuration,
      facialAnalysis: {
        confidence: answer.facialAnalysis.confidence,
        eyeContact: answer.facialAnalysis.eyeContact,
        speechClarity: answer.facialAnalysis.speechClarity,
        overallScore: answer.facialAnalysis.overallScore,
        emotions: answer.facialAnalysis.emotions,
        feedback: answer.facialAnalysis.feedback,
      },
      submittedAt: answer.submittedAt,
    }));

    // Generate insights based on facial analysis
    const insights = generateFacialAnalysisInsights({
      averageConfidence,
      averageEyeContact,
      averageSpeechClarity,
      dominantEmotion,
      questionBreakdown,
    });

    // Create timeline data for visualization
    const timeline = questionBreakdown.map((item, index) => ({
      questionNumber: item.questionNumber,
      timestamp: index + 1,
      confidence: item.facialAnalysis.confidence,
      eyeContact: item.facialAnalysis.eyeContact,
      speechClarity: item.facialAnalysis.speechClarity,
      dominantEmotion: Object.keys(item.facialAnalysis.emotions || {}).reduce((a, b) =>
        (item.facialAnalysis.emotions[a] || 0) > (item.facialAnalysis.emotions[b] || 0) ? a : b
      ),
    }));

    res.json({
      success: true,
      data: {
        interviewId,
        interviewInfo: {
          techStack: interview.techStack,
          hardnessLevel: interview.hardnessLevel,
          experienceLevel: interview.experienceLevel,
          totalQuestions: interview.numberOfQuestions,
          analyzedQuestions: answers.length,
        },
        overallFacialAnalysis: {
          averageConfidence,
          averageEyeContact,
          averageSpeechClarity,
          averageOverallScore,
          averageEmotions,
          dominantEmotion,
        },
        questionBreakdown,
        timeline,
        insights,
        metadata: {
          totalAnswersAnalyzed: answers.length,
          analysisCompleteness: Math.round((answers.length / interview.numberOfQuestions) * 100),
          generatedAt: new Date().toISOString(),
        },
      },
    });
  })
);

// @desc    Get facial analysis summary for user (all interviews)
// @route   GET /api/facial-analysis/user/summary
// @access  Private
router.get(
  "/user/summary",
  authenticateUser,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const userId = req.user._id;

    // Get all answers with facial analysis for this user
    const answers = await Answer.find({
      userId,
      facialAnalysis: { $exists: true, $ne: null },
    })
      .populate("interviewId", "techStack hardnessLevel experienceLevel createdAt")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select("interviewId questionNumber facialAnalysis createdAt");

    if (answers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No facial analysis data found for this user",
      });
    }

    // Group by interview
    const interviewGroups = {};
    answers.forEach((answer) => {
      const interviewId = answer.interviewId._id.toString();
      if (!interviewGroups[interviewId]) {
        interviewGroups[interviewId] = {
          interviewInfo: answer.interviewId,
          answers: [],
        };
      }
      interviewGroups[interviewId].answers.push(answer);
    });

    // Calculate summary for each interview
    const interviewSummaries = Object.values(interviewGroups).map((group) => {
      const facialData = group.answers.map((a) => a.facialAnalysis);
      
      const avgConfidence = Math.round(
        facialData.reduce((sum, fa) => sum + (fa.confidence || 0), 0) / facialData.length
      );
      
      const avgOverallScore = Math.round(
        facialData.reduce((sum, fa) => sum + (fa.overallScore || 0), 0) / facialData.length
      );

      return {
        interviewId: group.interviewInfo._id,
        interviewDate: group.interviewInfo.createdAt,
        techStack: group.interviewInfo.techStack,
        hardnessLevel: group.interviewInfo.hardnessLevel,
        questionsAnalyzed: group.answers.length,
        averageConfidence: avgConfidence,
        averageOverallScore: avgOverallScore,
      };
    });

    // Calculate overall user statistics
    const allFacialData = answers.map((a) => a.facialAnalysis);
    const overallStats = {
      totalInterviewsAnalyzed: Object.keys(interviewGroups).length,
      totalQuestionsAnalyzed: answers.length,
      overallAverageConfidence: Math.round(
        allFacialData.reduce((sum, fa) => sum + (fa.confidence || 0), 0) / allFacialData.length
      ),
      overallAverageScore: Math.round(
        allFacialData.reduce((sum, fa) => sum + (fa.overallScore || 0), 0) / allFacialData.length
      ),
    };

    res.json({
      success: true,
      data: {
        overallStats,
        interviewSummaries,
        metadata: {
          totalRecords: answers.length,
          limitApplied: parseInt(limit),
          generatedAt: new Date().toISOString(),
        },
      },
    });
  })
);

// @desc    Compare facial analysis between two interviews
// @route   GET /api/facial-analysis/compare/:interviewId1/:interviewId2
// @access  Private
router.get(
  "/compare/:interviewId1/:interviewId2",
  authenticateUser,
  [
    param("interviewId1").isMongoId().withMessage("Invalid first interview ID"),
    param("interviewId2").isMongoId().withMessage("Invalid second interview ID"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { interviewId1, interviewId2 } = req.params;
    const userId = req.user._id;

    // Get facial analysis data for both interviews
    const [answers1, answers2] = await Promise.all([
      Answer.find({
        interviewId: interviewId1,
        userId,
        facialAnalysis: { $exists: true, $ne: null },
      }).populate("interviewId", "techStack hardnessLevel experienceLevel createdAt"),
      
      Answer.find({
        interviewId: interviewId2,
        userId,
        facialAnalysis: { $exists: true, $ne: null },
      }).populate("interviewId", "techStack hardnessLevel experienceLevel createdAt"),
    ]);

    if (answers1.length === 0 || answers2.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Facial analysis data not found for one or both interviews",
      });
    }

    // Calculate metrics for both interviews
    const calculateMetrics = (answers) => {
      const facialData = answers.map((a) => a.facialAnalysis);
      return {
        averageConfidence: Math.round(
          facialData.reduce((sum, fa) => sum + (fa.confidence || 0), 0) / facialData.length
        ),
        averageEyeContact: Math.round(
          facialData.reduce((sum, fa) => sum + (fa.eyeContact || 0), 0) / facialData.length
        ),
        averageSpeechClarity: Math.round(
          facialData.reduce((sum, fa) => sum + (fa.speechClarity || 0), 0) / facialData.length
        ),
        averageOverallScore: Math.round(
          facialData.reduce((sum, fa) => sum + (fa.overallScore || 0), 0) / facialData.length
        ),
      };
    };

    const metrics1 = calculateMetrics(answers1);
    const metrics2 = calculateMetrics(answers2);

    // Calculate improvements/changes
    const comparison = {
      confidenceChange: metrics2.averageConfidence - metrics1.averageConfidence,
      eyeContactChange: metrics2.averageEyeContact - metrics1.averageEyeContact,
      speechClarityChange: metrics2.averageSpeechClarity - metrics1.averageSpeechClarity,
      overallScoreChange: metrics2.averageOverallScore - metrics1.averageOverallScore,
    };

    // Determine improvement areas
    const improvements = [];
    const declines = [];

    Object.keys(comparison).forEach((key) => {
      if (comparison[key] > 0) {
        improvements.push(key.replace('Change', ''));
      } else if (comparison[key] < 0) {
        declines.push(key.replace('Change', ''));
      }
    });

    res.json({
      success: true,
      data: {
        interview1: {
          id: interviewId1,
          info: answers1[0].interviewId,
          metrics: metrics1,
          questionsAnalyzed: answers1.length,
        },
        interview2: {
          id: interviewId2,
          info: answers2[0].interviewId,
          metrics: metrics2,
          questionsAnalyzed: answers2.length,
        },
        comparison,
        improvements,
        declines,
        overallImprovement: comparison.overallScoreChange > 0,
        timeDifference: new Date(answers2[0].interviewId.createdAt) - new Date(answers1[0].interviewId.createdAt),
      },
    });
  })
);

// Helper function to generate insights
function generateFacialAnalysisInsights({
  averageConfidence,
  averageEyeContact,
  averageSpeechClarity,
  dominantEmotion,
  questionBreakdown,
}) {
  const insights = [];

  // Confidence insights
  if (averageConfidence >= 80) {
    insights.push({
      type: "strength",
      category: "confidence",
      message: "Excellent confidence levels maintained throughout the interview",
      score: averageConfidence,
    });
  } else if (averageConfidence >= 60) {
    insights.push({
      type: "improvement",
      category: "confidence",
      message: "Good confidence with room for improvement in certain areas",
      score: averageConfidence,
    });
  } else {
    insights.push({
      type: "concern",
      category: "confidence",
      message: "Consider working on building confidence for future interviews",
      score: averageConfidence,
    });
  }

  // Eye contact insights
  if (averageEyeContact >= 75) {
    insights.push({
      type: "strength",
      category: "eyeContact",
      message: "Maintained excellent eye contact with the interviewer",
      score: averageEyeContact,
    });
  } else if (averageEyeContact >= 50) {
    insights.push({
      type: "improvement",
      category: "eyeContact",
      message: "Good eye contact, try to maintain it more consistently",
      score: averageEyeContact,
    });
  } else {
    insights.push({
      type: "concern",
      category: "eyeContact",
      message: "Focus on maintaining better eye contact with the interviewer",
      score: averageEyeContact,
    });
  }

  // Speech clarity insights
  if (averageSpeechClarity >= 75) {
    insights.push({
      type: "strength",
      category: "speechClarity",
      message: "Speech was clear and well-articulated throughout",
      score: averageSpeechClarity,
    });
  } else {
    insights.push({
      type: "improvement",
      category: "speechClarity",
      message: "Work on speaking more clearly and at an appropriate pace",
      score: averageSpeechClarity,
    });
  }

  // Emotion insights
  if (dominantEmotion === "happy" || dominantEmotion === "neutral") {
    insights.push({
      type: "strength",
      category: "emotions",
      message: "Maintained a positive and professional demeanor",
      emotion: dominantEmotion,
    });
  } else if (dominantEmotion === "fear" || dominantEmotion === "sad") {
    insights.push({
      type: "improvement",
      category: "emotions",
      message: "Try to project more confidence and positivity during interviews",
      emotion: dominantEmotion,
    });
  }

  // Performance trend insights
  if (questionBreakdown.length > 1) {
    const firstHalf = questionBreakdown.slice(0, Math.ceil(questionBreakdown.length / 2));
    const secondHalf = questionBreakdown.slice(Math.ceil(questionBreakdown.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, q) => sum + q.facialAnalysis.confidence, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, q) => sum + q.facialAnalysis.confidence, 0) / secondHalf.length;

    if (secondHalfAvg > firstHalfAvg + 5) {
      insights.push({
        type: "strength",
        category: "trend",
        message: "Confidence improved as the interview progressed",
        trend: "improving",
      });
    } else if (firstHalfAvg > secondHalfAvg + 5) {
      insights.push({
        type: "concern",
        category: "trend",
        message: "Confidence decreased during the interview - consider pacing strategies",
        trend: "declining",
      });
    }
  }

  return insights;
}

export default router;