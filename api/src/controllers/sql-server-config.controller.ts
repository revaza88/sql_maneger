import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import sql from 'mssql';

// SQL Server კონფიგურაციის სქემა
const sqlServerConfigSchema = z.object({
  serverName: z.string().min(1),
  serverAddress: z.string().min(1),
  port: z.string().optional(),
  username: z.string().min(1),
  password: z.string().min(1),
  database: z.string().optional(),
  connectionTimeout: z.string().optional(),
  requestTimeout: z.string().optional(),
  trustServerCertificate: z.boolean().optional(),
  encrypt: z.boolean().optional(),
});

interface SqlServerConnection {
  id: string;
  serverName: string;
  serverAddress: string;
  port?: string;
  username: string;
  password: string; // Added password field
  database?: string;
  status: 'connected' | 'disconnected' | 'testing';
  lastConnected?: string;
  createdAt: string;
  updatedAt?: string;
}

// In-memory storage for connections (in production, use database)
let connections: SqlServerConnection[] = [
  {
    id: '1',
    serverName: 'Default Local Server',
    serverAddress: 'localhost',
    port: '1433',
    username: 'sa',
    password: 'Admin1', // Added password for testing
    database: 'master',
    status: 'disconnected', // Changed to disconnected since we don't have real password
    lastConnected: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

// ყველა კავშირის მიღება
export const getConnections = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    logger.info('Fetching SQL Server connections');
    
    res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    logger.error('Error fetching connections:', error);
    next(error);
  }
};

// ახალი კავშირის დამატება
export const addConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = sqlServerConfigSchema.parse(req.body);
    
    logger.info('Adding new SQL Server connection:', validatedData.serverName);
      const newConnection: SqlServerConnection = {
      id: Date.now().toString(),
      serverName: validatedData.serverName,
      serverAddress: validatedData.serverAddress,
      port: validatedData.port || '1433',
      username: validatedData.username,
      password: validatedData.password, // Added password
      database: validatedData.database || 'master',
      status: 'disconnected',
      createdAt: new Date().toISOString()
    };
    
    connections.push(newConnection);
    
    res.json({
      success: true,
      data: newConnection,
      message: 'SQL Server connection added successfully'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { message: error.errors.map(e => e.message).join(', ') }
      });
      return;
    }
    
    logger.error('Error adding connection:', error);
    next(error);
  }
};

// კონკრეტული კავშირის მიღება
export const getConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const connection = connections.find(conn => conn.id === id);
    if (!connection) {
      res.status(404).json({
        success: false,
        error: { message: 'Connection not found' }
      });
      return;
    }
    
    res.json({
      success: true,
      data: connection
    });
    
  } catch (error) {
    logger.error('Error fetching connection:', error);
    next(error);
  }
};

// კავშირის განახლება
export const updateConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const validatedData = sqlServerConfigSchema.parse(req.body);
    
    const connectionIndex = connections.findIndex(conn => conn.id === id);
    if (connectionIndex === -1) {
      res.status(404).json({
        success: false,
        error: { message: 'Connection not found' }
      });
      return;
    }
    
    logger.info('Updating SQL Server connection:', validatedData.serverName);
      connections[connectionIndex] = {
      ...connections[connectionIndex],
      serverName: validatedData.serverName,
      serverAddress: validatedData.serverAddress,
      port: validatedData.port || '1433',
      username: validatedData.username,
      password: validatedData.password, // Added password
      database: validatedData.database || 'master',
      status: 'disconnected', // Reset status after update
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: connections[connectionIndex],
      message: 'SQL Server connection updated successfully'
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { message: error.errors.map(e => e.message).join(', ') }
      });
      return;
    }
    
    logger.error('Error updating connection:', error);
    next(error);
  }
};

// კავშირის წაშლა
export const deleteConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const connectionIndex = connections.findIndex(conn => conn.id === id);
    if (connectionIndex === -1) {
      res.status(404).json({
        success: false,
        error: { message: 'Connection not found' }
      });
      return;
    }
    
    logger.info('Deleting SQL Server connection:', connections[connectionIndex].serverName);
    
    connections = connections.filter(conn => conn.id !== id);
    
    res.json({
      success: true,
      message: 'SQL Server connection deleted successfully'
    });
    
  } catch (error) {
    logger.error('Error deleting connection:', error);
    next(error);
  }
};

// კავშირის ტესტირება
export const testConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const connection = connections.find(conn => conn.id === id);
    if (!connection) {
      res.status(404).json({
        success: false,
        error: { message: 'Connection not found' }
      });
      return;
    }
      logger.info('Testing SQL Server connection:', connection.serverName);
      // SQL Server კავშირის ტესტირება
    const config: sql.config = {
      user: connection.username,
      password: connection.password, // Use stored password
      server: connection.serverAddress,
      port: parseInt(connection.port || '1433'),
      database: connection.database || 'master',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 10000,
        requestTimeout: 10000
      }
    };
    
    try {
      const pool = await sql.connect(config);
      await pool.request().query('SELECT 1 as test');
      await pool.close();
      
      // კავშირის სტატუსის განახლება
      const connectionIndex = connections.findIndex(conn => conn.id === id);
      if (connectionIndex !== -1) {
        connections[connectionIndex] = {
          ...connections[connectionIndex],
          status: 'connected',
          lastConnected: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      res.json({
        success: true,
        message: 'Connection test successful',
        data: connections[connectionIndex]
      });
      
    } catch (dbError) {
      logger.error('Database connection test failed:', dbError);
      
      // კავშირის სტატუსის განახლება
      const connectionIndex = connections.findIndex(conn => conn.id === id);
      if (connectionIndex !== -1) {
        connections[connectionIndex] = {
          ...connections[connectionIndex],
          status: 'disconnected',
          updatedAt: new Date().toISOString()
        };
      }
      
      res.status(400).json({
        success: false,
        error: { message: 'Connection test failed: ' + (dbError as Error).message }
      });
    }
    
  } catch (error) {
    logger.error('Error testing connection:', error);
    next(error);
  }
};
