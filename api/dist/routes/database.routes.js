"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseRouter = void 0;
const express_1 = require("express");
const database_controller_1 = require("../controllers/database.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
exports.databaseRouter = (0, express_1.Router)();
const dbController = new database_controller_1.DatabaseController();
// Apply authentication to all database routes
exports.databaseRouter.use(auth_1.authenticate);
// Database endpoints
exports.databaseRouter.get('/test', dbController.testConnection);
exports.databaseRouter.get('/list', dbController.listDatabases);
exports.databaseRouter.post('/', dbController.createDatabase);
exports.databaseRouter.get('/:database/tables', dbController.listTables);
exports.databaseRouter.post('/:database/query', dbController.executeQuery);
exports.databaseRouter.delete('/:databaseName', dbController.deleteDatabase);
// Backup and restore routes
exports.databaseRouter.post('/:databaseName/backup', dbController.backupDatabase); // Database backup route
exports.databaseRouter.post('/:databaseName/restore', dbController.restoreDatabase); // Database restore route
exports.databaseRouter.get('/:databaseName/backup-history', dbController.getBackupHistory); // Get backup history for specific database
exports.databaseRouter.get('/backup-history', dbController.getBackupHistory); // Get backup history for all databases
// File download/upload routes
exports.databaseRouter.get('/:databaseName/download-backup', dbController.downloadBackup); // Download backup file
exports.databaseRouter.post('/upload-backup', upload_1.uploadBackupFile.single('backupFile'), dbController.uploadBackup); // Upload backup file
exports.databaseRouter.post('/:databaseName/restore-from-upload', dbController.restoreFromUpload); // Restore from uploaded file
exports.databaseRouter.get('/uploaded-backups', dbController.getUploadedBackups); // Get list of uploaded backup files
