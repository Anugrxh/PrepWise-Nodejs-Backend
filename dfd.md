# PrepWise - Data Flow Diagram (DFD) Documentation

## Overview
This document provides comprehensive Data Flow Diagrams (DFD) for the PrepWise AI-powered interview preparation platform. The diagrams illustrate how data flows through the system at different levels of abstraction.

---

## DFD Level 0 (Context Diagram)

### System Context
The context diagram shows the PrepWise system as a single process with external entities and data flows.

```
                                    ┌─────────────────────┐
                                    │                     │
                                    │   Google Gemini AI  │
                                    │                     │
                                    └──────────┬──────────┘
                                               │
                                               │ AI Requests/Responses
                                               │ (Questions, Evaluations)
                                               │
┌──────────────┐                              ▼
│              │         User Credentials  ┌──────────────────────┐
│     User     │─────────────────────────►│                      │
│  (Candidate) │                           │                      │
│              │◄─────────────────────────│   PrepWise System    │
└──────────────┘   Interview Results,     │                      │
                   Analytics, Feedback     │   (Interview Prep    │
                                           │    Platform)         │
                                           │                      │
                                           └──────────┬───────────┘
                                                      │
                                                      │ Video Data/
                                                      │ Analysis Results
                                                      │
                                    ┌─────────────────▼──────────┐
                                    │                            │
                                    │  Django Facial Analysis    │
                                    │        Service             │
                                    │                            │
                                    └────────────────────────────┘
```

### External Entities

1. **User (Candidate)**
   - Inputs: Registration data, login credentials, interview preferences, answers
   - Outputs: Interview questions, results, analytics, feedback

2. **Google Gemini AI**
   - Inputs: Question generation requests, answer evaluation requests
   - Outputs: Generated questions, answer evaluations, feedback

3. **Django Facial Analysis Service**
   - Inputs: Video frames, facial data
   - Outputs: Confidence scores, emotion analysis, presentation metrics

### Data Flows (Level 0)

| Flow ID | From | To | Data Description |
|---------|------|-----|------------------|
| DF-0.1 | User | PrepWise System | User credentials (registration/login) |
| DF-0.2 | User | PrepWise System | Interview preferences (tech stack, difficulty) |
| DF-0.3 | User | PrepWise System | Interview answers and video data |
| DF-0.4 | PrepWise System | User | Interview questions |
| DF-0.5 | PrepWise System | User | Results, analytics, feedback |
| DF-0.6 | PrepWise System | Google Gemini AI | Question generation requests |
| DF-0.7 | Google Gemini AI | PrepWise System | Generated questions |
| DF-0.8 | PrepWise System | Google Gemini AI | Answer evaluation requests |
| DF-0.9 | Google Gemini AI | PrepWise System | Answer evaluations and feedback |
| DF-0.10 | PrepWise System | Django Service | Video frames for analysis |
| DF-0.11 | Django Service | PrepWise System | Facial analysis results |

---


## DFD Level 1 (Major Processes)

### System Decomposition
Level 1 DFD breaks down the PrepWise system into major functional processes.

```
                    ┌─────────────────────┐
                    │  Google Gemini AI   │
                    └──────┬──────────┬───┘
                           │          │
                    Questions│        │Evaluations
                           │          │
┌──────────┐              ▼          ▼
│          │         ┌────────────────────────┐
│   User   │────────►│  1.0                   │
│          │ Creds   │  Authentication        │
└────┬─────┘         │  & User Management     │
     │               └──────┬─────────────────┘
     │                      │
     │                      │ User Data
     │                      ▼
     │               ┌─────────────┐
     │               │   D1: Users │
     │               └─────────────┘
     │
     │ Interview     ┌────────────────────────┐
     │ Preferences   │  2.0                   │
     ├──────────────►│  Interview Generation  │
     │               │  & Management          │
     │               └──────┬─────────────────┘
     │                      │
     │                      │ Interview Data
     │                      ▼
     │               ┌──────────────────┐
     │               │  D2: Interviews  │
     │               └──────────────────┘
     │
     │ Answers &     ┌────────────────────────┐
     │ Video Data    │  3.0                   │
     ├──────────────►│  Answer Processing     │
     │               │  & Evaluation          │
     │               └──────┬─────────────────┘
     │                      │
     │                      │ Answer Data
     │                      ▼
     │               ┌─────────────┐
     │               │  D3: Answers│
     │               └─────────────┘
     │
     │               ┌────────────────────────┐
     │               │  4.0                   │
     │               │  Facial Analysis       │
     │               │  Processing            │
     │               └──────┬─────────────────┘
     │                      │
     │                      │ Facial Data
     │                      ▼
     │               ┌──────────────────────┐
     │               │  D4: Facial Analysis │
     │               └──────────────────────┘
     │
     │               ┌────────────────────────┐
     │               │  5.0                   │
     │◄──────────────┤  Result Generation     │
     │  Results      │  & Analytics           │
     │               └──────┬─────────────────┘
     │                      │
     │                      │ Result Data
     │                      ▼
     │               ┌────────────────┐
     │               │  D5: Results   │
     │               └────────────────┘
     │
     └───────────────────────────────────────────┐
                                                 │
                                    ┌────────────▼──────────┐
                                    │  Django Facial        │
                                    │  Analysis Service     │
                                    └───────────────────────┘
```

### Major Processes (Level 1)

#### Process 1.0: Authentication & User Management
**Description:** Handles user registration, login, profile management, and session control.

**Inputs:**
- User credentials (email, password)
- Profile updates (name, email, profile image)
- Password change requests

**Outputs:**
- JWT tokens (access and refresh)
- User profile data
- Authentication status

**Data Stores:**
- D1: Users

**Functions:**
- Register new users
- Authenticate users
- Generate JWT tokens
- Manage user sessions
- Update user profiles
- Handle profile images
- Change passwords

---

#### Process 2.0: Interview Generation & Management
**Description:** Generates AI-powered interview questions and manages interview lifecycle.

**Inputs:**
- Interview preferences (tech stack, difficulty, experience level, question count)
- Interview control commands (start, complete, delete)

**Outputs:**
- Generated interview questions
- Interview status updates
- Interview metadata

**Data Stores:**
- D1: Users (read)
- D2: Interviews (read/write)

**External Interactions:**
- Google Gemini AI (question generation)

**Functions:**
- Generate interview questions using AI
- Create interview records
- Start interview sessions
- Complete interviews
- Track interview status
- Calculate interview duration
- Manage interview history

---

#### Process 3.0: Answer Processing & Evaluation
**Description:** Processes user answers and evaluates them using AI.

**Inputs:**
- User answers (text)
- Answer metadata (duration, question number)
- Interview context

**Outputs:**
- AI evaluation scores
- Detailed feedback
- Improvement suggestions

**Data Stores:**
- D2: Interviews (read)
- D3: Answers (write)

**External Interactions:**
- Google Gemini AI (answer evaluation)

**Functions:**
- Validate answer submissions
- Send answers to AI for evaluation
- Process AI evaluation results
- Store answers with evaluations
- Calculate answer scores
- Generate feedback

---

#### Process 4.0: Facial Analysis Processing
**Description:** Processes video data to analyze facial expressions and confidence.

**Inputs:**
- Video frames/recordings
- Interview context
- Answer timing data

**Outputs:**
- Confidence scores
- Emotion distribution
- Eye contact metrics
- Speech clarity scores
- Presentation feedback

**Data Stores:**
- D3: Answers (read/write)
- D4: Facial Analysis (write)

**External Interactions:**
- Django Facial Analysis Service

**Functions:**
- Extract video frames
- Send data to facial analysis service
- Process facial analysis results
- Calculate confidence levels
- Analyze emotions
- Measure eye contact
- Evaluate speech clarity
- Store facial analysis data

---

#### Process 5.0: Result Generation & Analytics
**Description:** Generates comprehensive results and performance analytics.

**Inputs:**
- All answers for an interview
- AI evaluations
- Facial analysis data
- Historical performance data

**Outputs:**
- Overall scores
- Category-wise scores
- Grade (A+ to F)
- Pass/fail status
- Strengths and weaknesses
- Recommendations
- Performance analytics
- Comparison reports

**Data Stores:**
- D2: Interviews (read)
- D3: Answers (read)
- D4: Facial Analysis (read)
- D5: Results (write)

**Functions:**
- Aggregate answer evaluations
- Calculate category scores
- Compute overall score
- Assign grade
- Determine pass/fail
- Identify strengths and weaknesses
- Generate recommendations
- Create performance analytics
- Compare interview results
- Track improvement trends

---

### Data Stores (Level 1)

| Store ID | Name | Description | Key Fields |
|----------|------|-------------|------------|
| D1 | Users | User account information | id, name, email, password, profileImage |
| D2 | Interviews | Interview records and questions | id, userId, techStack, questions, status |
| D3 | Answers | User answers and evaluations | id, interviewId, answerText, aiEvaluation |
| D4 | Facial Analysis | Facial expression analysis data | id, interviewId, confidence, emotions |
| D5 | Results | Final interview results | id, interviewId, overallScore, grade |

---


## DFD Level 2 (Detailed Process Decomposition)

### Level 2.0: Authentication & User Management (Detailed)

```
                    ┌──────────────────────────────────────────────────┐
                    │  Process 1.0: Authentication & User Management   │
                    └──────────────────────────────────────────────────┘

┌──────────┐
│   User   │
└────┬─────┘
     │
     │ Registration Data
     ├────────────────────►┌─────────────────────┐
     │                     │  1.1                │
     │                     │  User Registration  │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Hashed Password
     │                            │ User Data
     │                            ▼
     │                     ┌─────────────┐
     │                     │   D1: Users │
     │                     └──────┬──────┘
     │                            │
     │ Login Credentials          │ User Record
     ├────────────────────►┌──────▼──────────────┐
     │                     │  1.2                │
     │                     │  User Login         │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ JWT Tokens
     │◄───────────────────────────┤
     │                            │
     │ Profile Updates            │
     ├────────────────────►┌──────▼──────────────┐
     │                     │  1.3                │
     │                     │  Profile Management │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Updated Profile
     │                            ▼
     │                     ┌─────────────┐
     │                     │   D1: Users │
     │                     └─────────────┘
     │
     │ Image File/URL
     ├────────────────────►┌─────────────────────┐
     │                     │  1.4                │
     │                     │  Image Management   │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Base64 Image
     │                            ▼
     │                     ┌─────────────┐
     │                     │   D1: Users │
     │                     └─────────────┘
     │
     │ Password Change
     └────────────────────►┌─────────────────────┐
                           │  1.5                │
                           │  Password Management│
                           └──────┬──────────────┘
                                  │
                                  │ New Hashed Password
                                  ▼
                           ┌─────────────┐
                           │   D1: Users │
                           └─────────────┘
```

#### Sub-Processes (1.0)

**1.1 User Registration**
- Input: name, email, password
- Process:
  1. Validate input data (email format, password strength)
  2. Check email uniqueness
  3. Hash password using bcrypt (12 rounds)
  4. Create user record
  5. Generate JWT tokens
- Output: User profile, JWT tokens
- Data Store: D1 (write)

**1.2 User Login**
- Input: email, password
- Process:
  1. Validate credentials
  2. Retrieve user by email
  3. Verify password hash
  4. Generate JWT access token (15 min expiry)
  5. Generate refresh token (30 days expiry)
  6. Update last login timestamp
- Output: User profile, JWT tokens
- Data Store: D1 (read/write)

**1.3 Profile Management**
- Input: name, email updates
- Process:
  1. Validate input data
  2. Check email uniqueness (if changed)
  3. Update user record
  4. Return updated profile
- Output: Updated user profile
- Data Store: D1 (read/write)

**1.4 Image Management**
- Input: Image file or URL
- Process:
  1. Validate file (size < 5MB, type: JPEG/PNG/JPG)
  2. Convert to base64 data URL (if file)
  3. Store in user profile
  4. Return updated profile
- Output: Updated profile with image
- Data Store: D1 (write)

**1.5 Password Management**
- Input: current password, new password
- Process:
  1. Verify current password
  2. Validate new password strength
  3. Hash new password
  4. Update user record
  5. Invalidate all refresh tokens
- Output: Success confirmation
- Data Store: D1 (read/write)

---

### Level 2.1: Interview Generation & Management (Detailed)

```
                    ┌──────────────────────────────────────────────────┐
                    │  Process 2.0: Interview Generation & Management  │
                    └──────────────────────────────────────────────────┘

┌──────────┐                              ┌─────────────────────┐
│   User   │                              │  Google Gemini AI   │
└────┬─────┘                              └──────────┬──────────┘
     │                                               │
     │ Interview Preferences                         │
     │ (tech stack, difficulty,                      │
     │  experience, count)                           │
     ├────────────────────►┌─────────────────────┐  │
     │                     │  2.1                │  │
     │                     │  Validate Input     │  │
     │                     └──────┬──────────────┘  │
     │                            │                 │
     │                            │ Validated Data  │
     │                            ▼                 │
     │                     ┌──────────────────────┐ │
     │                     │  2.2                 │ │
     │                     │  Generate AI Prompt  │ │
     │                     └──────┬───────────────┘ │
     │                            │                 │
     │                            │ AI Prompt       │
     │                            ├─────────────────┘
     │                            │
     │                            │ AI Request
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  2.3                 │
     │                     │  Call AI Service     │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Generated Questions
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  2.4                 │
     │                     │  Parse & Structure   │
     │                     │  Questions           │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Structured Questions
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  2.5                 │
     │                     │  Create Interview    │
     │                     │  Record              │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Interview Data
     │                            ▼
     │                     ┌──────────────────┐
     │                     │  D2: Interviews  │
     │                     └──────┬───────────┘
     │                            │
     │◄───────────────────────────┤ Interview with Questions
     │
     │ Start Command
     ├────────────────────►┌──────▼───────────────┐
     │                     │  2.6                 │
     │                     │  Start Interview     │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Status: in_progress
     │                            │ Start timestamp
     │                            ▼
     │                     ┌──────────────────┐
     │                     │  D2: Interviews  │
     │                     └──────────────────┘
     │
     │ Complete Command
     └────────────────────►┌─────────────────────┐
                           │  2.7                │
                           │  Complete Interview │
                           └──────┬──────────────┘
                                  │
                                  │ Status: completed
                                  │ End timestamp
                                  │ Duration
                                  ▼
                           ┌──────────────────┐
                           │  D2: Interviews  │
                           └──────────────────┘
```

#### Sub-Processes (2.0)

**2.1 Validate Input**
- Input: tech stack, difficulty, experience level, question count
- Process:
  1. Validate tech stack (1-10 technologies)
  2. Validate difficulty (Easy/Medium/Hard)
  3. Validate experience level (Fresher/Junior/Mid/Senior/Lead)
  4. Validate question count (3-20)
- Output: Validated parameters
- Data Store: None

**2.2 Generate AI Prompt**
- Input: Validated parameters
- Process:
  1. Construct prompt template
  2. Include tech stack details
  3. Specify difficulty level
  4. Specify experience level
  5. Request specific number of questions
  6. Define expected response format
- Output: AI prompt string
- Data Store: None

**2.3 Call AI Service**
- Input: AI prompt
- Process:
  1. Send request to Google Gemini AI
  2. Wait for response
  3. Handle errors/timeouts
  4. Retry if necessary
- Output: AI-generated questions (JSON)
- Data Store: None
- External: Google Gemini AI

**2.4 Parse & Structure Questions**
- Input: AI response
- Process:
  1. Parse JSON response
  2. Validate question format
  3. Assign question numbers
  4. Categorize questions (Technical/Behavioral/Problem Solving)
  5. Add metadata
- Output: Structured question array
- Data Store: None

**2.5 Create Interview Record**
- Input: Structured questions, user ID, parameters
- Process:
  1. Create interview object
  2. Set status to 'generated'
  3. Add timestamp
  4. Store in database
- Output: Interview ID
- Data Store: D2 (write)

**2.6 Start Interview**
- Input: Interview ID
- Process:
  1. Validate interview exists
  2. Check interview status
  3. Update status to 'in_progress'
  4. Record start timestamp
- Output: Updated interview
- Data Store: D2 (read/write)

**2.7 Complete Interview**
- Input: Interview ID
- Process:
  1. Validate interview exists
  2. Check all questions answered
  3. Update status to 'completed'
  4. Record completion timestamp
  5. Calculate total duration
- Output: Completed interview
- Data Store: D2 (read/write)

---


### Level 2.2: Answer Processing & Evaluation (Detailed)

```
                    ┌──────────────────────────────────────────────────┐
                    │  Process 3.0: Answer Processing & Evaluation     │
                    └──────────────────────────────────────────────────┘

┌──────────┐                              ┌─────────────────────┐
│   User   │                              │  Google Gemini AI   │
└────┬─────┘                              └──────────┬──────────┘
     │                                               │
     │ Answer Text,                                  │
     │ Question Number,                              │
     │ Duration                                      │
     ├────────────────────►┌─────────────────────┐  │
     │                     │  3.1                │  │
     │                     │  Validate Answer    │  │
     │                     └──────┬──────────────┘  │
     │                            │                 │
     │                            │ Validated Answer│
     │                            ▼                 │
     │                     ┌──────────────────────┐ │
     │                     │  3.2                 │ │
     │                     │  Retrieve Question   │ │
     │                     │  Context             │ │
     │                     └──────┬───────────────┘ │
     │                            │                 │
     │                            │ Question Data   │
     │                            ▼                 │
     │                     ┌──────────────────────┐ │
     │                     │  3.3                 │ │
     │                     │  Prepare Evaluation  │ │
     │                     │  Request             │ │
     │                     └──────┬───────────────┘ │
     │                            │                 │
     │                            │ Evaluation      │
     │                            │ Request         │
     │                            ├─────────────────┘
     │                            │
     │                            │ AI Request
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  3.4                 │
     │                     │  Call AI Evaluation  │
     │                     │  Service             │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ AI Evaluation
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  3.5                 │
     │                     │  Parse Evaluation    │
     │                     │  Results             │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Parsed Scores
     │                            │ & Feedback
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  3.6                 │
     │                     │  Calculate Scores    │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Final Scores
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  3.7                 │
     │                     │  Store Answer with   │
     │                     │  Evaluation          │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Answer Record
     │                            ▼
     │                     ┌─────────────┐
     │                     │  D3: Answers│
     │                     └──────┬──────┘
     │                            │
     │◄───────────────────────────┤ Evaluation Results
     │
```

#### Sub-Processes (3.0)

**3.1 Validate Answer**
- Input: Answer text, question number, duration
- Process:
  1. Check answer length (10-5000 characters)
  2. Validate question number
  3. Validate duration (positive number)
  4. Sanitize input
- Output: Validated answer data
- Data Store: None

**3.2 Retrieve Question Context**
- Input: Interview ID, question number
- Process:
  1. Query interview record
  2. Extract specific question
  3. Get expected answer
  4. Get question category
- Output: Question context
- Data Store: D2 (read)

**3.3 Prepare Evaluation Request**
- Input: Question, user answer, expected answer
- Process:
  1. Format evaluation prompt
  2. Include question text
  3. Include user's answer
  4. Include expected answer reference
  5. Specify evaluation criteria
- Output: Evaluation request
- Data Store: None

**3.4 Call AI Evaluation Service**
- Input: Evaluation request
- Process:
  1. Send to Google Gemini AI
  2. Request scoring on:
     - Relevance (0-100)
     - Completeness (0-100)
     - Technical Accuracy (0-100)
     - Communication (0-100)
  3. Request detailed feedback
  4. Request improvement suggestions
- Output: AI evaluation response
- Data Store: None
- External: Google Gemini AI

**3.5 Parse Evaluation Results**
- Input: AI response
- Process:
  1. Parse JSON response
  2. Extract individual scores
  3. Extract feedback text
  4. Extract suggestions array
  5. Validate score ranges
- Output: Structured evaluation
- Data Store: None

**3.6 Calculate Scores**
- Input: Individual scores
- Process:
  1. Calculate overall AI score (average)
  2. Validate score ranges (0-100)
  3. Round to 2 decimal places
- Output: Final scores
- Data Store: None

**3.7 Store Answer with Evaluation**
- Input: Answer data, evaluation, scores
- Process:
  1. Create answer record
  2. Include AI evaluation
  3. Add timestamp
  4. Link to interview and user
  5. Store in database
- Output: Answer ID
- Data Store: D3 (write)

---

### Level 2.3: Facial Analysis Processing (Detailed)

```
                    ┌──────────────────────────────────────────────────┐
                    │  Process 4.0: Facial Analysis Processing         │
                    └──────────────────────────────────────────────────┘

┌──────────┐                              ┌─────────────────────────┐
│   User   │                              │  Django Facial Analysis │
└────┬─────┘                              │       Service           │
     │                                     └──────────┬──────────────┘
     │ Video Recording                               │
     │ Interview Context                             │
     ├────────────────────►┌─────────────────────┐  │
     │                     │  4.1                │  │
     │                     │  Extract Video      │  │
     │                     │  Frames             │  │
     │                     └──────┬──────────────┘  │
     │                            │                 │
     │                            │ Video Frames    │
     │                            ▼                 │
     │                     ┌──────────────────────┐ │
     │                     │  4.2                 │ │
     │                     │  Prepare Analysis    │ │
     │                     │  Request             │ │
     │                     └──────┬───────────────┘ │
     │                            │                 │
     │                            │ Analysis Request│
     │                            ├─────────────────┘
     │                            │
     │                            │ API Request
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  4.3                 │
     │                     │  Call Facial         │
     │                     │  Analysis Service    │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Analysis Results
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  4.4                 │
     │                     │  Parse Analysis      │
     │                     │  Results             │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Parsed Data
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  4.5                 │
     │                     │  Calculate Metrics   │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Confidence,
     │                            │ Emotions, Scores
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  4.6                 │
     │                     │  Generate Feedback   │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Feedback Text
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  4.7                 │
     │                     │  Store Facial        │
     │                     │  Analysis            │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Facial Data
     │                            ▼
     │                     ┌──────────────────────┐
     │                     │  D4: Facial Analysis │
     │                     └──────┬───────────────┘
     │                            │
     │                            │ Update Answer
     │                            ▼
     │                     ┌─────────────┐
     │                     │  D3: Answers│
     │                     └─────────────┘
```

#### Sub-Processes (4.0)

**4.1 Extract Video Frames**
- Input: Video recording, interview ID
- Process:
  1. Validate video format
  2. Extract frames at intervals
  3. Optimize frame quality
  4. Prepare for analysis
- Output: Video frames array
- Data Store: None

**4.2 Prepare Analysis Request**
- Input: Video frames, interview context
- Process:
  1. Format request payload
  2. Include video data
  3. Include interview ID
  4. Add metadata
- Output: Analysis request
- Data Store: None

**4.3 Call Facial Analysis Service**
- Input: Analysis request
- Process:
  1. Send to Django service
  2. Wait for processing
  3. Handle timeouts
  4. Retry if necessary
- Output: Analysis response
- Data Store: None
- External: Django Facial Analysis Service

**4.4 Parse Analysis Results**
- Input: Service response
- Process:
  1. Parse JSON response
  2. Extract confidence score
  3. Extract emotion percentages
  4. Extract eye contact score
  5. Extract speech clarity score
  6. Validate data ranges
- Output: Structured analysis data
- Data Store: None

**4.5 Calculate Metrics**
- Input: Parsed analysis data
- Process:
  1. Calculate overall facial score
  2. Determine dominant emotion
  3. Normalize scores (0-100)
  4. Calculate averages
- Output: Calculated metrics
- Data Store: None

**4.6 Generate Feedback**
- Input: Calculated metrics
- Process:
  1. Analyze confidence level
  2. Evaluate eye contact
  3. Assess speech clarity
  4. Generate feedback message
  5. Provide improvement tips
- Output: Feedback text
- Data Store: None

**4.7 Store Facial Analysis**
- Input: All facial data, answer ID
- Process:
  1. Create facial analysis record
  2. Link to answer
  3. Store in database
  4. Update answer record
- Output: Facial analysis ID
- Data Store: D3 (update), D4 (write)

---


### Level 2.4: Result Generation & Analytics (Detailed)

```
                    ┌──────────────────────────────────────────────────┐
                    │  Process 5.0: Result Generation & Analytics      │
                    └──────────────────────────────────────────────────┘

┌──────────┐
│   User   │
└────┬─────┘
     │
     │ Generate Result Request
     ├────────────────────►┌─────────────────────┐
     │                     │  5.1                │
     │                     │  Retrieve Interview │
     │                     │  Data               │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Interview Record
     │                            ▼
     │                     ┌──────────────────┐
     │                     │  D2: Interviews  │
     │                     └──────────────────┘
     │                            │
     │                            │ Interview Data
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.2                │
     │                     │  Retrieve All       │
     │                     │  Answers            │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Answer Records
     │                            ▼
     │                     ┌─────────────┐
     │                     │  D3: Answers│
     │                     └──────┬──────┘
     │                            │
     │                            │ Answers with
     │                            │ Evaluations
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.3                │
     │                     │  Aggregate AI       │
     │                     │  Evaluations        │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ AI Scores
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.4                │
     │                     │  Aggregate Facial   │
     │                     │  Analysis           │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Facial Scores
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.5                │
     │                     │  Calculate Category │
     │                     │  Scores             │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Category Scores
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.6                │
     │                     │  Calculate Overall  │
     │                     │  Score              │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Overall Score
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.7                │
     │                     │  Assign Grade       │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Grade (A+ to F)
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.8                │
     │                     │  Determine Pass/Fail│
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Pass/Fail Status
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.9                │
     │                     │  Identify Strengths │
     │                     │  & Weaknesses       │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Strengths,
     │                            │ Weaknesses
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.10               │
     │                     │  Generate           │
     │                     │  Recommendations    │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Recommendations
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.11               │
     │                     │  Create Detailed    │
     │                     │  Feedback           │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Detailed Feedback
     │                            ▼
     │                     ┌─────────────────────┐
     │                     │  5.12               │
     │                     │  Store Final Result │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Result Record
     │                            ▼
     │                     ┌────────────────┐
     │                     │  D5: Results   │
     │                     └──────┬─────────┘
     │                            │
     │◄───────────────────────────┤ Complete Result
     │
     │ Analytics Request
     ├────────────────────►┌──────▼──────────────┐
     │                     │  5.13               │
     │                     │  Calculate          │
     │                     │  Performance        │
     │                     │  Analytics          │
     │                     └──────┬──────────────┘
     │                            │
     │                            │ Historical Data
     │                            ▼
     │                     ┌────────────────┐
     │                     │  D5: Results   │
     │                     └──────┬─────────┘
     │                            │
     │◄───────────────────────────┤ Analytics Report
     │
     │ Comparison Request
     └────────────────────►┌─────────────────────┐
                           │  5.14               │
                           │  Compare Results    │
                           └──────┬──────────────┘
                                  │
                                  │ Two Result Records
                                  ▼
                           ┌────────────────┐
                           │  D5: Results   │
                           └──────┬─────────┘
                                  │
                                  │ Comparison Report
                                  ▼
                           ┌──────────┐
                           │   User   │
                           └──────────┘
```

#### Sub-Processes (5.0)

**5.1 Retrieve Interview Data**
- Input: Interview ID
- Process:
  1. Query interview record
  2. Validate interview exists
  3. Check completion status
  4. Extract interview metadata
- Output: Interview data
- Data Store: D2 (read)

**5.2 Retrieve All Answers**
- Input: Interview ID
- Process:
  1. Query all answers for interview
  2. Sort by question number
  3. Validate completeness
  4. Extract evaluations
- Output: Answer array with evaluations
- Data Store: D3 (read)

**5.3 Aggregate AI Evaluations**
- Input: All answers with AI evaluations
- Process:
  1. Extract relevance scores
  2. Extract completeness scores
  3. Extract technical accuracy scores
  4. Extract communication scores
  5. Calculate averages for each category
  6. Calculate overall AI score
- Output: Aggregated AI scores
- Data Store: None

**5.4 Aggregate Facial Analysis**
- Input: All answers with facial data
- Process:
  1. Extract confidence scores
  2. Extract eye contact scores
  3. Extract speech clarity scores
  4. Extract emotion distributions
  5. Calculate averages
  6. Determine dominant emotions
- Output: Aggregated facial scores
- Data Store: None

**5.5 Calculate Category Scores**
- Input: AI scores, facial scores
- Process:
  1. Technical Knowledge = AI technical accuracy
  2. Communication = AI communication score
  3. Problem Solving = AI relevance + completeness
  4. Confidence = Facial confidence score
  5. Facial Analysis = Overall facial score
  6. Normalize all to 0-100 scale
- Output: Category scores object
- Data Store: None

**5.6 Calculate Overall Score**
- Input: Category scores
- Process:
  1. Apply weights:
     - Technical Knowledge: 25%
     - Communication: 20%
     - Problem Solving: 25%
     - Confidence: 15%
     - Facial Analysis: 15%
  2. Calculate weighted average
  3. Round to 2 decimal places
- Output: Overall score (0-100)
- Data Store: None

**5.7 Assign Grade**
- Input: Overall score
- Process:
  1. Apply grading scale:
     - A+ (95-100)
     - A (90-94)
     - B+ (85-89)
     - B (80-84)
     - C+ (75-79)
     - C (70-74)
     - D (60-69)
     - F (Below 60)
  2. Assign letter grade
- Output: Grade (A+ to F)
- Data Store: None

**5.8 Determine Pass/Fail**
- Input: Overall score
- Process:
  1. Check if score >= 70
  2. Set passed = true if >= 70
  3. Set passed = false if < 70
- Output: Pass/fail boolean
- Data Store: None

**5.9 Identify Strengths & Weaknesses**
- Input: Category scores, answer evaluations
- Process:
  1. Identify top 3 scoring categories (strengths)
  2. Identify bottom 2 scoring categories (weaknesses)
  3. Extract specific feedback from AI evaluations
  4. Analyze patterns across answers
  5. Generate strength statements
  6. Generate weakness statements
- Output: Strengths array, weaknesses array
- Data Store: None

**5.10 Generate Recommendations**
- Input: Weaknesses, category scores
- Process:
  1. Analyze weak areas
  2. Generate actionable recommendations
  3. Prioritize by impact
  4. Include specific improvement strategies
  5. Reference best practices
- Output: Recommendations array
- Data Store: None

**5.11 Create Detailed Feedback**
- Input: All scores, strengths, weaknesses, recommendations
- Process:
  1. Summarize overall performance
  2. Highlight key strengths
  3. Address areas for improvement
  4. Provide context for scores
  5. Offer encouragement
  6. Create comprehensive narrative
- Output: Detailed feedback text
- Data Store: None

**5.12 Store Final Result**
- Input: All result components
- Process:
  1. Create result record
  2. Include all scores and feedback
  3. Link to interview and user
  4. Add timestamp
  5. Store in database
- Output: Result ID
- Data Store: D5 (write)

**5.13 Calculate Performance Analytics**
- Input: User ID, time range
- Process:
  1. Retrieve all user results
  2. Calculate statistics:
     - Total interviews
     - Average score
     - Best/worst scores
     - Pass rate
     - Improvement trend
  3. Analyze category trends
  4. Generate grade distribution
  5. Identify insights
- Output: Analytics report
- Data Store: D5 (read)

**5.14 Compare Results**
- Input: Two result IDs
- Process:
  1. Retrieve both results
  2. Compare overall scores
  3. Compare category scores
  4. Calculate differences
  5. Identify improvements/declines
  6. Compare facial analysis
  7. Calculate time difference
  8. Generate comparison insights
- Output: Comparison report
- Data Store: D5 (read)

---

## Data Dictionary

### Data Stores

#### D1: Users
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | ObjectId | Unique identifier | Primary Key |
| name | String | User's full name | 2-50 characters |
| email | String | Email address | Unique, valid format |
| password | String | Hashed password | Bcrypt hash |
| profileImage | String | Base64 or URL | Optional, max 5MB |
| isActive | Boolean | Account status | Default: true |
| lastLogin | DateTime | Last login time | Auto-updated |
| refreshTokens | Array | Active tokens | JWT tokens |
| createdAt | DateTime | Creation time | Auto-generated |
| updatedAt | DateTime | Update time | Auto-generated |

#### D2: Interviews
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | ObjectId | Unique identifier | Primary Key |
| userId | ObjectId | User reference | Foreign Key → D1 |
| techStack | Array[String] | Technologies | 1-10 items |
| hardnessLevel | String | Difficulty | Easy/Medium/Hard |
| experienceLevel | String | Experience | Fresher/Junior/Mid/Senior/Lead |
| numberOfQuestions | Number | Question count | 3-20 |
| questions | Array[Object] | Question list | Structured objects |
| status | String | Interview state | generated/in_progress/completed/abandoned |
| startedAt | DateTime | Start time | Optional |
| completedAt | DateTime | End time | Optional |
| duration | Number | Total seconds | Calculated |
| createdAt | DateTime | Creation time | Auto-generated |
| updatedAt | DateTime | Update time | Auto-generated |

#### D3: Answers
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | ObjectId | Unique identifier | Primary Key |
| interviewId | ObjectId | Interview reference | Foreign Key → D2 |
| userId | ObjectId | User reference | Foreign Key → D1 |
| questionNumber | Number | Question index | 1-20 |
| questionText | String | Question | From interview |
| answerText | String | User's answer | 10-5000 characters |
| answerDuration | Number | Time in seconds | Positive number |
| aiEvaluation | Object | AI scores | Structured object |
| facialAnalysis | Object | Facial data | Structured object |
| submittedAt | DateTime | Submission time | Auto-generated |
| createdAt | DateTime | Creation time | Auto-generated |
| updatedAt | DateTime | Update time | Auto-generated |

#### D4: Facial Analysis
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | ObjectId | Unique identifier | Primary Key |
| answerId | ObjectId | Answer reference | Foreign Key → D3 |
| interviewId | ObjectId | Interview reference | Foreign Key → D2 |
| userId | ObjectId | User reference | Foreign Key → D1 |
| confidence | Number | Confidence score | 0-100 |
| emotions | Object | Emotion percentages | Sum = 100 |
| eyeContact | Number | Eye contact score | 0-100 |
| speechClarity | Number | Speech clarity | 0-100 |
| overallScore | Number | Overall facial score | 0-100 |
| feedback | String | Feedback text | Generated |
| createdAt | DateTime | Creation time | Auto-generated |
| updatedAt | DateTime | Update time | Auto-generated |

#### D5: Results
| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| id | ObjectId | Unique identifier | Primary Key |
| interviewId | ObjectId | Interview reference | Foreign Key → D2 |
| userId | ObjectId | User reference | Foreign Key → D1 |
| overallScore | Number | Final score | 0-100 |
| categoryScores | Object | Category breakdown | 5 categories |
| grade | String | Letter grade | A+ to F |
| passed | Boolean | Pass status | score >= 70 |
| strengths | Array[String] | Strengths list | 3-5 items |
| weaknesses | Array[String] | Weaknesses list | 2-3 items |
| recommendations | Array[String] | Recommendations | 3-5 items |
| detailedFeedback | String | Comprehensive feedback | Long text |
| completionTime | Number | Total seconds | From interview |
| questionsAnswered | Number | Answered count | 0-20 |
| totalQuestions | Number | Total count | From interview |
| completionPercentage | Number | Completion % | 0-100 |
| createdAt | DateTime | Creation time | Auto-generated |
| updatedAt | DateTime | Update time | Auto-generated |

---

## Data Flow Summary

### Primary Data Flows

1. **User Registration Flow**
   - User → System: Registration data
   - System → D1: User record
   - System → User: JWT tokens

2. **Interview Generation Flow**
   - User → System: Interview preferences
   - System → Google AI: Generation request
   - Google AI → System: Questions
   - System → D2: Interview record
   - System → User: Interview with questions

3. **Answer Submission Flow**
   - User → System: Answer + video
   - System → Google AI: Evaluation request
   - Google AI → System: Evaluation
   - System → Django: Facial analysis request
   - Django → System: Facial analysis
   - System → D3: Answer with evaluations
   - System → User: Confirmation

4. **Result Generation Flow**
   - User → System: Generate result request
   - System → D2: Read interview
   - System → D3: Read answers
   - System: Calculate scores
   - System → D5: Store result
   - System → User: Complete result

5. **Analytics Flow**
   - User → System: Analytics request
   - System → D5: Read all results
   - System: Calculate analytics
   - System → User: Analytics report

---

## Performance Considerations

### Data Flow Optimization

1. **Caching Strategy**
   - Cache user profiles (15 min TTL)
   - Cache interview questions (session duration)
   - Cache analytics (5 min TTL)

2. **Batch Processing**
   - Bulk answer submission
   - Parallel AI evaluation
   - Batch facial analysis

3. **Asynchronous Processing**
   - Facial analysis (background)
   - Result generation (background)
   - Email notifications (background)

4. **Database Optimization**
   - Indexed queries on userId
   - Compound indexes on interviewId + questionNumber
   - Pagination for large datasets

---

*This DFD documentation provides a complete view of data flows in the PrepWise system at multiple levels of abstraction, from high-level context to detailed process decomposition.*
