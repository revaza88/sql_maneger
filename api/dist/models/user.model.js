"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const connection_1 = require("../database/connection");
const mssql_1 = __importDefault(require("mssql"));
const bcrypt_1 = __importDefault(require("bcrypt"));
class UserModel {
    static async createUser(user) {
        const hashedPassword = await bcrypt_1.default.hash(user.password, 10);
        const result = await connection_1.pool.request()
            .input('email', mssql_1.default.VarChar, user.email)
            .input('password', mssql_1.default.VarChar, hashedPassword)
            .input('name', mssql_1.default.VarChar, user.name)
            .input('role', mssql_1.default.VarChar, user.role || 'user')
            .query(`
        INSERT INTO Users (email, password, name, role, createdAt, updatedAt)
        VALUES (@email, @password, @name, @role, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
        const id = result.recordset[0].id;
        return {
            id,
            email: user.email,
            password: hashedPassword,
            name: user.name,
            role: user.role || 'user',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async findByEmail(email) {
        const result = await connection_1.pool.request()
            .input('email', mssql_1.default.VarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');
        return result.recordset[0] || null;
    }
    static async findById(id) {
        const result = await connection_1.pool.request()
            .input('id', mssql_1.default.Int, id)
            .query('SELECT * FROM Users WHERE id = @id');
        return result.recordset[0] || null;
    }
    static async updateProfile(id, updates) {
        const setClause = [];
        const request = connection_1.pool.request().input('id', mssql_1.default.Int, id).input('updatedAt', mssql_1.default.DateTime, new Date());
        if (updates.name !== undefined) {
            setClause.push('name = @name');
            request.input('name', mssql_1.default.VarChar, updates.name);
        }
        if (updates.email !== undefined) {
            setClause.push('email = @email');
            request.input('email', mssql_1.default.VarChar, updates.email);
        }
        if (setClause.length === 0) {
            return this.findById(id);
        }
        setClause.push('updatedAt = @updatedAt');
        await request.query(`
      UPDATE Users 
      SET ${setClause.join(', ')}
      WHERE id = @id
    `);
        return this.findById(id);
    }
    static async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        const result = await connection_1.pool.request()
            .input('id', mssql_1.default.Int, id)
            .input('password', mssql_1.default.VarChar, hashedPassword)
            .input('updatedAt', mssql_1.default.DateTime, new Date())
            .query(`
        UPDATE Users 
        SET password = @password, updatedAt = @updatedAt
        WHERE id = @id
      `);
        return result.rowsAffected[0] > 0;
    }
    static async verifyPassword(id, password) {
        const user = await this.findById(id);
        if (!user)
            return false;
        return bcrypt_1.default.compare(password, user.password);
    }
    // Added findAll method to fetch all users (excluding password)
    static async findAll() {
        const result = await connection_1.pool.request().query('SELECT id, email, name, role, sqlServerUsername, createdAt, updatedAt FROM Users');
        return result.recordset;
    }
    // Added updateRole method (example)
    static async updateRole(id, role) {
        const result = await connection_1.pool.request()
            .input('id', mssql_1.default.Int, id)
            .input('role', mssql_1.default.VarChar, role) // role should be 'ADMIN' or 'USER'
            .input('updatedAt', mssql_1.default.DateTime, new Date())
            .query('UPDATE Users SET role = @role, updatedAt = @updatedAt WHERE id = @id');
        return result.rowsAffected[0] > 0;
    }
    // Added delete method (example)
    static async delete(id) {
        const result = await connection_1.pool.request()
            .input('id', mssql_1.default.Int, id)
            .query('DELETE FROM Users WHERE id = @id');
        return result.rowsAffected[0] > 0;
    }
    // SQL Server credentials management methods
    static async updateSQLServerCredentials(id, username, password) {
        const result = await connection_1.pool.request()
            .input('id', mssql_1.default.Int, id)
            .input('sqlServerUsername', mssql_1.default.VarChar, username)
            .input('sqlServerPassword', mssql_1.default.VarChar, password)
            .input('updatedAt', mssql_1.default.DateTime, new Date())
            .query(`
        UPDATE Users 
        SET sqlServerUsername = @sqlServerUsername, 
            sqlServerPassword = @sqlServerPassword, 
            updatedAt = @updatedAt
        WHERE id = @id
      `);
        return result.rowsAffected[0] > 0;
    }
    static async getSQLServerCredentials(id) {
        const result = await connection_1.pool.request()
            .input('id', mssql_1.default.Int, id)
            .query('SELECT sqlServerUsername, sqlServerPassword FROM Users WHERE id = @id');
        const user = result.recordset[0];
        if (!user || !user.sqlServerUsername || !user.sqlServerPassword) {
            return null;
        }
        return {
            username: user.sqlServerUsername,
            password: user.sqlServerPassword
        };
    }
    static async hasSQLServerCredentials(id) {
        const result = await connection_1.pool.request()
            .input('id', mssql_1.default.Int, id)
            .query('SELECT sqlServerUsername FROM Users WHERE id = @id');
        const user = result.recordset[0];
        return !!(user && user.sqlServerUsername);
    }
}
exports.UserModel = UserModel;
