import { Request, Response, NextFunction } from 'express';

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role?.toUpperCase() !== 'ADMIN') { // Convert to uppercase for comparison
    return res.status(403).json({ status: 'error', message: 'Forbidden: Access is restricted to administrators.' });
  }
  next();
};
