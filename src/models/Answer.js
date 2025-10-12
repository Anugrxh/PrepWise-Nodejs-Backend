import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
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
    questionNumber: {
      type: Number,
      required: [true, "Question number is required"],
    },
    questionText: {
      type: String,
      required: [true, "Question text is required"],
    },
    answerText: {
      type: String,
      required: [true, "Answer text is required"],
      trim: true,
    },
    answerDuration: {
      type: Number, // in seconds
      default: 0,
    },
    facialAnalysis: {
      confidence: {
        type: Number,
        min: 0,
        max: 100,
      },
      emotions: {
        happy: Number,
        sad: Number,
        angry: Number,
        fear: Number,
        surprise: Number,
        disgust: Number,
        neutral: Number,
      },
      eyeContact: {
        type: Number,
        min: 0,
        max: 100,
      },
      speechClarity: {
        type: Number,
        min: 0,
        max: 100,
      },
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      feedback: String,
    },
    aiEvaluation: {
      relevance: {
        type: Number,
        min: 0,
        max: 100,
      },
      completeness: {
        type: Number,
        min: 0,
        max: 100,
      },
      technicalAccuracy: {
        type: Number,
        min: 0,
        max: 100,
      },
      communication: {
        type: Number,
        min: 0,
        max: 100,
      },
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      feedback: String,
      suggestions: [String],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
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
answerSchema.index({ interviewId: 1, questionNumber: 1 });
answerSchema.index({ userId: 1, createdAt: -1 });
answerSchema.index({ interviewId: 1, userId: 1 });

// Compound index for unique answer per question per user per interview
answerSchema.index(
  { interviewId: 1, userId: 1, questionNumber: 1 },
  { unique: true }
);

// Static method to get answers for an interview
answerSchema.statics.getInterviewAnswers = function (
  interviewId,
  userId = null
) {
  const query = { interviewId };
  if (userId) query.userId = userId;

  return this.find(query)
    .sort({ questionNumber: 1 })
    .populate("userId", "name email")
    .populate("interviewId", "techStack hardnessLevel experienceLevel");
};

// Static method to calculate interview completion percentage
answerSchema.statics.getCompletionPercentage = async function (
  interviewId,
  userId
) {
  const interview = await mongoose.model("Interview").findById(interviewId);
  if (!interview) return 0;

  const answeredCount = await this.countDocuments({ interviewId, userId });
  return Math.round((answeredCount / interview.numberOfQuestions) * 100);
};

const Answer = mongoose.model("Answer", answerSchema);

export default Answer;
