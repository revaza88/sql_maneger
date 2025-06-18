import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model';
import { LoginHistoryModel } from '../models/login-history.model';
import { AuditLogModel } from '../models/audit-log.model';
import { NotificationModel } from '../models/notification.model';
import { RoleModel } from '../models/role.model';
import { UserDatabaseModel } from '../models/user-database.model';
import { UserDatabaseService } from '../services/UserDatabaseService';
import os from 'os';

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
      const activeUsers = totalUsers - blockedUsers;
      
      // Get database statistics
      const databases = await UserDatabaseModel.getAllDatabasesWithOwners();
      const totalDatabases = Array.isArray(databases) ? databases.length : 0;
      
      // Calculate total database size
      const databaseList = Array.isArray(databases) ? databases : [];
      const totalDbSize = databaseList.reduce((sum, db) => sum + ((db as any)?.size_mb || 0), 0);
      
      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          blocked: blockedUsers,
          activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
        },
        databases: {
          total: totalDatabases,
          totalSizeMB: Math.round(totalDbSize * 100) / 100,
          averageSizeMB: totalDatabases > 0 ? Math.round((totalDbSize / totalDatabases) * 100) / 100 : 0
        },
        activity: {
          recentLogins: 0, // Will be implemented when login history is available
          onlineUsers: activeUsers
        }
      };
      
      res.json({ status: 'success', data: stats });
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

  public getSystemStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = {
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
        used: os.totalmem() - os.freemem(),
        usagePercentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      cpu: {
        load: os.loadavg()[0],
        cores: os.cpus().length,
        architecture: os.arch(),
        platform: os.platform()
      },
      system: {
        uptime: os.uptime(),
        hostname: os.hostname(),
        nodeVersion: process.version,
        pid: process.pid
      },
      network: {
        interfaces: Object.keys(os.networkInterfaces()).length
      }
    };
    res.json({ status: 'success', data: stats });
  };

  /**
   * Get all databases with their owners (admin only)
   */
  public getAllDatabases = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('Admin getAllDatabases endpoint called');
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || undefined;
      
      console.log(`Admin database request - page: ${page}, limit: ${limit}, search: ${search}`);
      
      // Get all databases with owner information
      const allDatabases = await UserDatabaseModel.getAllDatabasesWithOwners();
      console.log(`Found ${allDatabases.length} databases with owners`);
      
      // Filter by search if provided
      let filteredDatabases = allDatabases;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredDatabases = allDatabases.filter(db => 
          db.databaseName.toLowerCase().includes(searchLower) ||
          db.userEmail.toLowerCase().includes(searchLower)
        );
      }
      
      // Get detailed database information
      const databasesWithDetails = await Promise.all(
        filteredDatabases.map(async (db) => {
          try {
            const userDatabases = await UserDatabaseService.getUserDatabases(db.userId);
            const dbInfo = userDatabases.find(dbDetail => dbDetail.name === db.databaseName);
            
            return {
              databaseName: db.databaseName,
              userId: db.userId,
              userEmail: db.userEmail,
              size_mb: dbInfo?.size_mb || 0,
              create_date: dbInfo?.create_date || null,
              state_desc: dbInfo?.state_desc || 'Unknown'
            };
          } catch (error) {
            // If we can't get details, return basic info
            return {
              databaseName: db.databaseName,
              userId: db.userId,
              userEmail: db.userEmail,
              size_mb: 0,
              create_date: null,
              state_desc: 'Unknown'
            };
          }
        })
      );
      
      // Paginate results
      const offset = (page - 1) * limit;
      const paginatedDatabases = databasesWithDetails.slice(offset, offset + limit);
      
      console.log(`Returning ${paginatedDatabases.length} databases to admin`);
      
      res.json({
        status: 'success',
        data: paginatedDatabases,
        page,
        total: filteredDatabases.length,
      });
    } catch (error) {
      console.error('Error in admin getAllDatabases:', error);
      next(error);
    }
  };

  /**
   * Create a database for a user (admin only)
   */
  public createDatabase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { databaseName, userId, collation } = req.body;
      
      if (!databaseName || !userId) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Database name and user ID are required' 
        });
        return;
      }
      
      // Verify user exists
      const user = await UserModel.findById(parseInt(userId, 10));
      if (!user) {
        res.status(404).json({ 
          status: 'error', 
          message: 'User not found' 
        });
        return;
      }
      
      await UserDatabaseService.createDatabase(parseInt(userId, 10), databaseName, collation);
      
      res.json({ 
        status: 'success', 
        message: `Database '${databaseName}' created successfully for user ${user.email}` 
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already own a database')) {
        res.status(400).json({ 
          status: 'error', 
          message: error.message 
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Delete a database (admin only)
   */
  public deleteDatabase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { databaseName } = req.params;
      
      if (!databaseName) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Database name is required' 
        });
        return;
      }
      
      // Get database owner
      const ownerId = await UserDatabaseModel.getDatabaseOwner(databaseName);
      if (!ownerId) {
        res.status(404).json({ 
          status: 'error', 
          message: 'Database not found or no owner assigned' 
        });
        return;
      }
      
      await UserDatabaseService.deleteDatabase(ownerId, databaseName);
      
      res.json({ 
        status: 'success', 
        message: `Database '${databaseName}' deleted successfully` 
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Backup a database (admin only)
   */
  public backupDatabase = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { databaseName } = req.params;
      const { backupPath } = req.body;
      
      if (!databaseName) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Database name is required' 
        });
        return;
      }
      
      // Get database owner
      const ownerId = await UserDatabaseModel.getDatabaseOwner(databaseName);
      if (!ownerId) {
        res.status(404).json({ 
          status: 'error', 
          message: 'Database not found or no owner assigned' 
        });
        return;
      }
      
      const finalBackupPath = await UserDatabaseService.backupDatabase(ownerId, databaseName, backupPath);
      
      res.json({ 
        status: 'success', 
        message: `Database '${databaseName}' backed up successfully`,
        backupPath: finalBackupPath
      });
    } catch (error) {
      next(error);
    }
  };

}
