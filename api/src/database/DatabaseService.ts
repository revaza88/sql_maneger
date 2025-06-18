import sql from 'mssql';
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

import logger from "../utils/logger";
import { sanitizeDbName } from "./utils";
export class DatabaseService {
  private static instance: DatabaseService;
  private pool: sql.ConnectionPool | null = null;
  private poolConnect: Promise<sql.ConnectionPool>;

  private constructor() {
    this.pool = new sql.ConnectionPool({
      user: config.database.user,
      password: config.database.password,
      server: '127.0.0.1',  // Using IP address that we know works
      port: 1433,  // Explicit port
      database: config.database.database,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      }
    });

    this.poolConnect = this.pool.connect();

    // Handle pool errors
    this.pool.on('error', err => {
      logger.error('Database pool error:', err);
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async ensureConnection() {
    try {
      if (!this.pool) {
        logger.info('Creating new connection pool...');
        this.pool = new sql.ConnectionPool({
          user: config.database.user,
          password: config.database.password,
          server: config.database.server,
          port: 1433,
          database: config.database.database,
          options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true
          },
          pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
          }
        });
        this.poolConnect = this.pool.connect();
      }

      // Try to connect with retries
      let retries = 3;
      while (retries > 0) {
        try {
          await Promise.race([
            this.poolConnect,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), 5000)
            )
          ]);
          logger.info('Successfully connected to database');
          return;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          logger.info(`Connection failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      logger.error('Failed to ensure database connection:', error);
      throw error;
    }
  }

  public async query(query: string, params?: any[]): Promise<any[]> {
    await this.ensureConnection();
    
    try {
      const request = this.pool!.request();
      
      if (params) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
      }
      
      logger.info('Executing query:', query);
      const result = await request.query(query);
      logger.info('Query executed successfully');
      return result.recordset;
    } catch (error) {
      logger.error('Error executing query:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.poolConnect;
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database connection test failed:', error);
      return false;
    }
  }

  public async getDatabases(): Promise<any[]> {
    try {
      logger.info('Fetching databases list...');
      const query = `
        SELECT 
          d.name,
          CAST(mf.size/128.0 AS DECIMAL(10,2)) as size_mb,
          d.create_date,
          d.state_desc
        FROM sys.databases d
        JOIN sys.master_files mf ON d.database_id = mf.database_id
        WHERE d.database_id > 4 AND mf.type_desc = 'ROWS'
      `;
      
      await this.ensureConnection();
      logger.info('Connection ensured, executing query...');
      
      const result = await this.query(query);
      logger.info('Query executed, processing results...');
      
      if (!Array.isArray(result)) {
        logger.error('Invalid result format:', result);
        return [];
      }
      
      // Transform and validate the data
      const databases = result.map(db => ({
        name: String(db.name),
        size_mb: parseFloat(db.size_mb.toFixed(2)),
        create_date: new Date(db.create_date).toISOString(),
        state_desc: String(db.state_desc)
      }));
      
      logger.info(`Successfully retrieved ${databases.length} databases`);
      return databases;
    } catch (error) {
      logger.error('Error in getDatabases:', error);
      throw error;
    }
  }

  public async getTables(database: string): Promise<any[]> {
    const query = `
      USE [${database}];
      SELECT 
        t.name AS tableName,
        s.name AS schemaName
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      ORDER BY s.name, t.name;
    `;
    return await this.query(query);
  }

  public async executeQuery(database: string, query: string): Promise<any> {
    const useDbQuery = `USE [${database}]; ${query}`;
    return await this.query(useDbQuery);
  }

  // Helper function to sanitize database names
  
  public async createDatabase(dbName: string, collation?: string): Promise<void> {
    const sanitizedDbName = sanitizeDbName(dbName);
    if (!sanitizedDbName) {
      throw new Error('Invalid database name.');
    }
    // It's generally safer to avoid direct inclusion of collation in the query string if possible.
    // However, for CREATE DATABASE, collation is often part of the syntax and might not be parameterizable.
    // If your SQL Server version and driver support it, use parameters. Otherwise, validate/sanitize thoroughly.
    // For this example, we'll assume collation is either from a safe, predefined list or needs careful validation.
    // We will focus on sanitizing dbName primarily.

    // Basic validation for collation (example: allow only specific collations or alphanumeric with underscores)
    const sanitizedCollation = collation ? collation.replace(/[^\w_]/g, '') : null;

    let query = `CREATE DATABASE [${sanitizedDbName}]`;
    if (sanitizedCollation) {
      // Ensure the collation string is safe before appending
      // This might involve checking against a list of allowed collations
      query += ` COLLATE ${sanitizedCollation}`;
    }

    // DDL commands like CREATE DATABASE might not return recordsets in the same way DML commands do.
    // Adjusting to use a more generic execution method if `this.query` is strictly for recordset-returning queries.
    // Assuming `this.query` can handle DDL or there's an alternative way to execute non-query commands.
    // For mssql library, `request.query()` can execute DDL.
    await this.query(query);
  }

  public async deleteDatabase(dbName: string): Promise<void> {
    const sanitizedDbName = sanitizeDbName(dbName);
    if (!sanitizedDbName) {
      throw new Error('Invalid database name.');
    }
    const query = `DROP DATABASE [${sanitizedDbName}]`;
    await this.query(query);
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
    }
  }

  public async backupDatabase(dbName: string, backupPath: string): Promise<void> {
    try {
      const sanitizedDbName = sanitizeDbName(dbName);
      if (!sanitizedDbName) {
        throw new Error('Invalid database name.');
      }
      
      // Check if database exists
      const dbExists = await this.checkIfDatabaseExists(sanitizedDbName);
      if (!dbExists) {
        throw new Error(`Database '${sanitizedDbName}' does not exist.`);
      }
      
      // Validate and sanitize backup path
      const sanitizedBackupPath = backupPath.replace(/['"]/g, '');
      if (!sanitizedBackupPath) {
        throw new Error('Invalid backup path.');
      }
      
      // Add file extension if missing
      const finalBackupPath = sanitizedBackupPath.toLowerCase().endsWith('.bak') 
        ? sanitizedBackupPath 
        : `${sanitizedBackupPath}.bak`;
      
      // Perform the backup with detailed stats
      const query = `
        BACKUP DATABASE [${sanitizedDbName}] 
        TO DISK = N'${finalBackupPath}' 
        WITH NOFORMAT, NOINIT, NAME = N'${sanitizedDbName}-Full Database Backup', 
        SKIP, NOREWIND, NOUNLOAD, STATS = 10
      `;
      
      logger.info(`Attempting to backup database '${sanitizedDbName}' to '${finalBackupPath}'`);
      await this.query(query);
      logger.info(`Successfully backed up database '${sanitizedDbName}' to '${finalBackupPath}'`);
    } catch (error) {
      logger.error(`Error backing up database '${dbName}':`, error);
      throw error;
    }
  }
  
  /**
   * Check if a database exists
   * @param dbName Database name to check
   * @returns Boolean indicating if database exists
   */
  private async checkIfDatabaseExists(dbName: string): Promise<boolean> {
    const query = `SELECT 1 FROM sys.databases WHERE name = '${dbName}'`;
    const result = await this.query(query);
    return result.length > 0;
  }

  public async restoreDatabase(dbName: string, backupPath: string): Promise<void> {
    try {
      const sanitizedDbName = sanitizeDbName(dbName);
      if (!sanitizedDbName) {
        throw new Error('Invalid database name.');
      }
      
      // Check if database exists
      const dbExists = await this.checkIfDatabaseExists(sanitizedDbName);
      if (!dbExists) {
        throw new Error(`Database '${sanitizedDbName}' does not exist.`);
      }
      
      // Validate and sanitize backup path
      const sanitizedBackupPath = backupPath.replace(/['"]/g, '');
      if (!sanitizedBackupPath) {
        throw new Error('Invalid backup path.');
      }
      
      // Check if backup file exists (can't easily do this from SQL Server, would need file system access)
      // Would require additional server-side code with fs.existsSync
      
      logger.info(`Attempting to restore database '${sanitizedDbName}' from '${sanitizedBackupPath}'`);
      logger.info('Setting database to SINGLE_USER mode');
      
      // Set database to single user mode for restore
      const setSingleUserQuery = `
        USE [master];
        ALTER DATABASE [${sanitizedDbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      `;
      
      // Restore database from backup with progress reporting
      const restoreQuery = `
        RESTORE DATABASE [${sanitizedDbName}] 
        FROM DISK = N'${sanitizedBackupPath}' 
        WITH FILE = 1, NOUNLOAD, REPLACE, STATS = 10;
      `;
      
      // Set database back to multi user mode
      const setMultiUserQuery = `
        ALTER DATABASE [${sanitizedDbName}] SET MULTI_USER;
      `;
      
      try {
        // Execute the queries in sequence
        await this.query(setSingleUserQuery);
        logger.info('Database set to SINGLE_USER mode, beginning restore');
        
        await this.query(restoreQuery);
        logger.info('Restore completed successfully');
        
        await this.query(setMultiUserQuery);
        logger.info('Database set back to MULTI_USER mode');
        
        logger.info(`Successfully restored database '${sanitizedDbName}' from '${sanitizedBackupPath}'`);
      } catch (error) {
        logger.error(`Error during restore operation:`, error);
        
        // If error occurs, try to set database back to multi-user
        try {
          logger.info('Attempting to set database back to MULTI_USER mode after error');
          await this.query(setMultiUserQuery);
        } catch (cleanupError) {
          logger.error('Failed to reset database to MULTI_USER mode:', cleanupError);
          // Ignore additional errors in cleanup
        }
        throw error;
      }
    } catch (error) {
      logger.error(`Error restoring database '${dbName}':`, error);
      throw error;
    }
  }

  public async getDefaultBackupPath(): Promise<string> {
    const query = `SELECT SERVERPROPERTY('InstanceDefaultDataPath') AS DefaultPath`;
    const result = await this.query(query);
    
    if (!result || !result[0] || !result[0].DefaultPath) {
      // Fallback to a common SQL Server backup location
      return 'C:\\Program Files\\Microsoft SQL Server\\MSSQL15.SQLEXPRESS\\MSSQL\\Backup\\';
    }
    
    return result[0].DefaultPath;
  }

  /**
   * Get backup history for a specific database
   * @param dbName Database name to get backup history for
   * @returns Array of backup records with file details
   */
  public async getBackupHistory(dbName?: string): Promise<any[]> {
    try {
      const sanitizedDbName = dbName ? sanitizeDbName(dbName) : null;
      
      let dbFilter = '';
      if (sanitizedDbName) {
        dbFilter = `WHERE b.database_name = '${sanitizedDbName}'`;
      }
      
      // Query to get backup history from msdb
      const query = `
        USE msdb;
        SELECT 
          b.database_name AS [Database],
          b.backup_start_date AS [BackupStartTime],
          b.backup_finish_date AS [BackupFinishTime],
          CAST(b.backup_size / 1024 / 1024 AS DECIMAL(10, 2)) AS [BackupSizeMB],
          bmf.physical_device_name AS [BackupFile],
          CASE b.type
            WHEN 'D' THEN 'Full'
            WHEN 'I' THEN 'Differential'
            WHEN 'L' THEN 'Log'
            ELSE b.type
          END AS [BackupType]
        FROM 
          msdb.dbo.backupset b
          INNER JOIN msdb.dbo.backupmediafamily bmf ON b.media_set_id = bmf.media_set_id
        ${dbFilter}
        ORDER BY 
          b.backup_start_date DESC, 
          b.database_name
      `;
      
      logger.info(`Retrieving backup history ${sanitizedDbName ? 'for ' + sanitizedDbName : 'for all databases'}`);
      const result = await this.query(query);
      
      return result.map(record => ({
        databaseName: record.Database,
        startTime: new Date(record.BackupStartTime).toISOString(),
        finishTime: new Date(record.BackupFinishTime).toISOString(),
        sizeInMB: record.BackupSizeMB,
        backupFile: record.BackupFile,
        backupType: record.BackupType
      }));
    } catch (error) {
      logger.error('Error retrieving backup history:', error);
      throw error;
    }
  }

  /**
   * Create a backup file and return the file path for download
   */
  public async createBackupForDownload(databaseName: string): Promise<string> {
    try {
      logger.info(`Starting backup for download: ${databaseName}`);
      await this.ensureConnection();
      logger.info('Database connection established for backup');
      
      // Create a temporary backup directory if it doesn't exist
      const backupDir = path.join(process.cwd(), 'temp_backups');
      logger.info(`Backup directory: ${backupDir}`);
      
      if (!fs.existsSync(backupDir)) {
        logger.info('Creating backup directory...');
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `${databaseName}_${timestamp}.bak`);
      logger.info(`Generated backup path: ${backupPath}`);
      
      // SQL Server requires Windows-style paths
      const sqlServerPath = backupPath.replace(/\//g, '\\');
      logger.info(`SQL Server path: ${sqlServerPath}`);
      
      const query = `
        BACKUP DATABASE [${databaseName}] 
        TO DISK = '${sqlServerPath}'
        WITH 
          FORMAT,
          INIT,
          NAME = '${databaseName} Full Backup - ${new Date().toISOString()}'
      `;
      
      logger.info(`Executing backup query: ${query}`);
      await this.query(query);
      logger.info(`Backup completed successfully: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      logger.error('Error creating backup for download:', error);
      throw error;
    }
  }
  
  /**
   * Restore database from uploaded backup file
   */
  public async restoreFromUploadedFile(databaseName: string, uploadedFilePath: string): Promise<void> {
    try {
      await this.ensureConnection();
      
      // Verify the uploaded file exists
      if (!fs.existsSync(uploadedFilePath)) {
        throw new Error(`Uploaded backup file not found: ${uploadedFilePath}`);
      }
      
      // SQL Server requires Windows-style paths
      const sqlServerPath = uploadedFilePath.replace(/\//g, '\\');
      
      // First, get the logical file names from the backup
      const headerQuery = `
        RESTORE HEADERONLY 
        FROM DISK = '${sqlServerPath}'
      `;
      
      const fileListQuery = `
        RESTORE FILELISTONLY 
        FROM DISK = '${sqlServerPath}'
      `;
      
      logger.info('Reading backup file header and file list...');
      const fileListResult = await this.query(fileListQuery);
      
      if (!fileListResult || fileListResult.length === 0) {
        throw new Error('Invalid backup file or unable to read file structure');
      }
      
      // Generate new file paths for the restored database
      const dataFiles = fileListResult.filter((file: any) => file.Type === 'D');
      const logFiles = fileListResult.filter((file: any) => file.Type === 'L');
      
      if (dataFiles.length === 0) {
        throw new Error('No data files found in backup');
      }
      
      // Build the MOVE clauses for each file
      let moveClause = '';
      
      dataFiles.forEach((file: any, index: number) => {
        const newDataPath = `C:\\Program Files\\Microsoft SQL Server\\MSSQL16.SQLEXPRESS\\MSSQL\\DATA\\${databaseName}${index > 0 ? `_${index}` : ''}.mdf`;
        moveClause += `MOVE '${file.LogicalName}' TO '${newDataPath}', `;
      });
      
      logFiles.forEach((file: any, index: number) => {
        const newLogPath = `C:\\Program Files\\Microsoft SQL Server\\MSSQL16.SQLEXPRESS\\MSSQL\\DATA\\${databaseName}${index > 0 ? `_${index}` : ''}.ldf`;
        moveClause += `MOVE '${file.LogicalName}' TO '${newLogPath}', `;
      });
      
      // Remove trailing comma and space
      moveClause = moveClause.slice(0, -2);
      
      const restoreQuery = `
        RESTORE DATABASE [${databaseName}] 
        FROM DISK = '${sqlServerPath}'
        WITH 
          ${moveClause},
          REPLACE,
          RECOVERY
      `;
      
      logger.info(`Restoring database from uploaded file: ${databaseName} <- ${sqlServerPath}`);
      await this.query(restoreQuery);
      
      logger.info(`Database ${databaseName} restored successfully from uploaded file`);
    } catch (error) {
      logger.error('Error restoring from uploaded file:', error);
      throw error;
    }
  }
  
  /**
   * Clean up temporary backup files
   */
  public async cleanupTempBackup(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up temporary backup file: ${filePath}`);
      }
    } catch (error) {
      logger.error('Error cleaning up temporary backup file:', error);
      // Don't throw - this is cleanup, not critical
    }
  }
  
  /**
   * Get list of uploaded backup files
   */
  public async getUploadedBackups(): Promise<Array<{name: string, size: number, uploadDate: Date}>> {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        return [];
      }
      
      const files = fs.readdirSync(uploadsDir);
      const bakFiles = files.filter(file => file.toLowerCase().endsWith('.bak'));
      
      return bakFiles.map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          size: stats.size,
          uploadDate: stats.mtime
        };
      });
    } catch (error) {
      logger.error('Error getting uploaded backups:', error);
      return [];
    }
  }
}
