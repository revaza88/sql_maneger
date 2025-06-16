import { Router } from 'express';
import { DatabaseController } from '../controllers/database.controller';
import { authenticate } from '../middleware/auth';
import { uploadBackupFile } from '../middleware/upload';

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

// Backup and restore routes
databaseRouter.post('/:databaseName/backup', dbController.backupDatabase); // Database backup route
databaseRouter.post('/:databaseName/restore', dbController.restoreDatabase); // Database restore route
databaseRouter.get('/:databaseName/backup-history', dbController.getBackupHistory); // Get backup history for specific database
databaseRouter.get('/backup-history', dbController.getBackupHistory); // Get backup history for all databases

// File download/upload routes
databaseRouter.get('/:databaseName/download-backup', dbController.downloadBackup); // Download backup file
databaseRouter.post('/upload-backup', uploadBackupFile.single('backupFile'), dbController.uploadBackup); // Upload backup file
databaseRouter.post('/:databaseName/restore-from-upload', dbController.restoreFromUpload); // Restore from uploaded file
databaseRouter.get('/uploaded-backups', dbController.getUploadedBackups); // Get list of uploaded backup files
databaseRouter.put('/:databaseName/quota', dbController.updateDatabaseQuota);
