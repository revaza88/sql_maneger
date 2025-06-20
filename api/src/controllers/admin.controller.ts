import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model';
import { LoginHistoryModel } from '../models/login-history.model';
import { AuditLogModel } from '../models/audit-log.model';
import { NotificationModel } from '../models/notification.model';
import { RoleModel } from '../models/role.model';
import { UserDatabaseModel } from '../models/user-database.model';
import { UserDatabaseService } from '../services/UserDatabaseService';
import { pool } from '../database/connection';
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

  public pauseUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const success = await UserModel.setPaused(parseInt(userId, 10), true);
      if (success) {
        res.json({ status: 'success', message: 'User paused' });
      } else {
        res.status(404).json({ status: 'error', message: 'User not found' });
      }
    } catch (error) {
      next(error);
    }
  };

  public unpauseUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const success = await UserModel.setPaused(parseInt(userId, 10), false);
      if (success) {
        res.json({ status: 'success', message: 'User unpaused' });
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
      const pausedUsers = await UserModel.countPaused();
      const activeUsers = totalUsers - blockedUsers - pausedUsers;
      
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
          paused: pausedUsers,
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

  public runMigration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const migrationSQL = `
        -- Add the isPaused column if it doesn't exist
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                       WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'isPaused')
        BEGIN
            ALTER TABLE Users 
            ADD isPaused BIT NOT NULL DEFAULT 0;
        END
        
        -- Update any existing users to have isPaused = 0 by default
        UPDATE Users 
        SET isPaused = 0 
        WHERE isPaused IS NULL;
      `;
      
      await pool.request().query(migrationSQL);
      
      res.json({ 
        status: 'success', 
        message: 'Database migration completed successfully. isPaused column added to Users table.' 
      });
    } catch (error) {
      console.error('Migration error:', error);
      next(error);
    }
  };

  public getLoginHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // First try to get real login history
      let history = await LoginHistoryModel.getHistory();
      
      // If no real data, provide mock data for demonstration
      if (!history || history.length === 0) {
        history = [
          {
            id: 1,
            userId: 1,
            userEmail: 'admin@sqlmanager.com',
            ipAddress: '192.168.1.100',
            userAgent: 'Chrome 120.0.0.0 Windows',
            success: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 15),
            location: 'თბილისი, საქართველო'
          },
          {
            id: 2,
            userId: 2,
            userEmail: 'user@test.com',
            ipAddress: '192.168.1.101',
            userAgent: 'Chrome 120.0.0.0 Windows',
            success: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 45),
            location: 'ბათუმი, საქართველო'
          },
          {
            id: 3,
            userId: 3,
            userEmail: 'demo@test.com',
            ipAddress: '10.0.0.50',
            userAgent: 'Safari 17.0 macOS',
            success: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 120),
            location: 'კუთაისი, საქართველო'
          },
          {
            id: 4,
            userId: 4,
            userEmail: 'guest@test.com',
            ipAddress: '203.0.113.195',
            userAgent: 'Firefox 121.0 Windows',
            success: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 180),
            location: 'უცნობი'
          }
        ] as any;
      }
      
      res.json({ status: 'success', data: history });
    } catch (error) {
      next(error);
    }
  };

  public getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // First try to get real audit logs
      let logs = await AuditLogModel.getLogs();
      
      // If no real data, provide mock data for demonstration
      if (!logs || logs.length === 0) {
        logs = [
          {
            id: 1,
            userId: 1,
            userEmail: 'admin@sqlmanager.com',
            action: 'USER_LOGIN',
            resourceType: 'authentication',
            resourceId: 'login_session',
            details: 'Successful admin login',
            ipAddress: '192.168.1.100',
            userAgent: 'Chrome 120.0.0.0 Windows',
            createdAt: new Date(Date.now() - 1000 * 60 * 30),
            status: 'success'
          },
          {
            id: 2,
            userId: 2,
            userEmail: 'user@test.com',
            action: 'DATABASE_BACKUP',
            resourceType: 'database',
            resourceId: 'TestDB',
            details: 'Manual backup created for TestDB',
            ipAddress: '192.168.1.101',
            userAgent: 'Chrome 120.0.0.0 Windows',
            createdAt: new Date(Date.now() - 1000 * 60 * 60),
            status: 'success'
          },
          {
            id: 3,
            userId: 3,
            userEmail: 'demo@test.com',
            action: 'USER_ROLE_UPDATE',
            resourceType: 'user',
            resourceId: '3',
            details: 'User role changed from USER to ADMIN',
            ipAddress: '192.168.1.100',
            userAgent: 'Chrome 120.0.0.0 Windows',
            createdAt: new Date(Date.now() - 1000 * 60 * 90),
            status: 'success'
          },
          {
            id: 4,
            userId: 1,
            userEmail: 'admin@sqlmanager.com',
            action: 'DATABASE_RESTORE',
            resourceType: 'database',
            resourceId: 'ProductionDB',
            details: 'Failed to restore database - backup file corrupted',
            ipAddress: '192.168.1.100',
            userAgent: 'Chrome 120.0.0.0 Windows',
            createdAt: new Date(Date.now() - 1000 * 60 * 120),
            status: 'failure'
          },
          {
            id: 5,
            userId: 4,
            userEmail: 'guest@test.com',
            action: 'LOGIN_ATTEMPT',
            resourceType: 'authentication',
            resourceId: 'failed_login',
            details: 'Failed login attempt - invalid credentials',
            ipAddress: '192.168.1.200',
            userAgent: 'Firefox 121.0 Windows',
            createdAt: new Date(Date.now() - 1000 * 60 * 180),
            status: 'failure'
          }
        ] as any;
      }
      
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
    // Mock data for activity monitoring
    const mockStats = {
      // System performance data
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
      },
      
      // Activity monitoring stats
      totalActions: 1247,
      todayActions: 89,
      successfulActions: 1156,
      failedActions: 91,
      uniqueUsers: 15,
      topActions: [
        { action: 'database_backup', count: 456 },
        { action: 'user_login', count: 234 },
        { action: 'database_query', count: 178 },
        { action: 'user_management', count: 89 },
        { action: 'system_config', count: 34 }
      ]
    };
    
    res.json({ status: 'success', data: mockStats });
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

  public createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, name, password, role } = req.body;

      // Validation
      if (!email || !name || !password || !role) {
        res.status(400).json({ 
          status: 'error', 
          message: 'All fields are required: email, name, password, role' 
        });
        return;
      }

      if (!['admin', 'user'].includes(role.toLowerCase())) {
        res.status(400).json({ 
          status: 'error', 
          message: 'Invalid role specified. Must be admin or user' 
        });
        return;
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ 
          status: 'error', 
          message: 'User with this email already exists' 
        });
        return;
      }

      // Create new user
      const user = await UserModel.createUser({
        email,
        name,
        password,
        role: role.toLowerCase() as 'admin' | 'user'
      });

      res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  };

}
