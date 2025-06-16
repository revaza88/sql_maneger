import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller'; // Corrected import path
import { authenticate } from '../middleware/auth';
import { authorizeAdmin } from '../middleware/authorizeAdmin';

export const adminRouter = Router();
const adminController = new AdminController();

// All admin routes should be authenticated and authorized
adminRouter.use(authenticate);
adminRouter.use((req, res, next) => authorizeAdmin(req, res, next)); 

// Example admin route
adminRouter.get('/users', adminController.getUsers.bind(adminController));

// Add other admin-specific routes here
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

adminRouter.get('/system-stats', adminController.getSystemStats);

