import express from 'express';
import {
  getBackupConfigs,
  createBackupConfig,
  updateBackupConfig,
  deleteBackupConfig,
  getBackupFiles,
  createManualBackup,
  restoreFromBackup,
  deleteBackupFile,
  getDatabases,
  runConfigBackup,
  createBatchBackup,
  getBatchBackups,
  getBatchBackupDetails,
  restoreBatchBackup,
  restoreSingleFromBatch,
  deleteBatchBackup,
  getRestoreStatus
} from '../controllers/backup.controller';
import { authenticate } from '../middleware/auth';
import { authorizeAdmin } from '../middleware/authorizeAdmin';

const router = express.Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorizeAdmin);

// Backup configuration routes
router.get('/configs', getBackupConfigs);
router.post('/configs', createBackupConfig);
router.put('/configs/:id', updateBackupConfig);
router.delete('/configs/:id', deleteBackupConfig);
router.post('/configs/:id/run', runConfigBackup); // Run backup for specific config

// Individual backup file routes
router.get('/files', getBackupFiles);
router.post('/backup', createManualBackup);
router.post('/restore', restoreFromBackup);
router.delete('/files/:id', deleteBackupFile);

// Batch backup routes
router.post('/batch-backup', createBatchBackup);           // Create batch backup of all databases
router.get('/batch-backups', getBatchBackups);             // Get all batch backups
router.get('/batch-backups/:batchId', getBatchBackupDetails);  // Get batch backup details
router.post('/batch-restore/:batchId', restoreBatchBackup);    // Restore entire batch
router.post('/batch-restore/:batchId/:database', restoreSingleFromBatch); // Restore single database from batch
router.delete('/batch-backups/:batchId', deleteBatchBackup);   // Delete batch backup
router.get('/restore-status/:operationId', getRestoreStatus);  // Get restore operation status

// Database routes
router.get('/databases/:connectionId', getDatabases);

export default router;
