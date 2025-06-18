# CloudPanel Configuration for SQL Manager V2

## Site Configuration

### Domain Setup
1. In CloudPanel, create a new Node.js site
2. Set Node.js version to 18+ or latest LTS
3. Configure domain name
4. Set document root to the cloned repository directory

### Application Settings
- **Frontend Port**: 3000
- **API Port**: 3001
- **Node.js Version**: 18+ (recommended)
- **Process Manager**: PM2

## Environment Variables

### Frontend (.env)
```bash
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=SQL Manager V2
NEXT_PUBLIC_APP_VERSION=2.0.0
NODE_ENV=production
NEXTAUTH_SECRET=your-secure-secret-here
NEXTAUTH_URL=https://yourdomain.com
```

### API (api/.env)
```bash
PORT=3001
NODE_ENV=production
DB_SERVER=your-sql-server-host
DB_PORT=1433
DB_USER=your-admin-user
DB_PASSWORD=your-admin-password
JWT_SECRET=your-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://yourdomain.com
DATABASE_PATH=./database.sqlite
LOG_LEVEL=info
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Nginx Configuration

CloudPanel will automatically configure Nginx, but you can customize it using the provided `nginx.conf` file.

### Manual Nginx Setup (if needed)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SSL/HTTPS
CloudPanel can automatically manage SSL certificates through Let's Encrypt. Enable this in the site settings.

## Database Requirements
- SQL Server instance (local or remote)
- Administrative user with sysadmin privileges
- Network access from the server to SQL Server

## Monitoring
Use CloudPanel's built-in monitoring to track:
- Application uptime
- Resource usage
- Logs
- Performance metrics

## Backup Strategy
- Regular database backups
- Application code backup (via Git)
- Environment files backup
- User data backup

## Security Checklist
- [ ] Change default JWT secret
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs
