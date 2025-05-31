import { pool } from '../database/connection';
import { User, UserCreate } from '../types/user';
import sql from 'mssql';
import bcrypt from 'bcrypt';

export class UserModel {
  static async createUser(user: UserCreate): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    const result = await pool.request()
      .input('email', sql.VarChar, user.email)
      .input('password', sql.VarChar, hashedPassword)
      .input('name', sql.VarChar, user.name)
      .input('role', sql.VarChar, user.role || 'user')
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

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT * FROM Users WHERE email = @email');
    
    return result.recordset[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT * FROM Users WHERE id = @id');
    
    return result.recordset[0] || null;
  }
}
