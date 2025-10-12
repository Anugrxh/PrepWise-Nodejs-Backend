// 404 Not Found middleware
export const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.method} ${req.originalUrl}`);
  error.status = 404;

  res.status(404).json({
    success: false,
    message: error.message,
    availableRoutes: {
      auth: [
        "POST /api/auth/register",
        "POST /api/auth/login",
        "POST /api/auth/logout",
        "POST /api/auth/refresh",
        "GET /api/auth/me",
      ],
      interviews: [
        "GET /api/interviews",
        "POST /api/interviews",
        "GET /api/interviews/:id",
        "PUT /api/interviews/:id",
        "DELETE /api/interviews/:id",
      ],
      feedback: [
        "GET /api/feedback",
        "POST /api/feedback",
        "GET /api/feedback/:id",
        "GET /api/feedback/interview/:interviewId",
      ],
      vapi: [
        "POST /api/vapi/generate-questions",
        "POST /api/vapi/create-assistant",
        "POST /api/vapi/start-call",
        "GET /api/vapi/call/:callId",
      ],
      users: [
        "GET /api/users/profile",
        "PUT /api/users/profile",
        "GET /api/users/stats",
      ],
      health: ["GET /health"],
    },
  });
};
