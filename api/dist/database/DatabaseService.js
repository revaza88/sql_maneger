"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const mssql_1 = __importDefault(require("mssql"));
const config_1 = require("../config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class DatabaseService {
    constructor() {
        this.pool = null;
        this.pool = new mssql_1.default.ConnectionPool({
            user: config_1.config.database.user,
            password: config_1.config.database.password,
            server: '127.0.0.1', // Using IP address that we know works
            port: 1433, // Explicit port
            database: config_1.config.database.database,
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
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    async ensureConnection() {
        try {
            if (!this.pool) {
                console.log('Creating new connection pool...');
                this.pool = new mssql_1.default.ConnectionPool({
                    user: config_1.config.database.user,
                    password: config_1.config.database.password,
                    server: config_1.config.database.server,
                    port: 1433,
                    database: config_1.config.database.database,
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
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
                    ]);
                    console.log('Successfully connected to database');
                    return;
                }
                catch (error) {
                    retries--;
                    if (retries === 0)
                        throw error;
                    console.log(`Connection failed, retrying... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        catch (error) {
            console.error('Failed to ensure database connection:', error);
            throw error;
        }
    }
    async query(query, params) {
        await this.ensureConnection();
        try {
            const request = this.pool.request();
            if (params) {
                params.forEach((param, index) => {
                    request.input(`param${index}`, param);
                });
            }
            console.log('Executing query:', query);
            const result = await request.query(query);
            console.log('Query executed successfully');
            return result.recordset;
        }
        catch (error) {
            console.error('Error executing query:', error);
            throw error;
        }
    }
    async testConnection() {
        try {
            await this.poolConnect;
            await this.query('SELECT 1');
            return true;
        }
        catch (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
    }
    async getDatabases() {
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
        }
        catch (error) {
            console.error('Error in getDatabases:', error);
            throw error;
        }
    }
    async getTables(database) {
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
    async executeQuery(database, query) {
        const useDbQuery = `USE [${database}]; ${query}`;
        return await this.query(useDbQuery);
    }
    // Helper function to sanitize database names
    sanitizeDbName(dbName) {
        return dbName.replace(/[^\w_]/g, '');
    }
    async createDatabase(dbName, collation) {
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
    async deleteDatabase(dbName) {
        const sanitizedDbName = this.sanitizeDbName(dbName);
        if (!sanitizedDbName) {
            throw new Error('Invalid database name.');
        }
        const query = `DROP DATABASE [${sanitizedDbName}]`;
        await this.query(query);
    }
    async close() {
        if (this.pool) {
            await this.pool.close();
        }
    }
    async backupDatabase(dbName, backupPath) {
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
        }
        catch (error) {
            console.error(`Error backing up database '${dbName}':`, error);
            throw error;
        }
    }
    /**
     * Check if a database exists
     * @param dbName Database name to check
     * @returns Boolean indicating if database exists
     */
    async checkIfDatabaseExists(dbName) {
        const query = `SELECT 1 FROM sys.databases WHERE name = '${dbName}'`;
        const result = await this.query(query);
        return result.length > 0;
    }
    async restoreDatabase(dbName, backupPath) {
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
            }
            catch (error) {
                console.error(`Error during restore operation:`, error);
                // If error occurs, try to set database back to multi-user
                try {
                    console.log('Attempting to set database back to MULTI_USER mode after error');
                    await this.query(setMultiUserQuery);
                }
                catch (cleanupError) {
                    console.error('Failed to reset database to MULTI_USER mode:', cleanupError);
                    // Ignore additional errors in cleanup
                }
                throw error;
            }
        }
        catch (error) {
            console.error(`Error restoring database '${dbName}':`, error);
            throw error;
        }
    }
    async getDefaultBackupPath() {
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
    async getBackupHistory(dbName) {
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
        }
        catch (error) {
            console.error('Error retrieving backup history:', error);
            throw error;
        }
    }
    /**
     * Create a backup file and return the file path for download
     */
    async createBackupForDownload(databaseName) {
        try {
            console.log(`Starting backup for download: ${databaseName}`);
            await this.ensureConnection();
            console.log('Database connection established for backup');
            // Create a temporary backup directory if it doesn't exist
            const backupDir = path.join(process.cwd(), 'temp_backups');
            console.log(`Backup directory: ${backupDir}`);
            if (!fs.existsSync(backupDir)) {
                console.log('Creating backup directory...');
                fs.mkdirSync(backupDir, { recursive: true });
            }
            // Generate unique filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `${databaseName}_${timestamp}.bak`);
            console.log(`Generated backup path: ${backupPath}`);
            // SQL Server requires Windows-style paths
            const sqlServerPath = backupPath.replace(/\//g, '\\');
            console.log(`SQL Server path: ${sqlServerPath}`);
            const query = `
        BACKUP DATABASE [${databaseName}] 
        TO DISK = '${sqlServerPath}'
        WITH 
          FORMAT,
          INIT,
          NAME = '${databaseName} Full Backup - ${new Date().toISOString()}'
      `;
            console.log(`Executing backup query: ${query}`);
            await this.query(query);
            console.log(`Backup completed successfully: ${backupPath}`);
            return backupPath;
        }
        catch (error) {
            console.error('Error creating backup for download:', error);
            throw error;
        }
    }
    /**
     * Restore database from uploaded backup file
     */
    async restoreFromUploadedFile(databaseName, uploadedFilePath) {
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
            console.log('Reading backup file header and file list...');
            const fileListResult = await this.query(fileListQuery);
            if (!fileListResult || fileListResult.length === 0) {
                throw new Error('Invalid backup file or unable to read file structure');
            }
            // Generate new file paths for the restored database
            const dataFiles = fileListResult.filter((file) => file.Type === 'D');
            const logFiles = fileListResult.filter((file) => file.Type === 'L');
            if (dataFiles.length === 0) {
                throw new Error('No data files found in backup');
            }
            // Build the MOVE clauses for each file
            let moveClause = '';
            dataFiles.forEach((file, index) => {
                const newDataPath = `C:\\Program Files\\Microsoft SQL Server\\MSSQL16.SQLEXPRESS\\MSSQL\\DATA\\${databaseName}${index > 0 ? `_${index}` : ''}.mdf`;
                moveClause += `MOVE '${file.LogicalName}' TO '${newDataPath}', `;
            });
            logFiles.forEach((file, index) => {
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
            console.log(`Restoring database from uploaded file: ${databaseName} <- ${sqlServerPath}`);
            await this.query(restoreQuery);
            console.log(`Database ${databaseName} restored successfully from uploaded file`);
        }
        catch (error) {
            console.error('Error restoring from uploaded file:', error);
            throw error;
        }
    }
    /**
     * Clean up temporary backup files
     */
    async cleanupTempBackup(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up temporary backup file: ${filePath}`);
            }
        }
        catch (error) {
            console.error('Error cleaning up temporary backup file:', error);
            // Don't throw - this is cleanup, not critical
        }
    }
    /**
     * Get list of uploaded backup files
     */
    async getUploadedBackups() {
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
        }
        catch (error) {
            console.error('Error getting uploaded backups:', error);
            return [];
        }
    }
}
exports.DatabaseService = DatabaseService;
