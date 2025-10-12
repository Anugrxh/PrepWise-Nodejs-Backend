import crypto from "crypto";

// Generate random string
export const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

// Format date to readable string
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Calculate pagination metadata
export const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
};

// Sanitize user input
export const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input.trim().replace(/[<>]/g, "");
};

// Generate slug from string
export const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Calculate average from array of numbers
export const calculateAverage = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return Math.round(sum / numbers.length);
};

// Get random item from array
export const getRandomItem = (array) => {
  if (!Array.isArray(array) || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Deep clone object
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Convert string to title case
export const toTitleCase = (str) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

// Remove duplicates from array
export const removeDuplicates = (array) => {
  return [...new Set(array)];
};

// Check if object is empty
export const isEmpty = (obj) => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === "string") return obj.length === 0;
  return Object.keys(obj).length === 0;
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Generate interview cover image URL
export const getInterviewCoverUrl = (coverImage) => {
  if (!coverImage) return "/covers/default.png";
  if (coverImage.startsWith("http")) return coverImage;
  return coverImage.startsWith("/") ? coverImage : `/${coverImage}`;
};

// Calculate interview duration estimate
export const estimateInterviewDuration = (questionsCount, type = "Mixed") => {
  const baseTimePerQuestion = {
    Behavioral: 4, // 4 minutes per behavioral question
    Technical: 5, // 5 minutes per technical question
    Mixed: 4.5, // 4.5 minutes per mixed question
  };

  const timePerQuestion = baseTimePerQuestion[type] || 4.5;
  return Math.max(15, Math.round(questionsCount * timePerQuestion));
};

// Normalize tech stack names
export const normalizeTechStack = (techStack) => {
  const mappings = {
    js: "JavaScript",
    ts: "TypeScript",
    "react.js": "React",
    reactjs: "React",
    "next.js": "Next.js",
    nextjs: "Next.js",
    "vue.js": "Vue.js",
    vuejs: "Vue.js",
    "node.js": "Node.js",
    nodejs: "Node.js",
    "express.js": "Express.js",
    expressjs: "Express.js",
  };

  return techStack.map((tech) => {
    const normalized = mappings[tech.toLowerCase()];
    return normalized || toTitleCase(tech);
  });
};

// Generate performance grade
export const getPerformanceGrade = (score) => {
  if (score >= 90) return { grade: "A+", color: "#10B981" };
  if (score >= 80) return { grade: "A", color: "#059669" };
  if (score >= 70) return { grade: "B", color: "#D97706" };
  if (score >= 60) return { grade: "C", color: "#DC2626" };
  if (score >= 50) return { grade: "D", color: "#991B1B" };
  return { grade: "F", color: "#7F1D1D" };
};

// Calculate improvement percentage
export const calculateImprovement = (oldScore, newScore) => {
  if (oldScore === 0) return newScore > 0 ? 100 : 0;
  return Math.round(((newScore - oldScore) / oldScore) * 100);
};

// Format duration in seconds to readable format
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Validate MongoDB ObjectId
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Generate API response
export const createResponse = (
  success,
  message,
  data = null,
  errors = null
) => {
  const response = { success, message };
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  return response;
};

// Log API request
export const logRequest = (req) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - IP: ${
      req.ip
    }`
  );
};
