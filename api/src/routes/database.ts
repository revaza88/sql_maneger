import { Router } from 'express';
import { DatabaseController } from '../controllers/database.controller';
import { authenticate } from '../middleware/auth';

export const databaseRouter = Router();
const dbController = new DatabaseController();

// Apply authentication to all database routes
databaseRouter.use(authenticate);

// Database connection test
databaseRouter.get('/test', dbController.testConnection);

// Database operations
databaseRouter.get('/list', dbController.listDatabases);
databaseRouter.get('/:database/tables', dbController.listTables);
databaseRouter.post('/:database/query', dbController.executeQuery);
