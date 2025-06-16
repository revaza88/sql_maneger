import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model'; // Assuming UserModel can fetch all users

export class AdminController {
  public getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || undefined;
      const offset = (page - 1) * limit;
      const users = await UserModel.findAll(limit, offset, search);
      const total = await UserModel.countAll(search);
      res.json({
        status: 'success',
        data: users,
        page,
        total,
      });
    } catch (error) {
      next(error);
    }
  };

  // TODO: Implement other admin actions like updateUserRole, deleteUser, etc.
  
  public updateUserRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['ADMIN', 'USER'].includes(role.toUpperCase())) { // Validate against uppercase and convert to uppercase
        res.status(400).json({ status: 'error', message: 'Invalid role specified' });
        return;
      }

      const success = await UserModel.updateRole(parseInt(userId, 10), role.toUpperCase() as 'ADMIN' | 'USER'); // Pass uppercase role
      if (success) {
        res.json({ status: 'success', message: 'User role updated successfully' });
      } else {
        res.status(404).json({ status: 'error', message: 'User not found or role not updated' });
      }
    } catch (error) {
      next(error);
    }
  };

  public deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const success = await UserModel.delete(parseInt(userId, 10)); // Assuming UserModel.delete() exists
      if (success) {
        res.json({ status: 'success', message: 'User deleted successfully' });
      } else {
        res.status(404).json({ status: 'error', message: 'User not found or not deleted' });
      }
    } catch (error) {
      next(error);
    }
  };

  public blockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const success = await UserModel.setBlocked(parseInt(userId, 10), true);
      if (success) {
        res.json({ status: 'success', message: 'User blocked' });
      } else {
        res.status(404).json({ status: 'error', message: 'User not found' });
      }
    } catch (error) {
      next(error);
    }
  };

  public unblockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const success = await UserModel.setBlocked(parseInt(userId, 10), false);
      if (success) {
        res.json({ status: 'success', message: 'User unblocked' });
      } else {
        res.status(404).json({ status: 'error', message: 'User not found' });
      }
    } catch (error) {
      next(error);
    }
  };

  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      if (!newPassword) {
        res.status(400).json({ status: 'error', message: 'New password required' });
        return;
      }
      const success = await UserModel.updatePassword(parseInt(userId, 10), newPassword);
      if (success) {
        res.json({ status: 'success', message: 'Password reset' });
      } else {
        res.status(404).json({ status: 'error', message: 'User not found' });
      }
    } catch (error) {
      next(error);
    }
  };

  public getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const totalUsers = await UserModel.countAll();
      const blockedUsers = await UserModel.countBlocked();
      res.json({ status: 'success', data: { totalUsers, blockedUsers } });
    } catch (error) {
      next(error);
    }
  };
  
}
