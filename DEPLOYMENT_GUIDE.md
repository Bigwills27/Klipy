# 🚀 Klipy Render.com Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables Setup

In your Render.com dashboard, add these environment variables:

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://yudtkme:yudtkme20@tabmc.zhquyvw.mongodb.net/klipy
JWT_SECRET=your-super-secure-jwt-secret-here-change-this
BETA_INVITE_CODE=klipy-beta-2025
PORT=10000
```

**⚠️ SECURITY WARNING**: Change the JWT_SECRET to a random, secure string!

### 2. MongoDB Atlas Setup

1. Go to MongoDB Atlas → Network Access
2. Add Render.com IP ranges or use `0.0.0.0/0` (less secure but easier)
3. Ensure your cluster allows connections

### 3. Render.com Service Configuration

**Web Service Settings:**

- **Name**: klipy-beta
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: Starter (free tier) - should handle 50 users
- **Auto-Deploy**: Yes (from main branch)

## Deployment Steps

1. **Push to GitHub:**

```bash
git add .
git commit -m "Production ready for beta"
git push origin main
```

2. **Connect to Render.com:**

   - Connect your GitHub repository
   - Set up automatic deploys from main branch

3. **Configure Environment Variables** (see above)

4. **Deploy and Test:**
   - Monitor deployment logs
   - Test health endpoint: `https://yourapp.onrender.com/health`
   - Test user registration and login

## Post-Deployment Monitoring

### Key Metrics to Watch:

- **User Count**: Stay under 50 for beta
- **Response Times**: Should be < 2 seconds
- **Error Rates**: Should be < 1%
- **Clipboard Sync Success**: Track via browser console

### Browser Testing Priority:

1. ✅ Chrome (Desktop + Android) - Primary
2. ✅ Safari (Desktop + iOS) - iOS requires manual paste
3. ✅ Firefox (Desktop)
4. ✅ Edge (Desktop)

### iOS Safari Specific Notes:

- Shows floating blue "Paste" button
- Users must manually tap to sync clipboard
- This is a browser limitation, not a bug

## Known Limitations for Beta

1. **Render.com Free Tier:**

   - May sleep after 15 min inactivity
   - 512MB RAM limit (should be fine for 50 users)
   - No SLA guarantees

2. **Browser Limitations:**

   - Clipboard access requires user interaction
   - Background sync limited when tab inactive
   - iOS Safari needs manual clipboard operations

3. **Scale Limitations:**
   - 50 user hard limit (enforced by server)
   - Rate limiting in place (prevents abuse)
   - Single MongoDB connection (should scale to ~100 users)

## Beta User Onboarding

### Instructions for Beta Users:

1. **Desktop Users (Chrome/Firefox/Edge):**

   - Register at klipy.onrender.com
   - Click "Activate Sync"
   - Copy text anywhere → automatically syncs
   - Switch tabs/apps → sync continues in background

2. **iOS Safari Users:**

   - Register at klipy.onrender.com
   - Click "Activate Sync"
   - Copy text anywhere
   - Return to Klipy → tap blue "Paste" button
   - Manually paste content to sync

3. **General Tips:**
   - Stay logged in (24-hour sessions)
   - Refresh if connection issues occur
   - Report bugs via email/feedback form

## Troubleshooting Common Issues

### "Connection Error" / "Reconnecting"

- Normal when switching tabs
- Should reconnect within 2-3 seconds
- If persistent: check network connection

### "iOS Safari Notice"

- Expected behavior on iOS
- Use manual paste button
- No automatic clipboard reading possible

### "Beta is full"

- 50 user limit reached
- Users should join waitlist
- Consider expanding limit if needed

### High Error Rates

- Check Render.com logs
- Monitor MongoDB Atlas metrics
- Check rate limiting isn't too strict

## Support & Feedback

For beta testers:

- Email: support@yourcompany.com
- Include: Browser, OS, specific error messages
- Expected response: 24-48 hours

## Success Metrics for Beta

**Target Goals:**

- [ ] 50 active users registered
- [ ] < 2 second average response time
- [ ] > 95% clipboard sync success rate (excluding iOS manual)
- [ ] < 1% error rate
- [ ] Positive user feedback (survey after 1 week)

**If successful, prepare for:**

- Production tier on Render.com
- Expanded user limits
- Additional features based on feedback
