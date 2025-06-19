import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizeAdmin } from '../middleware/authorizeAdmin';
import {
  getOverviewStats,
  getBackupStats,
  getDatabaseHealth,
  getRecentActivity,
  getAlerts
} from '../controllers/dashboard.controller';

const router = Router();

// Apply authentication and admin authorization to all dashboard routes
router.use(authenticate);
router.use(authorizeAdmin);

// Dashboard statistics routes
router.get('/overview', getOverviewStats);
router.get('/backup-stats', getBackupStats);
router.get('/database-health', getDatabaseHealth);
router.get('/recent-activity', getRecentActivity);
router.get('/alerts', getAlerts);

export default router;
