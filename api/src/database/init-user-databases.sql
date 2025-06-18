-- Create table to track database ownership
CREATE TABLE IF NOT EXISTS UserDatabases (
    id INT IDENTITY(1,1) PRIMARY KEY,
    userId INT NOT NULL,
    databaseName NVARCHAR(255) NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE(userId, databaseName)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS IX_UserDatabases_UserId ON UserDatabases(userId);
CREATE INDEX IF NOT EXISTS IX_UserDatabases_DatabaseName ON UserDatabases(databaseName);
