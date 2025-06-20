// Main Application Logic
class KlipyApp {
    constructor() {
        this.currentUser = null;
        this.session = null;
        this.clipboardView = null;
        this.isConnected = false;
        this.database = new KlipyDatabase();
        
        // Multisynq configuration
        this.apiKey = null; // Will be set when user provides it
        this.appId = 'io.klipy.clipboard-sync';
        
        this.initializeElements();
        this.bindEvents();
        
        console.log('Klipy App initialized - Ready for Multisynq');
    }
    
    // Initialize DOM elements
    initializeElements() {
        // Containers
        this.authContainer = document.getElementById('auth-container');
        this.dashboardContainer = document.getElementById('dashboard-container');
        
        // Auth elements
        this.loginForm = document.getElementById('login-form');
        this.signupForm = document.getElementById('signup-form');
        this.showSignupBtn = document.getElementById('show-signup');
        this.showLoginBtn = document.getElementById('show-login');
        
        // Dashboard elements
        this.userNameSpan = document.getElementById('user-name');
        this.logoutBtn = document.getElementById('logout-btn');
        this.syncToggleBtn = document.getElementById('sync-toggle');
        this.syncStatus = document.getElementById('sync-status');
        this.entriesCount = document.getElementById('entries-count');
        this.clipboardEntries = document.getElementById('clipboard-entries');
        
        // Dev controls
        this.testClipBtn = document.getElementById('test-clip-btn');
        this.clearClipsBtn = document.getElementById('clear-clips-btn');
    }
    
    // Bind event listeners
    bindEvents() {
        // Auth form switching
        this.showSignupBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showSignupForm();
        });
        
        this.showLoginBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });
        
        // Form submissions
        this.loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        this.signupForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });
        
        // Dashboard actions
        this.logoutBtn?.addEventListener('click', () => this.handleLogout());
    }
    
    
    // Setup clipboard event listeners (removed - now handled by Multisynq View)
    
    // Show signup form
    showSignupForm() {
        this.loginForm?.classList.remove('active');
        this.signupForm?.classList.add('active');
    }
    
    // Show login form
    showLoginForm() {
        this.signupForm?.classList.remove('active');
        this.loginForm?.classList.add('active');
    }
    
    // Handle login with database authentication
    async handleLogin() {
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;
        const apiKey = document.getElementById('login-apikey')?.value;
        
        if (!email || !password || !apiKey) {
            alert('Please fill in all fields including your Multisynq API key');
            return;
        }
        
        try {
            // Authenticate with database
            const result = await this.database.authenticateUser(email, password);
            
            if (result.success) {
                // Store API key and user data
                this.apiKey = apiKey;
                this.currentUser = result.user;
                
                // Store token for future requests
                localStorage.setItem('klipy-token', result.token);
                
                await this.showDashboard();
            } else {
                alert(`Login failed: ${result.error || 'Invalid credentials'}`);
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Provide more specific error messages
            if (error.message.includes('Failed to fetch')) {
                alert('Cannot connect to server. Please check your internet connection and make sure the server is running.');
            } else if (error.message.includes('NetworkError')) {
                alert('Network error. If you\'re on mobile, make sure you\'re connected to the same network as the server.');
            } else {
                alert(`Login failed: ${error.message || 'Please try again.'}`);
            }
        }
    }
    
    // Handle signup with database
    async handleSignup() {
        const name = document.getElementById('signup-name')?.value;
        const email = document.getElementById('signup-email')?.value;
        const password = document.getElementById('signup-password')?.value;
        const apiKey = document.getElementById('signup-apikey')?.value;
        
        if (!name || !email || !password || !apiKey) {
            alert('Please fill in all fields including your Multisynq API key');
            return;
        }
        
        try {
            // Create user in database
            const result = await this.database.createUser({
                name,
                email,
                password,
                apiKey
            });
            
            if (result.success) {
                // Store API key and user data
                this.apiKey = apiKey;
                this.currentUser = result.user;
                
                // Store token for future requests
                localStorage.setItem('klipy-token', result.token);
                
                await this.showDashboard();
            } else {
                alert(`Signup failed: ${result.error || 'Please try again'}`);
            }
        } catch (error) {
            console.error('Signup error:', error);
            
            // Provide more specific error messages
            if (error.message.includes('Failed to fetch')) {
                alert('Cannot connect to server. Please check your internet connection and make sure the server is running.');
            } else if (error.message.includes('NetworkError')) {
                alert('Network error. If you\'re on mobile, make sure you\'re connected to the same network as the server.');
            } else {
                alert(`Signup failed: ${error.message || 'Please try again.'}`);
            }
        }
    }
    
    // Show dashboard after successful auth
    async showDashboard() {
        if (!this.currentUser || !this.apiKey) return;
        
        // Hide auth, show dashboard
        this.authContainer?.classList.add('hidden');
        this.dashboardContainer?.classList.remove('hidden');
        
        // Update user greeting
        if (this.userNameSpan) {
            this.userNameSpan.textContent = `Welcome, ${this.currentUser.name}`;
        }
        
        // Initialize Multisynq session
        await this.initializeMultisynq();
        
        console.log('Dashboard shown for user:', this.currentUser.email);
    }
    
    // Handle logout
    handleLogout() {
        // Disconnect from Multisynq session
        if (this.session) {
            this.session.leave();
            this.session = null;
        }
        
        // Clear user data
        this.currentUser = null;
        this.apiKey = null;
        this.clipboardView = null;
        this.isConnected = false;
        
        // Show auth screen
        this.dashboardContainer?.classList.add('hidden');
        this.authContainer?.classList.remove('hidden');
        
        // Reset forms
        this.loginForm?.reset();
        this.signupForm?.reset();
        this.showLoginForm();
        
        console.log('User logged out and disconnected from Multisynq');
    }
    
    // Initialize Multisynq session
    async initializeMultisynq() {
        if (!this.apiKey || !this.currentUser) {
            console.error('Cannot initialize Multisynq: missing API key or user');
            return;
        }
        
        try {
            // Create consistent session parameters based on user email
            const sessionName = `klipy-${this.currentUser.email.replace(/[^a-zA-Z0-9]/g, '-')}`;
            // Use a deterministic password based on user email so all devices can connect
            const password = this.generateUserPassword(this.currentUser.email);
            
            console.log('Connecting to Multisynq session:', sessionName);
            
            // Join Multisynq session with better error handling
            try {
                this.session = await Multisynq.Session.join({
                    apiKey: this.apiKey,
                    appId: this.appId,
                    name: sessionName,
                    password: password,
                    model: ClipboardModel,
                    view: ClipboardView
                });
                
                console.log('Successfully joined Multisynq session');
            } catch (sessionError) {
                console.error('Multisynq session join error:', sessionError);
                
                // Provide specific error messages for different failure types
                if (sessionError.message.includes('API key')) {
                    throw new Error('Invalid Multisynq API key. Please check your API key and try again.');
                } else if (sessionError.message.includes('network') || sessionError.message.includes('timeout')) {
                    throw new Error('Network connection failed. Please check your internet connection.');
                } else {
                    throw new Error(`Failed to connect to Multisynq: ${sessionError.message}`);
                }
            }
            
            // Store reference to the view for direct access
            this.clipboardView = this.session.view;
            window.clipboardView = this.clipboardView; // Global access for DOM event handlers
            
            // Set user information in the view
            this.clipboardView.setUserInfo(this.currentUser);
            
            // Setup system event listeners for device management
            this.setupSystemEventListeners();
            
            this.isConnected = true;
            
            // Update sync status
            if (this.syncStatus) {
                this.syncStatus.textContent = 'Connected to Multisynq - ready to sync';
                this.syncStatus.classList.add('active');
            }
            
            console.log('Successfully connected to Multisynq session');
            
        } catch (error) {
            console.error('Failed to initialize Multisynq:', error);
            alert('Failed to connect to Multisynq. Please check your API key and try again.');
            
            // Update sync status
            if (this.syncStatus) {
                this.syncStatus.textContent = 'Connection failed - check API key';
                this.syncStatus.classList.remove('active');
            }
        }
    }
    
    // Generate deterministic password from user email
    generateUserPassword(email) {
        // Simple hash function to create consistent password from email
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            const char = email.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Convert to a string and make it more secure
        return `klipy-${Math.abs(hash)}-${email.length}-clipboard`;
    }
    
    // Setup system event listeners for device management
    setupSystemEventListeners() {
        // These events are handled by the ClipboardView and ClipboardModel
        // The session object doesn't have a subscribe method
        // View-join and view-exit events are automatically handled by the model
        console.log('System event listeners setup completed');
        
        // We can listen for custom app-level events here if needed
        window.addEventListener('klipy-device-connected', (event) => {
            this.showDeviceNotification(`Device connected: ${event.detail.deviceName}`, 'success');
        });
        
        window.addEventListener('klipy-device-disconnected', (event) => {
            this.showDeviceNotification(`Device disconnected: ${event.detail.deviceName}`, 'info');
        });
    }
    
    // Update device status display
    updateDeviceStatus() {
        // Get connected device count from session
        if (this.session && this.session.getConnectionStatus) {
            const status = this.session.getConnectionStatus();
            const deviceCount = status.peerCount || 0;
            
            // Update UI to show connected devices
            if (this.syncStatus) {
                this.syncStatus.textContent = `Connected - ${deviceCount + 1} device${deviceCount === 0 ? '' : 's'} syncing`;
            }
        }
    }
    
    // Show device connection notifications
    showDeviceNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `device-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#38ef7d' : '#667eea'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-size: 14px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KlipyApp();
});
