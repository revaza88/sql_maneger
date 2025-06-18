import sql from 'mssql';
import { config } from '../config';
import crypto from 'crypto';

export class SQLServerUserService {
  private static getMasterConnection(): sql.ConnectionPool {
    return new sql.ConnectionPool({
      user: config.database.user,
      password: config.database.password,
      server: '127.0.0.1',
      port: 1433,
      database: 'master', // Connect to master database for user management
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    });
  }

  /**
   * Generate unique SQL Server username for user
   */
  static generateSQLServerUsername(userId: number, email: string): string {
    // Create username like: user_5_revaz (user_[id]_[first_part_of_email])
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    return `user_${userId}_${emailPrefix}`.substring(0, 50); // SQL Server username limit
  }

  /**
   * Generate secure random password for SQL Server user
   */
  static generateSecurePassword(): string {
    // Generate 16 character password with letters and numbers
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Create SQL Server login and user for application user
   */
  static async createSQLServerUser(userId: number, email: string): Promise<{
    username: string;
    password: string;
  }> {
    const username = this.generateSQLServerUsername(userId, email);
    const password = this.generateSecurePassword();
    
    const masterPool = this.getMasterConnection();
    
    try {
      await masterPool.connect();      // Create SQL Server login
      await masterPool.request()
        .input('username', sql.VarChar, username)
        .input('password', sql.VarChar, password)
        .query(`
          IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = @username)
          BEGIN
            EXEC('CREATE LOGIN [' + @username + '] WITH PASSWORD = ''' + @password + ''', CHECK_POLICY = OFF')
          END
        `);      // User is created with minimal permissions only
      // Database creation/deletion is handled by admin credentials
      console.log(`Created SQL Server login: ${username}`);
      
      return { username, password };
    } catch (error) {
      console.error('Error creating SQL Server user:', error);
      throw new Error(`Failed to create SQL Server user: ${error}`);
    } finally {
      await masterPool.close();
    }
  }

  /**
   * Create database user and grant permissions for specific database
   */
  static async grantDatabaseAccess(username: string, databaseName: string): Promise<void> {
    const dbPool = new sql.ConnectionPool({
      user: config.database.user,
      password: config.database.password,
      server: '127.0.0.1',
      port: 1433,
      database: databaseName,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
      }
    });

    try {
      await dbPool.connect();

      // Create user in database and grant permissions
      await dbPool.request()
        .input('username', sql.VarChar, username)
        .query(`
          IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = @username)
          BEGIN
            EXEC('CREATE USER [' + @username + '] FOR LOGIN [' + @username + ']')
            EXEC('ALTER ROLE db_owner ADD MEMBER [' + @username + ']')
          END
        `);

      console.log(`Granted access to database ${databaseName} for user: ${username}`);
    } catch (error) {
      console.error(`Error granting database access to ${databaseName}:`, error);
      throw new Error(`Failed to grant database access: ${error}`);
    } finally {
      await dbPool.close();
    }
  }

  /**
   * Remove SQL Server user and login
   */
  static async deleteSQLServerUser(username: string): Promise<void> {
    const masterPool = this.getMasterConnection();
    
    try {
      await masterPool.connect();

      // First, get list of databases where this user exists
      const dbResult = await masterPool.request()
        .input('username', sql.VarChar, username)
        .query(`
          SELECT name FROM sys.databases 
          WHERE database_id > 4 AND state = 0  -- Exclude system databases and offline databases
        `);

      // Remove user from all databases
      for (const db of dbResult.recordset) {
        try {
          const dbPool = new sql.ConnectionPool({
            user: config.database.user,
            password: config.database.password,
            server: '127.0.0.1',
            port: 1433,
            database: db.name,
            options: {
              encrypt: false,
              trustServerCertificate: true,
              enableArithAbort: true
            }
          });

          await dbPool.connect();
          
          await dbPool.request()
            .input('username', sql.VarChar, username)
            .query(`
              IF EXISTS (SELECT * FROM sys.database_principals WHERE name = @username)
              BEGIN
                EXEC('DROP USER [' + @username + ']')
              END
            `);
          
          await dbPool.close();
          console.log(`Removed user ${username} from database ${db.name}`);
        } catch (err) {
          console.warn(`Could not remove user from database ${db.name}:`, err);
        }
      }

      // Remove login from SQL Server
      await masterPool.request()
        .input('username', sql.VarChar, username)
        .query(`
          IF EXISTS (SELECT * FROM sys.server_principals WHERE name = @username)
          BEGIN
            EXEC('DROP LOGIN [' + @username + ']')
          END
        `);

      console.log(`Deleted SQL Server login: ${username}`);
    } catch (error) {
      console.error('Error deleting SQL Server user:', error);
      throw new Error(`Failed to delete SQL Server user: ${error}`);
    } finally {
      await masterPool.close();
    }
  }

  /**
   * List databases accessible to a user
   */
  static async getUserDatabases(username: string): Promise<string[]> {
    const masterPool = this.getMasterConnection();
    
    try {
      await masterPool.connect();

      const result = await masterPool.request()
        .input('username', sql.VarChar, username)
        .query(`
          SELECT DISTINCT d.name as database_name
          FROM sys.databases d
          WHERE d.database_id > 4 AND d.state = 0
          AND EXISTS (
            SELECT 1 FROM sys.server_principals sp 
            WHERE sp.name = @username AND sp.type = 'S'
          )
        `);

      return result.recordset.map(r => r.database_name);
    } catch (error) {
      console.error('Error getting user databases:', error);
      return [];
    } finally {
      await masterPool.close();
    }
  }
  /**
   * List databases accessible to a specific user (only databases with explicit access)
   */
  static async listDatabases(username?: string): Promise<string[]> {
    const masterPool = this.getMasterConnection();
    
    try {
      await masterPool.connect();

      if (!username) {
        // For users without SQL Server credentials, show empty list for security
        // They need to create SQL Server user first to see any databases
        return [];
      }

      // Show only databases where user has explicit access
      // No longer using dbcreator role - users only see databases they own/have access to
      const query = `
        SELECT DISTINCT d.name as database_name
        FROM sys.databases d
        WHERE d.database_id > 4 AND d.state = 0
        AND EXISTS (
          SELECT 1 
          FROM sys.database_principals dp 
          WHERE dp.name = @username 
          AND dp.type = 'S'
          AND dp.principal_id > 0
        )
        ORDER BY d.name
      `;
      
      const request = masterPool.request().input('username', sql.VarChar, username);
      const result = await request.query(query);
      return result.recordset.map(r => r.database_name);
    } catch (error) {
      console.error('Error listing databases:', error);
      throw new Error(`Failed to list databases: ${error}`);
    } finally {
      await masterPool.close();
    }
  }
}
