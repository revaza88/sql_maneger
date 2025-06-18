@echo off
REM SQL Manager V2 - Windows Deployment Script
REM Run this script on Windows after cloning the repository

echo 🚀 Starting SQL Manager V2 deployment...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Make sure you're in the project root directory.
    exit /b 1
)

REM Install dependencies
echo 📦 Installing frontend dependencies...
call npm install

echo 📦 Installing API dependencies...
cd api
call npm install
cd ..

REM Copy environment files if they don't exist
echo 🔧 Setting up environment files...
if not exist ".env" (
    copy .env.example .env
    echo 📝 Created .env from template. Please edit it with your settings.
)

if not exist "api\.env" (
    copy api\.env.example api\.env
    echo 📝 Created api\.env from template. Please edit it with your settings.
)

REM Build applications
echo 🔨 Building frontend...
call npm run build

echo 🔨 Building API...
cd api
call npm run build
cd ..

REM Check for PM2
where pm2 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo 🏃 Setting up PM2 processes...
    pm2 delete sqlmanager-api 2>nul
    pm2 delete sqlmanager-frontend 2>nul
    pm2 start ecosystem.config.json
    pm2 save
    echo ✅ PM2 processes started and saved.
) else (
    echo ⚠️  PM2 not found. Please install PM2 globally: npm install -g pm2
)

echo ✅ Deployment completed!
echo.
echo 📋 Next steps:
echo 1. Edit .env and api/.env with your actual configuration
echo 2. If PM2 is not installed, install it: npm install -g pm2
echo 3. Start the applications: pm2 start ecosystem.config.json
echo.
echo 🌐 Default URLs:
echo    Frontend: http://localhost:3000
echo    API: http://localhost:3001

pause