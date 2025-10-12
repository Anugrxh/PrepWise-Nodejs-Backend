import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Create axios instance for facial analysis API
const facialAnalysisClient = axios.create({
  baseURL: process.env.FACIAL_ANALYSIS_API_URL || "http://localhost:8000",
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Facial Analysis Service
export const facialAnalysisService = {
  // Analyze facial expressions and behavior from video/image data
  async analyzeFacialExpression(analysisData) {
    try {
      const response = await facialAnalysisClient.post(
        "/facial-analysis",
        analysisData
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error in facial analysis:",
        error.response?.data || error.message
      );
      throw new Error("Failed to analyze facial expressions");
    }
  },

  // Process multiple frames for comprehensive analysis
  async analyzeInterviewSession(sessionData) {
    try {
      const response = await facialAnalysisClient.post(
        "/facial-analysis/session",
        sessionData
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error in session analysis:",
        error.response?.data || error.message
      );
      throw new Error("Failed to analyze interview session");
    }
  },

  // Get analysis summary for an interview
  async getAnalysisSummary(interviewId, userId) {
    try {
      const response = await facialAnalysisClient.get(
        `/facial-analysis/summary/${interviewId}/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error getting analysis summary:",
        error.response?.data || error.message
      );
      throw new Error("Failed to get analysis summary");
    }
  },

  // Health check for facial analysis service
  async healthCheck() {
    try {
      const response = await facialAnalysisClient.get("/health");
      return response.data;
    } catch (error) {
      console.error(
        "Facial analysis service health check failed:",
        error.message
      );
      return { status: "down", error: error.message };
    }
  },
};

// Process facial analysis data and extract key metrics
export function processFacialAnalysisData(rawData) {
  try {
    // Expected structure from Django API
    const {
      confidence = 0,
      emotions = {},
      eye_contact = 0,
      speech_clarity = 0,
      overall_score = 0,
      feedback = "",
      frame_count = 0,
      analysis_duration = 0,
    } = rawData;

    return {
      confidence: Math.round(confidence),
      emotions: {
        happy: Math.round(emotions.happy || 0),
        sad: Math.round(emotions.sad || 0),
        angry: Math.round(emotions.angry || 0),
        fear: Math.round(emotions.fear || 0),
        surprise: Math.round(emotions.surprise || 0),
        disgust: Math.round(emotions.disgust || 0),
        neutral: Math.round(emotions.neutral || 0),
      },
      eyeContact: Math.round(eye_contact),
      speechClarity: Math.round(speech_clarity),
      overallScore: Math.round(overall_score),
      feedback: feedback || "No specific feedback available",
      metadata: {
        frameCount: frame_count,
        analysisDuration: analysis_duration,
        processedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error processing facial analysis data:", error);
    return getFallbackFacialAnalysis();
  }
}

// Aggregate facial analysis results for multiple answers
export function aggregateFacialAnalysis(analysisResults) {
  if (!Array.isArray(analysisResults) || analysisResults.length === 0) {
    return getFallbackFacialAnalysis();
  }

  const validResults = analysisResults.filter(
    (result) => result && result.overallScore > 0
  );

  if (validResults.length === 0) {
    return getFallbackFacialAnalysis();
  }

  // Calculate averages
  const averageConfidence = Math.round(
    validResults.reduce((sum, result) => sum + result.confidence, 0) /
      validResults.length
  );

  const averageEyeContact = Math.round(
    validResults.reduce((sum, result) => sum + result.eyeContact, 0) /
      validResults.length
  );

  const averageSpeechClarity = Math.round(
    validResults.reduce((sum, result) => sum + result.speechClarity, 0) /
      validResults.length
  );

  const averageOverallScore = Math.round(
    validResults.reduce((sum, result) => sum + result.overallScore, 0) /
      validResults.length
  );

  // Aggregate emotions
  const emotionKeys = [
    "happy",
    "sad",
    "angry",
    "fear",
    "surprise",
    "disgust",
    "neutral",
  ];
  const averageEmotions = {};

  emotionKeys.forEach((emotion) => {
    averageEmotions[emotion] = Math.round(
      validResults.reduce(
        (sum, result) => sum + (result.emotions[emotion] || 0),
        0
      ) / validResults.length
    );
  });

  // Determine dominant emotion
  const dominantEmotion = Object.keys(averageEmotions).reduce((a, b) =>
    averageEmotions[a] > averageEmotions[b] ? a : b
  );

  // Generate feedback based on analysis
  const feedback = generateFacialAnalysisFeedback({
    confidence: averageConfidence,
    eyeContact: averageEyeContact,
    speechClarity: averageSpeechClarity,
    dominantEmotion,
    overallScore: averageOverallScore,
  });

  return {
    averageConfidence,
    averageEyeContact,
    averageSpeechClarity,
    averageOverallScore,
    averageEmotions,
    dominantEmotion,
    feedback,
    analysisCount: validResults.length,
    metadata: {
      totalFrames: validResults.reduce(
        (sum, result) => sum + (result.metadata?.frameCount || 0),
        0
      ),
      totalDuration: validResults.reduce(
        (sum, result) => sum + (result.metadata?.analysisDuration || 0),
        0
      ),
      aggregatedAt: new Date().toISOString(),
    },
  };
}

// Generate feedback based on facial analysis metrics
function generateFacialAnalysisFeedback({
  confidence,
  eyeContact,
  speechClarity,
  dominantEmotion,
  overallScore,
}) {
  let feedback = [];

  // Confidence feedback
  if (confidence >= 80) {
    feedback.push("Excellent confidence levels throughout the interview.");
  } else if (confidence >= 60) {
    feedback.push("Good confidence, with room for slight improvement.");
  } else {
    feedback.push(
      "Consider working on building confidence for future interviews."
    );
  }

  // Eye contact feedback
  if (eyeContact >= 80) {
    feedback.push("Maintained excellent eye contact.");
  } else if (eyeContact >= 60) {
    feedback.push("Good eye contact, try to maintain it more consistently.");
  } else {
    feedback.push(
      "Focus on maintaining better eye contact with the interviewer."
    );
  }

  // Speech clarity feedback
  if (speechClarity >= 80) {
    feedback.push("Speech was clear and well-articulated.");
  } else if (speechClarity >= 60) {
    feedback.push("Generally clear speech with minor areas for improvement.");
  } else {
    feedback.push("Work on speaking more clearly and at an appropriate pace.");
  }

  // Emotion feedback
  if (dominantEmotion === "happy" || dominantEmotion === "neutral") {
    feedback.push("Maintained a positive and professional demeanor.");
  } else if (dominantEmotion === "fear" || dominantEmotion === "sad") {
    feedback.push(
      "Try to project more confidence and positivity during interviews."
    );
  }

  return feedback.join(" ");
}

// Fallback facial analysis when service is unavailable
function getFallbackFacialAnalysis() {
  return {
    confidence: 70,
    emotions: {
      happy: 30,
      sad: 10,
      angry: 5,
      fear: 15,
      surprise: 10,
      disgust: 5,
      neutral: 25,
    },
    eyeContact: 65,
    speechClarity: 70,
    overallScore: 68,
    feedback:
      "Facial analysis service was unavailable. Manual review recommended.",
    metadata: {
      frameCount: 0,
      analysisDuration: 0,
      processedAt: new Date().toISOString(),
      fallback: true,
    },
  };
}
