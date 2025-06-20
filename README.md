# 📋 Klipy - Real-time Clipboard Sync

A cross-device clipboard syncing app built with **vanilla JavaScript** and **Multisynq** for real-time synchronization. Copy text on one device and see it instantly appear on all your connected devices.

## ✨ Features

- **Real-time sync** across multiple devices using Multisynq P2P network  
- **User authentication** with MongoDB persistence
- **Device management** - activate/deactivate devices for sync
- **Cross-platform** - works in any modern web browser (Desktop & Mobile)
- **Secure** - end-to-end encrypted sessions with user-specific rooms

## 🚀 Deployment on Render

### Prerequisites
- Render account
- MongoDB Atlas account  
- Multisynq API key from [multisynq.io/coder](https://multisynq.io/coder/)

### Quick Deploy Steps

1. **Fork this repository** to your GitHub account

2. **Create MongoDB Database**
   - Create MongoDB Atlas cluster
   - Get connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/klipy`)

3. **Deploy to Render**
   - Go to [render.com](https://render.com) and sign up/login
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment Variables**:
       - `MONGODB_URI`: Your MongoDB connection string
       - `JWT_SECRET`: A secure random string (e.g., generate one)
       - `NODE_ENV`: `production`

4. **Deploy & Access**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Access your app at: `https://your-app-name.onrender.com`

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/klipy` |
| `JWT_SECRET` | Secret for JWT tokens | `your-super-secret-key-here` |
| `NODE_ENV` | Environment | `production` |

## 💻 Local Development

1. **Clone & Install**
   ```bash
   git clone <your-repo-url>
   cd Klipy
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and JWT secret
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access**
   - Desktop: `http://localhost:3000`
   - Mobile: `http://YOUR_IP:3000` (same network)

## 📱 Usage

1. **Sign Up**
   - Create account with your Multisynq API key
   - Each user gets their own secure sync room

2. **Login on Multiple Devices**
   - Use same credentials on all devices
   - Each device registers automatically

3. **Activate Sync**
   - Click "Activate Sync" to start monitoring
   - Grant clipboard permissions when prompted

4. **Sync Magic**
   - Copy text on any device
   - See it appear instantly on all active devices

## 🏗️ Architecture

- **Frontend**: Vanilla HTML/CSS/JS
- **Backend**: Node.js + Express (for user/device persistence)
- **Database**: MongoDB (user accounts, device management)
- **Sync**: Multisynq SDK (real-time P2P clipboard sync)
- **Deployment**: Render (with automatic CORS for mobile access)

## 🔧 API Endpoints

- `POST /api/users` - User authentication & creation
- `GET/POST /api/devices` - Device management  
- `GET/POST /api/sessions` - Session management

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Ready to deploy?** Just follow the Render deployment steps above! 🚀
- **Device awareness** - see which device each clip came from
- **Smart deduplication** - prevents duplicate entries
- **Local clipboard monitoring** - automatically detects copied text
- **Modern UI** - beautiful dark theme with animations

## 🚀 Quick Start

### 1. Get Your Free Multisynq API Key
1. Go to [multisynq.io/coder](https://multisynq.io/coder)
2. Sign up for a free account
3. Copy your API key

### 2. Open the App
1. Open `index.html` in your web browser
2. Enter any email/password (authentication is simulated)
3. **Important**: Paste your Multisynq API key in the API key field
4. Click "Sign In"

### 3. Start Syncing
1. Click "Activate Sync" to start monitoring your clipboard
2. Copy some text anywhere on your device
3. Open the same app on another device/browser tab
4. Use the same session details to join the same sync room
5. Watch as clipboard entries sync in real-time! 🎉

## 🏗️ Architecture

### Multisynq Integration
- **Model** (`clipboard-model.js`) - Manages synchronized clipboard state
- **View** (`clipboard-view.js`) - Handles UI and local clipboard monitoring
- **Session** - Automatic P2P synchronization via Multisynq's global network

### Key Components
- `app.js` - Main application logic and Multisynq session management
- `clipboard-manager.js` - Local clipboard monitoring using Web APIs
- `styles.css` - Modern responsive UI styling
- `index.html` - Single-page application structure

## 🔧 Technical Details

### Multisynq Model-View Pattern
The app follows Multisynq's architectural pattern:
- **Model**: Synchronized state that's identical across all connected devices
- **View**: Device-specific UI and input handling
- **Events**: Pub/sub communication between models and views

### Clipboard Monitoring
Uses modern Web APIs with fallbacks:
- `navigator.clipboard.readText()` for reading clipboard
- `navigator.clipboard.writeText()` for writing to clipboard
- Paste event listeners as fallback
- Polling for real-time detection

### Security
- End-to-end encryption via Multisynq
- Auto-generated session passwords
- No server-side storage of clipboard data
- Local-only processing of sensitive text

## 🌐 Browser Support

- **Chrome/Edge**: Full support (Clipboard API + all features)
- **Firefox**: Full support (Clipboard API + all features)
- **Safari**: Limited (requires user interaction for clipboard access)
- **Mobile browsers**: Varies by platform

## 🛠️ Development

### Project Structure
```
Klipy/
├── index.html              # Main HTML file
├── app.js                  # Main application logic
├── clipboard-model.js      # Multisynq model for sync state
├── clipboard-view.js       # Multisynq view for UI
├── clipboard-manager.js    # Local clipboard monitoring
├── styles.css              # CSS styling
└── README.md               # This file
```

### Testing Multi-Device Sync
1. Open the app in multiple browser tabs/windows
2. Use the same email but different names to simulate different devices
3. Use the same API key to join the same sync session
4. Test copying text in one tab and seeing it appear in others

### Development Features
- **Add Test Clip**: Adds random test content for testing
- **Clear All**: Removes all clipboard entries from sync
- **Console Logging**: Detailed logs of sync events and clipboard activity

## 🚫 Limitations

- **No persistent storage**: Clips are lost when all devices disconnect
- **Session-based**: Each login creates a new sync session
- **100-clip limit**: Only keeps the most recent 100 clipboard entries
- **Text only**: Currently only supports plain text (no images/files)

## 🔮 Future Enhancements

- **Persistent storage** using IndexedDB or cloud sync
- **Rich content** support (images, files, formatted text)
- **User accounts** with real authentication
- **Clip organization** with folders and tags
- **Search functionality** across clipboard history
- **Keyboard shortcuts** for quick access
- **Mobile app** versions

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Credits

- **Multisynq** for providing the real-time synchronization platform
- **Modern CSS** techniques for the beautiful UI
- **Web APIs** for seamless clipboard integration

---

## 🤔 Questions?

1. **"Is Multisynq free?"** - Yes, they offer free API keys at multisynq.io/coder
2. **"Does this work offline?"** - No, real-time sync requires internet connection
3. **"Is my data secure?"** - Yes, sessions are end-to-end encrypted
4. **"Can I self-host?"** - Multisynq supports self-hosting, but you'll lose global scaling benefits

**Happy clipboard syncing!** 🎉
