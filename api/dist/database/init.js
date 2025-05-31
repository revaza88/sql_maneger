"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
const connection_1 = require("./connection");
async function initializeDatabase() {
    try {
        // Create Users table if it doesn't exist
        await connection_1.pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[Users] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [email] NVARCHAR(255) NOT NULL UNIQUE,
          [password] NVARCHAR(255) NOT NULL,
          [name] NVARCHAR(255) NOT NULL,
          [role] NVARCHAR(50) NOT NULL DEFAULT 'user',
          [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
          [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
        );

        -- Create default admin user if needed
        IF NOT EXISTS (SELECT * FROM [dbo].[Users] WHERE [email] = 'admin@example.com')
        BEGIN
          INSERT INTO [dbo].[Users] ([email], [password], [name], [role])
          VALUES (
            'admin@example.com',
            -- Default password is 'admin123', should be changed immediately
            '$2b$10$rZR5cZe8lLc7htqkDW0pUOvhTiXq0UEQW1CdE4PtDq.BpXPX1sOxK',
            'Admin',
            'admin'
          );
        END
      END
    `);
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}
