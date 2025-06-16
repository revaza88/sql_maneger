import sql from 'mssql';
import { config } from '../config';
import { UserModel } from '../models/user.model';
import { UserDatabaseModel } from '../models/user-database.model';

export class UserDatabaseService {
  /**
   * Create a connection pool for a specific user using their SQL Server credentials
   */
  private static async getUserConnectionPool(userId: number): Promise<sql.ConnectionPool> {
    const credentials = await UserModel.getSQLServerCredentials(userId);
    if (!credentials) {
      throw new Error('User does not have SQL Server credentials configured');
    }

    const userPool = new sql.ConnectionPool({
      user: credentials.username,
      password: credentials.password,
      server: config.database.server,
      port: 1433,
      database: 'master', // Start with master database
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      },
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000
      }
    });

    await userPool.connect();
    return userPool;
  }

  /**
   * Get databases accessible to the user (only their own databases)
   */
  static async getUserDatabases(userId: number): Promise<any[]> {
    try {
      // Get list of databases owned by this user
      const ownedDatabases = await UserDatabaseModel.getUserDatabases(userId);
      
      if (ownedDatabases.length === 0) {
        return [];
      }

      // Get detailed information about these databases using admin credentials
      // (since we need to query system tables)
      const adminPool = new sql.ConnectionPool({
        user: config.database.user,
        password: config.database.password,
        server: config.database.server,
        port: 1433,
        database: 'master',
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true
        }
      });

      await adminPool.connect();

      try {
        const databaseList = ownedDatabases.map(db => `'${db.databaseName}'`).join(',');
        
        const result = await adminPool.request()
          .query(`
            SELECT 
              d.name,
              CAST(mf.size/128.0 AS DECIMAL(10,2)) as size_mb,
              d.create_date,
              d.state_desc
            FROM sys.databases d
            JOIN sys.master_files mf ON d.database_id = mf.database_id
            WHERE d.name IN (${databaseList}) AND mf.type_desc = 'ROWS'
            ORDER BY d.name
          `);

        return result.recordset.map(db => {
          const owned = ownedDatabases.find(o => o.databaseName === db.name);
          return {
            name: String(db.name),
            size_mb: parseFloat(db.size_mb.toFixed(2)),
            create_date: new Date(db.create_date).toISOString(),
            state_desc: String(db.state_desc),
            quotaMB: owned?.quotaMB ?? null
          };
        });
      } finally {
        await adminPool.close();
      }
    } catch (error) {
      console.error('Error getting user databases:', error);
      throw error;
    }
  }

  /**
   * Create a new database using user's credentials
   */
  static async createDatabase(userId: number, databaseName: string, collation?: string, quotaMB: number = 100): Promise<void> {
    const userPool = await this.getUserConnectionPool(userId);
    
    try {
      // Sanitize database name
      const sanitizedName = databaseName.replace(/[^\w_]/g, '');
      if (!sanitizedName) {
        throw new Error('Invalid database name');
      }

      // Check if user already owns a database with this name
      const alreadyOwns = await UserDatabaseModel.userOwnsDatabase(userId, sanitizedName);
      if (alreadyOwns) {
        throw new Error('You already own a database with this name');
      }

      // Create the database
      const collationClause = collation ? `COLLATE ${collation}` : '';
      const query = `CREATE DATABASE [${sanitizedName}] ${collationClause}`;      await userPool.request().query(query);

      // Grant the user full access to their database
      const credentials = await UserModel.getSQLServerCredentials(userId);
      if (credentials) {
        try {
          await userPool.request()
            .query(`
              USE [${sanitizedName}];
              IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '${credentials.username}')
              BEGIN
                CREATE USER [${credentials.username}] FOR LOGIN [${credentials.username}];
              END;
              IF NOT IS_ROLEMEMBER('db_owner', '${credentials.username}') = 1
              BEGIN
                ALTER ROLE db_owner ADD MEMBER [${credentials.username}];
              END;
            `);
        } catch (userError: any) {
          console.warn('Warning: Could not create user in database (user might already exist):', userError.message);
          // Continue anyway as the database was created successfully
        }
      }

      // Record the ownership in our system
      await UserDatabaseModel.createUserDatabase(userId, sanitizedName, quotaMB);

      console.log(`Database ${sanitizedName} created successfully for user ${userId}`);
    } catch (error) {
      console.error('Error creating user database:', error);
      throw error;
    } finally {
      await userPool.close();
    }
  }

  /**
   * Delete a database (only if owned by the user)
   */
  static async deleteDatabase(userId: number, databaseName: string): Promise<void> {
    // Check if user owns this database
    const owns = await UserDatabaseModel.userOwnsDatabase(userId, databaseName);
    if (!owns) {
      throw new Error('You do not have permission to delete this database');
    }

    const userPool = await this.getUserConnectionPool(userId);
    
    try {
      const sanitizedName = databaseName.replace(/[^\w_]/g, '');
      
      // Drop the database
      await userPool.request()
        .query(`DROP DATABASE [${sanitizedName}]`);

      // Remove ownership record
      await UserDatabaseModel.removeUserDatabase(userId, sanitizedName);

      console.log(`Database ${sanitizedName} deleted successfully by user ${userId}`);
    } catch (error) {
      console.error('Error deleting user database:', error);
      throw error;
    } finally {
      await userPool.close();
    }
  }

  /**
   * Get tables in a user's database
   */
  static async getDatabaseTables(userId: number, databaseName: string): Promise<any[]> {
    // Check if user owns this database
    const owns = await UserDatabaseModel.userOwnsDatabase(userId, databaseName);
    if (!owns) {
      throw new Error('You do not have permission to access this database');
    }

    const userPool = await this.getUserConnectionPool(userId);
    
    try {
      const result = await userPool.request()
        .query(`
          USE [${databaseName}];
          SELECT 
            t.name AS tableName,
            s.name AS schemaName
          FROM sys.tables t
          INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
          ORDER BY s.name, t.name;
        `);

      return result.recordset;
    } catch (error) {
      console.error('Error getting database tables:', error);
      throw error;
    } finally {
      await userPool.close();
    }
  }

  /**
   * Execute a query in a user's database
   */
  static async executeQuery(userId: number, databaseName: string, query: string): Promise<any> {
    // Check if user owns this database
    const owns = await UserDatabaseModel.userOwnsDatabase(userId, databaseName);
    if (!owns) {
      throw new Error('You do not have permission to access this database');
    }

    const userPool = await this.getUserConnectionPool(userId);
    
    try {
      const result = await userPool.request()
        .query(`USE [${databaseName}]; ${query}`);

      return result;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    } finally {
      await userPool.close();
    }
  }

  /**
   * Test user's SQL Server connection
   */
  static async testUserConnection(userId: number): Promise<boolean> {
    try {
      const userPool = await this.getUserConnectionPool(userId);
      await userPool.request().query('SELECT 1');
      await userPool.close();
      return true;
    } catch (error) {
      console.error('User connection test failed:', error);
      return false;
    }
  }

  /**
   * Backup a user's database
   */
  static async backupDatabase(userId: number, databaseName: string, backupPath?: string): Promise<string> {
    // Check if user owns this database
    const owns = await UserDatabaseModel.userOwnsDatabase(userId, databaseName);
    if (!owns) {
      throw new Error('You do not have permission to backup this database');
    }

    const userPool = await this.getUserConnectionPool(userId);
    
    try {
      const sanitizedName = databaseName.replace(/[^\w_]/g, '');
      
      // Generate backup path if not provided
      let finalBackupPath = backupPath;
      if (!finalBackupPath) {
        const timestamp = new Date().toISOString()
          .replace(/T/, '_')
          .replace(/:/g, '-')
          .substr(0, 19);
        finalBackupPath = `C:\\SQLBackups\\${sanitizedName}_${timestamp}.bak`;
      }

      // Ensure .bak extension
      if (!finalBackupPath.toLowerCase().endsWith('.bak')) {
        finalBackupPath = `${finalBackupPath}.bak`;
      }

      // Perform backup
      const query = `
        BACKUP DATABASE [${sanitizedName}] 
        TO DISK = N'${finalBackupPath}' 
        WITH NOFORMAT, NOINIT, NAME = N'${sanitizedName}-Full Database Backup', 
        SKIP, NOREWIND, NOUNLOAD, STATS = 10
      `;
      
      await userPool.request().query(query);
      
      console.log(`Database ${sanitizedName} backed up successfully to ${finalBackupPath} by user ${userId}`);
      return finalBackupPath;
    } catch (error) {
      console.error('Error backing up user database:', error);
      throw error;
    } finally {
      await userPool.close();
    }
  }

  /**
   * Restore a user's database
   */
  static async restoreDatabase(userId: number, databaseName: string, backupPath: string): Promise<void> {
    // Check if user owns this database
    const owns = await UserDatabaseModel.userOwnsDatabase(userId, databaseName);
    if (!owns) {
      throw new Error('You do not have permission to restore this database');
    }

    const userPool = await this.getUserConnectionPool(userId);
    
    try {
      const sanitizedName = databaseName.replace(/[^\w_]/g, '');
      const sanitizedBackupPath = backupPath.replace(/['"]/g, '');

      // Set database to single user mode
      const setSingleUserQuery = `
        USE [master];
        ALTER DATABASE [${sanitizedName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      `;

      // Restore database
      const restoreQuery = `
        RESTORE DATABASE [${sanitizedName}] 
        FROM DISK = N'${sanitizedBackupPath}' 
        WITH FILE = 1, NOUNLOAD, REPLACE, STATS = 10;
      `;

      // Set back to multi user mode
      const setMultiUserQuery = `
        ALTER DATABASE [${sanitizedName}] SET MULTI_USER;
      `;

      try {
        await userPool.request().query(setSingleUserQuery);
        await userPool.request().query(restoreQuery);
        await userPool.request().query(setMultiUserQuery);
        
        console.log(`Database ${sanitizedName} restored successfully from ${sanitizedBackupPath} by user ${userId}`);
      } catch (error) {
        // Try to set back to multi-user mode if restore fails
        try {
          await userPool.request().query(setMultiUserQuery);
        } catch (cleanupError) {
          console.error('Failed to reset database to MULTI_USER mode:', cleanupError);
        }
        throw error;
      }
    } catch (error) {
      console.error('Error restoring user database:', error);
      throw error;
    } finally {
      await userPool.close();
    }
  }

  /**
   * Update quota for a user's database
   */
  static async updateQuota(userId: number, databaseName: string, quotaMB: number): Promise<void> {
    // Check ownership
    const owns = await UserDatabaseModel.userOwnsDatabase(userId, databaseName);
    if (!owns) {
      throw new Error('You do not have permission to update quota for this database');
    }
    await UserDatabaseModel.updateQuota(userId, databaseName, quotaMB);
  }

  /**
   * Get backup history for a user's database
   */
  static async getBackupHistory(userId: number, databaseName?: string): Promise<any[]> {
    if (databaseName) {
      // Check if user owns this specific database
      const owns = await UserDatabaseModel.userOwnsDatabase(userId, databaseName);
      if (!owns) {
        throw new Error('You do not have permission to view backup history for this database');
      }
    }

    // Get all databases owned by the user
    const ownedDatabases = await UserDatabaseModel.getUserDatabases(userId);
    if (ownedDatabases.length === 0) {
      return [];
    }

    // Use admin credentials to query backup history from msdb
    const adminPool = new sql.ConnectionPool({
      user: config.database.user,
      password: config.database.password,
      server: config.database.server,
      port: 1433,
      database: 'msdb',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    });

    await adminPool.connect();

    try {
      let dbFilter = '';
      if (databaseName) {
        const sanitizedName = databaseName.replace(/[^\w_]/g, '');
        dbFilter = `WHERE b.database_name = '${sanitizedName}'`;
      } else {
        const databaseList = ownedDatabases.map(db => `'${db.databaseName}'`).join(',');
        dbFilter = `WHERE b.database_name IN (${databaseList})`;
      }

      const query = `
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
          backupset b
          INNER JOIN backupmediafamily bmf ON b.media_set_id = bmf.media_set_id
        ${dbFilter}
        ORDER BY 
          b.backup_start_date DESC, 
          b.database_name
      `;

      const result = await adminPool.request().query(query);

      return result.recordset.map(record => ({
        databaseName: record.Database,
        startTime: new Date(record.BackupStartTime).toISOString(),
        finishTime: new Date(record.BackupFinishTime).toISOString(),
        sizeInMB: record.BackupSizeMB,
        backupFile: record.BackupFile,
        backupType: record.BackupType
      }));
    } finally {
      await adminPool.close();
    }
  }
}
