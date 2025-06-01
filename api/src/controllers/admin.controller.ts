import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model'; // Assuming UserModel can fetch all users

export class AdminController {
  public getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: Add pagination and filtering options
      const users = await UserModel.findAll(); // Assuming UserModel.findAll() exists or will be created
      res.json({
        status: 'success',
        data: users, // users are already Omit<User, 'password'>
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
  
}
