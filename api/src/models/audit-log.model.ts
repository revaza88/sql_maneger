import { pool } from '../database/connection';
import sql from 'mssql';

export interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  details?: string;
  createdAt: Date;
}

export class AuditLogModel {
  static async logAction(userId: number | null, action: string, details?: string): Promise<void> {
    await pool.request()
      .input('userId', sql.Int, userId)
      .input('action', sql.VarChar, action)
      .input('details', sql.NVarChar, details || '')
      .query(`
        INSERT INTO AuditLogs (userId, action, details, createdAt)
        VALUES (@userId, @action, @details, GETDATE())
      `);
  }

  static async getLogs(limit = 100): Promise<AuditLog[]> {
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query('SELECT TOP (@limit) id, userId, action, details, createdAt FROM AuditLogs ORDER BY createdAt DESC');
    return result.recordset;
  }
}
