import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

export const authRouter = Router();

authRouter.post('/register', AuthController.register.bind(AuthController));
authRouter.post('/login', AuthController.login.bind(AuthController));
