import { pool } from '../database/connection';
import sql from 'mssql';

export interface Notification {
  id: number;
  message: string;
  type: string;
  isActive: boolean;
  createdAt: Date;
}

export class NotificationModel {
  static async create(message: string, type = 'info', isActive = true): Promise<Notification> {
    const result = await pool.request()
      .input('message', sql.NVarChar, message)
      .input('type', sql.VarChar, type)
      .input('isActive', sql.Bit, isActive ? 1 : 0)
      .query(`
        INSERT INTO Notifications (message, type, isActive, createdAt)
        VALUES (@message, @type, @isActive, GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
    return {
      id: result.recordset[0].id,
      message,
      type,
      isActive,
      createdAt: new Date()
    };
  }

  static async update(id: number, message: string, type: string, isActive: boolean): Promise<boolean> {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('message', sql.NVarChar, message)
      .input('type', sql.VarChar, type)
      .input('isActive', sql.Bit, isActive ? 1 : 0)
      .query('UPDATE Notifications SET message=@message, type=@type, isActive=@isActive WHERE id=@id');
    return result.rowsAffected[0] > 0;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Notifications WHERE id=@id');
    return result.rowsAffected[0] > 0;
  }

  static async list(): Promise<Notification[]> {
    const result = await pool.request().query('SELECT id, message, type, isActive, createdAt FROM Notifications ORDER BY createdAt DESC');
    return result.recordset;
  }
}
