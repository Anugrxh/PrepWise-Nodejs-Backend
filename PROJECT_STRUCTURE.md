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
├── node_modules/                # Dependencies (auto-generated)
├── .dockerignore                # 🐳 Docker ignore rules
├── .env                         # Environment variables (DO NOT COMMIT)
├── .env.example                 # Environment template
├── .git/                        # Git repository data
├── .gitignore                   # Git ignore rules
├── docker-compose.yml           # � Multi -container orchestration
├── Dockerfile                   # 🐳 Container build instructions
├── package.json                 # 📦 Dependencies & scripts
├── package-lock.json            # Dependency lock file
├── PROJECT_STRUCTURE.md         # This file
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

## 🐳 Docker Configuration

### Docker Files Added:
- **`Dockerfile`** - Container build instructions for the Node.js app
- **`docker-compose.yml`** - Multi-container orchestration (app + database)
- **`.dockerignore`** - Files to exclude from Docker build context

### Docker Architecture:
```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   Node.js App   │    │    MongoDB      │                │
│  │   (Port 5000)   │◄──►│   (Port 27017)  │                │
│  │                 │    │                 │                │
│  └─────────────────┘    └─────────────────┘                │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                       │
│  │ External APIs   │                                       │
│  │ - Gemini AI     │                                       │
│  │ - Email SMTP    │                                       │
│  │ - Facial API    │                                       │
│  └─────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 CI/CD Pipeline Structure

### Build Stage Files:
```
✅ Dockerfile              # Container build instructions
✅ docker-compose.yml      # Local development & testing
✅ package.json           # Dependencies & build scripts
✅ package-lock.json      # Exact dependency versions
✅ .dockerignore          # Build optimization
```

### Application Files:
```
✅ src/                   # All source code
✅ server.js             # Entry point
✅ .env.example          # Environment template
```

### CI/CD Exclusions:
```
❌ .env                  # Contains secrets (use CI/CD env vars)
❌ node_modules/         # Rebuilt in container
❌ .git/                 # Not needed in production
❌ *.md files            # Documentation only
```

### Port Configuration:
- **Default Port:** 5000 (configurable via PORT env var)
- **Health Check:** `/api/v1/health` endpoint available

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

## � CIc/CD Pipeline Recommendations

### 1. Build Pipeline:
```yaml
# Example GitHub Actions workflow structure
stages:
  - lint & test          # Code quality checks
  - docker build         # Build container image
  - security scan        # Vulnerability scanning
  - deploy staging       # Deploy to staging environment
  - integration tests    # End-to-end testing
  - deploy production    # Production deployment
```

### 2. Docker Build Strategy:
- **Multi-stage build** for optimized image size
- **Node.js Alpine** base image (smaller footprint)
- **Non-root user** for security
- **Health check** using `/api/v1/health` endpoint
- **Layer caching** for faster builds

### 3. Deployment Considerations:
- **Environment variables** managed via CI/CD secrets
- **Database migrations** handled separately
- **Rolling deployments** for zero downtime
- **Container orchestration** (Kubernetes/Docker Swarm)
- **Load balancing** for high availability

### 4. Monitoring & Logging:
- **Container logs** centralized collection
- **Health checks** for service monitoring (e.g., `/api/v1/health`)
- **Performance metrics** tracking
- **Error tracking** and alerting