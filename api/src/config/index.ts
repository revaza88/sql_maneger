import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  corsOrigin: [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3004',
    'http://localhost:3007',
    'http://172.23.96.1:3000'
  ],
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '1d'
  },
  database: {
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || 'Admin1',
    server: '127.0.0.1',
    database: process.env.MSSQL_DATABASE || 'master',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
