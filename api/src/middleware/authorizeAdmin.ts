import { Request, Response, NextFunction } from 'express';

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role?.toLowerCase() !== 'admin') { // Convert to lowercase for comparison
    res.status(403).json({ status: 'error', message: 'Forbidden: Access is restricted to administrators.' });
    return;
  }
  next();
};
