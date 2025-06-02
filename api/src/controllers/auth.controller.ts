import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { SQLServerUserService } from '../services/SQLServerUserService';
import { config } from '../config';
import { z } from 'zod';
import { SignOptions } from 'jsonwebtoken';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export class AuthController {
  async register(req: Request<any, any, any>, res: Response<any>, next: NextFunction): Promise<Response<any>> {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      const user = await UserModel.createUser({
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name
      });

      // Automatically create SQL Server credentials for the new user
      try {
        const sqlCredentials = await SQLServerUserService.createSQLServerUser(user.id, user.email);
        await UserModel.updateSQLServerCredentials(user.id, sqlCredentials.username, sqlCredentials.password);
        console.log(`SQL Server credentials created for user ${user.email}: ${sqlCredentials.username}`);
      } catch (sqlError) {
        console.error('Failed to create SQL Server credentials during registration:', sqlError);
        // Don't fail registration if SQL Server creation fails
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret as string,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      return res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error in register method:', error);
      next(error);
    }
  }

  async login(req: Request<any, any, any>, res: Response<any>, next: NextFunction): Promise<Response<any>> {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user
      const user = await UserModel.findByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: 'User with this email not found.' });
      }

      // Verify password
      if (!user.password) {
        console.error(`User ${user.email} has no password set in the database.`);
        return res.status(500).json({ message: 'Authentication error. Please contact support.' });
      }
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Incorrect password. Please try again.' });
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret as string,
        { expiresIn: config.jwt.expiresIn } as SignOptions
      );

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  }
}
