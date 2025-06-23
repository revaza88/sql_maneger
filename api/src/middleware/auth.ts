import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserModel } from '../models/user.model';

interface JwtPayload {
  id: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('Authenticating request...');
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('No token provided');
      res.status(401).json({ 
        status: 'error',
        message: 'Authentication required: No token provided' 
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;
      console.log('Token verified successfully for user:', decoded.email);
      next();
    } catch (jwtError: any) {
      console.error('JWT verification failed:', jwtError);
      
      // Check if it's a token expiration error
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json({ 
          status: 'error',
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: jwtError.expiredAt
        });
      } else {
        res.status(401).json({ 
          status: 'error',
          message: 'Authentication failed: Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      return;
    }
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Authentication error',
      details: error.message 
    });
    return;
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    next();
  };
};
