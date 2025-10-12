import express from "express";
import asyncHandler from "express-async-handler";
import multer from "multer";

import Answer from "../models/Answer.js";
import Interview from "../models/Interview.js";
import { authenticateUser } from "../middleware/auth.js";
import { body, param, validationResult } from "express-validator";
import { evaluateAnswer } from "../config/gemini.js";
import {
  facialAnalysisService,
  processFacialAnalysisData,
} from "../services/facialAnalysis.js";

const router = express.Router();

// Configure multer for file uploads (for facial analysis)
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"), false);
    }
  },
});

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

// @desc    Submit all answers for an interview at once
// @route   POST /api/answers/bulk
// @access  Private
router.post(
  "/bulk",
  authenticateUser,
  upload.single("facialData"),
  [
    body("interviewId").isMongoId().withMessage("Invalid interview ID"),
    body("answers")
      .isArray({ min: 1 })
      .withMessage("Answers must be an array with at least one answer"),
    body("answers.*.questionNumber")
      .isInt({ min: 1 })
      .withMessage("Question number must be a positive integer"),
    body("answers.*.answerText")
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage("Answer must be between 10 and 5000 characters"),
    body("answers.*.answerDuration")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Answer duration must be a positive integer"),
    body("totalInterviewDuration")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Total interview duration must be a positive integer"),
    body("facialAnalysisData")
      .optional()
      .isObject()
      .withMessage("Facial analysis data must be an object"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const {
      interviewId,
      answers,
      totalInterviewDuration = 0,
      facialAnalysisData,
    } = req.body;
    const userId = req.user._id;

    // Verify interview exists and belongs to user
    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Check if interview is in progress
    if (interview.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Interview is not in progress",
      });
    }

    try {
      // Process facial analysis once for the entire interview
      let overallFacialAnalysis = null;
      if (facialAnalysisData || req.file) {
        try {
          let analysisPayload;

          if (req.file) {
            // If file uploaded, use file data
            analysisPayload = {
              userId: userId.toString(),
              interviewId: interviewId.toString(),
              mediaData: req.file.buffer.toString("base64"),
              mediaType: req.file.mimetype,
              duration: totalInterviewDuration,
              analysisType: "full_interview",
            };
          } else if (facialAnalysisData) {
            // If facial analysis data provided directly
            analysisPayload = {
              userId: userId.toString(),
              interviewId: interviewId.toString(),
              ...facialAnalysisData,
              duration: totalInterviewDuration,
              analysisType: "full_interview",
            };
          }

          const rawFacialAnalysis =
            await facialAnalysisService.analyzeInterviewSession(
              analysisPayload
            );
          overallFacialAnalysis = processFacialAnalysisData(rawFacialAnalysis);
        } catch (facialError) {
          console.error("Facial analysis failed:", facialError);
          // Use fallback facial analysis
          overallFacialAnalysis = {
            confidence: 70,
            emotions: { neutral: 70, happy: 20, fear: 10 },
            eyeContact: 65,
            speechClarity: 70,
            overallScore: 68,
            feedback: "Facial analysis service unavailable",
          };
        }
      }

      // Process each answer
      const processedAnswers = [];
      const answerPromises = answers.map(async (answerData) => {
        const { questionNumber, answerText, answerDuration = 0 } = answerData;

        // Get the specific question
        const question = interview.questions.find(
          (q) => q.questionNumber === parseInt(questionNumber)
        );
        if (!question) {
          throw new Error(`Question ${questionNumber} not found`);
        }

        // Check if answer already exists
        const existingAnswer = await Answer.findOne({
          interviewId,
          userId,
          questionNumber,
        });
        if (existingAnswer) {
          throw new Error(
            `Answer already exists for question ${questionNumber}`
          );
        }

        // Evaluate answer using AI
        const aiEvaluation = await evaluateAnswer({
          questionText: question.questionText,
          answerText,
          expectedAnswer: question.expectedAnswer,
          techStack: interview.techStack,
          experienceLevel: interview.experienceLevel,
        });

        // Create answer record
        const answer = await Answer.create({
          interviewId,
          userId,
          questionNumber: parseInt(questionNumber),
          questionText: question.questionText,
          answerText: answerText.trim(),
          answerDuration: parseInt(answerDuration),
          facialAnalysis: overallFacialAnalysis, // Same facial analysis for all answers
          aiEvaluation,
        });

        return answer;
      });

      const createdAnswers = await Promise.all(answerPromises);

      // Populate interview data for response
      await Promise.all(
        createdAnswers.map((answer) =>
          answer.populate(
            "interviewId",
            "techStack hardnessLevel experienceLevel numberOfQuestions"
          )
        )
      );

      res.status(201).json({
        success: true,
        message: "All answers submitted successfully",
        data: {
          answers: createdAnswers.map((answer) => ({
            ...answer.toJSON(),
            // Return simplified facial analysis for performance
            facialAnalysis: overallFacialAnalysis
              ? {
                  overallScore: overallFacialAnalysis.overallScore,
                  confidence: overallFacialAnalysis.confidence,
                  feedback: overallFacialAnalysis.feedback,
                }
              : null,
          })),
          overallFacialAnalysis,
          totalAnswers: createdAnswers.length,
          completionPercentage: Math.round(
            (createdAnswers.length / interview.numberOfQuestions) * 100
          ),
        },
      });
    } catch (error) {
      console.error("Error submitting answers:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to submit answers. Please try again.",
      });
    }
  })
);

// @desc    Submit answer for a question
// @route   POST /api/answers
// @access  Private
router.post(
  "/",
  authenticateUser,
  upload.single("facialData"),
  [
    body("interviewId").isMongoId().withMessage("Invalid interview ID"),
    body("questionNumber")
      .isInt({ min: 1 })
      .withMessage("Question number must be a positive integer"),
    body("answerText")
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage("Answer must be between 10 and 5000 characters"),
    body("answerDuration")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Answer duration must be a positive integer"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const {
      interviewId,
      questionNumber,
      answerText,
      answerDuration = 0,
    } = req.body;
    const userId = req.user._id;

    // Verify interview exists and belongs to user
    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Check if interview is in progress
    if (interview.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Interview is not in progress",
      });
    }

    // Verify question number is valid
    if (questionNumber > interview.numberOfQuestions) {
      return res.status(400).json({
        success: false,
        message: "Invalid question number",
      });
    }

    // Get the specific question
    const question = interview.questions.find(
      (q) => q.questionNumber === parseInt(questionNumber)
    );
    if (!question) {
      return res.status(400).json({
        success: false,
        message: "Question not found",
      });
    }

    try {
      // Check if answer already exists
      const existingAnswer = await Answer.findOne({
        interviewId,
        userId,
        questionNumber,
      });
      if (existingAnswer) {
        return res.status(400).json({
          success: false,
          message: "Answer already submitted for this question",
        });
      }

      // Evaluate answer using AI
      const aiEvaluation = await evaluateAnswer({
        questionText: question.questionText,
        answerText,
        expectedAnswer: question.expectedAnswer,
        techStack: interview.techStack,
        experienceLevel: interview.experienceLevel,
      });

      // Process facial analysis if data provided
      let facialAnalysis = null;
      if (req.file) {
        try {
          // Prepare data for facial analysis service
          const facialData = {
            userId: userId.toString(),
            interviewId: interviewId.toString(),
            questionNumber,
            mediaData: req.file.buffer.toString("base64"),
            mediaType: req.file.mimetype,
            duration: answerDuration,
          };

          const rawFacialAnalysis =
            await facialAnalysisService.analyzeFacialExpression(facialData);
          facialAnalysis = processFacialAnalysisData(rawFacialAnalysis);
        } catch (facialError) {
          console.error("Facial analysis failed:", facialError);
          // Continue without facial analysis
          facialAnalysis = {
            confidence: 70,
            emotions: { neutral: 70, happy: 20, fear: 10 },
            eyeContact: 65,
            speechClarity: 70,
            overallScore: 68,
            feedback: "Facial analysis service unavailable",
          };
        }
      }

      // Create answer record
      const answer = await Answer.create({
        interviewId,
        userId,
        questionNumber: parseInt(questionNumber),
        questionText: question.questionText,
        answerText: answerText.trim(),
        answerDuration: parseInt(answerDuration),
        facialAnalysis,
        aiEvaluation,
      });

      await answer.populate(
        "interviewId",
        "techStack hardnessLevel experienceLevel numberOfQuestions"
      );

      res.status(201).json({
        success: true,
        message: "Answer submitted successfully",
        data: {
          answer: {
            ...answer.toJSON(),
            // Don't return full facial analysis data in response for performance
            facialAnalysis: facialAnalysis
              ? {
                  overallScore: facialAnalysis.overallScore,
                  confidence: facialAnalysis.confidence,
                  feedback: facialAnalysis.feedback,
                }
              : null,
          },
        },
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit answer. Please try again.",
      });
    }
  })
);

// @desc    Get answers for an interview
// @route   GET /api/answers/interview/:interviewId
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

    const answers = await Answer.getInterviewAnswers(interviewId, userId);
    const completionPercentage = await Answer.getCompletionPercentage(
      interviewId,
      userId
    );

    res.json({
      success: true,
      data: {
        answers,
        completionPercentage,
        totalQuestions: interview.numberOfQuestions,
        answeredQuestions: answers.length,
      },
    });
  })
);

// @desc    Get single answer
// @route   GET /api/answers/:id
// @access  Private
router.get(
  "/:id",
  authenticateUser,
  [param("id").isMongoId().withMessage("Invalid answer ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const answer = await Answer.findOne({ _id: id, userId })
      .populate("interviewId", "techStack hardnessLevel experienceLevel")
      .populate("userId", "name email");

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found",
      });
    }

    res.json({
      success: true,
      data: {
        answer,
      },
    });
  })
);

// @desc    Update answer
// @route   PUT /api/answers/:id
// @access  Private
router.put(
  "/:id",
  authenticateUser,
  upload.single("facialData"),
  [
    param("id").isMongoId().withMessage("Invalid answer ID"),
    body("answerText")
      .optional()
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage("Answer must be between 10 and 5000 characters"),
    body("answerDuration")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Answer duration must be a positive integer"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { answerText, answerDuration } = req.body;
    const userId = req.user._id;

    const answer = await Answer.findOne({ _id: id, userId });
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found",
      });
    }

    // Get interview to check status
    const interview = await Interview.findById(answer.interviewId);
    if (interview.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot update answer for completed interview",
      });
    }

    try {
      // Update answer text if provided
      if (answerText) {
        answer.answerText = answerText.trim();

        // Re-evaluate answer with AI
        const question = interview.questions.find(
          (q) => q.questionNumber === answer.questionNumber
        );
        if (question) {
          answer.aiEvaluation = await evaluateAnswer({
            questionText: question.questionText,
            answerText: answerText.trim(),
            expectedAnswer: question.expectedAnswer,
            techStack: interview.techStack,
            experienceLevel: interview.experienceLevel,
          });
        }
      }

      if (answerDuration !== undefined) {
        answer.answerDuration = parseInt(answerDuration);
      }

      // Process new facial analysis if provided
      if (req.file) {
        try {
          const facialData = {
            userId: userId.toString(),
            interviewId: answer.interviewId.toString(),
            questionNumber: answer.questionNumber,
            mediaData: req.file.buffer.toString("base64"),
            mediaType: req.file.mimetype,
            duration: answer.answerDuration,
          };

          const rawFacialAnalysis =
            await facialAnalysisService.analyzeFacialExpression(facialData);
          answer.facialAnalysis = processFacialAnalysisData(rawFacialAnalysis);
        } catch (facialError) {
          console.error("Facial analysis failed:", facialError);
          // Keep existing facial analysis or set fallback
        }
      }

      await answer.save();
      await answer.populate(
        "interviewId",
        "techStack hardnessLevel experienceLevel"
      );

      res.json({
        success: true,
        message: "Answer updated successfully",
        data: {
          answer,
        },
      });
    } catch (error) {
      console.error("Error updating answer:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update answer. Please try again.",
      });
    }
  })
);

// @desc    Delete answer
// @route   DELETE /api/answers/:id
// @access  Private
router.delete(
  "/:id",
  authenticateUser,
  [param("id").isMongoId().withMessage("Invalid answer ID")],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id;

    const answer = await Answer.findOne({ _id: id, userId });
    if (!answer) {
      return res.status(404).json({
        success: false,
        message: "Answer not found",
      });
    }

    // Check if interview is still in progress
    const interview = await Interview.findById(answer.interviewId);
    if (interview.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete answer for completed interview",
      });
    }

    await Answer.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Answer deleted successfully",
    });
  })
);

// @desc    Get answer statistics
// @route   GET /api/answers/stats/:interviewId
// @access  Private
router.get(
  "/stats/:interviewId",
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

    const answers = await Answer.find({ interviewId, userId });

    if (answers.length === 0) {
      return res.json({
        success: true,
        data: {
          totalAnswers: 0,
          averageScore: 0,
          averageDuration: 0,
          categoryAverages: {},
          facialAnalysisAverage: null,
        },
      });
    }

    // Calculate statistics
    const totalAnswers = answers.length;
    const scores = answers
      .map((a) => a.aiEvaluation?.overallScore || 0)
      .filter((s) => s > 0);
    const durations = answers
      .map((a) => a.answerDuration || 0)
      .filter((d) => d > 0);

    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    const averageDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    // Calculate category averages
    const categoryAverages = {};
    const categories = [
      "relevance",
      "completeness",
      "technicalAccuracy",
      "communication",
    ];

    categories.forEach((category) => {
      const categoryScores = answers
        .map((a) => a.aiEvaluation?.[category] || 0)
        .filter((s) => s > 0);

      categoryAverages[category] =
        categoryScores.length > 0
          ? Math.round(
              categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length
            )
          : 0;
    });

    // Calculate facial analysis average
    const facialAnalysisResults = answers
      .map((a) => a.facialAnalysis)
      .filter((f) => f && f.overallScore > 0);

    let facialAnalysisAverage = null;
    if (facialAnalysisResults.length > 0) {
      facialAnalysisAverage = {
        confidence: Math.round(
          facialAnalysisResults.reduce((sum, f) => sum + f.confidence, 0) /
            facialAnalysisResults.length
        ),
        eyeContact: Math.round(
          facialAnalysisResults.reduce((sum, f) => sum + f.eyeContact, 0) /
            facialAnalysisResults.length
        ),
        speechClarity: Math.round(
          facialAnalysisResults.reduce((sum, f) => sum + f.speechClarity, 0) /
            facialAnalysisResults.length
        ),
        overallScore: Math.round(
          facialAnalysisResults.reduce((sum, f) => sum + f.overallScore, 0) /
            facialAnalysisResults.length
        ),
      };
    }

    res.json({
      success: true,
      data: {
        totalAnswers,
        averageScore,
        averageDuration,
        categoryAverages,
        facialAnalysisAverage,
        completionPercentage: Math.round(
          (totalAnswers / interview.numberOfQuestions) * 100
        ),
      },
    });
  })
);

// @desc    Submit all answers with facial analysis result
// @route   POST /api/answers/submit-all
// @access  Private
router.post(
  "/submit-all",
  authenticateUser,
  [
    body("interviewId").isMongoId().withMessage("Invalid interview ID"),
    body("answers")
      .isArray({ min: 1 })
      .withMessage("Answers must be an array with at least one answer"),
    body("answers.*.questionNumber")
      .isInt({ min: 1 })
      .withMessage("Question number must be a positive integer"),
    body("answers.*.answerText")
      .trim()
      .isLength({ min: 10, max: 5000 })
      .withMessage("Answer must be between 10 and 5000 characters"),
    body("answers.*.answerDuration")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Answer duration must be a positive integer"),
    body("totalInterviewDuration")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Total interview duration must be a positive integer"),
    body("facialAnalysisResult")
      .optional()
      .isObject()
      .withMessage("Facial analysis result must be an object"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const {
      interviewId,
      answers,
      totalInterviewDuration = 0,
      facialAnalysisResult,
    } = req.body;
    const userId = req.user._id;

    // Verify interview exists and belongs to user
    const interview = await Interview.findOne({ _id: interviewId, userId });
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    // Check if interview is in progress
    if (interview.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Interview is not in progress",
      });
    }

    try {
      // Use provided facial analysis result or null if not provided
      const overallFacialAnalysis = facialAnalysisResult || null;

      // Process each answer
      const createdAnswers = [];

      for (const answerData of answers) {
        const { questionNumber, answerText, answerDuration = 0 } = answerData;

        // Get the specific question
        const question = interview.questions.find(
          (q) => q.questionNumber === parseInt(questionNumber)
        );
        if (!question) {
          throw new Error(`Question ${questionNumber} not found`);
        }

        // Check if answer already exists
        const existingAnswer = await Answer.findOne({
          interviewId,
          userId,
          questionNumber,
        });
        if (existingAnswer) {
          throw new Error(
            `Answer already exists for question ${questionNumber}`
          );
        }

        // Evaluate answer using AI
        const aiEvaluation = await evaluateAnswer({
          questionText: question.questionText,
          answerText,
          expectedAnswer: question.expectedAnswer,
          techStack: interview.techStack,
          experienceLevel: interview.experienceLevel,
        });

        // Create answer record
        const answer = await Answer.create({
          interviewId,
          userId,
          questionNumber: parseInt(questionNumber),
          questionText: question.questionText,
          answerText: answerText.trim(),
          answerDuration: parseInt(answerDuration),
          facialAnalysis: overallFacialAnalysis,
          aiEvaluation,
        });

        await answer.populate(
          "interviewId",
          "techStack hardnessLevel experienceLevel numberOfQuestions"
        );
        createdAnswers.push(answer);
      }

      res.status(201).json({
        success: true,
        message: "All answers submitted successfully",
        data: {
          answers: createdAnswers.map((answer) => ({
            id: answer._id,
            questionNumber: answer.questionNumber,
            questionText: answer.questionText,
            answerText: answer.answerText,
            answerDuration: answer.answerDuration,
            aiEvaluation: answer.aiEvaluation,
            facialAnalysis: overallFacialAnalysis
              ? {
                  overallScore: overallFacialAnalysis.overallScore,
                  confidence: overallFacialAnalysis.confidence,
                  eyeContact: overallFacialAnalysis.eyeContact,
                  speechClarity: overallFacialAnalysis.speechClarity,
                }
              : null,
            submittedAt: answer.submittedAt,
          })),
          summary: {
            totalAnswers: createdAnswers.length,
            completionPercentage: Math.round(
              (createdAnswers.length / interview.numberOfQuestions) * 100
            ),
            averageAIScore: Math.round(
              createdAnswers.reduce(
                (sum, answer) => sum + answer.aiEvaluation.overallScore,
                0
              ) / createdAnswers.length
            ),
            overallFacialAnalysis: overallFacialAnalysis,
            totalDuration: totalInterviewDuration,
          },
        },
      });
    } catch (error) {
      console.error("Error submitting answers:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to submit answers. Please try again.",
      });
    }
  })
);

export default router;
