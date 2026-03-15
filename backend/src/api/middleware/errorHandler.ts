import { Request, Response, NextFunction } from 'express';
import { errorLogger } from '../../utils/errorLogger';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
    retryAfter?: number;
  };
  requestId: string;
  timestamp: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const timestamp = new Date().toISOString();

  if (err instanceof AppError) {
    const severity =
      err.statusCode >= 500 ? 'high'
      : err.statusCode >= 400 ? 'low'
      : 'medium';

    errorLogger.log({
      timestamp,
      requestId,
      errorCode: err.code,
      message: err.message,
      stack: err.stack,
      context: {
        statusCode: err.statusCode,
        retryable: err.retryable,
        details: err.details,
        method: req.method,
        path: req.path,
      },
      severity,
    });

    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        retryable: err.retryable
      },
      requestId,
      timestamp
    };

    res.status(err.statusCode).json(response);
  } else {
    errorLogger.log({
      timestamp,
      requestId,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      stack: err.stack,
      context: {
        method: req.method,
        path: req.path,
      },
      severity: 'critical',
    });

    const response: ErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        retryable: false
      },
      requestId,
      timestamp
    };

    res.status(500).json(response);
  }
}
