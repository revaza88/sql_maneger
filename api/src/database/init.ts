import { DatabaseService } from './DatabaseService';

export async function initializeDatabase() {
  try {
    const db = DatabaseService.getInstance();
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[Users] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [email] NVARCHAR(255) NOT NULL UNIQUE,
          [password] NVARCHAR(255) NOT NULL,
          [name] NVARCHAR(255) NOT NULL,
          [role] NVARCHAR(50) NOT NULL DEFAULT 'user',
          [isBlocked] BIT NOT NULL DEFAULT 0,
          [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
          [updatedAt] DATETIME NOT NULL DEFAULT GETDATE()
        );

        -- Create default admin user if needed
        IF NOT EXISTS (SELECT * FROM [dbo].[Users] WHERE [email] = 'admin@example.com')
        BEGIN
          INSERT INTO [dbo].[Users] ([email], [password], [name], [role], [isBlocked])
          VALUES ('admin@example.com', '$2b$10$XkpOQj7XqU9s9ZQ5q5Z5Y.9Z5q5Y.9Z5q5Y.9Z5q5Y.', 'Admin', 'admin', 0)
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

    // LoginHistory table
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LoginHistory]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[LoginHistory] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [userId] INT NOT NULL,
          [ipAddress] NVARCHAR(255),
          [userAgent] NVARCHAR(512),
          [loginTime] DATETIME NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
        );
      END
    `);

    // AuditLogs table
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLogs]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[AuditLogs] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [userId] INT NULL,
          [action] NVARCHAR(255) NOT NULL,
          [details] NVARCHAR(MAX) NULL,
          [createdAt] DATETIME NOT NULL DEFAULT GETDATE(),
          FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE SET NULL
        );
      END
    `);

    // Notifications table
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[Notifications] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [message] NVARCHAR(1024) NOT NULL,
          [type] NVARCHAR(50) NOT NULL DEFAULT 'info',
          [isActive] BIT NOT NULL DEFAULT 1,
          [createdAt] DATETIME NOT NULL DEFAULT GETDATE()
        );
      END
    `);

    // Roles table
    await db.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Roles]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[Roles] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [name] NVARCHAR(50) NOT NULL UNIQUE,
          [description] NVARCHAR(255)
        );
        IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'ADMIN')
        BEGIN
          INSERT INTO Roles (name, description) VALUES ('ADMIN','System administrator');
        END
        IF NOT EXISTS (SELECT * FROM Roles WHERE name = 'USER')
        BEGIN
          INSERT INTO Roles (name, description) VALUES ('USER','Regular user');
        END
      END
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
