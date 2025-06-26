#!/bin/bash

# Klipy Production Testing Script
echo "🚀 Testing Klipy Production Setup"
echo "=================================="

# Check if server is running
echo "📡 Testing server health..."
curl -s http://localhost:2000/health | jq . || echo "❌ Health check failed"

echo ""
echo "🧪 Testing API endpoints..."

# Test rate limiting (should be allowed)
echo "📊 Testing normal API usage..."
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:2000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "data": {
      "name": "Test User",
      "email": "test@example.com",
      "password": "testpassword123",
      "apiKey": "test-api-key"
    }
  }')

if [ "$response" = "201" ] || [ "$response" = "400" ]; then
  echo "✅ User registration endpoint working (status: $response)"
else
  echo "❌ User registration failed (status: $response)"
fi

# Test authentication
echo "🔐 Testing authentication..."
auth_response=$(curl -s -X POST http://localhost:2000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "action": "authenticate",
    "data": {
      "email": "test@example.com",
      "password": "testpassword123"
    }
  }')

if echo "$auth_response" | grep -q "success"; then
  echo "✅ Authentication working"
else
  echo "❌ Authentication failed"
fi

echo ""
echo "🔄 Testing rate limiting..."

# Test rate limiting by making rapid requests
for i in {1..6}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:2000/api/users \
    -H "Content-Type: application/json" \
    -d '{
      "action": "authenticate",
      "data": {
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
      }
    }')
  
  echo "Request $i: HTTP $response"
  
  if [ "$response" = "429" ]; then
    echo "✅ Rate limiting is working!"
    break
  fi
done

echo ""
echo "📱 Browser compatibility tests:"
echo "- Open http://localhost:2000 in different browsers"
echo "- Test clipboard sync in each browser"
echo "- Test iOS Safari with manual paste"
echo "- Test background tab sync"

echo ""
echo "🎯 Manual testing checklist:"
echo "- [ ] Register new user"
echo "- [ ] Login with valid credentials" 
echo "- [ ] Login with invalid credentials (should fail)"
echo "- [ ] Enable clipboard sync"
echo "- [ ] Copy text in another app"
echo "- [ ] Switch back to Klipy (should sync)"
echo "- [ ] Test on iOS Safari (should show manual paste button)"
echo "- [ ] Test tab switching (should maintain sync)"
echo "- [ ] Test after 1 hour (should auto-login)"

echo ""
echo "💡 Next steps:"
echo "1. Deploy to Render.com"
echo "2. Update environment variables"
echo "3. Test with real users"
echo "4. Monitor error logs"
echo "5. Collect user feedback"

echo ""
echo "🔧 Production deployment command:"
echo "git add . && git commit -m 'Production ready' && git push origin main"
