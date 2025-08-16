import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { neonConfig } from './config/database';
import { apiKeyAuth } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import polesRouter from './routes/poles';
import projectsRouter from './routes/projects';
import analyticsRouter from './routes/analytics';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true, // Configure specific origins in production
  credentials: true
}));
app.use(express.json());

// Global middleware
app.use(apiKeyAuth);
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/poles', polesRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/analytics', analyticsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Error handler
app.use(errorHandler);

// Export Firebase function
export const neonReadAPI = functions.https.onRequest(app);