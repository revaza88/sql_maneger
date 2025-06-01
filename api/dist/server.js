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
const index_1 = require("./config/index");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./routes/auth");
const database_routes_1 = require("./routes/database.routes");
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const admin_routes_1 = require("./routes/admin.routes"); // Added adminRouter import
const sqlserver_routes_1 = __importDefault(require("./routes/sqlserver.routes"));
const DatabaseService_1 = require("./database/DatabaseService");
const init_1 = require("./database/init");
const app = (0, express_1.default)();
// Enable CORS for all routes and preflight requests
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (index_1.config.corsOrigin.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));
// Initialize database connection
DatabaseService_1.DatabaseService.getInstance();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: index_1.config.corsOrigin,
        credentials: true
    }
});
// Middleware
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
// Routes
app.use('/api/auth', auth_1.authRouter);
app.use('/api/databases', database_routes_1.databaseRouter);
app.use('/api/profile', profile_routes_1.default);
app.use('/api/admin', admin_routes_1.adminRouter); // Added adminRouter usage
app.use('/api/sqlserver', sqlserver_routes_1.default);
// Error handling
app.use(errorHandler_1.errorHandler);
// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});
const PORT = index_1.config.port || 3001;
// Initialize database and start server
async function startServer() {
    try {
        console.log('Initializing database connection...');
        const dbService = DatabaseService_1.DatabaseService.getInstance();
        await dbService.testConnection();
        console.log('Database connection verified successfully');
        // Initialize database tables
        console.log('Initializing database tables...');
        await (0, init_1.initializeDatabase)();
        console.log('Database tables initialized successfully');
        // Start HTTP server
        const port = index_1.config.port;
        httpServer.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log('CORS origins:', index_1.config.corsOrigin);
        });
        // Handle server errors
        httpServer.on('error', (error) => {
            console.error('Server error:', error);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
