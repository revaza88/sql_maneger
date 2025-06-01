import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { databaseRouter } from './routes/database.routes';
import profileRouter from './routes/profile.routes';
import { adminRouter } from './routes/admin.routes'; // Added adminRouter import
import sqlServerRouter from './routes/sqlserver.routes';
import { DatabaseService } from './database/DatabaseService';
import { initializeDatabase } from './database/init';

const app = express();

// Enable CORS for all routes and preflight requests
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (config.corsOrigin.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Initialize database connection
DatabaseService.getInstance();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/databases', databaseRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter); // Added adminRouter usage
app.use('/api/sqlserver', sqlServerRouter);

// Error handling
app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = config.port || 3001;

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database connection...');
    const dbService = DatabaseService.getInstance();
    await dbService.testConnection();
    console.log('Database connection verified successfully');

    // Initialize database tables
    console.log('Initializing database tables...');
    await initializeDatabase();
    console.log('Database tables initialized successfully');

    // Start HTTP server
    const port = config.port;
    httpServer.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log('CORS origins:', config.corsOrigin);
    });

    // Handle server errors
    httpServer.on('error', (error) => {
      console.error('Server error:', error);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
