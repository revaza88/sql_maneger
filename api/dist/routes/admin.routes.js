"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller"); // Corrected import path
const auth_1 = require("../middleware/auth");
const authorizeAdmin_1 = require("../middleware/authorizeAdmin");
exports.adminRouter = (0, express_1.Router)();
const adminController = new admin_controller_1.AdminController();
// All admin routes should be authenticated and authorized
exports.adminRouter.use(auth_1.authenticate);
exports.adminRouter.use((req, res, next) => (0, authorizeAdmin_1.authorizeAdmin)(req, res, next));
// Example admin route
exports.adminRouter.get('/users', adminController.getUsers.bind(adminController));
// Add other admin-specific routes here
exports.adminRouter.put('/users/:userId/role', adminController.updateUserRole);
exports.adminRouter.delete('/users/:userId', adminController.deleteUser);
