-- Add isBlocked column to Users table
ALTER TABLE Users
ADD isBlocked BIT NOT NULL DEFAULT 0;

PRINT 'Successfully added isBlocked column';
