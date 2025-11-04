import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Don't include password in queries by default
    },
    profileImage: {
      type: String,
      default: null,
    },
    resumeUrl: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
          // REMOVED: expires field - this was causing entire user deletion
          // TTL should not be used on subdocument fields
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for better query performance

userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return await this.save();
};

// Static method to find user by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Instance method to clean up expired refresh tokens
userSchema.methods.cleanupExpiredTokens = async function () {
  const now = new Date();
  const initialCount = this.refreshTokens.length;
  
  // Remove tokens that are older than 30 days (manual cleanup for safety)
  this.refreshTokens = this.refreshTokens.filter(tokenObj => {
    const tokenAge = now - tokenObj.createdAt;
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    return tokenAge < thirtyDaysInMs;
  });
  
  // Save if any tokens were removed
  if (this.refreshTokens.length !== initialCount) {
    await this.save();
    console.log(`Cleaned up ${initialCount - this.refreshTokens.length} expired tokens for user ${this._id}`);
  }
  
  return this.refreshTokens.length;
};

// Instance method to add refresh token with automatic cleanup
userSchema.methods.addRefreshToken = async function (token) {
  // Clean up expired tokens first
  await this.cleanupExpiredTokens();
  
  // Add new token
  this.refreshTokens.push({ token });
  
  // Limit to maximum 5 active refresh tokens per user (security measure)
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5); // Keep only the 5 most recent
  }
  
  await this.save();
  return this;
};

// Static method to get user stats
userSchema.statics.getUserStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ["$isActive", true] }, 1, 0],
          },
        },
        recentUsers: {
          $sum: {
            $cond: [
              {
                $gte: [
                  "$createdAt",
                  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return stats[0] || { totalUsers: 0, activeUsers: 0, recentUsers: 0 };
};

// Static method to cleanup expired tokens for all users (can be run as a cron job)
userSchema.statics.cleanupAllExpiredTokens = async function () {
  const users = await this.find({ 
    refreshTokens: { $exists: true, $not: { $size: 0 } } 
  });
  
  let totalCleaned = 0;
  for (const user of users) {
    const beforeCount = user.refreshTokens.length;
    await user.cleanupExpiredTokens();
    const afterCount = user.refreshTokens.length;
    totalCleaned += (beforeCount - afterCount);
  }
  
  console.log(`Global cleanup: Removed ${totalCleaned} expired refresh tokens from ${users.length} users`);
  return totalCleaned;
};

const User = mongoose.model("User", userSchema);

export default User;
