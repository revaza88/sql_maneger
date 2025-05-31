import sql from 'mssql';
import { config } from '../config';

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
      console.error('Database pool error:', err);
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
        console.log('Creating new connection pool...');
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
          console.log('Successfully connected to database');
          return;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.log(`Connection failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Failed to ensure database connection:', error);
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
      
      console.log('Executing query:', query);
      const result = await request.query(query);
      console.log('Query executed successfully');
      return result.recordset;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.poolConnect;
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  public async getDatabases(): Promise<any[]> {
    try {
      console.log('Fetching databases list...');
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
      console.log('Connection ensured, executing query...');
      
      const result = await this.query(query);
      console.log('Query executed, processing results...');
      
      if (!Array.isArray(result)) {
        console.error('Invalid result format:', result);
        return [];
      }
      
      // Transform and validate the data
      const databases = result.map(db => ({
        name: String(db.name),
        size_mb: parseFloat(db.size_mb.toFixed(2)),
        create_date: new Date(db.create_date).toISOString(),
        state_desc: String(db.state_desc)
      }));
      
      console.log(`Successfully retrieved ${databases.length} databases`);
      return databases;
    } catch (error) {
      console.error('Error in getDatabases:', error);
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
  private sanitizeDbName(dbName: string): string {
    return dbName.replace(/[^\w_]/g, '');
  }

  public async createDatabase(dbName: string, collation?: string): Promise<void> {
    const sanitizedDbName = this.sanitizeDbName(dbName);
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
    const sanitizedDbName = this.sanitizeDbName(dbName);
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
      const sanitizedDbName = this.sanitizeDbName(dbName);
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
      
      console.log(`Attempting to backup database '${sanitizedDbName}' to '${finalBackupPath}'`);
      await this.query(query);
      console.log(`Successfully backed up database '${sanitizedDbName}' to '${finalBackupPath}'`);
    } catch (error) {
      console.error(`Error backing up database '${dbName}':`, error);
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
      const sanitizedDbName = this.sanitizeDbName(dbName);
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
      
      console.log(`Attempting to restore database '${sanitizedDbName}' from '${sanitizedBackupPath}'`);
      console.log('Setting database to SINGLE_USER mode');
      
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
        console.log('Database set to SINGLE_USER mode, beginning restore');
        
        await this.query(restoreQuery);
        console.log('Restore completed successfully');
        
        await this.query(setMultiUserQuery);
        console.log('Database set back to MULTI_USER mode');
        
        console.log(`Successfully restored database '${sanitizedDbName}' from '${sanitizedBackupPath}'`);
      } catch (error) {
        console.error(`Error during restore operation:`, error);
        
        // If error occurs, try to set database back to multi-user
        try {
          console.log('Attempting to set database back to MULTI_USER mode after error');
          await this.query(setMultiUserQuery);
        } catch (cleanupError) {
          console.error('Failed to reset database to MULTI_USER mode:', cleanupError);
          // Ignore additional errors in cleanup
        }
        throw error;
      }
    } catch (error) {
      console.error(`Error restoring database '${dbName}':`, error);
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
      const sanitizedDbName = dbName ? this.sanitizeDbName(dbName) : null;
      
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
      
      console.log(`Retrieving backup history ${sanitizedDbName ? 'for ' + sanitizedDbName : 'for all databases'}`);
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
      console.error('Error retrieving backup history:', error);
      throw error;
    }
  }
}
