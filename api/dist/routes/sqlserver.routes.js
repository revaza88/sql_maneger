"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const sqlserver_controller_1 = require("../controllers/sqlserver.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Create SQL Server user for the authenticated user
router.post('/create-user', (req, res) => (0, sqlserver_controller_1.createSQLServerUser)(req, res));
// Get SQL Server credentials for the authenticated user
router.get('/credentials', (req, res) => (0, sqlserver_controller_1.getSQLServerCredentials)(req, res));
// Check if user has SQL Server credentials
router.get('/check', (req, res) => (0, sqlserver_controller_1.checkSQLServerUser)(req, res));
// Grant access to a specific database
router.post('/grant-access', (req, res) => (0, sqlserver_controller_1.grantDatabaseAccess)(req, res));
// Get list of available databases
router.get('/databases', (req, res) => (0, sqlserver_controller_1.getAvailableDatabases)(req, res));
exports.default = router;
