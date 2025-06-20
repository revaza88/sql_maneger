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
      .input('isBlocked', sql.Bit, user.isBlocked ? 1 : 0)
      .input('isPaused', sql.Bit, user.isPaused ? 1 : 0)
      .query(`
        INSERT INTO Users (email, password, name, role, isBlocked, isPaused, createdAt, updatedAt)
        VALUES (@email, @password, @name, @role, @isBlocked, @isPaused, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
    
    const id = result.recordset[0].id;
    return {
      id,
      email: user.email,
      password: hashedPassword,
      name: user.name,
      role: user.role || 'user',
      isBlocked: user.isBlocked || false,
      isPaused: user.isPaused || false,
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

  static async updateProfile(id: number, updates: { name?: string; email?: string }): Promise<User | null> {
    const setClause = [];
    const request = pool.request().input('id', sql.Int, id).input('updatedAt', sql.DateTime, new Date());

    if (updates.name !== undefined) {
      setClause.push('name = @name');
      request.input('name', sql.VarChar, updates.name);
    }

    if (updates.email !== undefined) {
      setClause.push('email = @email');
      request.input('email', sql.VarChar, updates.email);
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

  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('password', sql.VarChar, hashedPassword)
      .input('updatedAt', sql.DateTime, new Date())
      .query(`
        UPDATE Users 
        SET password = @password, updatedAt = @updatedAt
        WHERE id = @id
      `);

    return result.rowsAffected[0] > 0;
  }

  static async verifyPassword(id: number, password: string): Promise<boolean> {
    const user = await this.findById(id);
    if (!user) return false;
    
    return bcrypt.compare(password, user.password);
  }

  // Added findAll method to fetch all users (excluding password)
  static async findAll(limit?: number, offset?: number, search?: string): Promise<Omit<User, 'password'>[]> {
    let query = 'SELECT id, email, name, role, sqlServerUsername, isBlocked, isPaused, createdAt, updatedAt FROM Users';
    const request = pool.request();
    if (search) {
      query += ' WHERE email LIKE @search OR name LIKE @search';
      request.input('search', sql.VarChar, `%${search}%`);
    }
    query += ' ORDER BY id';
    if (limit !== undefined && offset !== undefined) {
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
      request.input('offset', sql.Int, offset).input('limit', sql.Int, limit);
    }
    const result = await request.query(query);
    return result.recordset;
  }

  static async countAll(search?: string): Promise<number> {
    let query = 'SELECT COUNT(*) as total FROM Users';
    const request = pool.request();
    if (search) {
      query += ' WHERE email LIKE @search OR name LIKE @search';
      request.input('search', sql.VarChar, `%${search}%`);
    }
    const result = await request.query(query);
    return result.recordset[0].total;
  }

  // Added updateRole method (example)
  static async updateRole(id: number, role: 'ADMIN' | 'USER'): Promise<boolean> { // Ensure role is 'ADMIN' or 'USER'
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('role', sql.VarChar, role) // role should be 'ADMIN' or 'USER'
      .input('updatedAt', sql.DateTime, new Date())
      .query('UPDATE Users SET role = @role, updatedAt = @updatedAt WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  // Added delete method (example)
  static async delete(id: number): Promise<boolean> {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Users WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  static async setBlocked(id: number, blocked: boolean): Promise<boolean> {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('isBlocked', sql.Bit, blocked ? 1 : 0)
      .input('updatedAt', sql.DateTime, new Date())
      .query('UPDATE Users SET isBlocked = @isBlocked, updatedAt = @updatedAt WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  static async countBlocked(): Promise<number> {
    const result = await pool.request()
      .query('SELECT COUNT(*) as total FROM Users WHERE isBlocked = 1');
    return result.recordset[0].total;
  }

  static async setPaused(id: number, paused: boolean): Promise<boolean> {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('isPaused', sql.Bit, paused ? 1 : 0)
      .input('updatedAt', sql.DateTime, new Date())
      .query('UPDATE Users SET isPaused = @isPaused, updatedAt = @updatedAt WHERE id = @id');
    return result.rowsAffected[0] > 0;
  }

  static async countPaused(): Promise<number> {
    const result = await pool.request()
      .query('SELECT COUNT(*) as total FROM Users WHERE isPaused = 1');
    return result.recordset[0].total;
  }

  // SQL Server credentials management methods
  static async updateSQLServerCredentials(id: number, username: string, password: string): Promise<boolean> {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('sqlServerUsername', sql.VarChar, username)
      .input('sqlServerPassword', sql.VarChar, password)
      .input('updatedAt', sql.DateTime, new Date())
      .query(`
        UPDATE Users 
        SET sqlServerUsername = @sqlServerUsername, 
            sqlServerPassword = @sqlServerPassword, 
            updatedAt = @updatedAt
        WHERE id = @id
      `);
    return result.rowsAffected[0] > 0;
  }

  static async getSQLServerCredentials(id: number): Promise<{ username: string; password: string } | null> {
    const result = await pool.request()
      .input('id', sql.Int, id)
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

  static async hasSQLServerCredentials(id: number): Promise<boolean> {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT sqlServerUsername FROM Users WHERE id = @id');
    
    const user = result.recordset[0];
    return !!(user && user.sqlServerUsername);
  }
}
