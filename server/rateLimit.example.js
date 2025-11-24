import express from 'express';
import { rateLimitMiddleware, getRateLimitStatus, getRateLimitAnalytics } from './rateLimit.js';

const app = express();

const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    id: 'user-123',
    email: 'user@example.com',
    role: 'Admin',
    organizationId: 'org-456'
  };
  next();
};

app.get('/api/data', mockAuthMiddleware, rateLimitMiddleware, (req, res) => {
  res.json({ message: 'This endpoint is rate limited' });
});

app.get('/api/rate-limit/status', mockAuthMiddleware, getRateLimitStatus);

app.get('/api/rate-limit/analytics', mockAuthMiddleware, getRateLimitAnalytics);

app.listen(3002, () => {
  console.log('Rate limit demo server running on http://localhost:3002');
  console.log('');
  console.log('Try these endpoints:');
  console.log('  GET http://localhost:3002/api/data');
  console.log('  GET http://localhost:3002/api/rate-limit/status');
  console.log('  GET http://localhost:3002/api/rate-limit/analytics?days=7');
  console.log('');
  console.log('Make multiple requests to see rate limiting in action!');
});
