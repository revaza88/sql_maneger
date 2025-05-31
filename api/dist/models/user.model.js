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
}
exports.UserModel = UserModel;
