import { pool } from '../database/connection';
import sql from 'mssql';

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export class RoleModel {
  static async create(name: string, description?: string): Promise<Role> {
    const result = await pool.request()
      .input('name', sql.VarChar, name)
      .input('description', sql.VarChar, description || '')
      .query(`
        INSERT INTO Roles (name, description)
        VALUES (@name, @description);
        SELECT SCOPE_IDENTITY() as id;
      `);
    return { id: result.recordset[0].id, name, description };
  }

  static async list(): Promise<Role[]> {
    const result = await pool.request().query('SELECT id, name, description FROM Roles ORDER BY id');
    return result.recordset;
  }
}
