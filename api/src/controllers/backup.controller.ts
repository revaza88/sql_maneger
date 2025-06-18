import { Request, Response } from 'express';
import * as sql from 'mssql';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as cron from 'node-cron';
import logger from '../utils/logger';
import { UserDatabaseService } from '../services/UserDatabaseService';
import { UserDatabaseModel } from '../models/user-database.model';
import { UserModel } from '../models/user.model';

interface BackupConfig {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string; // cron format
  databases: string[]; // empty array means all databases
  retentionDays: number;
  createdAt: Date;
  lastBackup?: Date;
}

interface BackupFile {
  id: string;
  database: string;
  fileName: string;
  filePath: string;
  size: number;
  createdAt: Date;
  type: 'manual' | 'scheduled';
  owner?: {
    userId: number;
    userEmail: string;
  };
}

// In-memory storage for backup configs and files (should be replaced with database)
let backupConfigs: BackupConfig[] = [
  {
    id: '1',
    name: 'Daily Full Backup',
    enabled: true,
    schedule: '0 2 * * *', // Daily at 2 AM
    databases: [], // All databases
    retentionDays: 30,
    createdAt: new Date(),
  }
];

let backupFiles: BackupFile[] = [];
let scheduledJobs: Map<string, any> = new Map();

// Get backup directory
const getBackupDir = () => {
  const backupDir = path.join(__dirname, '..', '..', 'backups');
  return backupDir;
};

// Ensure backup directory exists
const ensureBackupDir = async () => {
  const backupDir = getBackupDir();
  try {
    await fs.access(backupDir);
  } catch {
    await fs.mkdir(backupDir, { recursive: true });
  }
  return backupDir;
};

// Load existing backup files from disk
const loadExistingBackupFiles = async () => {
  try {
    const backupDir = await ensureBackupDir();
    const files = await fs.readdir(backupDir);
    
    for (const fileName of files) {
      if (fileName.endsWith('.bak')) {
        const filePath = path.join(backupDir, fileName);
        const stats = await fs.stat(filePath);
        
        // Extract database name from filename (before first underscore)
        const database = fileName.split('_')[0];
        
        // Get owner information
        let owner;
        try {
          const userId = await UserDatabaseModel.getDatabaseOwner(database);
          if (userId) {
            const user = await UserModel.findById(userId);
            if (user) {
              owner = {
                userId: user.id,
                userEmail: user.email
              };
            }
          }
        } catch (error) {
          logger.warn(`Could not get owner for database ${database}:`, error);
        }
        
        // Create backup file record
        const backupFile: BackupFile = {
          id: `${database}_${stats.mtime.getTime()}`,
          database,
          fileName,
          filePath,
          size: stats.size,
          createdAt: stats.mtime,
          type: 'scheduled', // Default to scheduled since we can't determine from filename
          owner
        };
        
        // Add to array if not already exists
        if (!backupFiles.find(f => f.fileName === fileName)) {
          backupFiles.push(backupFile);
        }
      }
    }
    
    logger.info(`Loaded ${backupFiles.length} existing backup files`);
  } catch (error) {
    logger.error('Error loading existing backup files:', error);
  }
};

// Get all databases from SQL Server
const getAllDatabases = async (connectionConfig: any): Promise<string[]> => {
  try {
    const pool = await sql.connect(connectionConfig);
    const result = await pool.request().query(`
      SELECT name FROM sys.databases 
      WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
      AND state = 0 -- ONLINE
    `);
    await pool.close();
    return result.recordset.map(row => row.name);
  } catch (error) {
    logger.error('Error getting databases:', error);
    throw error;
  }
};

// Create backup using sqlcmd
const createDatabaseBackup = async (
  database: string,
  connectionConfig: any,
  type: 'manual' | 'scheduled' = 'manual'
): Promise<BackupFile> => {
  const backupDir = await ensureBackupDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${database}_${timestamp}.bak`;
  const filePath = path.join(backupDir, fileName);

  return new Promise((resolve, reject) => {
    const sqlCmd = `sqlcmd -S "${connectionConfig.server}" -d "${database}" -Q "BACKUP DATABASE [${database}] TO DISK = '${filePath}' WITH FORMAT, INIT"`;
    
    if (connectionConfig.user && connectionConfig.password) {      // SQL Server authentication
      exec(`${sqlCmd} -U "${connectionConfig.user}" -P "${connectionConfig.password}"`, async (error, stdout, stderr) => {
        if (error) {
          logger.error(`Backup error for ${database}:`, error);
          reject(error);
          return;
        }

        try {
          const stats = await fs.stat(filePath);
          
          // Get owner information
          let owner;
          try {
            const userId = await UserDatabaseModel.getDatabaseOwner(database);
            if (userId) {
              const user = await UserModel.findById(userId);
              if (user) {
                owner = {
                  userId: user.id,
                  userEmail: user.email
                };
              }
            }
          } catch (error) {
            logger.warn(`Could not get owner for database ${database}:`, error);
          }
          
          const backupFile: BackupFile = {
            id: Date.now().toString(),
            database,
            fileName,
            filePath,
            size: stats.size,
            createdAt: new Date(),
            type,
            owner
          };
          
          backupFiles.push(backupFile);
          logger.info(`Backup created for ${database}: ${fileName}`);
          resolve(backupFile);
        } catch (statError) {
          reject(statError);
        }
      });
    } else {      // Windows authentication
      exec(sqlCmd, async (error, stdout, stderr) => {
        if (error) {
          logger.error(`Backup error for ${database}:`, error);
          reject(error);
          return;
        }

        try {
          const stats = await fs.stat(filePath);
          
          // Get owner information
          let owner;
          try {
            const userId = await UserDatabaseModel.getDatabaseOwner(database);
            if (userId) {
              const user = await UserModel.findById(userId);
              if (user) {
                owner = {
                  userId: user.id,
                  userEmail: user.email
                };
              }
            }
          } catch (error) {
            logger.warn(`Could not get owner for database ${database}:`, error);
          }
          
          const backupFile: BackupFile = {
            id: Date.now().toString(),
            database,
            fileName,
            filePath,
            size: stats.size,
            createdAt: new Date(),
            type,
            owner
          };
          
          backupFiles.push(backupFile);
          logger.info(`Backup created for ${database}: ${fileName}`);
          resolve(backupFile);
        } catch (statError) {
          reject(statError);
        }
      });
    }
  });
};

// Restore database from backup
const restoreDatabase = async (
  database: string,
  backupFilePath: string,
  connectionConfig: any,
  newDatabaseName?: string
): Promise<void> => {
  const targetDb = newDatabaseName || database;
  
  return new Promise((resolve, reject) => {
    const sqlCmd = `sqlcmd -S "${connectionConfig.server}" -Q "RESTORE DATABASE [${targetDb}] FROM DISK = '${backupFilePath}' WITH REPLACE"`;
    
    if (connectionConfig.user && connectionConfig.password) {
      exec(`${sqlCmd} -U "${connectionConfig.user}" -P "${connectionConfig.password}"`, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Restore error for ${database}:`, error);
          reject(error);
          return;
        }
        logger.info(`Database ${database} restored successfully`);
        resolve();
      });
    } else {
      exec(sqlCmd, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Restore error for ${database}:`, error);
          reject(error);
          return;
        }
        logger.info(`Database ${database} restored successfully`);
        resolve();
      });
    }
  });
};

// Clean up old backups based on retention policy
const cleanupOldBackups = async (retentionDays: number) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const filesToDelete = backupFiles.filter(file => file.createdAt < cutoffDate);
  
  for (const file of filesToDelete) {
    try {
      await fs.unlink(file.filePath);
      backupFiles = backupFiles.filter(f => f.id !== file.id);
      logger.info(`Deleted old backup: ${file.fileName}`);
    } catch (error) {
      logger.error(`Error deleting backup file ${file.fileName}:`, error);
    }
  }
};

// Get SQL Server connection config
const getSqlServerConnection = (connectionId?: string): any => {
  // Import connections from sql-server-config.controller
  // For now, use default connection
  return {
    server: 'localhost',
    database: 'master',
    user: 'sa',
    password: 'Admin1',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      connectionTimeout: 30000,
      requestTimeout: 30000
    }
  };
};

// Schedule backup job
const scheduleBackupJob = (config: BackupConfig) => {
  if (scheduledJobs.has(config.id)) {
    scheduledJobs.get(config.id).destroy();
  }

  if (config.enabled) {
    const job = cron.schedule(config.schedule, async () => {
      logger.info(`Starting scheduled backup: ${config.name}`);
      try {
        const connectionConfig = getSqlServerConnection();

        const databasesToBackup = config.databases.length > 0 
          ? config.databases 
          : await getAllDatabases(connectionConfig);

        for (const database of databasesToBackup) {
          await createDatabaseBackup(database, connectionConfig, 'scheduled');
        }

        // Update last backup time
        const configIndex = backupConfigs.findIndex(c => c.id === config.id);
        if (configIndex !== -1) {
          backupConfigs[configIndex].lastBackup = new Date();
        }

        // Clean up old backups
        await cleanupOldBackups(config.retentionDays);

        logger.info(`Scheduled backup completed: ${config.name}`);
      } catch (error) {
        logger.error(`Scheduled backup failed: ${config.name}`, error);
      }
    });

    job.start();
    scheduledJobs.set(config.id, job);
    logger.info(`Scheduled backup job: ${config.name} - ${config.schedule}`);
  }
};

// Initialize scheduled jobs
export const initializeBackupScheduler = async () => {
  // Load existing backup files first
  await loadExistingBackupFiles();
  
  backupConfigs.forEach(config => {
    if (config.enabled) {
      scheduleBackupJob(config);
    }
  });
};

// Controller functions
export const getBackupConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // If user is admin, show all backup configs
    if (req.user.role === 'admin') {
      res.json(backupConfigs);
      return;
    }

    // Get user's databases for non-admin users
    const userDatabases = await UserDatabaseService.getUserDatabases(req.user.id);
    const userDatabaseNames = userDatabases.map(db => db.name);

    // Filter backup configs to only show ones that include user's databases
    const userBackupConfigs = backupConfigs.filter(config => 
      config.databases.some(db => userDatabaseNames.includes(db))
    );

    res.json(userBackupConfigs);
  } catch (error) {
    logger.error('Error getting backup configs:', error);
    res.status(500).json({ error: 'Failed to get backup configs' });
  }
};

export const createBackupConfig = (req: Request, res: Response): void => {
  const { name, schedule, databases, retentionDays, enabled } = req.body;

  if (!name || !schedule) {
    res.status(400).json({ error: 'Name and schedule are required' });
    return;
  }

  const config: BackupConfig = {
    id: Date.now().toString(),
    name,
    enabled: enabled !== false,
    schedule,
    databases: databases || [],
    retentionDays: retentionDays || 30,
    createdAt: new Date()
  };

  backupConfigs.push(config);
  
  if (config.enabled) {
    scheduleBackupJob(config);
  }

  res.status(201).json(config);
};

export const updateBackupConfig = (req: Request, res: Response): void => {
  const { id } = req.params;
  const updates = req.body;

  const configIndex = backupConfigs.findIndex(config => config.id === id);
  if (configIndex === -1) {
    res.status(404).json({ error: 'Backup configuration not found' });
    return;
  }

  backupConfigs[configIndex] = { ...backupConfigs[configIndex], ...updates };
  
  // Reschedule if needed
  scheduleBackupJob(backupConfigs[configIndex]);

  res.json(backupConfigs[configIndex]);
};

export const deleteBackupConfig = (req: Request, res: Response): void => {
  const { id } = req.params;
  const configIndex = backupConfigs.findIndex(config => config.id === id);
  if (configIndex === -1) {
    res.status(404).json({ error: 'Backup configuration not found' });
    return;
  }

  // Stop scheduled job
  if (scheduledJobs.has(id)) {
    scheduledJobs.get(id).destroy();
    scheduledJobs.delete(id);
  }

  backupConfigs.splice(configIndex, 1);
  res.status(204).send();
};

export const getBackupFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { database } = req.query;
    let files = backupFiles;

    // If user is admin, show all backup files
    if (req.user.role !== 'admin') {
      // Get user's databases only for non-admin users
      const userDatabases = await UserDatabaseService.getUserDatabases(req.user.id);
      const userDatabaseNames = userDatabases.map(db => db.name);
      files = backupFiles.filter(file => userDatabaseNames.includes(file.database));
    }
    
    if (database) {
      files = files.filter(file => file.database === database);
    }

    res.json(files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
  } catch (error) {
    logger.error('Error getting backup files:', error);
    res.status(500).json({ error: 'Failed to get backup files' });
  }
};

export const createManualBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { database, connectionId } = req.body;

    if (!database) {
      res.status(400).json({ error: 'Database name is required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Allow admin users to backup any database
    if (req.user.role !== 'admin') {
      // Check if user has access to this database
      const userDatabases = await UserDatabaseService.getUserDatabases(req.user.id);
      const userDatabaseNames = userDatabases.map(db => db.name);
      
      if (!userDatabaseNames.includes(database)) {
        res.status(403).json({ error: 'Access denied to this database' });
        return;
      }
    }

    const connectionConfig = getSqlServerConnection(connectionId);
    const backupFile = await createDatabaseBackup(database, connectionConfig, 'manual');
    res.status(201).json(backupFile);
  } catch (error) {
    logger.error('Manual backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
};

export const restoreFromBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { backupFileId, newDatabaseName, connectionId } = req.body;

    if (!backupFileId) {
      res.status(400).json({ error: 'Backup file ID is required' });
      return;
    }

    const backupFile = backupFiles.find(file => file.id === backupFileId);
    if (!backupFile) {
      res.status(404).json({ error: 'Backup file not found' });
      return;
    }

    const connectionConfig = getSqlServerConnection(connectionId);
    await restoreDatabase(backupFile.database, backupFile.filePath, connectionConfig, newDatabaseName);
    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    logger.error('Restore error:', error);
    res.status(500).json({ error: 'Failed to restore database' });
  }
};

export const deleteBackupFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const fileIndex = backupFiles.findIndex(file => file.id === id);
    if (fileIndex === -1) {
      res.status(404).json({ error: 'Backup file not found' });
      return;
    }

    const file = backupFiles[fileIndex];
    
    // Delete physical file
    await fs.unlink(file.filePath);
    
    // Remove from array
    backupFiles.splice(fileIndex, 1);

    res.status(204).send();
  } catch (error) {
    logger.error('Delete backup file error:', error);
    res.status(500).json({ error: 'Failed to delete backup file' });
  }
};

export const getDatabases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { connectionId } = req.params;

    const connectionConfig = getSqlServerConnection(connectionId);
    const databases = await getAllDatabases(connectionConfig);
    res.json(databases);
  } catch (error) {
    logger.error('Get databases error:', error);
    res.status(500).json({ error: 'Failed to get databases' });
  }
};

// Run backup for a specific configuration manually
export const runConfigBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const config = backupConfigs.find(c => c.id === id);
    if (!config) {
      res.status(404).json({ error: 'Backup configuration not found' });
      return;
    }

    logger.info(`Starting manual backup run for config: ${config.name}`);
    
    const connectionConfig = getSqlServerConnection();
    const results: BackupFile[] = [];

    const databasesToBackup = config.databases.length > 0 
      ? config.databases 
      : await getAllDatabases(connectionConfig);

    for (const database of databasesToBackup) {
      try {
        const backupFile = await createDatabaseBackup(database, connectionConfig, 'manual');
        results.push(backupFile);
        logger.info(`Manual backup completed for database: ${database}`);
      } catch (error) {
        logger.error(`Manual backup failed for database ${database}:`, error);
        // Continue with other databases even if one fails
      }
    }

    // Update last backup time for the configuration
    const configIndex = backupConfigs.findIndex(c => c.id === id);
    if (configIndex !== -1) {
      backupConfigs[configIndex].lastBackup = new Date();
    }

    // Clean up old backups based on retention policy
    await cleanupOldBackups(config.retentionDays);

    logger.info(`Manual backup run completed for config: ${config.name}, ${results.length} databases backed up`);
    
    res.json({
      message: `Backup completed successfully for ${results.length} databases`,
      backupFiles: results,
      configName: config.name
    });
  } catch (error) {
    logger.error('Manual config backup error:', error);
    res.status(500).json({ error: 'Failed to run backup' });
  }
};

// Load existing backup files on server start
loadExistingBackupFiles();
