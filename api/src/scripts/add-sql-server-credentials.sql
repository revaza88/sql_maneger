-- Add SQL Server user credentials to Users table
-- Run this script in your main database (not the SQL Server master database)

ALTER TABLE Users 
ADD sqlServerUsername NVARCHAR(50) NULL,
    sqlServerPassword NVARCHAR(255) NULL;

-- Create index for better performance
CREATE INDEX IX_Users_SqlServerUsername ON Users(sqlServerUsername);

PRINT 'Successfully added SQL Server user credentials columns to Users table';
