#!/bin/bash

# Klipy Deployment Preparation Script

echo "🚀 Preparing Klipy for deployment..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - Klipy clipboard sync app"
else
    echo "✅ Git repository already initialized"
fi

# Check for environment file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo "📝 Please edit .env with your MongoDB URI and JWT secret"
fi

# Check for node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "✅ Klipy is ready for deployment!"
echo ""
echo "🔗 Next steps for Render deployment:"
echo "1. Push your code to GitHub:"
echo "   git remote add origin <your-github-repo-url>"
echo "   git push -u origin main"
echo ""
echo "2. Go to render.com and create a new Web Service"
echo "3. Connect your GitHub repository"
echo "4. Set environment variables:"
echo "   - MONGODB_URI: Your MongoDB connection string"
echo "   - JWT_SECRET: A secure random string"
echo "   - NODE_ENV: production"
echo ""
echo "5. Deploy and enjoy your cross-device clipboard sync! 🎉"
echo ""
echo "📱 Don't forget to get your Multisynq API key from:"
echo "   https://multisynq.io/coder/"
