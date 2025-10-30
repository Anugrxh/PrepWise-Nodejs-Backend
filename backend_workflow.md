# PrepWise Backend Workflow Documentation

## Architecture Overview

PrepWise backend is built with Node.js/Express and follows a modular, RESTful API architecture with MongoDB as the primary database. The system integrates with external AI services for interview generation and facial analysis.

## Technology Stack

### Core Technologies
- **Runtime**: Node.js (ES6 Modules)
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB with Mongoose ODM 8.0.3
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcryptjs 2.4.3
- **AI Integration**: Google Generative AI (@google/generative-ai 0.2.1)
- **HTTP Client**: Axios 1.6.2

### Security & Middleware
- **Security Headers**: Helmet 7.1.0
- **CORS**: cors 2.8.5
- **Rate Limiting**: express-rate-limit 7.1.5
- **Validation**: express-validator 7.0.1
- **Compression**: compression 1.7.4
- **Logging**: morgan 1.10.0
- **File Upload**: multer 1.4.5-lts.1

## Project Structure

```
src/
├── config/
│   └── database.js          # MongoDB connection configuration
├── middleware/
│   ├── errorHandler.js      # Global error handling middleware
│   ├── notFound.js          # 404 handler middleware
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User data model and methods
│   ├── Interview.js         # Interview data model and methods
│   ├── Answer.js            # Answer data model and methods
│   └── FinalResult.js       # Final result data model and methods
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── users.js             # User management routes
│   ├── interviews.js        # Interview CRUD routes
│   ├── answers.js           # Answer submission routes
│   ├── results.js           # Result generation routes
│   └── facialAnalysis.js    # Facial analysis integration routes
├── services/
│   ├── aiService.js         # AI integration service
│   ├── facialAnalysisService.js # Facial analysis service
│   └── emailService.js      # Email notification service
├── utils/
│   ├── validators.js        # Input validation utilities
│   ├── helpers.js           # Common helper functions
│   └── constants.js         # Application constants
└── server.js                # Main application entry point
```

## API Workflow Architecture

### 1. Authentication Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │    Auth     │    │  Database   │    │   Response  │
│   Request   │───▶│ Middleware  │───▶│   Query     │───▶│   Handler   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Authentication Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

**JWT Token Strategy:**
- Access Token: 15 minutes expiry
- Refresh Token: 30 days expiry
- Automatic token cleanup for expired tokens
- Maximum 5 active refresh tokens per user

### 2. Interview Generation Workflow

```
User Request → Validation → AI Service → Database → Response
     ↓              ↓           ↓          ↓         ↓
   POST         Input       Gemini AI   Interview   Generated
/interviews   Validation    Integration   Model     Questions
```

**Process Steps:**
1. **Input Validation**: Validate tech stack, difficulty, experience level
2. **AI Integration**: Call Google Gemini AI for question generation
3. **Data Processing**: Structure questions with metadata
4. **Database Storage**: Save interview with generated questions
5. **Response**: Return interview ID and questions to client

**Interview Generation Parameters:**
```javascript
{
  techStack: ["JavaScript", "React", "Node.js"],
  hardnessLevel: "Medium",
  experienceLevel: "Mid",
  numberOfQuestions: 5
}
```

### 3. Interview Session Workflow

```
Start Interview → Answer Submission → Facial Analysis → AI Evaluation → Final Results
      ↓                   ↓                ↓              ↓              ↓
   Update Status      Store Answer    Django Service   Gemini AI    Generate Report
```

**Session Management:**
- Interview status tracking (generated → in_progress → completed)
- Real-time answer submission and storage
- Parallel facial analysis processing
- AI-powered answer evaluation
- Comprehensive result generation

### 4. Answer Processing Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Answer    │    │   Facial    │    │     AI      │    │   Result    │
│ Submission  │───▶│  Analysis   │───▶│ Evaluation  │───▶│ Aggregation │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Processing Components:**
1. **Answer Storage**: Store user response with metadata
2. **Facial Analysis**: Process video for confidence and emotion detection
3. **AI Evaluation**: Assess answer quality and technical accuracy
4. **Score Calculation**: Combine facial and AI scores
5. **Feedback Generation**: Create personalized feedback

## Service Integration Architecture

### 1. AI Service Integration

**Google Gemini AI Integration:**
```javascript
// AI Service Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

// Question Generation
const generateQuestions = async (techStack, difficulty, experience, count) => {
  const prompt = buildPrompt(techStack, difficulty, experience, count);
  const result = await model.generateContent(prompt);
  return parseQuestions(result.response.text());
};

// Answer Evaluation
const evaluateAnswer = async (question, answer, expectedAnswer) => {
  const evaluationPrompt = buildEvaluationPrompt(question, answer, expectedAnswer);
  const result = await model.generateContent(evaluationPrompt);
  return parseEvaluation(result.response.text());
};
```

### 2. Facial Analysis Service

**Django Integration (Port 8000):**
```javascript
// Facial Analysis Service
const analyzeFacialData = async (videoPath, interviewId) => {
  try {
    const response = await axios.post('http://localhost:8000/api/analyze', {
      video_path: videoPath,
      interview_id: interviewId
    });
    
    return {
      confidence: response.data.confidence,
      emotions: response.data.emotions,
      eyeContact: response.data.eye_contact,
      overallScore: response.data.overall_score
    };
  } catch (error) {
    console.error('Facial analysis failed:', error);
    return null;
  }
};
```

### 3. Database Service Layer

**MongoDB Operations:**
```javascript
// User Service
class UserService {
  static async createUser(userData) {
    const user = new User(userData);
    await user.save();
    return user;
  }
  
  static async authenticateUser(email, password) {
    const user = await User.findByEmail(email).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid credentials');
    }
    return user;
  }
}

// Interview Service
class InterviewService {
  static async generateInterview(userId, interviewData) {
    const questions = await AIService.generateQuestions(interviewData);
    const interview = new Interview({
      userId,
      ...interviewData,
      questions
    });
    return await interview.save();
  }
}
```

## API Endpoint Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | User registration | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/refresh` | Refresh access token | No |
| POST | `/api/auth/logout` | User logout | Yes |
| GET | `/api/auth/me` | Get current user | Yes |

### User Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/profile` | Get user profile | Yes |
| PUT | `/api/users/profile` | Update user profile | Yes |
| POST | `/api/users/upload-avatar` | Upload profile image | Yes |
| GET | `/api/users/stats` | Get user statistics | Yes |

### Interview Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/interviews` | Generate new interview | Yes |
| GET | `/api/interviews` | Get user's interviews | Yes |
| GET | `/api/interviews/:id` | Get specific interview | Yes |
| PUT | `/api/interviews/:id/start` | Start interview session | Yes |
| PUT | `/api/interviews/:id/complete` | Complete interview | Yes |

### Answer Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/answers` | Submit answer | Yes |
| GET | `/api/answers/interview/:id` | Get interview answers | Yes |
| PUT | `/api/answers/:id` | Update answer | Yes |
| GET | `/api/answers/:id/analysis` | Get answer analysis | Yes |

### Result Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/results/generate/:interviewId` | Generate final results | Yes |
| GET | `/api/results/interview/:id` | Get interview results | Yes |
| GET | `/api/results/user` | Get user's all results | Yes |
| GET | `/api/results/analytics` | Get performance analytics | Yes |

## Error Handling Strategy

### Global Error Handler
```javascript
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};
```

### Validation Middleware
```javascript
const validateInterviewData = [
  body('techStack').isArray().withMessage('Tech stack must be an array'),
  body('hardnessLevel').isIn(['Easy', 'Medium', 'Hard']).withMessage('Invalid hardness level'),
  body('experienceLevel').isIn(['Fresher', 'Junior', 'Mid', 'Senior', 'Lead']).withMessage('Invalid experience level'),
  body('numberOfQuestions').isInt({ min: 3, max: 20 }).withMessage('Questions must be between 3 and 20'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];
```

## Security Implementation

### Authentication Middleware
```javascript
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};
```

### Rate Limiting Configuration
```javascript
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
```

## Performance Optimization

### Database Optimization
- **Indexing Strategy**: Compound indexes for common query patterns
- **Connection Pooling**: MongoDB connection pool management
- **Query Optimization**: Efficient aggregation pipelines
- **Data Pagination**: Limit large result sets

### Caching Strategy
- **In-Memory Caching**: Cache frequently accessed data
- **Redis Integration**: (Future enhancement) Distributed caching
- **API Response Caching**: Cache static responses

### Monitoring and Logging
```javascript
// Request logging
app.use(morgan('combined'));

// Performance monitoring
const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
```

## Deployment Architecture

### Environment Configuration
```javascript
// Environment Variables
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/prepwise
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=30d
GEMINI_API_KEY=your_gemini_api_key
FACIAL_ANALYSIS_URL=http://localhost:8000
```

### Production Considerations
- **Process Management**: PM2 for process management
- **Load Balancing**: Nginx reverse proxy
- **SSL/TLS**: HTTPS encryption
- **Database Replication**: MongoDB replica sets
- **Backup Strategy**: Automated database backups
- **Monitoring**: Application performance monitoring

## Future Enhancements

### Planned Features
1. **Real-time Communication**: WebSocket integration for live interviews
2. **Advanced Analytics**: Machine learning-based performance insights
3. **Microservices Architecture**: Service decomposition for scalability
4. **API Gateway**: Centralized API management
5. **Event-Driven Architecture**: Message queues for async processing
6. **Multi-tenant Support**: Organization-level user management

### Technical Improvements
1. **GraphQL Integration**: Flexible query capabilities
2. **Redis Caching**: Distributed caching layer
3. **Elasticsearch**: Advanced search and analytics
4. **Docker Containerization**: Containerized deployment
5. **Kubernetes Orchestration**: Container orchestration
6. **CI/CD Pipeline**: Automated testing and deployment

This backend workflow documentation provides a comprehensive guide for understanding, maintaining, and extending the PrepWise backend system.