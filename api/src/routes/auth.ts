import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

export const authRouter = Router();

const authController = new AuthController();

authRouter.post('/register', authController.register.bind(authController));
authRouter.post('/login', authController.login.bind(authController));
