import mongoose from "mongoose";

const finalResultSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      required: [true, "Interview ID is required"],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    overallScore: {
      type: Number,
      required: [true, "Overall score is required"],
      min: [0, "Score cannot be less than 0"],
      max: [100, "Score cannot be more than 100"],
    },
    categoryScores: {
      technicalKnowledge: {
        type: Number,
        min: 0,
        max: 100,
      },
      communication: {
        type: Number,
        min: 0,
        max: 100,
      },
      problemSolving: {
        type: Number,
        min: 0,
        max: 100,
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
      },
      facialAnalysis: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
    strengths: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    weaknesses: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    recommendations: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    detailedFeedback: {
      type: String,
      required: [true, "Detailed feedback is required"],
      trim: true,
    },
    grade: {
      type: String,
      enum: ["A+", "A", "B+", "B", "C+", "C", "D", "F"],
    },
    passed: {
      type: Boolean,
      default: false,
    },
    completionTime: {
      type: Number, // in seconds
      required: true,
    },
    questionsAnswered: {
      type: Number,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    metadata: {
      aiModel: {
        type: String,
        default: "gemini-2.0-flash-001",
      },
      facialAnalysisModel: {
        type: String,
        default: "django-facial-analysis",
      },
      processingTime: Number, // in milliseconds
      generatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better query performance
finalResultSchema.index({ interviewId: 1, userId: 1 }, { unique: true });
finalResultSchema.index({ userId: 1, createdAt: -1 });
finalResultSchema.index({ overallScore: -1 });
finalResultSchema.index({ grade: 1 });

// Virtual for performance level
finalResultSchema.virtual("performanceLevel").get(function () {
  const overallScore = Number(this.overallScore);
  if (overallScore >= 90) return "Excellent";
  if (overallScore >= 80) return "Very Good";
  if (overallScore >= 70) return "Good";
  if (overallScore >= 60) return "Average";
  if (overallScore >= 50) return "Below Average";
  return "Poor";
});

// Pre-save middleware to calculate grade and completion percentage
finalResultSchema.pre("save", function (next) {
  // Ensure overallScore is a number
  const overallScore = Number(this.overallScore);
  
  // Calculate grade based on overall score
  if (overallScore >= 95) this.grade = "A+";
  else if (overallScore >= 90) this.grade = "A";
  else if (overallScore >= 85) this.grade = "B+";
  else if (overallScore >= 80) this.grade = "B";
  else if (overallScore >= 75) this.grade = "C+";
  else if (overallScore >= 70) this.grade = "C";
  else if (overallScore >= 60) this.grade = "D";
  else this.grade = "F";

  // Determine if passed (70% or above)
  this.passed = overallScore >= 70;

  // Calculate completion percentage
  this.completionPercentage = Math.round(
    (this.questionsAnswered / this.totalQuestions) * 100
  );

  next();
});

// Static method to get user's results
finalResultSchema.statics.getUserResults = function (userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate(
      "interviewId",
      "techStack hardnessLevel experienceLevel numberOfQuestions"
    )
    .populate("userId", "name email");
};

// Static method to get performance analytics
finalResultSchema.statics.getPerformanceAnalytics = async function (userId) {
  const results = await this.find({ userId }).sort({ createdAt: 1 });

  if (results.length === 0) {
    return {
      totalInterviews: 0,
      averageScore: 0,
      bestScore: 0,
      improvementTrend: 0,
      passRate: 0,
    };
  }

  const totalScore = results.reduce(
    (sum, result) => sum + result.overallScore,
    0
  );
  const averageScore = Math.round(totalScore / results.length);
  const bestScore = Math.max(...results.map((r) => r.overallScore));
  const passedCount = results.filter((r) => r.passed).length;
  const passRate = Math.round((passedCount / results.length) * 100);

  // Calculate improvement trend (comparing first half vs second half)
  const midPoint = Math.floor(results.length / 2);
  const firstHalf = results.slice(0, midPoint);
  const secondHalf = results.slice(midPoint);

  const firstHalfAvg =
    firstHalf.length > 0
      ? firstHalf.reduce((sum, r) => sum + r.overallScore, 0) / firstHalf.length
      : 0;
  const secondHalfAvg =
    secondHalf.length > 0
      ? secondHalf.reduce((sum, r) => sum + r.overallScore, 0) /
        secondHalf.length
      : 0;

  const improvementTrend = Math.round(secondHalfAvg - firstHalfAvg);

  return {
    totalInterviews: results.length,
    averageScore,
    bestScore,
    improvementTrend,
    passRate,
    recentResults: results.slice(-5), // Last 5 results
  };
};

const FinalResult = mongoose.model("FinalResult", finalResultSchema);

export default FinalResult;
