import sql from 'mssql';
import { config } from '../config';

const poolConfig: sql.config = {
  user: process.env.MSSQL_USER || 'sa',
  password: process.env.MSSQL_PASSWORD || 'Admin1',
  server: '127.0.0.1',  // Using IP address instead of hostname
  port: 1433,  // Explicitly set the port
  database: process.env.MSSQL_DATABASE || 'master',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

export const pool = new sql.ConnectionPool(poolConfig);

// Connect to database
pool.connect().then(() => {
  console.log('Connected to MSSQL database');
}).catch(err => {
  console.error('Database connection failed:', err);
});

// Handle pool errors
pool.on('error', err => {
  console.error('Database pool error:', err);
});
