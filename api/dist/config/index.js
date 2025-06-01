"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 3001,
    corsOrigin: [
        'http://localhost:3000',
        'http://localhost:3002',
        'http://localhost:3004',
        'http://localhost:3007',
        'http://172.23.96.1:3000'
    ],
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: '1d'
    },
    database: {
        user: process.env.MSSQL_USER || 'sa',
        password: process.env.MSSQL_PASSWORD || 'Admin1',
        server: '127.0.0.1',
        database: process.env.MSSQL_DATABASE || 'master',
        options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true
        }
    }
};
