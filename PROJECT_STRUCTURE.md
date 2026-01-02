# PrepWise Backend - Project Structure

## 📁 Directory Structure

```
PrepWise-Nodejs-Backend/
├── src/                          # Main application source code
│   ├── config/                   # Configuration files
│   │   ├── database.js          # MongoDB connection config
│   │   └── gemini.js            # Google Gemini AI config
│   ├── middleware/              # Express middleware
│   │   ├── auth.js              # Authentication middleware
│   │   ├── errorHandler.js      # Global error handler
│   │   ├── notFound.js          # 404 handler
│   │   └── validation.js        # Input validation middleware
│   ├── models/                  # MongoDB/Mongoose models
│   │   ├── Answer.js            # Interview answer model
│   │   ├── FinalResult.js       # Interview result model
│   │   ├── Interview.js         # Interview session model
│   │   └── User.js              # User model
│   ├── routes/                  # API route handlers
│   │   ├── answers.js           # Answer management routes
│   │   ├── auth.js              # Authentication routes
│   │   ├── facialAnalysis.js    # Facial analysis routes
│   │   ├── interviews.js        # Interview management routes
│   │   ├── results.js           # Result management routes
│   │   └── users.js             # User management routes
│   ├── services/                # Business logic services
│   │   ├── emailService.js      # Email sending service
│   │   └── facialAnalysis.js    # Facial analysis service
│   ├── utils/                   # Utility functions
│   │   └── helpers.js           # Helper functions
│   └── server.js                # 🎯 MAIN APPLICATION FILE
├── .env                         # Environment variables (DO NOT COMMIT)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # 📦 Dependencies & scripts
├── package-lock.json            # Dependency lock file
├── README.md                    # Project documentation
└── server.js                    # 🚀 ENTRY POINT (redirects to src/server.js)
```

## 🎯 Main Files for Docker

### Entry Point
- **`server.js`** (root) - Application entry point
- **`src/server.js`** - Main application server

### Dependencies
- **`package.json`** - Node.js dependencies and scripts
- **`package-lock.json`** - Exact dependency versions

### Configuration
- **`.env.example`** - Environment variables template
- **`src/config/database.js`** - Database connection
- **`src/config/gemini.js`** - AI service config

## 🐳 Docker Considerations

### Files to Include in Docker Image:
```
✅ src/
✅ package.json
✅ package-lock.json
✅ server.js
✅ .env.example (as template)
```

### Files to Exclude (.dockerignore):
```
❌ .env (contains secrets)
❌ node_modules/
❌ .git/
❌ README.md
❌ PROJECT_STRUCTURE.md
```

### Port Configuration:
- **Default Port:** 5000 (configurable via PORT env var)
- **Health Check:** `/health` endpoint available

### External Dependencies:
- **MongoDB** - Database (can be containerized separately)
- **Google Gemini AI** - External API service
- **Email Service** - SMTP configuration required
- **Facial Analysis Service** - Django service on port 8000

### Environment Variables Required:
- `NODE_ENV=production`
- `PORT=5000`
- `MONGODB_URI`
- `JWT_SECRET`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `EMAIL_USER` & `EMAIL_PASSWORD`
- `FACIAL_ANALYSIS_API_URL`

## 🚀 Docker Build Strategy

1. **Multi-stage build** recommended
2. **Node.js Alpine** base image for smaller size
3. **Non-root user** for security
4. **Health check** using `/health` endpoint
5. **Volume mounts** for logs and uploads