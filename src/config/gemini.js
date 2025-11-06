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

// Pre-validation to catch obviously bad answers
function preValidateAnswer(answerText, questionText) {
  const answer = answerText.trim().toLowerCase();
  const question = questionText.toLowerCase();
  
  // Check for extremely short answers
  if (answer.length < 10) {
    return {
      isValid: false,
      reason: "Answer too short",
      score: 5
    };
  }
  
  // Check for gibberish patterns
  const gibberishPatterns = [
    /^[a-z]{1,3}(\s[a-z]{1,3}){5,}$/,  // Random short words
    /(.)\1{4,}/,                        // Repeated characters (aaaaa)
    /^[^a-zA-Z]*$/,                     // No letters at all
    /^(test|testing|hello|hi|ok|yes|no|idk|dunno)\s*$/,  // Common non-answers
  ];
  
  for (const pattern of gibberishPatterns) {
    if (pattern.test(answer)) {
      return {
        isValid: false,
        reason: "Answer appears to be gibberish or non-meaningful",
        score: 8
      };
    }
  }
  
  // Check if answer has any relation to question keywords
  const questionWords = question.split(' ').filter(word => word.length > 3);
  const answerWords = answer.split(' ');
  const commonWords = questionWords.filter(qWord => 
    answerWords.some(aWord => aWord.includes(qWord) || qWord.includes(aWord))
  );
  
  // If no common words and answer is short, likely irrelevant
  if (commonWords.length === 0 && answer.length < 50) {
    return {
      isValid: false,
      reason: "Answer appears unrelated to the question",
      score: 12
    };
  }
  
  return { isValid: true };
}

// Evaluate a single answer
export async function evaluateAnswer({
  questionText,
  answerText,
  expectedAnswer,
  techStack,
  experienceLevel,
}) {
  // Pre-validate the answer
  const preValidation = preValidateAnswer(answerText, questionText);
  if (!preValidation.isValid) {
    return {
      relevance: preValidation.score,
      completeness: Math.max(0, preValidation.score - 5),
      technicalAccuracy: Math.max(0, preValidation.score - 8),
      communication: Math.max(0, preValidation.score + 5),
      overallScore: preValidation.score,
      feedback: `Poor answer quality: ${preValidation.reason}. Please provide a meaningful, relevant response that demonstrates your understanding of the topic.`,
      suggestions: [
        "Provide a more detailed and relevant answer",
        "Ensure your response directly addresses the question",
        "Include specific technical details and examples"
      ],
    };
  }
  const prompt = `You are a strict technical interviewer evaluating this answer for a ${experienceLevel} level candidate.

Question: ${questionText}
Expected Answer: ${expectedAnswer || "Not specified"}
Candidate's Answer: ${answerText}
Technology Context: ${
    Array.isArray(techStack) ? techStack.join(", ") : techStack
  }

STRICT EVALUATION CRITERIA (score 0-100 each):

1. Relevance (0-100):
   - 0-20: Completely irrelevant, gibberish, or no attempt to answer
   - 21-40: Barely addresses the question, mostly off-topic
   - 41-60: Partially relevant but missing key aspects
   - 61-80: Good relevance with minor gaps
   - 81-100: Perfectly addresses the question

2. Completeness (0-100):
   - 0-20: No meaningful content or extremely incomplete
   - 21-40: Very basic, missing most important details
   - 41-60: Covers some aspects but lacks depth
   - 61-80: Good coverage with minor omissions
   - 81-100: Comprehensive and thorough

3. Technical Accuracy (0-100):
   - 0-20: Completely wrong or nonsensical technical information
   - 21-40: Major technical errors or misconceptions
   - 41-60: Some correct information but with notable errors
   - 61-80: Mostly accurate with minor technical issues
   - 81-100: Technically sound and accurate

4. Communication (0-100):
   - 0-20: Incoherent, gibberish, or impossible to understand
   - 21-40: Very poor structure and clarity
   - 41-60: Understandable but poorly organized
   - 61-80: Clear communication with minor issues
   - 81-100: Excellent clarity and structure

IMPORTANT RULES:
- If the answer is gibberish, nonsensical, or completely unrelated: ALL scores must be 0-20
- If the answer doesn't attempt to address the question: Relevance must be 0-30
- If there are major technical errors: Technical Accuracy must be below 40
- Be HARSH on irrelevant or low-quality answers
- Only give high scores (70+) for genuinely good answers

Calculate overallScore as the average of all four criteria.

Return ONLY a valid JSON object in this exact format:
{
  "relevance": 15,
  "completeness": 10,
  "technicalAccuracy": 5,
  "communication": 20,
  "overallScore": 12,
  "feedback": "Detailed feedback explaining why the answer received low scores",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

Be STRICT and OBJECTIVE. Do not be lenient with poor answers.`;

  try {
    // Log for debugging (remove in production)
    console.log(`🔍 Evaluating answer (${answerText.length} chars): "${answerText.substring(0, 100)}..."`);
    
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

    // Validate score ranges and consistency
    const scores = [
      evaluation.relevance,
      evaluation.completeness,
      evaluation.technicalAccuracy,
      evaluation.communication
    ];
    
    // Ensure all scores are within 0-100 range
    for (const score of scores) {
      if (score < 0 || score > 100 || isNaN(score)) {
        throw new Error(`Invalid score: ${score}`);
      }
    }
    
    // Recalculate overall score to ensure consistency
    const calculatedOverall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    evaluation.overallScore = calculatedOverall;
    
    // Additional validation: if answer is very short, cap the scores
    if (answerText.trim().length < 20) {
      evaluation.relevance = Math.min(evaluation.relevance, 40);
      evaluation.completeness = Math.min(evaluation.completeness, 30);
      evaluation.technicalAccuracy = Math.min(evaluation.technicalAccuracy, 25);
      evaluation.communication = Math.min(evaluation.communication, 35);
      evaluation.overallScore = Math.round((evaluation.relevance + evaluation.completeness + evaluation.technicalAccuracy + evaluation.communication) / 4);
    }

    // Log final evaluation for debugging
    console.log(`📊 Final evaluation: Overall=${evaluation.overallScore}%, Relevance=${evaluation.relevance}%, Length=${answerText.length} chars`);

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

// Fallback evaluation for when AI evaluation fails (conservative scoring)
function getFallbackEvaluation() {
  return {
    relevance: 30,
    completeness: 25,
    technicalAccuracy: 20,
    communication: 35,
    overallScore: 28,
    feedback:
      "Unable to properly evaluate this answer due to technical issues. The answer appears to lack sufficient technical depth and clarity. Please provide a more comprehensive and relevant response.",
    suggestions: [
      "Provide more specific and relevant technical details",
      "Ensure your answer directly addresses the question asked",
      "Structure your response more clearly with concrete examples",
    ],
  };
}

// Fallback final result (conservative scoring when AI fails)
function getFallbackFinalResult(answeredQuestions, totalQuestions) {
  const completionRate = (answeredQuestions / totalQuestions) * 100;
  
  // Much more conservative scoring when AI evaluation fails
  const baseScore = Math.max(20, Math.min(45, completionRate * 0.4));

  return {
    overallScore: Math.round(baseScore),
    categoryScores: {
      technicalKnowledge: Math.round(baseScore * 0.8),
      communication: Math.round(baseScore * 0.9),
      problemSolving: Math.round(baseScore * 0.7),
      confidence: Math.round(baseScore * 0.6),
      facialAnalysis: Math.round(baseScore * 0.5),
    },
    strengths: [
      "Completed the interview process",
    ],
    weaknesses: [
      "Unable to properly evaluate answer quality due to technical issues",
      "Answers may lack sufficient technical depth and clarity",
      "Response quality could not be verified",
    ],
    recommendations: [
      "Retake the interview when technical issues are resolved",
      "Ensure answers are comprehensive and technically accurate",
      "Provide more detailed explanations with specific examples",
    ],
    detailedFeedback: `Technical evaluation failed for this interview. You completed ${answeredQuestions} out of ${totalQuestions} questions, but we could not properly assess the quality of your responses. Please retake the interview to get an accurate evaluation of your skills.`,
  };
}
