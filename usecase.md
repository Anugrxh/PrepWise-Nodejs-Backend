# PrepWise - Use Case Documentation

## System Overview
PrepWise is an AI-powered interview preparation platform that combines Google Gemini AI for question generation and evaluation, facial analysis for confidence assessment, and comprehensive performance analytics to help users practice technical interviews.

---

## Use Case Diagram

```
                                    PrepWise System
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  ┌──────────┐                                                            │
│  │   User   │                                                            │
│  │(Candidate)│                                                           │
│  └────┬─────┘                                                            │
│       │                                                                   │
│       ├──────► UC-1: Register/Login                                      │
│       │                                                                   │
│       ├──────► UC-2: Manage Profile                                      │
│       │                                                                   │
│       ├──────► UC-3: Generate Interview                                  │
│       │                                                                   │
│       ├──────► UC-4: Take Interview                                      │
│       │                                                                   │
│       ├──────► UC-5: Submit Answers                                      │
│       │                                                                   │
│       ├──────► UC-6: View Results                                        │
│       │                                                                   │
│       │                                                                   │
│       └──────► UC-7: View Performance Analytics                          │
│                                                                           │
│  ┌──────────────┐                                                        │
│  │ Google Gemini│◄────── (External System)                               │
│  │      AI      │                                                        │
│  └──────────────┘                                                        │
│                                                                           │
│  ┌──────────────┐                                                        │
│  │    Django    │◄────── (External System)                               │
│  │Facial Analysis│                                                       │
│  └──────────────┘                                                        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Use Cases

### UC-1: Register/Login

**Actor:** User (Candidate)

**Description:** User creates an account or logs into the system to access interview preparation features.

**Preconditions:**
- User has internet connection
- System is operational

**Main Flow:**

**Registration:**
1. User navigates to registration page
2. User enters name, email, and password
3. System validates input data
4. System hashes password using bcrypt
5. System creates user account in database
6. System generates JWT access token and refresh token
7. System returns user profile and tokens
8. User is redirected to dashboard

**Login:**
1. User navigates to login page
2. User enters email and password
3. System validates credentials
4. System verifies password hash
5. System generates JWT tokens
6. System updates last login timestamp
7. System returns user profile and tokens
8. User is redirected to dashboard

**Alternative Flows:**
- A1: Invalid email format → System shows validation error
- A2: Email already exists (registration) → System shows error message
- A3: Invalid credentials (login) → System shows authentication error
- A4: Account inactive → System denies access

**Postconditions:**
- User is authenticated
- JWT tokens are stored
- User session is active

**Related Use Cases:** UC-2, UC-3

---

### UC-2: Manage Profile

**Actor:** User (Candidate)

**Description:** User manages their profile information including personal details and profile image.

**Preconditions:**
- User is authenticated
- User has valid JWT token

**Main Flow:**

**View Profile:**
1. User navigates to profile page
2. System retrieves user data from database
3. System displays profile information and statistics
4. User views profile details

**Update Profile:**
1. User clicks edit profile
2. User modifies name or email
3. System validates input data
4. System updates user record in database
5. System returns updated profile
6. System displays success message

**Update Profile Image:**
1. User clicks upload profile image
2. User selects image file (or provides URL)
3. System validates file (max 5MB, JPEG/PNG/JPG)
4. System converts image to base64 data URL
5. System stores image in user profile
6. System returns updated profile
7. System displays new profile image

**Change Password:**
1. User navigates to change password
2. User enters current password and new password
3. System verifies current password
4. System validates new password strength
5. System hashes new password
6. System updates password in database
7. System invalidates all refresh tokens
8. System displays success message

**Alternative Flows:**
- A1: Invalid email format → System shows validation error
- A2: Email already taken → System shows error message
- A3: File too large → System rejects upload
- A4: Invalid file type → System shows error
- A5: Incorrect current password → System denies change

**Postconditions:**
- User profile is updated
- Changes are persisted in database
- User receives confirmation

**Related Use Cases:** UC-1, UC-7

---

### UC-3: Generate Interview

**Actor:** User (Candidate)

**Description:** User generates a customized interview with AI-powered questions based on their preferences.

**Preconditions:**
- User is authenticated
- Google Gemini AI service is available

**Main Flow:**
1. User navigates to interview setup page
2. User selects technology stack (e.g., React, Node.js, MongoDB)
3. User chooses difficulty level (Easy, Medium, Hard)
4. User selects experience level (Fresher, Junior, Mid, Senior, Lead)
5. User specifies number of questions (3-20)
6. User submits interview generation request
7. System validates input parameters
8. System sends request to Google Gemini AI
9. AI generates customized interview questions
10. System structures questions with metadata
11. System creates interview record in database
12. System returns interview with questions
13. User views generated interview questions

**Alternative Flows:**
- A1: Invalid tech stack → System shows validation error
- A2: AI service unavailable → System shows error and retry option
- A3: Question generation fails → System uses fallback questions
- A4: Invalid number of questions → System shows validation error

**Postconditions:**
- Interview is created with status 'generated'
- Questions are stored in database
- User can start the interview

**Related Use Cases:** UC-4

---

### UC-3.1: AI Question Generation (Sub-process)

**Actor:** System, Google Gemini AI

**Description:** System uses AI to generate relevant interview questions.

**Main Flow:**
1. System constructs AI prompt with parameters
2. System includes tech stack, difficulty, and experience level
3. System sends prompt to Google Gemini AI
4. AI analyzes requirements
5. AI generates questions with expected answers
6. AI categorizes questions (Technical, Behavioral, Problem Solving)
7. System parses AI response
8. System validates question format
9. System assigns question numbers
10. System returns structured questions

---

### UC-4: Take Interview

**Actor:** User (Candidate)

**Description:** User participates in an interview session, answering questions with video recording for facial analysis.

**Preconditions:**
- Interview is generated (status: 'generated')
- User has camera and microphone access
- User is authenticated

**Main Flow:**
1. User selects interview from dashboard
2. User clicks "Start Interview"
3. System updates interview status to 'in_progress'
4. System records start timestamp
5. System displays first question
6. User enables camera for facial recording
7. System begins video capture
8. User reads question
9. User provides answer (text/voice)
10. System records answer duration
11. System captures facial data during answer
12. User submits answer
13. System processes to next question
14. Steps 8-13 repeat for all questions
15. User completes all questions
16. System stops video recording
17. User clicks "Complete Interview"
18. System updates interview status to 'completed'
19. System records completion timestamp
20. System calculates total duration

**Alternative Flows:**
- A1: Camera access denied → System continues without facial analysis
- A2: User abandons interview → System marks status as 'abandoned'
- A3: Network interruption → System saves progress
- A4: User skips question → System records empty answer

**Postconditions:**
- Interview status is 'completed'
- All answers are recorded
- Video data is captured
- Interview duration is calculated

**Related Use Cases:** UC-5, UC-6

---

### UC-5: Submit Answers

**Actor:** User (Candidate), System

**Description:** User submits answers to interview questions with optional facial analysis data.

**Preconditions:**
- Interview is in progress
- User has answered questions
- User is authenticated

**Main Flow:**

**Single Answer Submission:**
1. User completes answer for a question
2. User clicks "Submit Answer"
3. System validates answer text (10-5000 characters)
4. System records answer duration
5. System sends answer to Google Gemini AI for evaluation
6. AI evaluates answer on relevance, completeness, technical accuracy, communication
7. AI generates feedback and suggestions
8. System receives AI evaluation
9. System sends video frame to Django Facial Analysis service
10. Facial analysis processes confidence, emotions, eye contact, speech clarity
11. System receives facial analysis results
12. System creates answer record with both evaluations
13. System stores answer in database
14. System displays submission confirmation

**Bulk Answer Submission:**
1. User completes all interview questions
2. User clicks "Submit All Answers"
3. System validates all answers
4. System processes each answer sequentially
5. System sends all answers to AI for evaluation
6. System sends video data to facial analysis service
7. System receives all evaluations
8. System creates answer records in database
9. System calculates completion percentage
10. System displays submission summary

**Alternative Flows:**
- A1: Answer too short → System shows validation error
- A2: AI evaluation fails → System uses default scoring
- A3: Facial analysis fails → System continues without facial data
- A4: Network error → System retries submission

**Postconditions:**
- Answers are stored in database
- AI evaluation is completed
- Facial analysis is processed
- User can view results

**Related Use Cases:** UC-4, UC-6

---

### UC-5.1: AI Answer Evaluation (Sub-process)

**Actor:** System, Google Gemini AI

**Description:** AI evaluates user's answer and provides detailed feedback.

**Main Flow:**
1. System sends question and answer to AI
2. System includes expected answer for reference
3. AI analyzes answer content
4. AI scores relevance (0-100)
5. AI scores completeness (0-100)
6. AI scores technical accuracy (0-100)
7. AI scores communication quality (0-100)
8. AI calculates overall score
9. AI generates detailed feedback
10. AI provides improvement suggestions
11. System receives evaluation results
12. System stores evaluation with answer

---

### UC-5.2: Facial Analysis Processing (Sub-process)

**Actor:** System, Django Facial Analysis Service

**Description:** System analyzes facial expressions and body language during interview.

**Main Flow:**
1. System extracts video frames from recording
2. System sends frames to Django service
3. Facial analysis detects face landmarks
4. Service analyzes facial expressions
5. Service detects emotions (happy, sad, angry, fear, surprise, disgust, neutral)
6. Service calculates confidence level (0-100)
7. Service measures eye contact percentage
8. Service evaluates speech clarity
9. Service calculates overall facial score
10. Service generates feedback message
11. System receives analysis results
12. System stores facial data with answer

---

### UC-6: View Results

**Actor:** User (Candidate)

**Description:** User views comprehensive interview results with AI-generated feedback and grading.

**Preconditions:**
- Interview is completed
- All answers are submitted
- User is authenticated

**Main Flow:**
1. User navigates to results page
2. User selects completed interview
3. System checks if result exists
4. If not exists, system triggers result generation
5. System retrieves all answers for interview
6. System aggregates AI evaluations
7. System aggregates facial analysis data
8. System calculates category scores:
   - Technical Knowledge (from AI evaluation)
   - Communication (from AI evaluation)
   - Problem Solving (from AI evaluation)
   - Confidence (from facial analysis)
   - Facial Analysis (overall facial score)
9. System calculates overall score (weighted average)
10. System determines grade (A+ to F scale)
11. System determines pass/fail (70% threshold)
12. System identifies strengths and weaknesses
13. System generates recommendations
14. System creates detailed feedback
15. System stores final result in database
16. System displays comprehensive result to user
17. User views:
    - Overall score and grade
    - Pass/fail status
    - Category-wise breakdown
    - Question-wise performance
    - Facial analysis insights
    - Strengths and weaknesses
    - Improvement recommendations

**Alternative Flows:**
- A1: Result already exists → System retrieves from database
- A2: Incomplete interview → System shows error
- A3: No answers submitted → System cannot generate result

**Postconditions:**
- Final result is generated and stored
- User receives comprehensive feedback
- Grade is assigned
- Pass/fail status is determined

**Related Use Cases:** UC-5, UC-7

---

### UC-6.1: Grading System (Sub-process)

**Actor:** System

**Description:** System calculates grade based on overall score.

**Grading Scale:**
- A+ (95-100%): Excellent - PASS
- A (90-94%): Excellent - PASS
- B+ (85-89%): Very Good - PASS
- B (80-84%): Very Good - PASS
- C+ (75-79%): Good - PASS
- C (70-74%): Good - PASS
- D (60-69%): Average - FAIL
- F (Below 60%): Poor - FAIL

**Main Flow:**
1. System calculates overall score
2. System applies grading scale
3. System assigns letter grade
4. System determines pass/fail (score >= 70%)
5. System stores grade with result

---

### UC-7: View Performance Analytics

**Actor:** User (Candidate)

**Description:** User views comprehensive performance analytics and progress tracking.

**Preconditions:**
- User is authenticated
- User has completed at least one interview

**Main Flow:**
1. User navigates to analytics/dashboard page
2. System retrieves user statistics
3. System calculates overview metrics:
   - Total interviews created
   - Total interviews completed
   - Average score across all interviews
   - Pass rate percentage
4. System analyzes interview distribution:
   - Status distribution (generated, in_progress, completed, abandoned)
   - Difficulty distribution (Easy, Medium, Hard)
   - Experience level distribution
5. System calculates performance metrics:
   - Best score achieved
   - Lowest score
   - Average category scores
   - Improvement trend
6. System generates grade distribution
7. System identifies insights:
   - Most improved category
   - Strongest category
   - Categories needing improvement
8. System displays analytics dashboard with:
   - Performance graphs
   - Score trends over time
   - Category-wise breakdown
   - Interview history
   - Facial analysis summary
9. User views and analyzes performance data

**Alternative Flows:**
- A1: No completed interviews → System shows empty state
- A2: Insufficient data → System shows limited analytics

**Postconditions:**
- User understands their performance
- User identifies areas for improvement
- User tracks progress over time

**Related Use Cases:** UC-6, UC-7

---

### UC-8: Manage Interview History

**Actor:** User (Candidate)

**Description:** User views and manages their interview history.

**Preconditions:**
- User is authenticated
- User has created interviews

**Main Flow:**
1. User navigates to interview history page
2. System retrieves user's interviews
3. System applies filters (status, difficulty, date)
4. System implements pagination (10 per page)
5. System displays interview list with:
   - Tech stack
   - Difficulty and experience level
   - Status
   - Creation date
   - Completion date (if completed)
   - Duration
6. User can:
   - View interview details
   - Continue in-progress interview
   - View results (if completed)
   - Delete interview
7. User selects action
8. System performs requested operation

**Alternative Flows:**
- A1: No interviews found → System shows empty state
- A2: Delete interview → System confirms and removes data

**Postconditions:**
- User can access interview history
- User can manage interviews
- User can track interview status

**Related Use Cases:** UC-3, UC-4, UC-6

---

### UC-9: Delete Account

**Actor:** User (Candidate)

**Description:** User permanently deletes their account and all associated data.

**Preconditions:**
- User is authenticated
- User confirms deletion intent

**Main Flow:**
1. User navigates to account settings
2. User clicks "Delete Account"
3. System displays confirmation dialog
4. User confirms deletion
5. System verifies user authentication
6. System deletes user data:
   - User profile
   - All interviews
   - All answers
   - All results
   - All facial analysis data
7. System invalidates all tokens
8. System logs out user
9. System redirects to landing page
10. System displays deletion confirmation

**Alternative Flows:**
- A1: User cancels → System returns to settings
- A2: Authentication fails → System denies deletion

**Postconditions:**
- User account is permanently deleted
- All user data is removed
- User is logged out
- User cannot access system

**Related Use Cases:** UC-1, UC-2

---

## Use Case Summary Table

| Use Case ID | Use Case Name | Actor | Priority | Complexity |
|-------------|---------------|-------|----------|------------|
| UC-1 | Register/Login | User | High | Medium |
| UC-2 | Manage Profile | User | Medium | Low |
| UC-3 | Generate Interview | User, AI | High | High |
| UC-4 | Take Interview | User | High | High |
| UC-5 | Submit Answers | User, AI, Facial Analysis | High | High |
| UC-6 | View Results | User | High | Medium |
| UC-7 | View Performance Analytics | User | Medium | Medium |
| UC-8 | Manage Interview History | User | Medium | Low |
| UC-9 | Delete Account | User | Low | Low |

---

## Actor Descriptions

### Primary Actor: User (Candidate)
- **Description:** Individual preparing for technical interviews
- **Goals:** Improve interview skills, receive feedback, track progress
- **Responsibilities:** Create account, take interviews, review results

### External System: Google Gemini AI
- **Description:** AI service for question generation and answer evaluation
- **Responsibilities:** Generate questions, evaluate answers, provide feedback

### External System: Django Facial Analysis Service
- **Description:** Computer vision service for facial expression analysis
- **Responsibilities:** Analyze facial expressions, detect emotions, measure confidence

---

## System Boundaries

**Included in System:**
- User authentication and authorization
- Interview generation and management
- Answer submission and storage
- Result generation and analytics
- Profile management
- Performance tracking

**External to System:**
- Google Gemini AI (question generation and evaluation)
- Django Facial Analysis Service (facial expression analysis)
- MongoDB Database (data persistence)
- Email services (future enhancement)

---

## Non-Functional Requirements

### Performance
- Interview generation: < 10 seconds
- Answer evaluation: < 5 seconds per answer
- Result generation: < 15 seconds
- Page load time: < 2 seconds

### Security
- JWT-based authentication
- Password hashing with bcrypt (12 rounds)
- Input validation and sanitization
- Rate limiting (100 requests per 15 minutes)
- CORS protection

### Scalability
- Support 1000+ concurrent users
- Handle 10,000+ interviews per day
- Database indexing for performance
- Horizontal scaling capability

### Reliability
- 99.9% uptime
- Automatic error recovery
- Data backup and recovery
- Graceful degradation for external services

### Usability
- Intuitive user interface
- Responsive design
- Clear error messages
- Comprehensive feedback

---

*This use case documentation provides a complete overview of PrepWise system functionality and user interactions.*
