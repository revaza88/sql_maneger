"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseController = void 0;
const mssql_1 = __importDefault(require("mssql"));
const connection_1 = require("../database/connection");
const zod_1 = require("zod");
const createDatabaseSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).regex(/^[a-zA-Z0-9_]+$/),
    collation: zod_1.z.string().optional()
});
class DatabaseController {
    static async listDatabases(req, res, next) {
        try {
            const result = await connection_1.pool.request()
                .query(`
          SELECT 
            name,
            create_date,
            state_desc,
            size * 8.0 / 1024 as size_mb
          FROM sys.databases
          WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
          ORDER BY name;
        `);
            res.json(result.recordset);
        }
        catch (error) {
            next(error);
        }
    }
    static async createDatabase(req, res, next) {
        try {
            const validatedData = createDatabaseSchema.parse(req.body);
            // Check if database exists
            const existingDb = await connection_1.pool.request()
                .input('name', mssql_1.default.VarChar, validatedData.name)
                .query(`
          SELECT name FROM sys.databases WHERE name = @name
        `);
            if (existingDb.recordset.length > 0) {
                return res.status(400).json({ message: 'Database already exists' });
            }
            // Create database
            await connection_1.pool.request()
                .input('name', mssql_1.default.VarChar, validatedData.name)
                .input('collation', mssql_1.default.VarChar, validatedData.collation || 'SQL_Latin1_General_CP1_CI_AS')
                .query(`
          CREATE DATABASE [@name]
          COLLATE @collation;
        `);
            res.status(201).json({ message: 'Database created successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteDatabase(req, res, next) {
        try {
            const { name } = req.params;
            // Check if database exists
            const existingDb = await connection_1.pool.request()
                .input('name', mssql_1.default.VarChar, name)
                .query(`
          SELECT name FROM sys.databases WHERE name = @name
        `);
            if (existingDb.recordset.length === 0) {
                return res.status(404).json({ message: 'Database not found' });
            }
            // Delete database
            await connection_1.pool.request()
                .input('name', mssql_1.default.VarChar, name)
                .query(`
          ALTER DATABASE [@name] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
          DROP DATABASE [@name];
        `);
            res.json({ message: 'Database deleted successfully' });
        }
        catch (error) {
            next(error);
        }
    }
    static async getDatabaseInfo(req, res, next) {
        try {
            const { name } = req.params;
            const result = await connection_1.pool.request()
                .input('name', mssql_1.default.VarChar, name)
                .query(`
          SELECT 
            d.name,
            d.create_date,
            d.state_desc,
            d.collation_name,
            SUM(f.size * 8.0 / 1024) as size_mb,
            (
              SELECT COUNT(*) 
              FROM sys.tables t
              JOIN sys.schemas s ON t.schema_id = s.schema_id
              WHERE t.is_ms_shipped = 0
            ) as table_count
          FROM sys.databases d
          JOIN sys.master_files f ON d.database_id = f.database_id
          WHERE d.name = @name
          GROUP BY d.name, d.create_date, d.state_desc, d.collation_name;
        `);
            if (result.recordset.length === 0) {
                return res.status(404).json({ message: 'Database not found' });
            }
            res.json(result.recordset[0]);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DatabaseController = DatabaseController;
