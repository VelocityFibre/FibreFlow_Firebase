import { Request, Response, NextFunction } from 'express';
import { functions } from 'firebase-functions';
import crypto from 'crypto';

// API keys would normally be stored in a database
// For now, using environment config
const VALID_API_KEYS = new Set([
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  functions.config().api?.key_1,
  functions.config().api?.key_2,
].filter(Boolean));

// For development only
if (process.env.NODE_ENV === 'development') {
  VALID_API_KEYS.add('dev-api-key-12345');
}

export interface AuthRequest extends Request {
  apiKey?: string;
  clientId?: string;
}

export function apiKeyAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required. Include X-API-Key header'
      }
    });
  }
  
  // Hash the API key for comparison (basic security)
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // In production, check against database of valid keys
  if (!VALID_API_KEYS.has(apiKey)) {
    // Log failed attempt
    console.warn('Invalid API key attempt:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key'
      }
    });
  }
  
  // Attach API key info to request
  req.apiKey = apiKey;
  req.clientId = `client_${hashedKey.substring(0, 8)}`;
  
  // Log successful auth
  console.log('API request authenticated:', {
    clientId: req.clientId,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  next();
}