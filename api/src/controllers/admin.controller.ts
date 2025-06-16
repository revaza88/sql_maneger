import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model';
import { LoginHistoryModel } from '../models/login-history.model';
import { AuditLogModel } from '../models/audit-log.model';
import { NotificationModel } from '../models/notification.model';
import { RoleModel } from '../models/role.model';
import os from 'os';
import { execSync } from 'child_process';

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

  public getLoginHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const history = await LoginHistoryModel.getHistory();
      res.json({ status: 'success', data: history });
    } catch (error) {
      next(error);
    }
  };

  public getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logs = await AuditLogModel.getLogs();
      res.json({ status: 'success', data: logs });
    } catch (error) {
      next(error);
    }
  };

  public listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notes = await NotificationModel.list();
      res.json({ status: 'success', data: notes });
    } catch (error) {
      next(error);
    }
  };

  public createNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { message, type, isActive } = req.body;
      const note = await NotificationModel.create(message, type, isActive);
      res.json({ status: 'success', data: note });
    } catch (error) {
      next(error);
    }
  };

  public updateNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { message, type, isActive } = req.body;
      const updated = await NotificationModel.update(parseInt(id, 10), message, type, isActive);
      res.json({ status: updated ? 'success' : 'error' });
    } catch (error) {
      next(error);
    }
  };

  public deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await NotificationModel.delete(parseInt(id, 10));
      res.json({ status: deleted ? 'success' : 'error' });
    } catch (error) {
      next(error);
    }
  };

  public listRoles = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roles = await RoleModel.list();
      res.json({ status: 'success', data: roles });
    } catch (error) {
      next(error);
    }
  };

  public createRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description } = req.body;
      const role = await RoleModel.create(name, description);
      res.json({ status: 'success', data: role });
    } catch (error) {
      next(error);
    }
  };

  public updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const success = await RoleModel.update(parseInt(id, 10), name, description);
      res.json({ status: success ? 'success' : 'error' });
    } catch (error) {
      next(error);
    }
  };

  public deleteRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await RoleModel.delete(parseInt(id, 10));
      res.json({ status: success ? 'success' : 'error' });
    } catch (error) {
      next(error);
    }
  };

  public getSystemStats = async (_req: Request, res: Response): Promise<void> => {
    const cpuUsage = await new Promise<number>((resolve) => {
      const start = os.cpus();
      setTimeout(() => {
        const end = os.cpus();
        let idleDiff = 0;
        let totalDiff = 0;
        for (let i = 0; i < start.length; i++) {
          const s = start[i].times;
          const e = end[i].times;
          const startTotal = Object.values(s).reduce((a, v) => a + v, 0);
          const endTotal = Object.values(e).reduce((a, v) => a + v, 0);
          idleDiff += e.idle - s.idle;
          totalDiff += endTotal - startTotal;
        }
        const usage = totalDiff ? (1 - idleDiff / totalDiff) * 100 : 0;
        resolve(parseFloat(usage.toFixed(2)));
      }, 100);
    });

    let freeDisk = null;
    let totalDisk = null;
    try {
      const out = execSync('df -k --output=avail,size / | tail -1').toString().trim().split(/\s+/);
      if (out.length >= 2) {
        freeDisk = parseInt(out[0], 10) * 1024;
        totalDisk = parseInt(out[1], 10) * 1024;
      }
    } catch {}

    const stats = {
      freeMem: os.freemem(),
      totalMem: os.totalmem(),
      load: os.loadavg()[0],
      cpuUsage,
      freeDisk,
      totalDisk,
      activeConnections: process._getActiveHandles().length
    };
    res.json({ status: 'success', data: stats });
  };
  
}
