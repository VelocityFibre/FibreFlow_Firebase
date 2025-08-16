import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('API Error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error
  let statusCode = 500;
  let errorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  };

  // Handle specific errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse.error = {
      code: 'VALIDATION_ERROR',
      message: err.message
    };
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorResponse.error = {
      code: 'UNAUTHORIZED',
      message: 'Invalid or missing authentication'
    };
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    errorResponse.error = {
      code: err.code || 'ERROR',
      message: err.message
    };
  }

  res.status(statusCode).json(errorResponse);
}