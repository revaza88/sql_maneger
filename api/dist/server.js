"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./routes/auth");
const database_1 = require("./routes/database");
require("./database/connection");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: config_1.config.corsOrigin,
        credentials: true
    }
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigin,
    credentials: true
}));
app.use(express_1.default.json());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
// Routes
app.use('/api/auth', auth_1.authRouter);
app.use('/api/databases', database_1.databaseRouter);
// Error handling
app.use(errorHandler_1.errorHandler);
// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
const PORT = config_1.config.port || 3001;
// Initialize database and start server
const init_1 = require("./database/init");
(0, init_1.initializeDatabase)()
    .then(() => {
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
})
    .catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});
