# SQL Manager V2

A modern, secure SQL Server database management system built with Next.js and Node.js.

## Features

### User Management
- **User Registration & Authentication**: Secure user registration and login system
- **Profile Management**: Users can update their profile information and change passwords
- **Role-based Access Control**: Admin and regular user roles with appropriate permissions

### Database Management
- **Personal Database Creation**: Each user can create and manage their own SQL Server databases
- **Database Isolation**: Complete user isolation - users can only access their own databases
- **Database Operations**: Create, backup, restore, and delete databases
- **Query Interface**: Execute SQL queries directly in the browser

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **User Isolation**: Complete separation of user data and database access
- **SQL Server Integration**: Direct integration with SQL Server for database operations
- **Admin Controls**: Administrative interface for user and system management

### Enhanced UI/UX
- **Modern Interface**: Clean, responsive design with Tailwind CSS
- **Navigation**: Comprehensive navigation with user dropdown, profile access, and logout
- **Real-time Updates**: Live updates using React Query for optimal user experience
- **Loading States**: Proper loading and error states throughout the application

## Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **React Query**: Data fetching and state management
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation
- **Lucide React**: Modern icon library

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type-safe server development
- **JWT**: Authentication tokens
- **SQL Server**: Database engine
- **Multer**: File upload handling

## Project Structure

```
sqlmanager-v2/
├── src/                    # Frontend application
│   ├── app/               # Next.js app router pages
│   │   ├── admin/         # Admin interface
│   │   ├── databases/     # Database management
│   │   ├── login/         # Authentication
│   │   ├── profile/       # User profile
│   │   └── sqlserver/     # SQL Server operations
│   ├── components/        # Reusable UI components
│   └── lib/               # Utilities and configuration
├── api/                   # Backend API server
│   └── src/
│       ├── controllers/   # Request handlers
│       ├── database/      # Database connection and services
│       ├── middleware/    # Authentication and validation
│       ├── models/        # Data models
│       ├── routes/        # API routes
│       └── services/      # Business logic
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- SQL Server instance
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sqlmanager-v2
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd api
   npm install
   ```

4. **Environment Configuration**
   
   Create `.env` files in both root and api directories:
   
   **Root `.env`:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
   
   **API `.env`:**
   ```env
   PORT=3001
   JWT_SECRET=your-jwt-secret-key
   DB_HOST=localhost
   DB_USER=sa
   DB_PASSWORD=your-sql-server-password
   DB_NAME=sqlmanager
   ```

5. **Database Setup**
   ```bash
   cd api
   npm run setup-db
   ```

### Running the Application

1. **Start the API server**
   ```bash
   cd api
   npm run dev
   ```

2. **Start the frontend application**
   ```bash
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001

## Recent Updates

### Enhanced Navigation
- Added comprehensive navigation component with user dropdown
- Integrated user profile access and logout functionality
- Consistent navigation across all pages

### Improved Database Page
- Added user welcome section with profile information
- Enhanced authentication guards and loading states
- Improved page layout and user experience

### Profile Management
- Complete profile editing functionality
- Secure password change system
- Account information display

### Security Enhancements
- Complete user database isolation
- Enhanced authentication middleware
- Secure API endpoints

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-password` - Verify password

### Database Management
- `GET /api/databases/list` - List user databases
- `POST /api/databases` - Create new database
- `DELETE /api/databases/:databaseName` - Delete database
- `POST /api/databases/:databaseName/backup` - Backup database
- `POST /api/databases/:databaseName/restore` - Restore database

### Profile Management
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `PUT /api/profile/password` - Change password

### SQL Server Operations
- `POST /api/databases/:database/query` - Execute SQL query
- `GET /api/databases/:database/tables` - List database tables

## Deployment

For full deployment steps, see the [deployment guide](deployment-guide.md) and the
[CloudPanel configuration](cloudpanel-config.md). A helper script
`deploy.sh` is provided to automate installation and PM2 setup on servers.

## Testing

Several scripts are available to verify security and database features:

- `node test-database-security.js` – checks isolation between SQL Server users
  and verifies credential creation.
- `node api/test-db-creation.js` – tests database creation via the API.
- `node api/test-user-isolation.js` – ensures user-specific access controls
  are enforced.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository.
