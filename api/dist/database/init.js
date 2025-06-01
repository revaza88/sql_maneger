"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
const DatabaseService_1 = require("./DatabaseService");
async function initializeDatabase() {
    try {
        const db = DatabaseService_1.DatabaseService.getInstance();
        await db.query(`
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
          VALUES ('admin@example.com', '$2b$10$XkpOQj7XqU9s9ZQ5q5Z5Y.9Z5q5Y.9Z5q5Y.9Z5q5Y.', 'Admin', 'admin')
        END
      END
    `);
        // Create UserDatabases table for tracking database ownership
        await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserDatabases]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[UserDatabases] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [userId] INT NOT NULL,
          [databaseName] NVARCHAR(255) NOT NULL,
          [createdAt] DATETIME2 DEFAULT GETDATE(),
          [updatedAt] DATETIME2 DEFAULT GETDATE(),
          FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
          UNIQUE(userId, databaseName)
        );

        -- Create indexes for faster lookups
        CREATE INDEX IX_UserDatabases_UserId ON UserDatabases(userId);
        CREATE INDEX IX_UserDatabases_DatabaseName ON UserDatabases(databaseName);
      END
    `);
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}
