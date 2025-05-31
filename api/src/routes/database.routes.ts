import { Router } from 'express';
import { DatabaseController } from '../controllers/database.controller';
import { authenticate } from '../middleware/auth';

export const databaseRouter = Router();
const dbController = new DatabaseController();

// Apply authentication to all database routes
databaseRouter.use(authenticate);

// Database endpoints
databaseRouter.get('/test', dbController.testConnection);
databaseRouter.get('/list', dbController.listDatabases);
databaseRouter.post('/', dbController.createDatabase); 
databaseRouter.get('/:database/tables', dbController.listTables);
databaseRouter.post('/:database/query', dbController.executeQuery);
databaseRouter.delete('/:databaseName', dbController.deleteDatabase); 
databaseRouter.post('/:databaseName/backup', dbController.backupDatabase); // Database backup route
databaseRouter.post('/:databaseName/restore', dbController.restoreDatabase); // Database restore route
databaseRouter.get('/:databaseName/backup-history', dbController.getBackupHistory); // Get backup history for specific database
databaseRouter.get('/backup-history', dbController.getBackupHistory); // Get backup history for all databases
