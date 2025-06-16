import { pool } from '../database/connection';
import sql from 'mssql';

export interface LoginHistory {
  id: number;
  userId: number;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
}

export class LoginHistoryModel {
  static async recordLogin(userId: number, ipAddress: string, userAgent: string): Promise<void> {
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('ipAddress', sql.VarChar, ipAddress)
      .input('userAgent', sql.VarChar, userAgent)
      .query(`
        INSERT INTO LoginHistory (userId, ipAddress, userAgent, loginTime)
        VALUES (@userId, @ipAddress, @userAgent, GETDATE())
      `);
  }

  static async getHistory(limit = 100): Promise<LoginHistory[]> {
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query('SELECT TOP (@limit) id, userId, ipAddress, userAgent, loginTime FROM LoginHistory ORDER BY loginTime DESC');
    return result.recordset;
  }
}
