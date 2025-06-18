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
router.post('/create-user', async (req, res, next) => {
  try {
    await createSQLServerUser(req, res);
  } catch (error) {
    next(error);
  }
});

// Get SQL Server credentials for the authenticated user
router.get('/credentials', async (req, res, next) => {
  try {
    await getSQLServerCredentials(req, res);
  } catch (error) {
    next(error);
  }
});

// Check if user has SQL Server credentials
router.get('/check', async (req, res, next) => {
  try {
    await checkSQLServerUser(req, res);
  } catch (error) {
    next(error);
  }
});

// Grant access to a specific database
router.post('/grant-access', async (req, res, next) => {
  try {
    await grantDatabaseAccess(req, res);
  } catch (error) {
    next(error);
  }
});

// Get list of available databases
router.get('/databases', async (req, res, next) => {
  try {
    await getAvailableDatabases(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
