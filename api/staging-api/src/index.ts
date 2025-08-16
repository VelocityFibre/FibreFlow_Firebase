import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiKeyAuth } from './middleware/auth';
import { stagingRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { validateSubmission } from './middleware/validation';
import submissionsRouter from './routes/submissions';
import statusRouter from './routes/status';
import uploadsRouter from './routes/uploads';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Larger limit for photo data
app.use(express.urlencoded({ extended: true }));

// Global middleware
app.use(apiKeyAuth);
app.use(stagingRateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'staging-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/v1/submit', validateSubmission, submissionsRouter);
app.use('/api/v1/status', statusRouter);
app.use('/api/v1/upload', uploadsRouter);

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
export const stagingAPI = functions
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300 // 5 minutes for large uploads
  })
  .https.onRequest(app);