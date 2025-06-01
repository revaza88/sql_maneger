"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDatabaseModel = void 0;
const connection_1 = require("../database/connection");
const mssql_1 = __importDefault(require("mssql"));
class UserDatabaseModel {
    /**
     * Associate a database with a user
     */
    static async createUserDatabase(userId, databaseName) {
        const result = await connection_1.pool.request()
            .input('userId', mssql_1.default.Int, userId)
            .input('databaseName', mssql_1.default.VarChar, databaseName)
            .query(`
        INSERT INTO UserDatabases (userId, databaseName, createdAt, updatedAt)
        VALUES (@userId, @databaseName, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
        const id = result.recordset[0].id;
        return {
            id,
            userId,
            databaseName,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    /**
     * Get all databases owned by a user
     */
    static async getUserDatabases(userId) {
        const result = await connection_1.pool.request()
            .input('userId', mssql_1.default.Int, userId)
            .query(`
        SELECT databaseName 
        FROM UserDatabases 
        WHERE userId = @userId
        ORDER BY databaseName
      `);
        return result.recordset.map(row => row.databaseName);
    }
    /**
     * Check if a user owns a specific database
     */
    static async userOwnsDatabase(userId, databaseName) {
        const result = await connection_1.pool.request()
            .input('userId', mssql_1.default.Int, userId)
            .input('databaseName', mssql_1.default.VarChar, databaseName)
            .query(`
        SELECT COUNT(*) as count 
        FROM UserDatabases 
        WHERE userId = @userId AND databaseName = @databaseName
      `);
        return result.recordset[0].count > 0;
    }
    /**
     * Remove database ownership when database is deleted
     */
    static async removeUserDatabase(userId, databaseName) {
        const result = await connection_1.pool.request()
            .input('userId', mssql_1.default.Int, userId)
            .input('databaseName', mssql_1.default.VarChar, databaseName)
            .query(`
        DELETE FROM UserDatabases 
        WHERE userId = @userId AND databaseName = @databaseName
      `);
        return result.rowsAffected[0] > 0;
    }
    /**
     * Get the owner of a database
     */
    static async getDatabaseOwner(databaseName) {
        const result = await connection_1.pool.request()
            .input('databaseName', mssql_1.default.VarChar, databaseName)
            .query(`
        SELECT userId 
        FROM UserDatabases 
        WHERE databaseName = @databaseName
      `);
        return result.recordset[0]?.userId || null;
    }
    /**
     * Get all databases with their owners (admin only)
     */
    static async getAllDatabasesWithOwners() {
        const result = await connection_1.pool.request()
            .query(`
        SELECT 
          ud.databaseName,
          ud.userId,
          u.email as userEmail
        FROM UserDatabases ud
        INNER JOIN Users u ON ud.userId = u.id
        ORDER BY ud.databaseName
      `);
        return result.recordset;
    }
}
exports.UserDatabaseModel = UserDatabaseModel;
