import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createSQLServerUser,
  getSQLServerCredentials,
  checkSQLServerUser,
  grantDatabaseAccess,
  getAvailableDatabases
} from '../controllers/sqlserver.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create SQL Server user for the authenticated user
router.post('/create-user', (req, res) => createSQLServerUser(req, res));

// Get SQL Server credentials for the authenticated user
router.get('/credentials', (req, res) => getSQLServerCredentials(req, res));

// Check if user has SQL Server credentials
router.get('/check', (req, res) => checkSQLServerUser(req, res));

// Grant access to a specific database
router.post('/grant-access', (req, res) => grantDatabaseAccess(req, res));

// Get list of available databases
router.get('/databases', (req, res) => getAvailableDatabases(req, res));

export default router;
