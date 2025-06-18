import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional()
});

const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

export class ProfileController {
  static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      const { password, ...userProfile } = user;
      res.json({
        status: 'success',
        data: userProfile
      });
      return;
    } catch (error) {
      console.error('Error in getProfile:', error);
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const validatedData = profileUpdateSchema.parse(req.body);

      // Check if email is being updated and if it already exists
      if (validatedData.email) {
        const existingUser = await UserModel.findByEmail(validatedData.email);
        if (existingUser && existingUser.id !== req.user.id) {
          res.status(400).json({ 
            status: 'error',
            message: 'Email already exists' 
          });
          return;
        }
      }

      const updatedUser = await UserModel.updateProfile(req.user.id, validatedData);
      if (!updatedUser) {
        res.status(404).json({ 
          status: 'error',
          message: 'User not found' 
        });
        return;
      }

      const { password, ...userProfile } = updatedUser;
      res.json({
        status: 'success',
        message: 'Profile updated successfully',
        data: userProfile
      });
      return;
    } catch (error) {
      console.error('Error in updateProfile:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          status: 'error',
          message: 'Validation error',
          errors: error.errors 
        });
        return;
      }
      next(error);
    }
  }

  static async updatePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const validatedData = passwordUpdateSchema.parse(req.body);

      // Verify current password
      const isCurrentPasswordValid = await UserModel.verifyPassword(
        req.user.id, 
        validatedData.currentPassword
      );

      if (!isCurrentPasswordValid) {
        res.status(400).json({ 
          status: 'error',
          message: 'Current password is incorrect' 
        });
        return;
      }

      // Update password
      const success = await UserModel.updatePassword(req.user.id, validatedData.newPassword);
      
      if (!success) {
        res.status(404).json({ 
          status: 'error',
          message: 'User not found' 
        });
        return;
      }

      res.json({
        status: 'success',
        message: 'Password updated successfully'
      });
      return;
    } catch (error) {
      console.error('Error in updatePassword:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          status: 'error',
          message: 'Validation error',
          errors: error.errors 
        });
        return;
      }
      next(error);
    }
  }
}