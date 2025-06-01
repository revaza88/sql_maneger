"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseRouter = void 0;
const express_1 = require("express");
const database_controller_1 = require("../controllers/database.controller");
const auth_1 = require("../middleware/auth");
exports.databaseRouter = (0, express_1.Router)();
const dbController = new database_controller_1.DatabaseController();
// Apply authentication to all database routes
exports.databaseRouter.use(auth_1.authenticate);
// Database connection test
exports.databaseRouter.get('/test', dbController.testConnection);
// Database operations
exports.databaseRouter.get('/list', dbController.listDatabases);
exports.databaseRouter.get('/:database/tables', dbController.listTables);
exports.databaseRouter.post('/:database/query', dbController.executeQuery);
