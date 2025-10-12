import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import mongoose from "mongoose"; // Import Mongoose for graceful shutdown

// Import database connection
import { connectDB } from "./config/database.js";

// Import routes
import authRoutes from "./routes/auth.js";
import interviewRoutes from "./routes/interviews.js";
import answerRoutes from "./routes/answers.js";
import resultRoutes from "./routes/results.js";
import userRoutes from "./routes/users.js";

// Import middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Middleware ---
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(morgan("combined"));

// ✅ **FIXED ORDER**: CORS configuration now runs BEFORE the rate limiter.
// This ensures that even error responses from the limiter have CORS headers.
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-production-frontend.com', // Replace with your actual frontend URL
];

app.use(
  cors({
    origin: (origin, callback) => {
      // For development, allow requests with no origin (e.g., Postman, mobile apps)
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// The rate limiter now runs AFTER CORS.
app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    message: "Prepwise Backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/results", resultRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Prepwise Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});


// ✅ **IMPROVED**: A true graceful shutdown
const gracefulShutdown = () => {
    console.log("Shutdown signal received. Closing HTTP server...");
    server.close(() => {
        console.log("HTTP server closed.");
        // Close the MongoDB connection
        mongoose.connection.close(false, () => {
            console.log("MongoDB connection closed. Exiting process.");
            process.exit(0);
        });
    });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);


export default app;
