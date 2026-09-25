import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { authSecret, defaultDebugPlayerId, isAuthBypassEnabled } from '../../config/authConfig';
import { parsePlaygroundToken } from '../../utils/playgroundToken';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    bypass?: boolean;
  };
}

export function getPlayerId(req: Request): string {
  const authReq = req as AuthRequest;
  if (authReq.user?.uid) return authReq.user.uid;
  if (isAuthBypassEnabled()) {
    return (req.headers['x-player-id'] as string) || defaultDebugPlayerId();
  }
  throw new AppError(401, 'UNAUTHORIZED', 'Missing authenticated player');
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (isAuthBypassEnabled()) {
      req.user = {
        uid: (req.headers['x-player-id'] as string) || defaultDebugPlayerId(),
        email: 'debug@localhost',
        bypass: true,
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const local = parsePlaygroundToken(token, authSecret());
    if (local) {
      req.user = { uid: local.playerId, email: local.email };
      return next();
    }

    try {
      const admin = require('firebase-admin');
      if (admin.apps?.length) {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = { uid: decodedToken.uid, email: decodedToken.email };
        return next();
      }
    } catch {
      // fall through to invalid token
    }

    throw new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token');
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token'));
    }
  }
}
