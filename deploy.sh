#!/bin/bash

# SQL Manager V2 - CloudPanel Deployment Script
# Run this script on your CloudPanel server after cloning the repository

echo "🚀 Starting SQL Manager V2 deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the project root directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo "📦 Installing API dependencies..."
cd api
npm install
cd ..

# Copy environment files if they don't exist
echo "🔧 Setting up environment files..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "📝 Created .env from template. Please edit it with your settings."
fi

if [ ! -f "api/.env" ]; then
    cp api/.env.example api/.env
    echo "📝 Created api/.env from template. Please edit it with your settings."
fi

# Build applications
echo "🔨 Building frontend..."
npm run build

echo "🔨 Building API..."
cd api
npm run build
cd ..

# Setup PM2 if it's available
if command -v pm2 &> /dev/null; then
    echo "🏃 Setting up PM2 processes..."
    pm2 delete sqlmanager-api 2>/dev/null || true
    pm2 delete sqlmanager-frontend 2>/dev/null || true
    pm2 start ecosystem.config.json
    pm2 save
    echo "✅ PM2 processes started and saved."
else
    echo "⚠️  PM2 not found. Please install PM2 globally: npm install -g pm2"
fi

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env and api/.env with your actual configuration"
echo "2. Configure your web server (Nginx/Apache) to proxy to the applications"
echo "3. If PM2 is not installed, install it: npm install -g pm2"
echo "4. Start the applications: pm2 start ecosystem.config.json"
echo ""
echo "🌐 Default URLs:"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:3001"