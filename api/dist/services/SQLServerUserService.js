"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLServerUserService = void 0;
const mssql_1 = __importDefault(require("mssql"));
const config_1 = require("../config");
class SQLServerUserService {
    static getMasterConnection() {
        return new mssql_1.default.ConnectionPool({
            user: config_1.config.database.user,
            password: config_1.config.database.password,
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
    static generateSQLServerUsername(userId, email) {
        // Create username like: user_5_revaz (user_[id]_[first_part_of_email])
        const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        return `user_${userId}_${emailPrefix}`.substring(0, 50); // SQL Server username limit
    }
    /**
     * Generate secure random password for SQL Server user
     */
    static generateSecurePassword() {
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
    static async createSQLServerUser(userId, email) {
        const username = this.generateSQLServerUsername(userId, email);
        const password = this.generateSecurePassword();
        const masterPool = this.getMasterConnection();
        try {
            await masterPool.connect(); // Create SQL Server login
            await masterPool.request()
                .input('username', mssql_1.default.VarChar, username)
                .input('password', mssql_1.default.VarChar, password)
                .query(`
          IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = @username)
          BEGIN
            EXEC('CREATE LOGIN [' + @username + '] WITH PASSWORD = ''' + @password + ''', CHECK_POLICY = OFF')
          END
        `); // Grant dbcreator role to allow creating databases
            await masterPool.request()
                .input('username', mssql_1.default.VarChar, username)
                .query(`
          IF NOT EXISTS (
            SELECT 1 FROM sys.server_role_members rm 
            JOIN sys.server_principals r ON rm.role_principal_id = r.principal_id 
            JOIN sys.server_principals m ON rm.member_principal_id = m.principal_id 
            WHERE r.name = 'dbcreator' AND m.name = @username
          )
          BEGIN
            EXEC('ALTER SERVER ROLE dbcreator ADD MEMBER [' + @username + ']')
          END
        `);
            console.log(`Created SQL Server login with dbcreator role: ${username}`);
            return { username, password };
        }
        catch (error) {
            console.error('Error creating SQL Server user:', error);
            throw new Error(`Failed to create SQL Server user: ${error}`);
        }
        finally {
            await masterPool.close();
        }
    }
    /**
     * Create database user and grant permissions for specific database
     */
    static async grantDatabaseAccess(username, databaseName) {
        const dbPool = new mssql_1.default.ConnectionPool({
            user: config_1.config.database.user,
            password: config_1.config.database.password,
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
                .input('username', mssql_1.default.VarChar, username)
                .query(`
          IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = @username)
          BEGIN
            EXEC('CREATE USER [' + @username + '] FOR LOGIN [' + @username + ']')
            EXEC('ALTER ROLE db_owner ADD MEMBER [' + @username + ']')
          END
        `);
            console.log(`Granted access to database ${databaseName} for user: ${username}`);
        }
        catch (error) {
            console.error(`Error granting database access to ${databaseName}:`, error);
            throw new Error(`Failed to grant database access: ${error}`);
        }
        finally {
            await dbPool.close();
        }
    }
    /**
     * Remove SQL Server user and login
     */
    static async deleteSQLServerUser(username) {
        const masterPool = this.getMasterConnection();
        try {
            await masterPool.connect();
            // First, get list of databases where this user exists
            const dbResult = await masterPool.request()
                .input('username', mssql_1.default.VarChar, username)
                .query(`
          SELECT name FROM sys.databases 
          WHERE database_id > 4 AND state = 0  -- Exclude system databases and offline databases
        `);
            // Remove user from all databases
            for (const db of dbResult.recordset) {
                try {
                    const dbPool = new mssql_1.default.ConnectionPool({
                        user: config_1.config.database.user,
                        password: config_1.config.database.password,
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
                        .input('username', mssql_1.default.VarChar, username)
                        .query(`
              IF EXISTS (SELECT * FROM sys.database_principals WHERE name = @username)
              BEGIN
                EXEC('DROP USER [' + @username + ']')
              END
            `);
                    await dbPool.close();
                    console.log(`Removed user ${username} from database ${db.name}`);
                }
                catch (err) {
                    console.warn(`Could not remove user from database ${db.name}:`, err);
                }
            }
            // Remove login from SQL Server
            await masterPool.request()
                .input('username', mssql_1.default.VarChar, username)
                .query(`
          IF EXISTS (SELECT * FROM sys.server_principals WHERE name = @username)
          BEGIN
            EXEC('DROP LOGIN [' + @username + ']')
          END
        `);
            console.log(`Deleted SQL Server login: ${username}`);
        }
        catch (error) {
            console.error('Error deleting SQL Server user:', error);
            throw new Error(`Failed to delete SQL Server user: ${error}`);
        }
        finally {
            await masterPool.close();
        }
    }
    /**
     * List databases accessible to a user
     */
    static async getUserDatabases(username) {
        const masterPool = this.getMasterConnection();
        try {
            await masterPool.connect();
            const result = await masterPool.request()
                .input('username', mssql_1.default.VarChar, username)
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
        }
        catch (error) {
            console.error('Error getting user databases:', error);
            return [];
        }
        finally {
            await masterPool.close();
        }
    }
    /**
     * List databases that user can create or has created (with dbcreator role)
     * For security, only show databases that the user has rights to manage
     */
    static async listDatabases(username) {
        const masterPool = this.getMasterConnection();
        try {
            await masterPool.connect();
            let query = '';
            let request = masterPool.request();
            if (username) {
                // Show only databases that user has created or can manage
                // Since user has dbcreator role, they can create new databases
                // But for existing databases, show only ones they have access to
                query = `
          SELECT DISTINCT d.name as database_name
          FROM sys.databases d
          LEFT JOIN sys.database_principals dp ON dp.name = @username
          WHERE d.database_id > 4 AND d.state = 0
          AND (
            -- Show databases where user is owner/creator
            d.owner_sid = (SELECT sid FROM sys.server_principals WHERE name = @username)
            OR
            -- Show databases where user has explicit access
            EXISTS (
              SELECT 1 FROM sys.database_principals dp2 
              WHERE dp2.name = @username 
              AND dp2.type = 'S'
            )
          )
          ORDER BY d.name
        `;
                request = request.input('username', mssql_1.default.VarChar, username);
            }
            else {
                // For users without SQL Server credentials, show empty list for security
                // They need to create SQL Server user first to see any databases
                return [];
            }
            const result = await request.query(query);
            return result.recordset.map(r => r.database_name);
        }
        catch (error) {
            console.error('Error listing databases:', error);
            throw new Error(`Failed to list databases: ${error}`);
        }
        finally {
            await masterPool.close();
        }
    }
}
exports.SQLServerUserService = SQLServerUserService;
