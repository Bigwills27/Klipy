#!/bin/bash

# Production Deployment Preparation Script for Klipy
echo "🚀 Preparing Klipy for Production Deployment"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the Klipy root directory."
    exit 1
fi

print_status "Starting deployment preparation..."

# 1. Clean up development files
echo -e "\n📁 Cleaning up development files..."
rm -f test-*.html test-*.sh *.log
rm -f multisynq-js.txt
print_status "Development files cleaned"

# 2. Check package.json for production readiness
echo -e "\n📦 Checking package.json..."
if grep -q '"start"' package.json; then
    print_status "Start script found"
else
    print_error "No start script found in package.json"
    exit 1
fi

# 3. Install production dependencies
echo -e "\n📥 Installing production dependencies..."
npm ci --only=production
if [ $? -eq 0 ]; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# 4. Check for required environment variables
echo -e "\n🔐 Checking environment configuration..."
if [ -f ".env.example" ]; then
    print_status ".env.example found"
    if [ ! -f ".env" ]; then
        print_warning "No .env file found. Copy .env.example to .env and configure:"
        print_warning "cp .env.example .env"
    fi
else
    print_warning "No .env.example found"
fi

# 5. Validate critical files
echo -e "\n📋 Validating critical files..."
REQUIRED_FILES=("index.html" "app.js" "clipboard-model-fixed.js" "clipboard-view.js" "server.js" "styles.css")

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "$file exists"
    else
        print_error "$file is missing!"
        exit 1
    fi
done

# 6. Check JavaScript syntax
echo -e "\n🔍 Checking JavaScript syntax..."
JS_FILES=("app.js" "clipboard-model-fixed.js" "clipboard-view.js" "clipboard-manager.js" "server.js")

for file in "${JS_FILES[@]}"; do
    if node -c "$file" 2>/dev/null; then
        print_status "$file syntax OK"
    else
        print_error "$file has syntax errors!"
        node -c "$file"
        exit 1
    fi
done

# 7. Create production build info
echo -e "\n📝 Creating build info..."
cat > build-info.json << EOF
{
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "$(node -p "require('./package.json').version")",
  "nodeVersion": "$(node --version)",
  "environment": "production"
}
EOF
print_status "Build info created"

# 8. Security check - remove sensitive files
echo -e "\n🔒 Security cleanup..."
rm -f .env.local .env.development
print_status "Sensitive files removed"

# 9. Optimize for production
echo -e "\n⚡ Production optimizations..."

# Create a production-ready server.js backup if needed
if grep -q "development" server.js; then
    print_warning "server.js may contain development settings. Review before deployment."
fi

# 10. Create deployment package info
echo -e "\n📦 Creating deployment summary..."
cat > DEPLOYMENT_READY.md << EOF
# Klipy - Production Deployment Ready

## Deployment Date
$(date)

## Files Included
- Core application files
- Production dependencies only
- Environment template (.env.example)
- Build information

## Environment Variables Required
\`\`\`
PORT=3000
NODE_ENV=production
\`\`\`

## Deployment Steps
1. Set environment variables
2. Run: npm start
3. Access at configured port

## Health Check
- GET / should return the main application
- Check server logs for any errors

## Support
- Check README.md for additional information
- Monitor browser console for client-side issues
EOF

print_status "Deployment summary created"

echo -e "\n🎉 ${GREEN}Deployment preparation complete!${NC}"
echo -e "\n📋 Next steps:"
echo "1. Review DEPLOYMENT_READY.md"
echo "2. Configure environment variables"
echo "3. Deploy to your hosting platform"
echo "4. Test the deployed application"

echo -e "\n📊 Final checklist:"
print_status "✅ Dependencies installed"
print_status "✅ Syntax validated"
print_status "✅ Security cleanup done"
print_status "✅ Build info created"
print_status "✅ Ready for deployment"

exit 0