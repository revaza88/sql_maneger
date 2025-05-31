"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const mssql_1 = __importDefault(require("mssql"));
const config_1 = require("../config");
const poolConfig = {
    user: config_1.config.database.user,
    password: config_1.config.database.password,
    server: config_1.config.database.server,
    database: config_1.config.database.database,
    options: config_1.config.database.options,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};
exports.pool = new mssql_1.default.ConnectionPool(poolConfig);
// Connect to database
exports.pool.connect().then(() => {
    console.log('Connected to MSSQL database');
}).catch(err => {
    console.error('Database connection failed:', err);
});
// Handle pool errors
exports.pool.on('error', err => {
    console.error('Database pool error:', err);
});
