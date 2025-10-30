# PrepWise Entity Relationship (ER) Diagram

## Database Schema Overview

PrepWise uses MongoDB with Mongoose ODM for data modeling. The system consists of 4 main entities that handle user management, interview generation, answer collection, and result analysis.

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      USER       │       │   INTERVIEW     │       │     ANSWER      │       │  FINAL_RESULT   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ _id (ObjectId)  │◄──────┤ userId (FK)     │◄──────┤ interviewId(FK) │       │ interviewId(FK) │
│ name            │       │ _id (ObjectId)  │       │ userId (FK)     │◄──────┤ userId (FK)     │
│ email (unique)  │       │ techStack[]     │       │ _id (ObjectId)  │       │ _id (ObjectId)  │
│ password        │       │ hardnessLevel   │       │ questionNumber  │       │ overallScore    │
│ profileImage    │       │ experienceLevel │       │ questionText    │       │ categoryScores  │
│ resumeUrl       │       │ numberOfQuestions│      │ answerText      │       │ strengths[]     │
│ isActive        │       │ questions[]     │       │ answerDuration  │       │ weaknesses[]    │
│ lastLogin       │       │ status          │       │ facialAnalysis  │       │ recommendations[]│
│ refreshTokens[] │       │ startedAt       │       │ aiEvaluation    │       │ detailedFeedback│
│ createdAt       │       │ completedAt     │       │ submittedAt     │       │ grade           │
│ updatedAt       │       │ duration        │       │ createdAt       │       │ passed          │
└─────────────────┘       │ metadata        │       │ updatedAt       │       │ completionTime  │
                          │ createdAt       │       └─────────────────┘       │ questionsAnswered│
                          │ updatedAt       │                                 │ totalQuestions  │
                          └─────────────────┘                                 │ completionPercentage│
                                                                              │ metadata        │
                                                                              │ createdAt       │
                                                                              │ updatedAt       │
                                                                              └─────────────────┘
```

## Entity Definitions

### 1. USER Entity
**Collection:** `users`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | Primary Key | Unique user identifier |
| name | String | Required, 2-50 chars | User's full name |
| email | String | Required, Unique, Valid email | User's email address |
| password | String | Required, Min 6 chars, Hashed | User's password (bcrypt) |
| profileImage | String | Optional | URL/path to profile image |
| resumeUrl | String | Optional | URL/path to resume file |
| isActive | Boolean | Default: true | Account status |
| lastLogin | Date | Optional | Last login timestamp |
| refreshTokens | Array | JWT tokens with expiry | Active refresh tokens |
| createdAt | Date | Auto-generated | Account creation date |
| updatedAt | Date | Auto-generated | Last update timestamp |

**Indexes:**
- `email` (unique)
- `createdAt` (descending)

**Relationships:**
- One-to-Many with Interview (1:N)
- One-to-Many with Answer (1:N)
- One-to-Many with FinalResult (1:N)

### 2. INTERVIEW Entity
**Collection:** `interviews`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | Primary Key | Unique interview identifier |
| userId | ObjectId | Required, FK to User | Interview owner |
| techStack | Array[String] | Required | Technologies to focus on |
| hardnessLevel | String | Enum: Easy/Medium/Hard | Interview difficulty |
| experienceLevel | String | Enum: Fresher/Junior/Mid/Senior/Lead | Target experience level |
| numberOfQuestions | Number | 3-20 range | Total questions count |
| questions | Array[Object] | Generated questions | Question details array |
| status | String | Enum: generated/in_progress/completed/abandoned | Interview state |
| startedAt | Date | Optional | Interview start time |
| completedAt | Date | Optional | Interview completion time |
| duration | Number | Seconds | Total interview duration |
| metadata | Object | AI generation details | Generation metadata |
| createdAt | Date | Auto-generated | Creation timestamp |
| updatedAt | Date | Auto-generated | Last update timestamp |

**Question Object Structure:**
```javascript
{
  questionText: String,      // The actual question
  questionNumber: Number,    // Question sequence
  expectedAnswer: String,    // Sample/expected answer
  category: String          // Technical/Behavioral/Problem Solving
}
```

**Indexes:**
- `userId, createdAt` (compound, descending)
- `status`
- `techStack`
- `hardnessLevel, experienceLevel` (compound)

**Relationships:**
- Many-to-One with User (N:1)
- One-to-Many with Answer (1:N)
- One-to-One with FinalResult (1:1)

### 3. ANSWER Entity
**Collection:** `answers`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | Primary Key | Unique answer identifier |
| interviewId | ObjectId | Required, FK to Interview | Parent interview |
| userId | ObjectId | Required, FK to User | Answer author |
| questionNumber | Number | Required | Question sequence number |
| questionText | String | Required | The question asked |
| answerText | String | Required | User's text response |
| answerDuration | Number | Seconds | Time taken to answer |
| facialAnalysis | Object | Facial analysis results | Computer vision data |
| aiEvaluation | Object | AI assessment results | AI scoring and feedback |
| submittedAt | Date | Auto-generated | Answer submission time |
| createdAt | Date | Auto-generated | Creation timestamp |
| updatedAt | Date | Auto-generated | Last update timestamp |

**Facial Analysis Object:**
```javascript
{
  confidence: Number,        // 0-100 confidence score
  emotions: {               // Emotion percentages
    happy: Number,
    sad: Number,
    angry: Number,
    fear: Number,
    surprise: Number,
    disgust: Number,
    neutral: Number
  },
  eyeContact: Number,       // 0-100 eye contact score
  speechClarity: Number,    // 0-100 speech clarity
  overallScore: Number,     // 0-100 overall facial score
  feedback: String          // Textual feedback
}
```

**AI Evaluation Object:**
```javascript
{
  relevance: Number,        // 0-100 answer relevance
  completeness: Number,     // 0-100 answer completeness
  technicalAccuracy: Number, // 0-100 technical correctness
  communication: Number,    // 0-100 communication quality
  overallScore: Number,     // 0-100 overall AI score
  feedback: String,         // Detailed feedback
  suggestions: [String]     // Improvement suggestions
}
```

**Indexes:**
- `interviewId, questionNumber` (compound)
- `userId, createdAt` (compound, descending)
- `interviewId, userId, questionNumber` (compound, unique)

**Relationships:**
- Many-to-One with Interview (N:1)
- Many-to-One with User (N:1)

### 4. FINAL_RESULT Entity
**Collection:** `finalresults`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| _id | ObjectId | Primary Key | Unique result identifier |
| interviewId | ObjectId | Required, FK to Interview | Parent interview |
| userId | ObjectId | Required, FK to User | Result owner |
| overallScore | Number | 0-100 range | Final interview score |
| categoryScores | Object | Category-wise scores | Detailed scoring breakdown |
| strengths | Array[String] | Required | Identified strengths |
| weaknesses | Array[String] | Required | Areas for improvement |
| recommendations | Array[String] | Required | Actionable recommendations |
| detailedFeedback | String | Required | Comprehensive feedback |
| grade | String | A+ to F scale | Letter grade |
| passed | Boolean | Auto-calculated | Pass/fail status (≥70%) |
| completionTime | Number | Required, Seconds | Total interview time |
| questionsAnswered | Number | Required | Questions completed |
| totalQuestions | Number | Required | Total questions available |
| completionPercentage | Number | 0-100 range | Completion percentage |
| metadata | Object | Processing metadata | Generation details |
| createdAt | Date | Auto-generated | Creation timestamp |
| updatedAt | Date | Auto-generated | Last update timestamp |

**Category Scores Object:**
```javascript
{
  technicalKnowledge: Number,  // 0-100 technical score
  communication: Number,       // 0-100 communication score
  problemSolving: Number,      // 0-100 problem solving score
  confidence: Number,          // 0-100 confidence score
  facialAnalysis: Number       // 0-100 facial analysis score
}
```

**Indexes:**
- `interviewId, userId` (compound, unique)
- `userId, createdAt` (compound, descending)
- `overallScore` (descending)
- `grade`

**Relationships:**
- One-to-One with Interview (1:1)
- Many-to-One with User (N:1)

## Relationship Details

### Primary Relationships

1. **User → Interview (1:N)**
   - One user can create multiple interviews
   - Foreign Key: `interviews.userId` → `users._id`

2. **Interview → Answer (1:N)**
   - One interview contains multiple answers (one per question)
   - Foreign Key: `answers.interviewId` → `interviews._id`

3. **User → Answer (1:N)**
   - One user provides multiple answers across interviews
   - Foreign Key: `answers.userId` → `users._id`

4. **Interview → FinalResult (1:1)**
   - Each completed interview has exactly one final result
   - Foreign Key: `finalresults.interviewId` → `interviews._id`

5. **User → FinalResult (1:N)**
   - One user can have multiple interview results
   - Foreign Key: `finalresults.userId` → `users._id`

### Referential Integrity

- All foreign key relationships use MongoDB ObjectId references
- Mongoose populate() is used for joining related documents
- Cascade deletion is handled at application level
- Unique constraints prevent duplicate answers per question per interview

## Data Flow Sequence

1. **User Registration/Login** → `users` collection
2. **Interview Generation** → `interviews` collection
3. **Question Answering** → `answers` collection (one per question)
4. **Facial Analysis Processing** → Updates `answers.facialAnalysis`
5. **AI Evaluation** → Updates `answers.aiEvaluation`
6. **Result Generation** → `finalresults` collection
7. **Analytics Calculation** → Aggregated from existing data

## Performance Considerations

### Indexing Strategy
- Compound indexes for common query patterns
- Descending indexes for time-based sorting
- Unique indexes for data integrity

### Query Optimization
- Use of MongoDB aggregation pipeline for analytics
- Efficient population of related documents
- Pagination for large result sets

### Scalability Features
- Document-based structure allows horizontal scaling
- Embedded objects reduce join operations
- TTL indexes for automatic token cleanup

This ER diagram represents the complete data model for PrepWise, supporting the full interview preparation workflow from user registration through result analysis and performance tracking.