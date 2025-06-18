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
  runConfigBackup
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

// Backup file routes
router.get('/files', getBackupFiles);
router.post('/backup', createManualBackup);
router.post('/restore', restoreFromBackup);
router.delete('/files/:id', deleteBackupFile);

// Database routes
router.get('/databases/:connectionId', getDatabases);

export default router;
