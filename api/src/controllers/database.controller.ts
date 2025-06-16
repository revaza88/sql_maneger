import { Request, Response } from 'express';
import { DatabaseService } from '../database/DatabaseService';
import { UserDatabaseService } from '../services/UserDatabaseService';
import { UserDatabaseModel } from '../models/user-database.model';
import * as fs from 'fs';
import * as path from 'path';

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

      // Use UserDatabaseService to get only user's own databases
      const databases = await UserDatabaseService.getUserDatabases(req.user.id);
      
      console.log(`Successfully retrieved ${databases.length} databases for user ${req.user.id}`);
      
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
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({ 
          status: 'error', 
          message: 'Authentication required' 
        });
        return;
      }

      // Use UserDatabaseService to ensure user owns the database
      const tables = await UserDatabaseService.getDatabaseTables(req.user.id, database);
      res.json({ status: 'success', data: tables });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Failed to fetch tables', error });
    }
  };

  public executeQuery = async (req: Request, res: Response): Promise<void> => {
    try {
      const { database } = req.params;
      const { query } = req.body;

      // Verify authentication
      if (!req.user) {
        res.status(401).json({ 
          status: 'error', 
          message: 'Authentication required' 
        });
        return;
      }

      if (!query) {
        res.status(400).json({ status: 'error', message: 'Query is required' });
        return;
      }

      // Use UserDatabaseService to ensure user owns the database
      const result = await UserDatabaseService.executeQuery(req.user.id, database, query);
      res.json({ status: 'success', data: result });
    } catch (error) {
      res.status(500).json({ status: 'error', message: 'Query execution failed', error });
    }
  };

  public createDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, collation, quotaMB } = req.body;
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({ 
          status: 'error', 
          message: 'Authentication required' 
        });
        return;
      }

      if (!name) {
        res.status(400).json({ status: 'error', message: 'Database name is required' });
        return;
      }

      // Use UserDatabaseService to create database with user's credentials
      await UserDatabaseService.createDatabase(req.user.id, name, collation, quotaMB);
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
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({ 
          status: 'error', 
          message: 'Authentication required' 
        });
        return;
      }

      if (!databaseName) {
        res.status(400).json({ status: 'error', message: 'Database name is required' });
        return;
      }

      // Use UserDatabaseService to delete database (only if user owns it)
      await UserDatabaseService.deleteDatabase(req.user.id, databaseName);
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
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({ 
          status: 'error', 
          message: 'Authentication required' 
        });
        return;
      }

      if (!databaseName) {
        res.status(400).json({ status: 'error', message: 'Database name is required' });
        return;
      }
      
      // Log the backup request
      console.log(`Received backup request for database "${databaseName}" with path "${backupPath || 'default'}" from user ${req.user.id}`);
      
      // Use UserDatabaseService to backup database (only if user owns it)
      const finalBackupPath = await UserDatabaseService.backupDatabase(req.user.id, databaseName, backupPath);
      
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
      
      if (error.message?.includes('access') || error.message?.includes('permission') || error.message?.includes('do not have permission')) {
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
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({ 
          status: 'error', 
          message: 'Authentication required' 
        });
        return;
      }

      if (!databaseName) {
        res.status(400).json({ status: 'error', message: 'Database name is required' });
        return;
      }
      
      if (!backupPath) {
        res.status(400).json({ status: 'error', message: 'Backup path is required' });
        return;
      }

      // Log the restore request
      console.log(`Received restore request for database "${databaseName}" from backup path "${backupPath}" by user ${req.user.id}`);
      
      // Validate backup file extension
      if (!backupPath.toLowerCase().endsWith('.bak')) {
        console.warn('Backup file does not have .bak extension, this might cause issues');
      }
      
      // Use UserDatabaseService to restore database (only if user owns it)
      await UserDatabaseService.restoreDatabase(req.user.id, databaseName, backupPath);
      
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
      
      if (error.message?.includes('access') || error.message?.includes('permission') || error.message?.includes('do not have permission')) {
        errorType = 'permission';
        statusCode = 403;
        message = 'Permission denied: Unable to access database or backup file';
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
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({ 
          status: 'error', 
          message: 'Authentication required' 
        });
        return;
      }
      
      console.log(`Retrieving backup history${databaseName ? ' for ' + databaseName : ''} for user ${req.user.id}`);
      
      // Use UserDatabaseService to get backup history (only for user's databases)
      const backupHistory = await UserDatabaseService.getBackupHistory(req.user.id, databaseName);
      
      res.json({ 
        status: 'success', 
        data: backupHistory 
      });
    } catch (error: any) {
      console.error('Error in getBackupHistory controller:', error);
      
      let statusCode = 500;
      let message = 'Failed to retrieve backup history';
      
      if (error.message?.includes('do not have permission')) {
        statusCode = 403;
        message = 'Permission denied: Cannot access backup history for this database';
      }
      
      res.status(statusCode).json({ 
        status: 'error',
        message,
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Download database backup file
   */
  public downloadBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { databaseName } = req.params;
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }
      
      if (!databaseName) {
        res.status(400).json({
          status: 'error',
          message: 'Database name is required'
        });
        return;
      }
      
      // Check if user owns this database
      const owns = await UserDatabaseModel.userOwnsDatabase(req.user.id, databaseName);
      if (!owns) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to download backup for this database'
        });
        return;
      }
      
      console.log(`Creating backup for download: ${databaseName} for user ${req.user.id}`);
      
      // Create backup file using admin credentials (needed for file system access)
      const backupFilePath = await this.db.createBackupForDownload(databaseName);
      
      // Check if file exists
      if (!fs.existsSync(backupFilePath)) {
        res.status(500).json({
          status: 'error',
          message: 'Backup file was not created successfully'
        });
        return;
      }
      
      // Set headers for file download
      const fileName = path.basename(backupFilePath);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      // Stream the file to response
      const fileStream = fs.createReadStream(backupFilePath);
      
      fileStream.on('end', () => {
        // Clean up the temporary file after download
        setTimeout(() => {
          this.db.cleanupTempBackup(backupFilePath);
        }, 1000);
      });
      
      fileStream.on('error', (error) => {
        console.error('Error streaming backup file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            status: 'error',
            message: 'Error downloading backup file'
          });
        }
      });
      
      fileStream.pipe(res);
      
    } catch (error: any) {
      console.error('Error in downloadBackup controller:', error);
      
      let statusCode = 500;
      let message = 'Failed to create or download backup';
      
      if (error.message?.includes('do not have permission')) {
        statusCode = 403;
        message = 'Permission denied: Cannot backup this database';
      }
      
      if (!res.headersSent) {
        res.status(statusCode).json({
          status: 'error',
          message,
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  };
  
  /**
   * Upload backup file
   */
  public uploadBackup = async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }
      
      if (!file) {
        res.status(400).json({
          status: 'error',
          message: 'No backup file uploaded'
        });
        return;
      }
      
      // Validate file extension
      if (!file.originalname.toLowerCase().endsWith('.bak')) {
        // Delete the uploaded file if it's not a .bak file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        res.status(400).json({
          status: 'error',
          message: 'Only .bak files are allowed'
        });
        return;
      }
      
      console.log(`Backup file uploaded successfully by user ${req.user.id}: ${file.originalname}`);
      
      res.json({
        status: 'success',
        message: 'Backup file uploaded successfully',
        data: {
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          uploadDate: new Date().toISOString(),
          userId: req.user.id
        }
      });
      
    } catch (error: any) {
      console.error('Error in uploadBackup controller:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to upload backup file',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
  
  /**
   * Restore database from uploaded backup file
   */
  public restoreFromUpload = async (req: Request, res: Response): Promise<void> => {
    try {
      const { databaseName } = req.params;
      const { filename } = req.body;
      
      // Verify authentication
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }
      
      if (!databaseName || !filename) {
        res.status(400).json({
          status: 'error',
          message: 'Database name and backup filename are required'
        });
        return;
      }
      
      // Check if user owns this database
      const owns = await UserDatabaseModel.userOwnsDatabase(req.user.id, databaseName);
      if (!owns) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have permission to restore this database'
        });
        return;
      }
      
      // Construct the path to the uploaded file
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const uploadedFilePath = path.join(uploadsDir, filename);
      
      // Verify the file exists
      if (!fs.existsSync(uploadedFilePath)) {
        res.status(404).json({
          status: 'error',
          message: 'Uploaded backup file not found'
        });
        return;
      }
      
      console.log(`Restoring database ${databaseName} from uploaded file: ${filename} by user ${req.user.id}`);
      
      // Use the old DatabaseService for file-based restore since it handles file system operations
      // But first verify user owns the database (already checked above)
      await this.db.restoreFromUploadedFile(databaseName, uploadedFilePath);
      
      res.json({
        status: 'success',
        message: `Database ${databaseName} restored successfully from uploaded backup`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('Error in restoreFromUpload controller:', error);
      
      let errorType = 'unknown';
      let statusCode = 500;
      let message = 'Failed to restore database from uploaded backup';
      
      if (error.message?.includes('access') || error.message?.includes('permission') || error.message?.includes('do not have permission')) {
        errorType = 'permission';
        statusCode = 403;
        message = 'Permission denied: Unable to access uploaded backup file';
      } else if (error.message?.includes('Invalid backup file')) {
        errorType = 'invalid_backup';
        statusCode = 400;
        message = 'Invalid backup file format';
      } else if (error.message?.includes('not found')) {
        errorType = 'file_not_found';
        statusCode = 404;
        message = 'Uploaded backup file not found';
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

  public updateDatabaseQuota = async (req: Request, res: Response): Promise<void> => {
    try {
      const { databaseName } = req.params;
      const { quotaMB } = req.body;

      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Authentication required' });
        return;
      }

      if (!quotaMB || quotaMB <= 0) {
        res.status(400).json({ status: 'error', message: 'quotaMB must be a positive number' });
        return;
      }

      await UserDatabaseService.updateQuota(req.user.id, databaseName, quotaMB);
      res.json({ status: 'success' });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  };
  
  /**
   * Get list of uploaded backup files
   */
  public getUploadedBackups = async (req: Request, res: Response): Promise<void> => {
    try {
      // Verify authentication
      if (!req.user) {
        res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
        return;
      }
      
      // For now, return all uploaded backups since we don't have user-specific file storage
      // In a production environment, you might want to implement user-specific upload folders
      const uploadedBackups = await this.db.getUploadedBackups();
      
      console.log(`Retrieved uploaded backups for user ${req.user.id}`);
      
      res.json({
        status: 'success',
        data: uploadedBackups
      });
      
    } catch (error: any) {
      console.error('Error in getUploadedBackups controller:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Failed to retrieve uploaded backups',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}
