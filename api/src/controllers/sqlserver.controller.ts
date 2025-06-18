import { Request, Response } from 'express';
import { UserModel } from '../models/user.model';
import { SQLServerUserService } from '../services/SQLServerUserService';

// Create SQL Server user account for the authenticated user
export const createSQLServerUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;

    // Check if user already has SQL Server credentials
    const hasCredentials = await UserModel.hasSQLServerCredentials(userId);
    if (hasCredentials) {
      return res.status(400).json({ 
        message: 'SQL Server user already exists for this account' 
      });
    }

    // Create SQL Server login
    const credentials = await SQLServerUserService.createSQLServerUser(userId, userEmail);

    // Store credentials in database
    await UserModel.updateSQLServerCredentials(userId, credentials.username, credentials.password);

    res.json({
      message: 'SQL Server user created successfully',
      username: credentials.username,
      password: credentials.password
    });
  } catch (error) {
    console.error('Error creating SQL Server user:', error);
    res.status(500).json({ 
      message: 'Failed to create SQL Server user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get SQL Server credentials for the authenticated user
export const getSQLServerCredentials = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const credentials = await UserModel.getSQLServerCredentials(userId);
    
    if (!credentials) {
      return res.status(404).json({ 
        message: 'No SQL Server credentials found. Please create a SQL Server user first.' 
      });
    }

    res.json({
      username: credentials.username,
      password: credentials.password,
      server: '127.0.0.1',
      port: 1433
    });
  } catch (error) {
    console.error('Error getting SQL Server credentials:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve SQL Server credentials',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Grant access to a specific database for the user's SQL Server account
export const grantDatabaseAccess = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { databaseName } = req.body;

    if (!databaseName) {
      return res.status(400).json({ message: 'Database name is required' });
    }

    // Get user's SQL Server credentials
    const credentials = await UserModel.getSQLServerCredentials(userId);
    if (!credentials) {
      return res.status(404).json({ 
        message: 'No SQL Server credentials found. Please create a SQL Server user first.' 
      });
    }

    // Grant database access
    await SQLServerUserService.grantDatabaseAccess(credentials.username, databaseName);

    res.json({
      message: `Successfully granted access to database: ${databaseName}`,
      database: databaseName,
      username: credentials.username
    });
  } catch (error) {
    console.error('Error granting database access:', error);
    res.status(500).json({ 
      message: 'Failed to grant database access',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Check if user has SQL Server credentials
export const checkSQLServerUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const hasCredentials = await UserModel.hasSQLServerCredentials(userId);

    res.json({
      hasSQLServerUser: hasCredentials
    });
  } catch (error) {
    console.error('Error checking SQL Server user:', error);
    res.status(500).json({ 
      message: 'Failed to check SQL Server user status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get list of databases available on the server (for access management)
export const getAvailableDatabases = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // Get user's SQL Server credentials to filter databases by username
    const credentials = await UserModel.getSQLServerCredentials(userId);
    
    let databases: string[];
    
    if (credentials) {
      // If user has SQL Server credentials, show only their accessible databases
      databases = await SQLServerUserService.listDatabases(credentials.username);
    } else {
      // If no SQL Server credentials, show limited set of general databases
      databases = await SQLServerUserService.listDatabases();
    }

    res.json({
      databases: databases,
      hasCredentials: !!credentials
    });
  } catch (error) {
    console.error('Error getting available databases:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve available databases',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
