import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth';

const profileRouter = Router();

// Define a wrapper for async route handlers to ensure correct error handling and type compatibility
const asyncHandler = 
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };

// Profile routes with authentication
profileRouter.get('/', authenticate, asyncHandler(ProfileController.getProfile));

profileRouter.put('/', authenticate, asyncHandler(ProfileController.updateProfile));

profileRouter.put('/password', authenticate, asyncHandler(ProfileController.updatePassword));

export default profileRouter;
