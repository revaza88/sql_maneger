-- Remove dbcreator role from all users except sa
-- This script removes the dbcreator role from all non-system users to implement security changes

USE master;
GO

-- Get all users with dbcreator role (excluding sa)
DECLARE @username NVARCHAR(128)
DECLARE user_cursor CURSOR FOR
SELECT sp.name
FROM sys.server_role_members srm
JOIN sys.server_principals sp ON srm.member_principal_id = sp.principal_id
JOIN sys.server_principals sr ON srm.role_principal_id = sr.principal_id
WHERE sr.name = 'dbcreator' 
  AND sp.name != 'sa'
  AND sp.type = 'S'  -- SQL logins only

OPEN user_cursor
FETCH NEXT FROM user_cursor INTO @username

WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @sql NVARCHAR(MAX)
    SET @sql = 'ALTER SERVER ROLE dbcreator DROP MEMBER [' + @username + ']'
    
    PRINT 'Removing dbcreator role from user: ' + @username
    EXEC sp_executesql @sql
    
    FETCH NEXT FROM user_cursor INTO @username
END

CLOSE user_cursor
DEALLOCATE user_cursor

PRINT 'Completed removing dbcreator roles from all users (except sa)'