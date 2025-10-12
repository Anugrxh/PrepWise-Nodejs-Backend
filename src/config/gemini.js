import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

// Get the Gemini model
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-001",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
  },
});

// Generate interview questions based on user preferences
export async function generateInterviewQuestions({
  techStack,
  hardnessLevel,
  experienceLevel,
  numberOfQuestions,
}) {
  const techStackString = Array.isArray(techStack)
    ? techStack.join(", ")
    : techStack;

  const prompt = `Generate ${numberOfQuestions} interview questions for a ${experienceLevel} level candidate.

Requirements:
- Technology Stack: ${techStackString}
- Experience Level: ${experienceLevel}
- Difficulty Level: ${hardnessLevel}
- Number of Questions: ${numberOfQuestions}

Guidelines:
1. Questions should be appropriate for ${experienceLevel} level candidates
2. Difficulty should be ${hardnessLevel}
3. Include relevant ${techStackString} technologies
4. Mix of technical, problem-solving, and behavioral questions
5. Questions should be clear and specific
6. Include both theoretical and practical questions

Return ONLY a valid JSON array of objects in this exact format:
[
  {
    "questionText": "Question 1 text here",
    "questionNumber": 1,
    "category": "Technical",
    "expectedAnswer": "Brief expected answer or key points"
  },
  {
    "questionText": "Question 2 text here", 
    "questionNumber": 2,
    "category": "Problem Solving",
    "expectedAnswer": "Brief expected answer or key points"
  }
]

Categories should be one of: "Technical", "Behavioral", "Problem Solving"

Do not include any other text, explanations, or formatting.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Invalid response format - no JSON array found");
    }

    const questions = JSON.parse(jsonMatch[0]);

    // Validate questions
    if (
      !Array.isArray(questions) ||
      questions.length !== parseInt(numberOfQuestions)
    ) {
      throw new Error(
        `Expected ${numberOfQuestions} questions, got ${questions.length}`
      );
    }

    // Validate each question structure
    questions.forEach((question, index) => {
      if (
        !question.questionText ||
        !question.questionNumber ||
        !question.category
      ) {
        throw new Error(`Invalid question structure at index ${index}`);
      }
      if (
        !["Technical", "Behavioral", "Problem Solving"].includes(
          question.category
        )
      ) {
        question.category = "Technical"; // Default fallback
      }
    });

    return questions;
  } catch (error) {
    console.error("Error generating questions:", error);

    // Fallback questions based on tech stack and level
    const fallbackQuestions = getFallbackQuestions(
      techStackString,
      experienceLevel,
      hardnessLevel,
      parseInt(numberOfQuestions)
    );
    return fallbackQuestions;
  }
}

// Evaluate a single answer
export async function evaluateAnswer({
  questionText,
  answerText,
  expectedAnswer,
  techStack,
  experienceLevel,
}) {
  const prompt = `Evaluate this interview answer for a ${experienceLevel} level candidate.

Question: ${questionText}
Expected Answer: ${expectedAnswer || "Not specified"}
Candidate's Answer: ${answerText}
Technology Context: ${
    Array.isArray(techStack) ? techStack.join(", ") : techStack
  }

Evaluate the answer on these criteria (score 0-100 each):
1. Relevance - How well does the answer address the question?
2. Completeness - How complete and thorough is the answer?
3. Technical Accuracy - How technically accurate is the answer?
4. Communication - How well is the answer communicated?

Provide constructive feedback and suggestions for improvement.

Return ONLY a valid JSON object in this exact format:
{
  "relevance": 85,
  "completeness": 78,
  "technicalAccuracy": 82,
  "communication": 80,
  "overallScore": 81,
  "feedback": "Detailed feedback about the answer quality, strengths, and areas for improvement",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

Be objective and constructive in your evaluation.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format - no JSON object found");
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    // Validate evaluation structure
    const requiredFields = [
      "relevance",
      "completeness",
      "technicalAccuracy",
      "communication",
      "overallScore",
      "feedback",
      "suggestions",
    ];
    for (const field of requiredFields) {
      if (!(field in evaluation)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return evaluation;
  } catch (error) {
    console.error("Error evaluating answer:", error);

    // Return fallback evaluation
    return getFallbackEvaluation();
  }
}

// Generate final interview result
export async function generateFinalResult({
  answers,
  interview,
  facialAnalysisResults,
}) {
  const answersText = answers
    .map(
      (answer, index) =>
        `Q${index + 1}: ${answer.questionText}\nA${index + 1}: ${
          answer.answerText
        }\nAI Score: ${answer.aiEvaluation?.overallScore || "N/A"}/100\n`
    )
    .join("\n");

  const facialSummary = facialAnalysisResults
    ? `Average Confidence: ${
        facialAnalysisResults.averageConfidence || "N/A"
      }%, Eye Contact: ${facialAnalysisResults.averageEyeContact || "N/A"}%`
    : "Facial analysis not available";

  const prompt = `Generate a comprehensive interview evaluation report.

INTERVIEW DETAILS:
- Tech Stack: ${interview.techStack.join(", ")}
- Experience Level: ${interview.experienceLevel}
- Difficulty: ${interview.hardnessLevel}
- Questions Answered: ${answers.length}/${interview.numberOfQuestions}

ANSWERS AND SCORES:
${answersText}

FACIAL ANALYSIS:
${facialSummary}

Provide a comprehensive evaluation with:
1. Overall score (0-100) based on all answers and performance
2. Category-wise scores for different skills
3. Strengths and weaknesses
4. Specific recommendations for improvement
5. Detailed feedback

Return ONLY a valid JSON object in this exact format:
{
  "overallScore": 78,
  "categoryScores": {
    "technicalKnowledge": 80,
    "communication": 75,
    "problemSolving": 82,
    "confidence": 70,
    "facialAnalysis": 73
  },
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "detailedFeedback": "Comprehensive feedback about the candidate's overall performance, highlighting key areas and providing actionable insights for improvement."
}

Be thorough, constructive, and specific in your evaluation.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format - no JSON object found");
    }

    const finalResult = JSON.parse(jsonMatch[0]);

    // Validate structure
    const requiredFields = [
      "overallScore",
      "categoryScores",
      "strengths",
      "weaknesses",
      "recommendations",
      "detailedFeedback",
    ];
    for (const field of requiredFields) {
      if (!(field in finalResult)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return finalResult;
  } catch (error) {
    console.error("Error generating final result:", error);

    // Return fallback result
    return getFallbackFinalResult(answers.length, interview.numberOfQuestions);
  }
}

// Fallback questions for when AI generation fails
function getFallbackQuestions(
  techStack,
  experienceLevel,
  hardnessLevel,
  numberOfQuestions
) {
  const baseQuestions = [
    {
      questionText:
        "Tell me about your experience with the technologies mentioned in your profile.",
      questionNumber: 1,
      category: "Technical",
      expectedAnswer: "Should demonstrate knowledge of mentioned technologies",
    },
    {
      questionText:
        "Describe a challenging project you worked on and how you overcame the difficulties.",
      questionNumber: 2,
      category: "Problem Solving",
      expectedAnswer: "Should show problem-solving skills and resilience",
    },
    {
      questionText:
        "How do you stay updated with the latest technology trends?",
      questionNumber: 3,
      category: "Behavioral",
      expectedAnswer: "Should show commitment to continuous learning",
    },
    {
      questionText:
        "Explain a complex technical concept to someone without a technical background.",
      questionNumber: 4,
      category: "Technical",
      expectedAnswer:
        "Should demonstrate communication skills and deep understanding",
    },
    {
      questionText:
        "Describe your approach to debugging and troubleshooting issues.",
      questionNumber: 5,
      category: "Problem Solving",
      expectedAnswer: "Should show systematic problem-solving approach",
    },
  ];

  return baseQuestions.slice(0, numberOfQuestions);
}

// Fallback evaluation for when AI evaluation fails
function getFallbackEvaluation() {
  return {
    relevance: 70,
    completeness: 65,
    technicalAccuracy: 68,
    communication: 72,
    overallScore: 69,
    feedback:
      "The answer addresses the question but could be more detailed and specific. Consider providing more concrete examples and technical details.",
    suggestions: [
      "Provide more specific examples",
      "Include technical details where relevant",
      "Structure your answer more clearly",
    ],
  };
}

// Fallback final result
function getFallbackFinalResult(answeredQuestions, totalQuestions) {
  const completionRate = (answeredQuestions / totalQuestions) * 100;
  const baseScore = Math.max(50, Math.min(80, completionRate * 0.8));

  return {
    overallScore: Math.round(baseScore),
    categoryScores: {
      technicalKnowledge: Math.round(baseScore * 0.9),
      communication: Math.round(baseScore * 1.1),
      problemSolving: Math.round(baseScore),
      confidence: Math.round(baseScore * 0.8),
      facialAnalysis: Math.round(baseScore * 0.7),
    },
    strengths: [
      "Completed the interview process",
      "Showed engagement with the questions",
      "Demonstrated basic understanding",
    ],
    weaknesses: [
      "Could provide more detailed answers",
      "Technical depth could be improved",
    ],
    recommendations: [
      "Practice explaining technical concepts in detail",
      "Work on providing specific examples",
      "Continue learning and practicing",
    ],
    detailedFeedback: `You completed ${answeredQuestions} out of ${totalQuestions} questions. Your responses show basic understanding, but there's room for improvement in technical depth and detail. Focus on providing more comprehensive answers with specific examples.`,
  };
}
