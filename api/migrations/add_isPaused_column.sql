-- Add isPaused column to Users table
-- This migration should be run to support the new pause functionality

-- Add the isPaused column if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'isPaused')
BEGIN
    ALTER TABLE Users 
    ADD isPaused BIT NOT NULL DEFAULT 0;
    
    PRINT 'isPaused column added to Users table successfully';
END
ELSE
BEGIN
    PRINT 'isPaused column already exists in Users table';
END

-- Update any existing users to have isPaused = 0 by default (in case they were created before this migration)
UPDATE Users 
SET isPaused = 0 
WHERE isPaused IS NULL;

PRINT 'Database migration for isPaused column completed';
