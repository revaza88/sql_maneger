# SQL Manager V2 - CloudPanel Deployment Guide

## Prerequisites
- CloudPanel installed on VPS/Server
- Node.js 18+ installed
- SQL Server instance running
- Domain name configured

## Deployment Steps

### 1. Clone Repository
```bash
cd /home/[username]/htdocs/[domain.com]
git clone https://github.com/revaza88/sql_manager.git .
git checkout feature-v2
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install API dependencies
cd api
npm install
cd ..
```

### 3. Environment Configuration
```bash
# Copy environment templates
cp .env.example .env
cp api/.env.example api/.env

# Edit environment files with your settings
nano .env
nano api/.env
```

### 4. Build Applications
```bash
# Build frontend
npm run build

# Build API
cd api
npm run build
cd ..
```

### 5. Setup PM2 Process Manager
```bash
# Install PM2 globally
npm install -g pm2

# Start applications using ecosystem file
pm2 start ecosystem.config.json
pm2 save
pm2 startup
```

### 6. Configure Nginx (CloudPanel will handle this)
The nginx.conf file is provided for reference. CloudPanel will automatically configure nginx.

### 7. SSL Certificate
CloudPanel will automatically handle SSL certificate installation via Let's Encrypt.

## Environment Variables

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Backend (api/.env)
```
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-here
MSSQL_USER=sa
MSSQL_PASSWORD=your-sqlserver-password
MSSQL_DATABASE=master
```

## Post-Deployment

### 1. Test API Endpoints
```bash
curl https://yourdomain.com/api/health
```

### 2. Monitor Applications
```bash
pm2 status
pm2 logs
```

### 3. Security Testing
Run the security test script to verify everything works:
```bash
node test-database-security.js
```

## Maintenance

### Update Application
```bash
git pull origin feature-v2
npm install
npm run build
cd api
npm install
npm run build
pm2 restart all
```

### Backup
Regular backups should include:
- Application files
- SQL Server databases
- Environment configurations

## Troubleshooting

### Check Logs
```bash
pm2 logs sqlmanager-api
pm2 logs sqlmanager-frontend
```

### Restart Services
```bash
pm2 restart all
```

### Check Process Status
```bash
pm2 status
```