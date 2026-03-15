import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token'));
    }
  }
}
