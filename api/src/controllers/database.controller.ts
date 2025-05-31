import { Request, Response } from 'express';
import { DatabaseService } from '../database/DatabaseService';

export class DatabaseController {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public testConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const isConnected = await this.db.testConnection();
      if (isConnected) {
        res.json({ status: 'success', message: 'Database connection successful' });
      } else {
        res.status(500).json({ status: 'error', message: 'Database connection failed' });
      }
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Database connection failed', error });
    }
  };

  public listDatabases = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('Handling listDatabases request...');
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({ 
          status: 'error', 
          message: 'Authentication required' 
        });
        return;
      }

      const databases = await this.db.getDatabases();
      
      console.log(`Successfully retrieved ${databases.length} databases`);
      
      res.json({ 
        status: 'success', 
        data: databases 
      });
    } catch (error: any) {
      console.error('Error in listDatabases controller:', error);
      
      // Send a more detailed error response
      res.status(500).json({ 
        status: 'error',
        message: 'Failed to fetch databases',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  public listTables = async (req: Request, res: Response): Promise<void> => {
    try {
      const { database } = req.params;
      const tables = await this.db.getTables(database);
      res.json({ status: 'success', data: tables });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Failed to fetch tables', error });
    }
  };

  public executeQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { database } = req.params;
      const { query } = req.body;

      if (!query) {
        res.status(400).json({ status: 'error', message: 'Query is required' });
        return;
      }

      const result = await this.db.executeQuery(database, query);
      res.json({ status: 'success', data: result });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Query execution failed', error });
    }
  };

  public createDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, collation } = req.body;
      if (!name) {
        res.status(400).json({ status: 'error', message: 'Database name is required' });
        return;
      }
      await this.db.createDatabase(name, collation);
      res.json({ status: 'success', message: `Database ${name} created successfully` });
    } catch (error) {
      let message = 'Failed to create database';
      if (error instanceof Error) {
        message = error.message;
      }
      res.status(500).json({ status: 'error', message, error });
    }
  };

  public deleteDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { databaseName } = req.params;
      if (!databaseName) {
        res.status(400).json({ status: 'error', message: 'Database name is required' });
        return;
      }
      await this.db.deleteDatabase(databaseName);
      res.json({ status: 'success', message: `Database ${databaseName} deleted successfully` });
    } catch (error) {
      let message = 'Failed to delete database';
      if (error instanceof Error) {
        message = error.message;
      }
      res.status(500).json({ status: 'error', message, error });
    }
  };

  public backupDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { databaseName } = req.params;
      const { backupPath } = req.body;
      
      if (!databaseName) {
        res.status(400).json({ status: 'error', message: 'Database name is required' });
        return;
      }
      
      // Log the backup request
      console.log(`Received backup request for database "${databaseName}" with path "${backupPath || 'default'}"`);
      
      // Generate a timestamp with format YYYY-MM-DD_HH-MM-SS
      const timestamp = new Date().toISOString()
        .replace(/T/, '_')
        .replace(/:/g, '-')
        .substr(0, 19);
      
      // If no backup path provided, get default from SQL Server
      let finalBackupPath = backupPath;
      if (!finalBackupPath) {
        const defaultPath = await this.db.getDefaultBackupPath();
        finalBackupPath = `${defaultPath}${databaseName}_${timestamp}.bak`;
        console.log(`No backup path provided, using default: ${finalBackupPath}`);
      }
      
      console.log(`Starting backup of database "${databaseName}" to "${finalBackupPath}"`);
      await this.db.backupDatabase(databaseName, finalBackupPath);
      console.log(`Backup completed successfully`);
      
      res.json({ 
        status: 'success', 
        message: `Database ${databaseName} backed up successfully`,
        backupPath: finalBackupPath,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error in backupDatabase controller:', error);
      
      // Determine if error is related to permissions, path or database issues
      let errorType = 'unknown';
      let statusCode = 500;
      
      if (error.message?.includes('access') || error.message?.includes('permission')) {
        errorType = 'permission';
        statusCode = 403;
      } else if (error.message?.includes('path') || error.message?.includes('directory')) {
        errorType = 'path';
        statusCode = 400;
      } else if (error.message?.includes('not exist')) {
        errorType = 'database';
        statusCode = 404;
      }
      
      res.status(statusCode).json({ 
        status: 'error',
        message: 'Failed to backup database',
        details: error.message,
        errorType,
        timestamp: new Date().toISOString()
      });
    }
  };

  public restoreDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { databaseName } = req.params;
      const { backupPath } = req.body;
      
      if (!databaseName) {
        res.status(400).json({ status: 'error', message: 'Database name is required' });
        return;
      }
      
      if (!backupPath) {
        res.status(400).json({ status: 'error', message: 'Backup path is required' });
        return;
      }

      // Log the restore request
      console.log(`Received restore request for database "${databaseName}" from backup path "${backupPath}"`);
      
      // Validate backup file extension
      if (!backupPath.toLowerCase().endsWith('.bak')) {
        console.warn('Backup file does not have .bak extension, this might cause issues');
      }
      
      console.log(`Starting restore of database "${databaseName}" from "${backupPath}"`);
      await this.db.restoreDatabase(databaseName, backupPath);
      console.log(`Restore completed successfully`);
      
      res.json({ 
        status: 'success', 
        message: `Database ${databaseName} restored successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error in restoreDatabase controller:', error);
      
      // Determine if error is related to permissions, path, database issues, or file not found
      let errorType = 'unknown';
      let statusCode = 500;
      let message = 'Failed to restore database';
      
      if (error.message?.includes('access') || error.message?.includes('permission')) {
        errorType = 'permission';
        statusCode = 403;
        message = 'Permission denied: Unable to access backup file';
      } else if (error.message?.includes('Cannot open backup device') || 
                 error.message?.includes('Could not find file')) {
        errorType = 'file_not_found';
        statusCode = 404;
        message = 'Backup file not found or not accessible';
      } else if (error.message?.includes('not exist')) {
        errorType = 'database';
        statusCode = 404;
        message = 'Database does not exist';
      } else if (error.message?.includes('RESTORE HEADERONLY')) {
        errorType = 'invalid_backup';
        statusCode = 400;
        message = 'Invalid backup file';
      }
      
      res.status(statusCode).json({ 
        status: 'error',
        message,
        details: error.message,
        errorType,
        timestamp: new Date().toISOString()
      });
    }
  };

  public getBackupHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { databaseName } = req.params;
      
      console.log(`Retrieving backup history${databaseName ? ' for ' + databaseName : ''}`);
      
      const backupHistory = await this.db.getBackupHistory(databaseName);
      
      res.json({ 
        status: 'success', 
        data: backupHistory 
      });
    } catch (error: any) {
      console.error('Error in getBackupHistory controller:', error);
      
      res.status(500).json({ 
        status: 'error',
        message: 'Failed to retrieve backup history',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}
