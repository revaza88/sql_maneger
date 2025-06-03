"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const sqlserver_controller_1 = require("../controllers/sqlserver.controller");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
// Create SQL Server user for the authenticated user
router.post('/create-user', async (req, res, next) => {
    try {
        await (0, sqlserver_controller_1.createSQLServerUser)(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Get SQL Server credentials for the authenticated user
router.get('/credentials', async (req, res, next) => {
    try {
        await (0, sqlserver_controller_1.getSQLServerCredentials)(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Check if user has SQL Server credentials
router.get('/check', async (req, res, next) => {
    try {
        await (0, sqlserver_controller_1.checkSQLServerUser)(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Grant access to a specific database
router.post('/grant-access', async (req, res, next) => {
    try {
        await (0, sqlserver_controller_1.grantDatabaseAccess)(req, res);
    }
    catch (error) {
        next(error);
    }
});
// Get list of available databases
router.get('/databases', async (req, res, next) => {
    try {
        await (0, sqlserver_controller_1.getAvailableDatabases)(req, res);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
