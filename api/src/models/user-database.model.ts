import { pool } from '../database/connection';
import sql from 'mssql';

export interface UserDatabase {
  id: number;
  userId: number;
  databaseName: string;
  quotaMB: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserDatabaseModel {
  /**
   * Associate a database with a user
   */
  static async createUserDatabase(userId: number, databaseName: string, quotaMB: number = 100): Promise<UserDatabase> {
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('databaseName', sql.VarChar, databaseName)
      .input('quotaMB', sql.Int, quotaMB)
      .query(`
        INSERT INTO UserDatabases (userId, databaseName, quotaMB, createdAt, updatedAt)
        VALUES (@userId, @databaseName, @quotaMB, GETDATE(), GETDATE());
        SELECT SCOPE_IDENTITY() as id;
      `);
    
    const id = result.recordset[0].id;
    return {
      id,
      userId,
      databaseName,
      quotaMB,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get all databases owned by a user
   */
  static async getUserDatabases(userId: number): Promise<{ databaseName: string; quotaMB: number }[]> {
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT databaseName, quotaMB
        FROM UserDatabases
        WHERE userId = @userId
        ORDER BY databaseName
      `);

    return result.recordset.map(row => ({ databaseName: row.databaseName, quotaMB: row.quotaMB }));
  }

  /**
   * Check if a user owns a specific database
   */
  static async userOwnsDatabase(userId: number, databaseName: string): Promise<boolean> {
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('databaseName', sql.VarChar, databaseName)
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
  static async removeUserDatabase(userId: number, databaseName: string): Promise<boolean> {
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('databaseName', sql.VarChar, databaseName)
      .query(`
        DELETE FROM UserDatabases 
        WHERE userId = @userId AND databaseName = @databaseName
      `);
    
    return result.rowsAffected[0] > 0;
  }

  /**
   * Update quota for a user's database
   */
  static async updateQuota(userId: number, databaseName: string, quotaMB: number): Promise<boolean> {
    const result = await pool.request()
      .input('userId', sql.Int, userId)
      .input('databaseName', sql.VarChar, databaseName)
      .input('quotaMB', sql.Int, quotaMB)
      .query(`
        UPDATE UserDatabases
        SET quotaMB = @quotaMB, updatedAt = GETDATE()
        WHERE userId = @userId AND databaseName = @databaseName
      `);

    return result.rowsAffected[0] > 0;
  }

  /**
   * Get the owner of a database
   */
  static async getDatabaseOwner(databaseName: string): Promise<number | null> {
    const result = await pool.request()
      .input('databaseName', sql.VarChar, databaseName)
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
  static async getAllDatabasesWithOwners(): Promise<Array<{databaseName: string, userId: number, userEmail: string, quotaMB: number}>> {
    const result = await pool.request()
      .query(`
        SELECT
          ud.databaseName,
          ud.quotaMB,
          ud.userId,
          u.email as userEmail
        FROM UserDatabases ud
        INNER JOIN Users u ON ud.userId = u.id
        ORDER BY ud.databaseName
      `);

    return result.recordset;
  }
}
