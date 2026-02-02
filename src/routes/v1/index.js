import express from "express";

import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import interviewRoutes from "./interviews.js";
import answerRoutes from "./answers.js";
import resultRoutes from "./results.js";
import facialAnalysisRoutes from "./facialAnalysis.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/interviews", interviewRoutes);
router.use("/answers", answerRoutes);
router.use("/results", resultRoutes);
router.use("/facial-analysis", facialAnalysisRoutes);

export default router;
