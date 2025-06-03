"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableDatabases = exports.checkSQLServerUser = exports.grantDatabaseAccess = exports.getSQLServerCredentials = exports.createSQLServerUser = void 0;
const user_model_1 = require("../models/user.model");
const SQLServerUserService_1 = require("../services/SQLServerUserService");
// Create SQL Server user account for the authenticated user
const createSQLServerUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        // Check if user already has SQL Server credentials
        const hasCredentials = await user_model_1.UserModel.hasSQLServerCredentials(userId);
        if (hasCredentials) {
            return res.status(400).json({
                message: 'SQL Server user already exists for this account'
            });
        }
        // Create SQL Server login
        const credentials = await SQLServerUserService_1.SQLServerUserService.createSQLServerUser(userId, userEmail);
        // Store credentials in database
        await user_model_1.UserModel.updateSQLServerCredentials(userId, credentials.username, credentials.password);
        res.json({
            message: 'SQL Server user created successfully',
            username: credentials.username,
            password: credentials.password
        });
    }
    catch (error) {
        console.error('Error creating SQL Server user:', error);
        res.status(500).json({
            message: 'Failed to create SQL Server user',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.createSQLServerUser = createSQLServerUser;
// Get SQL Server credentials for the authenticated user
const getSQLServerCredentials = async (req, res) => {
    try {
        const userId = req.user.id;
        const credentials = await user_model_1.UserModel.getSQLServerCredentials(userId);
        if (!credentials) {
            return res.status(404).json({
                message: 'No SQL Server credentials found. Please create a SQL Server user first.'
            });
        }
        res.json({
            username: credentials.username,
            password: credentials.password,
            server: '127.0.0.1',
            port: 1433
        });
    }
    catch (error) {
        console.error('Error getting SQL Server credentials:', error);
        res.status(500).json({
            message: 'Failed to retrieve SQL Server credentials',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getSQLServerCredentials = getSQLServerCredentials;
// Grant access to a specific database for the user's SQL Server account
const grantDatabaseAccess = async (req, res) => {
    try {
        const userId = req.user.id;
        const { databaseName } = req.body;
        if (!databaseName) {
            return res.status(400).json({ message: 'Database name is required' });
        }
        // Get user's SQL Server credentials
        const credentials = await user_model_1.UserModel.getSQLServerCredentials(userId);
        if (!credentials) {
            return res.status(404).json({
                message: 'No SQL Server credentials found. Please create a SQL Server user first.'
            });
        }
        // Grant database access
        await SQLServerUserService_1.SQLServerUserService.grantDatabaseAccess(credentials.username, databaseName);
        res.json({
            message: `Successfully granted access to database: ${databaseName}`,
            database: databaseName,
            username: credentials.username
        });
    }
    catch (error) {
        console.error('Error granting database access:', error);
        res.status(500).json({
            message: 'Failed to grant database access',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.grantDatabaseAccess = grantDatabaseAccess;
// Check if user has SQL Server credentials
const checkSQLServerUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const hasCredentials = await user_model_1.UserModel.hasSQLServerCredentials(userId);
        res.json({
            hasSQLServerUser: hasCredentials
        });
    }
    catch (error) {
        console.error('Error checking SQL Server user:', error);
        res.status(500).json({
            message: 'Failed to check SQL Server user status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.checkSQLServerUser = checkSQLServerUser;
// Get list of databases available on the server (for access management)
const getAvailableDatabases = async (req, res) => {
    try {
        const userId = req.user.id;
        // Get user's SQL Server credentials to filter databases by username
        const credentials = await user_model_1.UserModel.getSQLServerCredentials(userId);
        let databases;
        if (credentials) {
            // If user has SQL Server credentials, show only their accessible databases
            databases = await SQLServerUserService_1.SQLServerUserService.listDatabases(credentials.username);
        }
        else {
            // If no SQL Server credentials, show limited set of general databases
            databases = await SQLServerUserService_1.SQLServerUserService.listDatabases();
        }
        res.json({
            databases: databases,
            hasCredentials: !!credentials
        });
    }
    catch (error) {
        console.error('Error getting available databases:', error);
        res.status(500).json({
            message: 'Failed to retrieve available databases',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.getAvailableDatabases = getAvailableDatabases;
