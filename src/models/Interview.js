import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    techStack: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    hardnessLevel: {
      type: String,
      required: [true, "Hardness level is required"],
      enum: {
        values: ["Easy", "Medium", "Hard"],
        message: "Hardness level must be one of: Easy, Medium, Hard",
      },
    },
    experienceLevel: {
      type: String,
      required: [true, "Experience level is required"],
      enum: {
        values: ["Fresher", "Junior", "Mid", "Senior", "Lead"],
        message:
          "Experience level must be one of: Fresher, Junior, Mid, Senior, Lead",
      },
    },
    numberOfQuestions: {
      type: Number,
      required: [true, "Number of questions is required"],
      min: [3, "Minimum 3 questions required"],
      max: [20, "Maximum 20 questions allowed"],
    },
    questions: [
      {
        questionText: {
          type: String,
          required: true,
          trim: true,
        },
        questionNumber: {
          type: Number,
          required: true,
        },
        expectedAnswer: {
          type: String,
          trim: true,
        },
        category: {
          type: String,
          enum: ["Technical", "Behavioral", "Problem Solving"],
          default: "Technical",
        },
      },
    ],
    status: {
      type: String,
      enum: ["generated", "in_progress", "completed", "abandoned"],
      default: "generated",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    metadata: {
      generatedBy: {
        type: String,
        default: "AI",
      },
      aiModel: {
        type: String,
        default: "gemini-2.0-flash-001",
      },
      generationPrompt: String,
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
interviewSchema.index({ userId: 1, createdAt: -1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ techStack: 1 });
interviewSchema.index({ hardnessLevel: 1, experienceLevel: 1 });

// Instance method to start interview
interviewSchema.methods.startInterview = async function () {
  this.status = "in_progress";
  this.startedAt = new Date();
  return await this.save();
};

// Instance method to complete interview
interviewSchema.methods.completeInterview = async function () {
  this.status = "completed";
  this.completedAt = new Date();
  if (this.startedAt) {
    this.duration = Math.floor((this.completedAt - this.startedAt) / 1000);
  }
  return await this.save();
};

// Static method to get user's interviews
interviewSchema.statics.getUserInterviews = function (userId, status = null) {
  const query = { userId };
  if (status) query.status = status;

  return this.find(query)
    .sort({ createdAt: -1 })
    .populate("userId", "name email");
};

const Interview = mongoose.model("Interview", interviewSchema);

export default Interview;
