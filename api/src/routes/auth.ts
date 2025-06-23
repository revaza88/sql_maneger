import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

export const authRouter = Router();

const authController = new AuthController();

authRouter.post('/register', authController.register.bind(authController));
authRouter.post('/login', authController.login.bind(authController));
authRouter.post('/refresh', authenticate, authController.refreshToken.bind(authController));
authRouter.post('/verify-password', authenticate, authController.verifyPassword.bind(authController));
