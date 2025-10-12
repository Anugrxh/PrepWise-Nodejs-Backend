import { body, param, query, validationResult } from "express-validator";
import mongoose from "mongoose";

// Validation middleware to check for errors
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// Custom validator for MongoDB ObjectId
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

// Auth validation rules
export const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address")
    .isLength({ max: 100 })
    .withMessage("Email cannot exceed 100 characters"),

  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
];

export const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("password").notEmpty().withMessage("Password is required"),
];

// Interview generation validation rules
export const generateInterviewValidation = [
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
];

// Answer submission validation rules
export const submitAnswerValidation = [
  body("interviewId")
    .custom(isValidObjectId)
    .withMessage("Invalid interview ID"),

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
];

// User profile validation rules
export const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
];

// Query validation rules
export const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("sort")
    .optional()
    .isIn([
      "createdAt",
      "-createdAt",
      "overallScore",
      "-overallScore",
      "status",
      "-status",
    ])
    .withMessage("Invalid sort parameter"),
];

export const interviewStatusValidation = [
  query("status")
    .optional()
    .isIn(["generated", "in_progress", "completed", "abandoned"])
    .withMessage(
      "Status must be one of: generated, in_progress, completed, abandoned"
    ),
];

// Parameter validation rules
export const idValidation = [
  param("id").custom(isValidObjectId).withMessage("Invalid ID format"),
];

export const interviewIdValidation = [
  param("interviewId")
    .custom(isValidObjectId)
    .withMessage("Invalid interview ID format"),
];

export const userIdValidation = [
  param("userId").custom(isValidObjectId).withMessage("Invalid user ID format"),
];

// File upload validation
export const fileUploadValidation = [
  body("facialData")
    .optional()
    .custom((value, { req }) => {
      if (req.file) {
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "video/mp4",
          "video/webm",
        ];
        if (!allowedTypes.includes(req.file.mimetype)) {
          throw new Error(
            "Only JPEG, PNG images and MP4, WebM videos are allowed"
          );
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
          throw new Error("File size must be less than 10MB");
        }
      }
      return true;
    }),
];

// Password change validation
export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6, max: 128 })
    .withMessage("New password must be between 6 and 128 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password");
    }
    return true;
  }),
];

// Interview comparison validation
export const compareResultsValidation = [
  param("id1").custom(isValidObjectId).withMessage("Invalid first result ID"),

  param("id2").custom(isValidObjectId).withMessage("Invalid second result ID"),
];

// Facial analysis validation
export const facialAnalysisValidation = [
  body("confidence")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Confidence must be between 0 and 100"),

  body("eyeContact")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Eye contact score must be between 0 and 100"),

  body("speechClarity")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Speech clarity score must be between 0 and 100"),
];

// Search and filter validation
export const searchValidation = [
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),

  query("techStack")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Tech stack filter must be between 1 and 50 characters"),

  query("hardnessLevel")
    .optional()
    .isIn(["Easy", "Medium", "Hard"])
    .withMessage("Hardness level must be one of: Easy, Medium, Hard"),

  query("experienceLevel")
    .optional()
    .isIn(["Fresher", "Junior", "Mid", "Senior", "Lead"])
    .withMessage(
      "Experience level must be one of: Fresher, Junior, Mid, Senior, Lead"
    ),
];

// Date range validation
export const dateRangeValidation = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),

  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const startDate = new Date(req.query.startDate);
        const endDate = new Date(value);
        if (endDate <= startDate) {
          throw new Error("End date must be after start date");
        }
      }
      return true;
    }),
];

// Analytics validation
export const analyticsValidation = [
  query("period")
    .optional()
    .isIn(["7d", "30d", "90d", "1y", "all"])
    .withMessage("Period must be one of: 7d, 30d, 90d, 1y, all"),

  query("category")
    .optional()
    .isIn([
      "technicalKnowledge",
      "communication",
      "problemSolving",
      "confidence",
      "facialAnalysis",
    ])
    .withMessage("Invalid category for analytics"),
];
