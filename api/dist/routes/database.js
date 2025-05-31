"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseRouter = void 0;
const express_1 = require("express");
const database_controller_1 = require("../controllers/database.controller");
const auth_1 = require("../middleware/auth");
exports.databaseRouter = (0, express_1.Router)();
// Apply authentication to all database routes
exports.databaseRouter.use(auth_1.authenticate);
// Routes
exports.databaseRouter.get('/', database_controller_1.DatabaseController.listDatabases);
exports.databaseRouter.get('/:name', database_controller_1.DatabaseController.getDatabaseInfo);
// Admin only routes
exports.databaseRouter.post('/', (0, auth_1.authorize)('admin'), database_controller_1.DatabaseController.createDatabase);
exports.databaseRouter.delete('/:name', (0, auth_1.authorize)('admin'), database_controller_1.DatabaseController.deleteDatabase);
