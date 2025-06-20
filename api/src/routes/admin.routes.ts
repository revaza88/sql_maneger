import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller'; // Corrected import path
import { authenticate } from '../middleware/auth';
import { authorizeAdmin } from '../middleware/authorizeAdmin';

export const adminRouter = Router();
const adminController = new AdminController();

// All admin routes should be authenticated and authorized
adminRouter.use(authenticate);
adminRouter.use((req, res, next) => authorizeAdmin(req, res, next)); 

// User management routes
adminRouter.get('/users', adminController.getUsers.bind(adminController));
adminRouter.post('/users', adminController.createUser.bind(adminController)); // Added createUser route
adminRouter.put('/users/:userId/role', adminController.updateUserRole);
adminRouter.delete('/users/:userId', adminController.deleteUser);
adminRouter.put('/users/:userId/block', adminController.blockUser);
adminRouter.put('/users/:userId/unblock', adminController.unblockUser);
adminRouter.put('/users/:userId/password', adminController.resetPassword);
adminRouter.get('/stats', adminController.getStats);

// new admin features
adminRouter.get('/login-history', adminController.getLoginHistory);
adminRouter.get('/audit-logs', adminController.getAuditLogs);

adminRouter.get('/notifications', adminController.listNotifications);
adminRouter.post('/notifications', adminController.createNotification);
adminRouter.put('/notifications/:id', adminController.updateNotification);
adminRouter.delete('/notifications/:id', adminController.deleteNotification);

adminRouter.get('/roles', adminController.listRoles);
adminRouter.post('/roles', adminController.createRole);

// Database management routes
adminRouter.get('/databases', adminController.getAllDatabases);
adminRouter.post('/databases', adminController.createDatabase);
adminRouter.delete('/databases/:databaseName', adminController.deleteDatabase);
adminRouter.post('/databases/:databaseName/backup', adminController.backupDatabase);

adminRouter.get('/system-stats', adminController.getSystemStats);

