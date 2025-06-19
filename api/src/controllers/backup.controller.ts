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

interface BatchBackupInfo {
  timestamp: string;
  databases: string[];
  totalSize: string;
  status: 'completed' | 'partial' | 'failed';
  createdBy: {
    userId: number;
    userEmail: string;
  };
}

interface BatchBackup {
  id: string;
  timestamp: Date;
  databases: string[];
  totalSize: number;
  status: 'in-progress' | 'completed' | 'failed';
  folderPath: string;
  backupFiles: BackupFile[];
  createdBy: {
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

// In-memory storage for batch backups (should be replaced with database)
let batchBackups: BatchBackup[] = [];

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

// Clean up old batch backups based on retention policy
const cleanupOldBatchBackups = async (retentionDays: number) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const batchBackupsToDelete = batchBackups.filter(batch => batch.timestamp < cutoffDate);
  
  for (const batchBackup of batchBackupsToDelete) {
    try {
      // Delete folder and all files
      await fs.rm(batchBackup.folderPath, { recursive: true, force: true });
      
      // Remove from memory
      const index = batchBackups.findIndex(b => b.id === batchBackup.id);
      if (index !== -1) {
        batchBackups.splice(index, 1);
      }
      
      logger.info(`Deleted old batch backup: ${batchBackup.id}`);
    } catch (error) {
      logger.error(`Error deleting old batch backup ${batchBackup.id}:`, error);
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

// Schedule backup job - UPDATED: Now creates batch backups for scheduled jobs
const scheduleBackupJob = (config: BackupConfig) => {
  if (scheduledJobs.has(config.id)) {
    scheduledJobs.get(config.id).destroy();
  }

  if (config.enabled) {
    const job = cron.schedule(config.schedule, async () => {
      logger.info(`Starting scheduled batch backup: ${config.name}`);
      try {
        // Get all databases for batch backup
        const databases = await UserDatabaseService.getAllDatabases();
        
        if (databases.length === 0) {
          logger.warn('No databases found for scheduled batch backup');
          return;
        }

        // Create batch folder with timestamp
        const timestamp = new Date();
        const batchId = `scheduled_${config.id}_${timestamp.toISOString().replace(/[:.]/g, '-')}`;
        const batchDir = path.join(await ensureBatchBackupDir(), batchId);
        await fs.mkdir(batchDir, { recursive: true });

        const backupFiles: BackupFile[] = [];
        let totalSize = 0;

        // Create batch backup entry
        const batchBackup: BatchBackup = {
          id: batchId,
          timestamp,
          databases: databases.map(db => db.name),
          totalSize: 0,
          status: 'in-progress',
          folderPath: batchDir,
          backupFiles: [],
          createdBy: {
            userId: 0, // System user for scheduled backups
            userEmail: 'system@scheduler'
          }
        };

        batchBackups.push(batchBackup);
        logger.info(`Scheduled batch backup started: ${batchId} for ${databases.length} databases`);

        // Create backups for all databases
        for (const database of databases) {
          try {
            const fileName = `${database.name}.bak`;
            const backupPath = path.join(batchDir, fileName);

            await new Promise<void>((resolve, reject) => {
              const command = `sqlcmd -S localhost -d master -E -Q "BACKUP DATABASE [${database.name}] TO DISK = N'${backupPath}' WITH FORMAT, INIT, NAME = N'${database.name}-Scheduled Database Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10"`;
              
              exec(command, (error, stdout, stderr) => {
                if (error) {
                  logger.error(`Scheduled backup failed for ${database.name}:`, error);
                  reject(error);
                } else {
                  logger.info(`Scheduled backup completed for ${database.name}`);
                  resolve();
                }
              });
            });

            // Get file stats
            const stats = await fs.stat(backupPath);
            totalSize += stats.size;

            const backupFile: BackupFile = {
              id: `${batchId}_${database.name}`,
              database: database.name,
              fileName,
              filePath: backupPath,
              size: stats.size,
              createdAt: timestamp,
              type: 'scheduled',
              owner: {
                userId: 0,
                userEmail: 'system@scheduler'
              }
            };

            backupFiles.push(backupFile);

          } catch (error) {
            logger.error(`Failed to backup database ${database.name} in scheduled batch:`, error);
          }
        }

        // Update batch backup status
        const batchIndex = batchBackups.findIndex(b => b.id === batchId);
        if (batchIndex !== -1) {
          batchBackups[batchIndex].status = 'completed';
          batchBackups[batchIndex].totalSize = totalSize;
          batchBackups[batchIndex].backupFiles = backupFiles;
        }

        // Create backup info file
        const backupInfo: BatchBackupInfo = {
          timestamp: timestamp.toISOString(),
          databases: databases.map(db => db.name),
          totalSize: `${Math.round(totalSize / 1024 / 1024)}MB`,
          status: 'completed',
          createdBy: {
            userId: 0,
            userEmail: 'system@scheduler'
          }
        };

        await fs.writeFile(
          path.join(batchDir, 'backup_info.json'),
          JSON.stringify(backupInfo, null, 2)
        );

        // Update last backup time for the configuration
        const configIndex = backupConfigs.findIndex(c => c.id === config.id);
        if (configIndex !== -1) {
          backupConfigs[configIndex].lastBackup = new Date();
        }

        // Clean up old batch backups based on retention policy
        await cleanupOldBatchBackups(config.retentionDays);

        logger.info(`Scheduled batch backup completed: ${config.name} - ${backupFiles.length} databases backed up`);
      } catch (error) {
        logger.error(`Scheduled batch backup failed: ${config.name}`, error);
        
        // Update failed status
        const batchIndex = batchBackups.findIndex(b => b.id.includes(config.id));
        if (batchIndex !== -1) {
          batchBackups[batchIndex].status = 'failed';
        }
      }
    });

    job.start();
    scheduledJobs.set(config.id, job);
    logger.info(`Scheduled batch backup job: ${config.name} - ${config.schedule}`);
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

// Run backup for a specific configuration manually - UPDATED: Now creates batch backup
export const runConfigBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const config = backupConfigs.find(c => c.id === id);
    if (!config) {
      res.status(404).json({ error: 'Backup configuration not found' });
      return;
    }

    logger.info(`Starting manual batch backup run for config: ${config.name}`);
    
    // Get all databases for batch backup (same as scheduled)
    const databases = await UserDatabaseService.getAllDatabases();
    
    if (databases.length === 0) {
      res.status(400).json({ error: 'No databases found to backup' });
      return;
    }

    // Create batch folder with timestamp
    const timestamp = new Date();
    const batchId = `manual_${config.id}_${timestamp.toISOString().replace(/[:.]/g, '-')}`;
    const batchDir = path.join(await ensureBatchBackupDir(), batchId);
    await fs.mkdir(batchDir, { recursive: true });

    const backupFiles: BackupFile[] = [];
    let totalSize = 0;

    // Create batch backup entry
    const batchBackup: BatchBackup = {
      id: batchId,
      timestamp,
      databases: databases.map(db => db.name),
      totalSize: 0,
      status: 'in-progress',
      folderPath: batchDir,
      backupFiles: [],
      createdBy: {
        userId: user.id,
        userEmail: user.email
      }
    };

    batchBackups.push(batchBackup);
    logger.info(`Manual batch backup started: ${batchId} for ${databases.length} databases`);

    // Create backups for all databases
    for (const database of databases) {
      try {
        const fileName = `${database.name}.bak`;
        const backupPath = path.join(batchDir, fileName);

        await new Promise<void>((resolve, reject) => {
          const command = `sqlcmd -S localhost -d master -E -Q "BACKUP DATABASE [${database.name}] TO DISK = N'${backupPath}' WITH FORMAT, INIT, NAME = N'${database.name}-Manual Database Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10"`;
          
          exec(command, (error, stdout, stderr) => {
            if (error) {
              logger.error(`Manual backup failed for ${database.name}:`, error);
              reject(error);
            } else {
              logger.info(`Manual backup completed for ${database.name}`);
              resolve();
            }
          });
        });

        // Get file stats
        const stats = await fs.stat(backupPath);
        totalSize += stats.size;

        const backupFile: BackupFile = {
          id: `${batchId}_${database.name}`,
          database: database.name,
          fileName,
          filePath: backupPath,
          size: stats.size,
          createdAt: timestamp,
          type: 'manual',
          owner: {
            userId: user.id,
            userEmail: user.email
          }
        };

        backupFiles.push(backupFile);

      } catch (error) {
        logger.error(`Failed to backup database ${database.name} in manual batch:`, error);
      }
    }

    // Update batch backup status
    const batchIndex = batchBackups.findIndex(b => b.id === batchId);
    if (batchIndex !== -1) {
      batchBackups[batchIndex].status = 'completed';
      batchBackups[batchIndex].totalSize = totalSize;
      batchBackups[batchIndex].backupFiles = backupFiles;
    }

    // Create backup info file
    const backupInfo: BatchBackupInfo = {
      timestamp: timestamp.toISOString(),
      databases: databases.map(db => db.name),
      totalSize: `${Math.round(totalSize / 1024 / 1024)}MB`,
      status: 'completed',
      createdBy: {
        userId: user.id,
        userEmail: user.email
      }
    };

    await fs.writeFile(
      path.join(batchDir, 'backup_info.json'),
      JSON.stringify(backupInfo, null, 2)
    );

    // Update last backup time for the configuration
    const configIndex = backupConfigs.findIndex(c => c.id === id);
    if (configIndex !== -1) {
      backupConfigs[configIndex].lastBackup = new Date();
    }

    // Clean up old batch backups based on retention policy
    await cleanupOldBatchBackups(config.retentionDays);

    logger.info(`Manual batch backup completed for config: ${config.name} - ${backupFiles.length} databases backed up`);
    
    res.json({
      message: `Batch backup completed successfully for ${backupFiles.length} databases`,
      batchId: batchId,
      backupFiles: backupFiles.map(f => ({
        database: f.database,
        fileName: f.fileName,
        size: `${Math.round(f.size / 1024 / 1024)}MB`
      })),
      configName: config.name
    });
  } catch (error) {
    logger.error('Manual config batch backup error:', error);
    res.status(500).json({ error: 'Failed to run batch backup' });
  }
};

// Get batch backup directory
const getBatchBackupDir = () => {
  const batchBackupDir = path.join(__dirname, '..', '..', 'backups', 'batch_backups');
  return batchBackupDir;
};

// Ensure batch backup directory exists
const ensureBatchBackupDir = async () => {
  const batchBackupDir = getBatchBackupDir();
  try {
    await fs.access(batchBackupDir);
  } catch {
    await fs.mkdir(batchBackupDir, { recursive: true });
  }
  return batchBackupDir;
};

// Load existing batch backups from disk
const loadExistingBatchBackups = async () => {
  try {
    const batchBackupDir = await ensureBatchBackupDir();
    const folders = await fs.readdir(batchBackupDir);
    
    for (const folderName of folders) {
      if (folderName.startsWith('batch_') || folderName.startsWith('manual_')) {
        const folderPath = path.join(batchBackupDir, folderName);
        const stat = await fs.stat(folderPath);
        
        if (stat.isDirectory()) {
          try {
            // Check if backup_info.json exists
            const infoPath = path.join(folderPath, 'backup_info.json');
            const infoData = await fs.readFile(infoPath, 'utf-8');
            const backupInfo: BatchBackupInfo = JSON.parse(infoData);
            
            // Load backup files from folder
            const backupFiles: BackupFile[] = [];
            const files = await fs.readdir(folderPath);
            let totalSize = 0;
            
            for (const fileName of files) {
              if (fileName.endsWith('.bak')) {
                const filePath = path.join(folderPath, fileName);
                const fileStats = await fs.stat(filePath);
                const database = fileName.replace('.bak', '');
                
                totalSize += fileStats.size;
                
                backupFiles.push({
                  id: `${folderName}_${database}`,
                  database,
                  fileName,
                  filePath,
                  size: fileStats.size,
                  createdAt: new Date(backupInfo.timestamp),
                  type: 'manual',
                  owner: backupInfo.createdBy
                });
              }
            }
            
            // Create batch backup record
            const batchBackup: BatchBackup = {
              id: folderName,
              timestamp: new Date(backupInfo.timestamp),
              databases: backupInfo.databases,
              totalSize,
              status: backupInfo.status === 'completed' ? 'completed' : 'completed',
              folderPath,
              backupFiles,
              createdBy: backupInfo.createdBy
            };
            
            // Add to array if not already exists
            if (!batchBackups.find(b => b.id === folderName)) {
              batchBackups.push(batchBackup);
            }
          } catch (error) {
            logger.warn(`Could not load batch backup info for ${folderName}:`, error);
          }
        }
      }
    }
    
    logger.info(`Loaded ${batchBackups.length} existing batch backups`);
  } catch (error) {
    logger.error('Error loading existing batch backups:', error);
  }
};

// Create batch backup of all databases
export const createBatchBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user || user.role?.toLowerCase() !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    logger.info('Starting batch backup for all databases');

    // Get all databases
    const databases = await UserDatabaseService.getAllDatabases();
    
    if (databases.length === 0) {
      res.status(400).json({ error: 'No databases found to backup' });
      return;
    }

    // Create batch folder with timestamp
    const timestamp = new Date();
    const batchId = `batch_${timestamp.toISOString().replace(/[:.]/g, '-')}`;
    const batchDir = path.join(await ensureBatchBackupDir(), batchId);
    await fs.mkdir(batchDir, { recursive: true });

    const backupFiles: BackupFile[] = [];
    let totalSize = 0;

    // Create batch backup entry
    const batchBackup: BatchBackup = {
      id: batchId,
      timestamp,
      databases: databases.map(db => db.name),
      totalSize: 0,
      status: 'in-progress',
      folderPath: batchDir,
      backupFiles: [],
      createdBy: {
        userId: user.id,
        userEmail: user.email
      }
    };

    batchBackups.push(batchBackup);

    // Start backup process
    res.json({
      message: 'Batch backup started',
      batchId,
      databases: databases.map(db => db.name)
    });

    // Background processing
    setTimeout(async () => {
      let failedBackups: string[] = [];
      
      try {
        for (const database of databases) {
          try {
            const fileName = `${database.name}.bak`;
            const backupPath = path.join(batchDir, fileName);

            logger.info(`Creating backup for database: ${database.name}`);

            await new Promise<void>((resolve, reject) => {
              const command = `sqlcmd -S localhost -d master -E -Q "BACKUP DATABASE [${database.name}] TO DISK = N'${backupPath}' WITH FORMAT, INIT, NAME = N'${database.name}-Full Database Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10"`;
              
              exec(command, (error, stdout, stderr) => {
                if (error) {
                  logger.error(`Backup failed for ${database.name}:`, error);
                  failedBackups.push(database.name);
                  reject(error);
                } else {
                  logger.info(`Backup completed for ${database.name}`);
                  resolve();
                }
              });
            });

            // Get file stats
            const stats = await fs.stat(backupPath);
            totalSize += stats.size;

            const backupFile: BackupFile = {
              id: `${batchId}_${database.name}`,
              database: database.name,
              fileName,
              filePath: backupPath,
              size: stats.size,
              createdAt: timestamp,
              type: 'manual',
              owner: {
                userId: user.id,
                userEmail: user.email
              }
            };

            backupFiles.push(backupFile);

          } catch (error) {
            logger.error(`Failed to backup database ${database.name}:`, error);
            failedBackups.push(database.name);
          }
        }

        // Update batch backup status
        const batchIndex = batchBackups.findIndex(b => b.id === batchId);
        if (batchIndex !== -1) {
          batchBackups[batchIndex].status = failedBackups.length === 0 ? 'completed' : 'completed';
          batchBackups[batchIndex].totalSize = totalSize;
          batchBackups[batchIndex].backupFiles = backupFiles;
        }

        // Create backup info file
        const backupInfo: BatchBackupInfo = {
          timestamp: timestamp.toISOString(),
          databases: databases.map(db => db.name),
          totalSize: `${Math.round(totalSize / 1024 / 1024)}MB`,
          status: failedBackups.length === 0 ? 'completed' : 'partial',
          createdBy: {
            userId: user.id,
            userEmail: user.email
          }
        };

        await fs.writeFile(
          path.join(batchDir, 'backup_info.json'),
          JSON.stringify(backupInfo, null, 2)
        );

        logger.info(`Batch backup completed. ${backupFiles.length} successful, ${failedBackups.length} failed`);

      } catch (error) {
        logger.error('Batch backup process failed:', error);
        const batchIndex = batchBackups.findIndex(b => b.id === batchId);
        if (batchIndex !== -1) {
          batchBackups[batchIndex].status = 'failed';
        }
      }
    }, 100);

  } catch (error) {
    logger.error('Error starting batch backup:', error);
    res.status(500).json({ error: 'Failed to start batch backup' });
  }
};

// Get all batch backups
export const getBatchBackups = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    
    if (!user || user.role?.toLowerCase() !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    // All admins have access to ALL batch backups
    res.json(batchBackups.map(batch => ({
      id: batch.id,
      timestamp: batch.timestamp,
      databases: batch.databases,
      totalSize: `${Math.round(batch.totalSize / 1024 / 1024)}MB`,
      status: batch.status,
      backupCount: batch.backupFiles.length,
      createdBy: batch.createdBy
    })));

  } catch (error) {
    logger.error('Error fetching batch backups:', error);
    res.status(500).json({ error: 'Failed to fetch batch backups' });
  }
};

// Get batch backup details
export const getBatchBackupDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { batchId } = req.params;
    
    if (!user || user.role?.toLowerCase() !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    const batchBackup = batchBackups.find(b => b.id === batchId);
    
    if (!batchBackup) {
      res.status(404).json({ error: 'Batch backup not found' });
      return;
    }

    res.json({
      id: batchBackup.id,
      timestamp: batchBackup.timestamp,
      databases: batchBackup.databases,
      totalSize: `${Math.round(batchBackup.totalSize / 1024 / 1024)}MB`,
      status: batchBackup.status,
      backupFiles: batchBackup.backupFiles.map(file => ({
        database: file.database,
        fileName: file.fileName,
        size: `${Math.round(file.size / 1024 / 1024)}MB`,
        createdAt: file.createdAt
      })),
      createdBy: batchBackup.createdBy
    });

  } catch (error) {
    logger.error('Error fetching batch backup details:', error);
    res.status(500).json({ error: 'Failed to fetch batch backup details' });
  }
};

// Helper function to add delay between operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory storage for restore operations status
const restoreOperations: Map<string, {
  status: 'in-progress' | 'completed' | 'failed';
  results: { database: string; success: boolean; error?: string }[];
  startedAt: Date;
  completedAt?: Date;
}> = new Map();

// Restore entire batch backup
export const restoreBatchBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { batchId } = req.params;
    
    if (!user || user.role?.toLowerCase() !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    const batchBackup = batchBackups.find(b => b.id === batchId);
    
    if (!batchBackup) {
      res.status(404).json({ error: 'Batch backup not found' });
      return;
    }

    const operationId = `restore_${batchId}_${Date.now()}`;
    
    // Initialize restore operation tracking
    restoreOperations.set(operationId, {
      status: 'in-progress',
      results: [],
      startedAt: new Date()
    });

    logger.info(`Starting restore of batch backup: ${batchId}`);

    // Return immediately with operation ID
    res.json({
      message: 'Batch restore started',
      operationId,
      totalDatabases: batchBackup.backupFiles.length
    });

    // Background processing with proper error handling and rate limiting
    setTimeout(async () => {
      const restoreResults: { database: string; success: boolean; error?: string }[] = [];
      
      try {
        for (let i = 0; i < batchBackup.backupFiles.length; i++) {
          const backupFile = batchBackup.backupFiles[i];
          
          try {
            logger.info(`Restoring database ${i + 1}/${batchBackup.backupFiles.length}: ${backupFile.database}`);
            
            await new Promise<void>((resolve, reject) => {
              const command = `sqlcmd -S localhost -d master -E -Q "RESTORE DATABASE [${backupFile.database}] FROM DISK = N'${backupFile.filePath}' WITH REPLACE, STATS = 10" -t 300`;
              
              exec(command, { timeout: 300000 }, (error, stdout, stderr) => {
                if (error) {
                  logger.error(`Restore failed for ${backupFile.database}:`, error);
                  restoreResults.push({
                    database: backupFile.database,
                    success: false,
                    error: error.message
                  });
                  resolve(); // Continue with next database instead of rejecting
                } else {
                  logger.info(`Restore completed for ${backupFile.database}`);
                  restoreResults.push({
                    database: backupFile.database,
                    success: true
                  });
                  resolve();
                }
              });
            });

            // Add delay between restore operations to prevent overwhelming SQL Server
            if (i < batchBackup.backupFiles.length - 1) {
              await delay(2000); // 2 second delay between restores
            }

          } catch (error) {
            logger.error(`Failed to restore database ${backupFile.database}:`, error);
            restoreResults.push({
              database: backupFile.database,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Update operation status
        const operation = restoreOperations.get(operationId);
        if (operation) {
          operation.status = 'completed';
          operation.results = restoreResults;
          operation.completedAt = new Date();
        }

        const successCount = restoreResults.filter(r => r.success).length;
        const totalCount = restoreResults.length;

        logger.info(`Batch restore completed: ${successCount}/${totalCount} databases restored successfully`);

      } catch (error) {
        logger.error('Error during batch restore:', error);
        const operation = restoreOperations.get(operationId);
        if (operation) {
          operation.status = 'failed';
          operation.completedAt = new Date();
        }
      }
    }, 100);

  } catch (error) {
    logger.error('Error starting batch restore:', error);
    res.status(500).json({ error: 'Failed to start batch restore' });
  }
};

// Restore single database from batch backup
export const restoreSingleFromBatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { batchId, database } = req.params;
    
    if (!user || user.role?.toLowerCase() !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    const batchBackup = batchBackups.find(b => b.id === batchId);
    
    if (!batchBackup) {
      res.status(404).json({ error: 'Batch backup not found' });
      return;
    }

    const backupFile = batchBackup.backupFiles.find(f => f.database === database);
    
    if (!backupFile) {
      res.status(404).json({ error: `Database '${database}' not found in batch backup` });
      return;
    }

    logger.info(`Starting restore of database ${database} from batch backup: ${batchId}`);

    await new Promise<void>((resolve, reject) => {
      const command = `sqlcmd -S localhost -d master -E -Q "RESTORE DATABASE [${database}] FROM DISK = N'${backupFile.filePath}' WITH REPLACE, STATS = 10"`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error(`Restore failed for ${database}:`, error);
          reject(error);
        } else {
          logger.info(`Restore completed for ${database}`);
          resolve();
        }
      });
    });

    res.json({
      message: `Database '${database}' restored successfully from batch backup`
    });

  } catch (error) {
    logger.error(`Error restoring database ${req.params.database}:`, error);
    res.status(500).json({ error: 'Failed to restore database from batch backup' });
  }
};

// Delete batch backup
export const deleteBatchBackup = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { batchId } = req.params;
    
    if (!user || user.role?.toLowerCase() !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    const batchIndex = batchBackups.findIndex(b => b.id === batchId);
    
    if (batchIndex === -1) {
      res.status(404).json({ error: 'Batch backup not found' });
      return;
    }

    const batchBackup = batchBackups[batchIndex];

    // Delete folder and all files
    try {
      await fs.rm(batchBackup.folderPath, { recursive: true, force: true });
    } catch (error) {
      logger.warn(`Could not delete batch backup folder: ${batchBackup.folderPath}`, error);
    }

    // Remove from memory
    batchBackups.splice(batchIndex, 1);

    logger.info(`Deleted batch backup: ${batchId}`);

    res.json({
      message: 'Batch backup deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting batch backup:', error);
    res.status(500).json({ error: 'Failed to delete batch backup' });
  }
};

// Get restore operation status
export const getRestoreStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { operationId } = req.params;
    
    if (!user || user.role?.toLowerCase() !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      return;
    }

    const operation = restoreOperations.get(operationId);
    
    if (!operation) {
      res.status(404).json({ error: 'Restore operation not found' });
      return;
    }

    const successCount = operation.results.filter(r => r.success).length;
    const failedCount = operation.results.filter(r => !r.success).length;

    res.json({
      operationId,
      status: operation.status,
      startedAt: operation.startedAt,
      completedAt: operation.completedAt,
      totalDatabases: operation.results.length + (operation.status === 'in-progress' ? 1 : 0),
      completedDatabases: operation.results.length,
      successCount,
      failedCount,
      results: operation.results
    });

  } catch (error) {
    logger.error('Error fetching restore status:', error);
    res.status(500).json({ error: 'Failed to fetch restore status' });
  }
};

// Load existing backup files on server start
loadExistingBackupFiles();

// Load existing batch backups on server start
loadExistingBatchBackups();
