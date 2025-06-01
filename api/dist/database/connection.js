"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.ensureConnected = ensureConnected;
const mssql_1 = __importDefault(require("mssql"));
const poolConfig = {
    user: process.env.MSSQL_USER || 'sa',
    password: process.env.MSSQL_PASSWORD || 'Admin1',
    server: '127.0.0.1', // Using IP address instead of hostname
    port: 1433, // Explicitly set the port
    database: process.env.MSSQL_DATABASE || 'master',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    requestTimeout: 30000,
    connectionTimeout: 30000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};
exports.pool = new mssql_1.default.ConnectionPool(poolConfig);
let connectionPromise = null;
function ensureConnected() {
    if (!connectionPromise) {
        connectionPromise = exports.pool.connect()
            .then(connectedPool => {
            console.log('Connected to MSSQL database (via ensureConnected)');
            return connectedPool;
        })
            .catch(err => {
            console.error('Database connection failed (via ensureConnected):', err);
            connectionPromise = null; // Reset on failure to allow retry
            throw err; // Re-throw to propagate the error
        });
    }
    return connectionPromise;
}
// Initial connection attempt (optional, can be removed if all access goes via ensureConnected)
ensureConnected().catch(err => {
    // The error is already logged by ensureConnected,
    // but you might want to do additional handling here if the initial auto-connect fails.
    console.error("Initial auto-connection failed. Application might not work correctly until connection is established.");
});
// Handle pool errors
exports.pool.on('error', err => {
    console.error('Database pool error:', err);
});
