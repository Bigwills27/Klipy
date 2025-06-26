// Main Application Logic
class KlipyApp {
  constructor() {
    this.currentUser = null;
    this.session = null;
    this.clipboardView = null;
    this.isConnected = false;
    this.isReconnecting = false;
    this.database = new KlipyDatabase();

    // Multisynq configuration
    this.apiKey = null; // Will be set when user provides it
    this.appId = "io.klipy.clipboard-sync";

    this.initializeElements();
    this.bindEvents();
    this.init();

    console.log("Klipy App initialized - Ready for Multisynq");
  }

  // Initialize DOM elements
  initializeElements() {
    // Containers
    this.authContainer = document.getElementById("auth-container");
    this.dashboardContainer = document.getElementById("dashboard-container");

    // Auth elements
    this.loginForm = document.getElementById("login-form");
    this.signupForm = document.getElementById("signup-form");
    this.showSignupBtn = document.getElementById("show-signup");
    this.showLoginBtn = document.getElementById("show-login");

    // Dashboard elements
    this.userNameSpan = document.getElementById("user-name-sidebar");
    this.logoutBtn = document.getElementById("logout-btn-sidebar");
    this.syncToggleBtn = document.getElementById("sync-toggle-sidebar");
    this.syncStatus = document.getElementById("sync-status-sidebar");
    this.entriesCount = document.getElementById("entries-count");
    this.clipboardEntries = document.getElementById("clipboard-entries");

    // Sidebar elements
    this.sidebarToggle = document.querySelector("[data-drawer-toggle='default-sidebar']");
    this.sidebar = document.getElementById("default-sidebar");

    // Dev controls (both main and sidebar versions)
    this.testClipBtn = document.getElementById("test-clip-btn-sidebar");
    this.clearClipsBtn = document.getElementById("clear-clips-btn-sidebar");
  }

  // Bind event listeners
  bindEvents() {
    // Auth form switching
    this.showSignupBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.showSignupForm();
    });

    this.showLoginBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.showLoginForm();
    });

    // Form submissions
    this.loginForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    this.signupForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSignup();
    });

    // Dashboard actions
    this.logoutBtn?.addEventListener("click", () => this.handleLogout());

    // Sidebar toggle
    this.sidebarToggle?.addEventListener("click", () => this.toggleSidebar());

    // Sync toggle
    this.syncToggleBtn?.addEventListener("click", () => this.toggleSync());

    // Dev controls
    this.testClipBtn?.addEventListener("click", () => this.addTestClip());
    this.clearClipsBtn?.addEventListener("click", () => this.clearAllClips());

    // Search functionality
    const searchInput = document.querySelector(".search-input");
    searchInput?.addEventListener("input", (e) =>
      this.handleSearch(e.target.value)
    );
  }

  showSyncStatus() {
    console.log("Showing sync status");
    // Could show detailed sync information
  }

  showConnectedDevices() {
    console.log("Showing connected devices");
    // Could show device management interface
  }

  // Show signup form
  showSignupForm() {
    this.loginForm?.classList.remove("active");
    this.signupForm?.classList.add("active");
  }

  // Show login form
  showLoginForm() {
    this.signupForm?.classList.remove("active");
    this.loginForm?.classList.add("active");
  }

  // Handle login with database authentication
  async handleLogin() {
    const loginBtn = document.querySelector("#login-form .auth-btn");
    const email = document.getElementById("login-email")?.value;
    const password = document.getElementById("login-password")?.value;
    const apiKey = document.getElementById("login-apikey")?.value;

    if (!email || !password || !apiKey) {
      this.showNotification("Please fill in all fields including your Multisynq API key", "warning", 4000);
      return;
    }

    // Set loading state
    loginBtn.classList.add("loading");
    loginBtn.disabled = true;
    loginBtn.textContent = "Signing In...";

    try {
      // Show connecting status
      this.showNotification("Connecting to server...", "info", 2000);
      
      // Authenticate with database
      const result = await this.database.authenticateUser(email, password);

      if (result.success) {
        // Store API key and user data
        this.apiKey = apiKey;
        this.currentUser = result.user;

        // Store token for future requests
        localStorage.setItem("klipy-token", result.token);

        // Save session state for 24h auto-login
        this.saveSessionState();

        this.showNotification("Login successful! Setting up your dashboard...", "info", 2000);
        await this.showDashboard();
      } else {
        this.showNotification(`Login failed: ${result.error || "Invalid credentials"}`, "error", 5000);
      }
    } catch (error) {
      console.error("Login error:", error);

      // Provide more specific error messages
      if (error.message.includes("Failed to fetch")) {
        this.showNotification(
          "Cannot connect to server. Please check your internet connection and make sure the server is running.",
          "error",
          7000
        );
      } else if (error.message.includes("NetworkError")) {
        this.showNotification(
          "Network error. If you're on mobile, make sure you're connected to the same network as the server.",
          "error",
          7000
        );
      } else {
        this.showNotification(`Login failed: ${error.message || "Please try again."}`, "error", 5000);
      }
    } finally {
      // Remove loading state
      loginBtn.classList.remove("loading");
      loginBtn.disabled = false;
      loginBtn.textContent = "Sign In";
    }
  }

  // Handle signup with database
  async handleSignup() {
    const signupBtn = document.querySelector("#signup-form .auth-btn");
    const name = document.getElementById("signup-name")?.value;
    const email = document.getElementById("signup-email")?.value;
    const password = document.getElementById("signup-password")?.value;
    const apiKey = document.getElementById("signup-apikey")?.value;

    if (!name || !email || !password || !apiKey) {
      this.showNotification("Please fill in all fields including your Multisynq API key", "warning", 4000);
      return;
    }

    // Set loading state
    signupBtn.classList.add("loading");
    signupBtn.disabled = true;
    signupBtn.textContent = "Creating Account...";

    try {
      // Show connecting status
      this.showNotification("Creating your account...", "info", 2000);
      
      // Create user in database
      const result = await this.database.createUser({
        name,
        email,
        password,
        apiKey,
      });

      if (result.success) {
        // Store API key and user data
        this.apiKey = apiKey;
        this.currentUser = result.user;

        // Store token for future requests
        localStorage.setItem("klipy-token", result.token);

        // Save session state for 24h auto-login
        this.saveSessionState();

        this.showNotification("Account created successfully! Setting up your dashboard...", "info", 2000);
        await this.showDashboard();
      } else {
        this.showNotification(`Signup failed: ${result.error || "Please try again"}`, "error", 5000);
      }
    } catch (error) {
      console.error("Signup error:", error);

      // Provide more specific error messages
      if (error.message.includes("Failed to fetch")) {
        this.showNotification(
          "Cannot connect to server. Please check your internet connection and make sure the server is running.",
          "error",
          7000
        );
      } else if (error.message.includes("NetworkError")) {
        this.showNotification(
          "Network error. If you're on mobile, make sure you're connected to the same network as the server.",
          "error",
          7000
        );
      } else {
        this.showNotification(`Signup failed: ${error.message || "Please try again."}`, "error", 5000);
      }
    } finally {
      // Remove loading state
      signupBtn.classList.remove("loading");
      signupBtn.disabled = false;
      signupBtn.textContent = "Create Account";
    }
  }

  // Show dashboard after successful auth
  async showDashboard() {
    if (!this.currentUser || !this.apiKey) return;

    console.log("Showing dashboard for user:", this.currentUser.email);

    // Hide auth container and show dashboard
    if (this.authContainer) {
      this.authContainer.style.display = "none";
    }
    if (this.dashboardContainer) {
      this.dashboardContainer.style.display = "flex";
    }

    // Update user info in sidebar
    const userNameElement = document.getElementById("user-name-sidebar");
    const userAvatarElement = document.getElementById("user-avatar");

    if (userNameElement) {
      userNameElement.textContent = this.currentUser.name || this.currentUser.email || "User";
    }
    if (userAvatarElement) {
      userAvatarElement.textContent = (this.currentUser.name || this.currentUser.email || "User").charAt(0).toUpperCase();
    }

    // Initialize clipboard manager
    if (!this.clipboardManager) {
      this.clipboardManager = new ClipboardManager();
      
      // Listen for clipboard events
      this.clipboardManager.on('clip-added', (clip) => {
        this.updateClipboardView();
        console.log('New clip added:', clip.text.substring(0, 50) + '...');
      });
      
      this.clipboardManager.on('clips-cleared', () => {
        this.updateClipboardView();
      });
    }

    // Initialize clipboard view
    this.updateClipboardView();

    // Initialize Multisynq session
    await this.initializeMultisynq();

    console.log("Dashboard shown for user:", this.currentUser.email);
  }

  // Handle logout
  handleLogout() {
    this.showNotification("Logging you out...", "info", 2000);
    
    // Disconnect from Multisynq session
    if (this.session) {
      this.session.leave();
      this.session = null;
    }

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clean up session monitoring
    this.cleanupSessionMonitoring();

    // Clean up clipboard manager
    if (this.clipboardManager) {
      this.clipboardManager.stopMonitoring();
      this.clipboardManager.hideClipboardAccessButton();
      this.clipboardManager = null;
    }

    // Clear user data
    this.currentUser = null;
    this.apiKey = null;
    this.clipboardView = null;
    this.isConnected = false;

    // Clear session data
    this.clearSession();

    // Show auth screen and hide dashboard
    if (this.dashboardContainer) {
      this.dashboardContainer.style.display = "none";
    }
    if (this.authContainer) {
      this.authContainer.style.display = "flex";
    }

    // Reset forms
    this.loginForm?.reset();
    this.signupForm?.reset();
    this.showLoginForm();

    this.showNotification("You have been logged out successfully.", "info", 3000);
    console.log("User logged out and disconnected from Multisynq");
  }

  // Initialize Multisynq session
  async initializeMultisynq() {
    if (!this.apiKey || !this.currentUser) {
      console.error("Cannot initialize Multisynq: missing API key or user");
      return;
    }

    try {
      // Create consistent session parameters based on user email
      const sessionName = `klipy-${this.currentUser.email.replace(
        /[^a-zA-Z0-9]/g,
        "-"
      )}`;
      // Use a deterministic password based on user email so all devices can connect
      const password = this.generateUserPassword(this.currentUser.email);

      console.log("Connecting to Multisynq session:", sessionName);

      // Join Multisynq session with better error handling
      try {
        this.session = await Multisynq.Session.join({
          apiKey: this.apiKey,
          appId: this.appId,
          name: sessionName,
          password: password,
          model: ClipboardModel,
          view: ClipboardView,
        });

        console.log("Successfully joined Multisynq session");
      } catch (sessionError) {
        console.error("Multisynq session join error:", sessionError);

        // Provide specific error messages for different failure types
        if (sessionError.message.includes("API key")) {
          throw new Error(
            "Invalid Multisynq API key. Please check your API key and try again."
          );
        } else if (
          sessionError.message.includes("network") ||
          sessionError.message.includes("timeout")
        ) {
          throw new Error(
            "Network connection failed. Please check your internet connection."
          );
        } else {
          throw new Error(
            `Failed to connect to Multisynq: ${sessionError.message}`
          );
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

      // Reset reconnection attempts on successful connection
      this.reconnectAttempts = 0;
      this.isReconnecting = false;

      // Update sync status
      if (this.syncStatus) {
        this.syncStatus.textContent = "Connected to Multisynq - ready to sync";
        this.syncStatus.classList.add("active");
      }

      // Setup connection stability features
      this.setupConnectionStability();

      // Add session error monitoring
      this.setupSessionErrorHandling();

      console.log("Successfully connected to Multisynq session");
    } catch (error) {
      console.error("Failed to initialize Multisynq:", error);
      alert(
        "Failed to connect to Multisynq. Please check your API key and try again."
      );

      // Update sync status
      if (this.syncStatus) {
        this.syncStatus.textContent = "Connection failed - check API key";
        this.syncStatus.classList.remove("active");
      }
    }
  }

  // Generate deterministic password from user email
  generateUserPassword(email) {
    // Simple hash function to create consistent password from email
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = (hash << 5) - hash + char;
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
    console.log("System event listeners setup completed");

    // We can listen for custom app-level events here if needed
    window.addEventListener("klipy-device-connected", (event) => {
      this.showDeviceNotification(
        `Device connected: ${event.detail.deviceName}`,
        "success"
      );
    });

    window.addEventListener("klipy-device-disconnected", (event) => {
      this.showDeviceNotification(
        `Device disconnected: ${event.detail.deviceName}`,
        "info"
      );
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
        this.syncStatus.textContent = `Connected - ${deviceCount + 1} device${
          deviceCount === 0 ? "" : "s"
        } syncing`;
      }
    }
  }

  // Show device connection notifications
  showDeviceNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `device-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === "success" ? "#38ef7d" : "#667eea"};
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
      notification.style.animation = "slideOutRight 0.3s ease-in";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // Toggle sidebar visibility (mobile)
  toggleSidebar() {
    if (this.sidebar) {
      this.sidebar.classList.toggle("open");
    }
  }

  // Toggle sync functionality
  toggleSync() {
    if (!this.syncToggleBtn) return;
    
    const isActive = this.syncToggleBtn.getAttribute("data-active") === "true";
    
    if (isActive) {
      // Stop sync
      this.syncToggleBtn.setAttribute("data-active", "false");
      this.syncToggleBtn.innerHTML = `
        <i class="fas fa-sync-alt"></i>
        <span>Activate Sync</span>
      `;
      
      // Stop clipboard monitoring
      if (this.clipboardManager) {
        this.clipboardManager.stopMonitoring();
        this.clipboardManager.hideClipboardAccessButton();
      }
      
      this.updateSyncStatus("Ready to sync", false);
      this.showNotification("Sync deactivated", "info", 2000);
    } else {
      // Start sync
      this.syncToggleBtn.setAttribute("data-active", "true");
      this.syncToggleBtn.innerHTML = `
        <i class="fas fa-sync-alt"></i>
        <span>Deactivate Sync</span>
      `;
      
      // Start clipboard monitoring
      if (this.clipboardManager) {
        this.clipboardManager.startMonitoring();
        this.clipboardManager.showClipboardAccessButton();
      }
      
      this.updateSyncStatus("Sync active", true);
      this.showNotification("Sync activated! You can now paste clipboard content.", "success", 3000);
    }
  }

  // Update sync status display
  updateSyncStatus(text, isActive = false) {
    if (this.syncStatus) {
      this.syncStatus.textContent = text;
      if (isActive) {
        this.syncStatus.classList.add("active");
      } else {
        this.syncStatus.classList.remove("active");
      }
    }
    
    // Update sidebar sync status too
    const sidebarSyncStatus = document.getElementById("sync-status-sidebar");
    if (sidebarSyncStatus) {
      sidebarSyncStatus.textContent = text;
      if (isActive) {
        sidebarSyncStatus.classList.add("active");
      } else {
        sidebarSyncStatus.classList.remove("active");
      }
    }
  }

  // Add test clip
  addTestClip() {
    const testTexts = [
      "This is a test clipboard entry",
      "Another sample text for testing",
      "https://example.com/test-url",
      "Sample code: console.log('Hello World');",
      "Test email: user@example.com"
    ];
    
    const randomText = testTexts[Math.floor(Math.random() * testTexts.length)];
    
    if (this.clipboardManager) {
      this.clipboardManager.addClip(randomText);
      this.showNotification("Test clip added!", "success", 2000);
      this.updateClipboardView();
    }
  }

  // Clear all clips
  clearAllClips() {
    if (this.clipboardManager) {
      const count = this.clipboardManager.clearAllClips();
      this.showNotification(`Cleared ${count} clipboard entries`, "info", 2000);
      this.updateClipboardView();
    }
  }

  // Update clipboard view
  updateClipboardView() {
    if (!this.clipboardManager || !this.clipboardEntries) return;
    
    const clips = this.clipboardManager.getAllClips();
    
    // Update entries count
    if (this.entriesCount) {
      this.entriesCount.textContent = `${clips.length} entries`;
    }
    
    // Update sidebar count
    const sidebarCount = document.getElementById("entries-count-sidebar");
    if (sidebarCount) {
      sidebarCount.textContent = clips.length.toString();
    }
    
    // Update clipboard entries display
    this.clipboardEntries.innerHTML = '';
    
    if (clips.length === 0) {
      this.clipboardEntries.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-clipboard"></i>
          <h3>No clipboard entries yet</h3>
          <p>Start copying content or use the "Test Clip" button to add sample data</p>
        </div>
      `;
      return;
    }
    
    clips.forEach(clip => {
      const clipElement = document.createElement('div');
      clipElement.className = 'clipboard-item';
      clipElement.innerHTML = `
        <div class="clipboard-item-header">
          <span class="clipboard-item-time">${ClipboardManager.formatTimestamp(clip.timestamp)}</span>
        </div>
        <div class="clipboard-item-content">${this.escapeHtml(clip.text)}</div>
        <div class="clipboard-item-actions">
          <button class="clipboard-item-btn primary" onclick="app.copyToClipboard('${this.escapeQuotes(clip.text)}')">
            Copy
          </button>
          <button class="clipboard-item-btn" onclick="app.removeClip('${clip.id}')">
            Delete
          </button>
        </div>
      `;
      this.clipboardEntries.appendChild(clipElement);
    });
  }

  // Helper function to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Helper function to escape quotes for onclick attributes
  escapeQuotes(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  // Copy text to clipboard
  async copyToClipboard(text) {
    if (this.clipboardManager) {
      const success = await this.clipboardManager.copyToClipboard(text);
      if (success) {
        this.showNotification("Copied to clipboard!", "success", 2000);
      } else {
        this.showNotification("Failed to copy to clipboard", "error", 3000);
      }
    }
  }

  // Remove clip
  removeClip(clipId) {
    if (this.clipboardManager) {
      this.clipboardManager.removeClip(clipId);
      this.updateClipboardView();
      this.showNotification("Clip removed", "info", 2000);
    }
  }

  // Initialize and setup functionality
  //  init() {
  //    this.bindEvents();
  //    this.loadInitialData();
  //    this.setupKeyboardShortcuts();
  //    this.setupConnectionStability();
  //  }
  async init() {
    try {
      console.log("Initializing Klipy app...");

      // Initialize configuration
      this.config = new KlipyConfig();

      // Set up error monitoring for production
      this.setupErrorMonitoring();

      // Set up connection monitoring
      this.setupConnectionMonitoring();

      // Check for existing session first (24h auto-login)
      this.showNotification("Checking for existing session...", "info", 2000);
      const hasValidSession = await this.checkExistingSession();

      if (hasValidSession) {
        // User has valid session - auto login
        this.showNotification("Logging you in automatically...", "info", 2000);
        this.showMainInterface();
        this.setupAutoReconnect();
        console.log("Auto-login successful");
      } else {
        // Show auth interface
        this.showAuthInterface();
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      console.log("Klipy app initialized successfully");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.handleCriticalError(error);
    }
  }

  // Set up error monitoring for production
  setupErrorMonitoring() {
    this.errorCount = 0;
    this.maxErrors = 10;
    this.errorWindow = 5 * 60 * 1000; // 5 minutes
    this.lastErrorReset = Date.now();

    // Track different types of errors
    this.errorMetrics = {
      clipboard: 0,
      connection: 0,
      auth: 0,
      sync: 0,
    };
  }

  // Set up connection monitoring
  setupConnectionMonitoring() {
    this.connectionState = {
      status: "disconnected",
      lastConnected: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
    };

    // Monitor online/offline status
    window.addEventListener("online", () => {
      console.log("Network connection restored");
      this.handleNetworkRestore();
    });

    window.addEventListener("offline", () => {
      console.log("Network connection lost");
      this.handleNetworkLoss();
    });
  }

  // Setup auto-reconnection logic
  setupAutoReconnect() {
    // Initialize reconnection state
    this.reconnectState = {
      attempts: 0,
      maxAttempts: 10,
      baseDelay: 1000, // Start with 1 second
      maxDelay: 30000, // Cap at 30 seconds
      currentDelay: 1000,
    };

    console.log("Auto-reconnect system initialized");
  }

  // Handle network restoration
  handleNetworkRestore() {
    this.connectionState.status = "reconnecting";
    this.updateConnectionIndicator();

    // Attempt to reconnect after brief delay
    setTimeout(() => {
      this.attemptReconnection();
    }, 1000);
  }

  // Handle network loss
  handleNetworkLoss() {
    this.connectionState.status = "offline";
    this.updateConnectionIndicator();

    // Show offline notice
    this.showNotification(
      "Connection lost - will reconnect automatically",
      "warning"
    );
  }

  // Update connection status indicator
  updateConnectionIndicator() {
    const indicator = document.querySelector(".connection-status");
    if (!indicator) {
      this.createConnectionIndicator();
      return;
    }

    const { status } = this.connectionState;
    indicator.className = `connection-status ${status}`;

    const messages = {
      connected: "Connected",
      connecting: "Connecting...",
      reconnecting: "Reconnecting...",
      offline: "Offline",
      error: "Connection Error",
    };

    indicator.textContent = messages[status] || status;
  }

  // Create connection indicator
  createConnectionIndicator() {
    const indicator = document.createElement("div");
    indicator.className = "connection-status disconnected";
    indicator.textContent = "Disconnected";

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      .connection-status {
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        z-index: 1000;
        transition: all 0.3s ease;
      }
      
      .connection-status.connected {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }
      
      .connection-status.connecting,
      .connection-status.reconnecting {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeeba;
      }
      
      .connection-status.offline,
      .connection-status.error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }
      
      .connection-status.disconnected {
        background: #f8f9fa;
        color: #6c757d;
        border: 1px solid #dee2e6;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(indicator);
  }

  // Set up global error handlers
  setupGlobalErrorHandlers() {
    window.addEventListener("error", (event) => {
      this.logError("global", event.error);
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.logError("promise", event.reason);
    });
  }

  // Log and track errors
  logError(type, error) {
    this.errorCount++;
    this.errorMetrics[type] = (this.errorMetrics[type] || 0) + 1;

    // Reset error count if enough time has passed
    const now = Date.now();
    if (now - this.lastErrorReset > this.errorWindow) {
      this.errorCount = 1;
      this.lastErrorReset = now;
    }

    console.error(`[${type.toUpperCase()}] Error:`, error);

    // If too many errors, show user notification
    if (this.errorCount >= this.maxErrors) {
      this.handleCriticalError(error);
    }
  }

  // Handle critical errors
  handleCriticalError(error) {
    console.error("Critical error occurred:", error);

    // Provide more specific error messages based on error type
    let errorMessage = "An unexpected error occurred.";
    
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
    } else if (error.message.includes("authentication") || error.message.includes("login")) {
      errorMessage = "Authentication failed. Please try logging in again.";
    } else if (error.message.includes("multisynq") || error.message.includes("sync")) {
      errorMessage = "Sync service connection failed. Please check your API key and try again.";
    } else if (error.message.includes("timeout")) {
      errorMessage = "Request timed out. Please check your connection and try again.";
    } else {
      errorMessage = "Something unexpected happened. Please refresh the page or contact support if the problem persists.";
    }

    // Show user-friendly error message
    this.showNotification(
      errorMessage,
      "error",
      10000 // Show for 10 seconds
    );

    // In production, you might want to send errors to a logging service
    if (this.config.environment === "production") {
      this.sendErrorReport(error);
    }
  }

  // Send error reports (placeholder for production logging service)
  sendErrorReport(error) {
    // TODO: Implement error reporting service (e.g., Sentry)
    console.log("Error report sent:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.currentUser?.id,
    });
  }

  // Show notifications to user
  showNotification(message, type = "info", duration = 5000) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add notification styles if not present
    if (!document.querySelector("#notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
        .notification {
          position: fixed;
          top: 60px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 4px;
          font-size: 14px;
          z-index: 10000;
          max-width: 300px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          animation: slideIn 0.3s ease-out;
        }
        
        .notification.info {
          background: #d1ecf1;
          color: #0c5460;
          border: 1px solid #b6d4db;
        }
        
        .notification.warning {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeeba;
        }
        
        .notification.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .notification.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = "slideIn 0.3s ease-out reverse";
        setTimeout(() => notification.remove(), 300);
      }
    }, duration);
  }

  // Session Management Methods
  async checkExistingSession() {
    try {
      const token = localStorage.getItem('klipy-token');
      const sessionState = localStorage.getItem('klipy-session-state');
      
      if (!token || !sessionState) {
        console.log('No existing session found');
        return false;
      }
      
      const state = JSON.parse(sessionState);
      const now = Date.now();
      const sessionAge = now - state.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (sessionAge > maxAge) {
        console.log('Session expired (older than 24 hours)');
        this.clearSession();
        return false;
      }
      
      // Validate session with server
      this.showNotification("Validating your session...", "info", 1500);
      const isValid = await this.validateSession(token);
      if (!isValid) {
        console.log('Session validation failed');
        this.clearSession();
        this.showNotification("Session expired. Please log in again.", "warning", 3000);
        return false;
      }
      
      // Restore session
      this.currentUser = state.user;
      this.apiKey = state.apiKey;
      this.appId = state.appId;
      
      console.log('Valid session found - auto-logging in user:', this.currentUser.email);
      this.showNotification(`Welcome back, ${this.currentUser.name}!`, "info", 3000);
      return true;
      
    } catch (error) {
      console.warn('Error checking existing session:', error);
      this.clearSession();
      this.showNotification("Could not restore your session. Please log in again.", "warning", 3000);
      return false;
    }
  }

  // Validate session with server
  async validateSession(token) {
    try {
      const response = await this.database.validateToken(token);
      return response.success;
    } catch (error) {
      console.warn('Session validation error:', error);
      return false;
    }
  }

  // Save session state
  saveSessionState() {
    try {
      const sessionState = {
        user: this.currentUser,
        apiKey: this.apiKey,
        appId: this.appId,
        timestamp: Date.now()
      };
      localStorage.setItem('klipy-session-state', JSON.stringify(sessionState));
      console.log('Session state saved');
    } catch (error) {
      console.warn('Failed to save session state:', error);
    }
  }

  // Clear all session data
  clearSession() {
    localStorage.removeItem('klipy-token');
    localStorage.removeItem('klipy-session-state');
    console.log('Session cleared');
  }

  // Show authentication interface
  showAuthInterface() {
    console.log("Showing authentication interface");
    
    // Show auth container and hide dashboard
    if (this.authContainer) {
      this.authContainer.style.display = "flex";
    }
    if (this.dashboardContainer) {
      this.dashboardContainer.style.display = "none";
    }
    
    // Reset any form states
    this.resetAuthForms();
  }

  // Show main interface (same as showDashboard but for consistency)
  showMainInterface() {
    console.log("Showing main interface");
    return this.showDashboard();
  }

  // Reset authentication forms
  resetAuthForms() {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    
    // Reset any loading states
    const authBtns = document.querySelectorAll(".auth-btn");
    authBtns.forEach(btn => {
      btn.classList.remove("loading");
      btn.disabled = false;
    });
  }

  // Set up connection stability features
  setupConnectionStability() {
    // Set up heartbeat to maintain connection
    this.heartbeatInterval = setInterval(() => {
      if (this.session && this.isConnected) {
        try {
          // Send a lightweight ping to keep connection alive
          this.session.sendMessage("ping", { timestamp: Date.now() });
        } catch (error) {
          console.warn("Heartbeat failed:", error);
          this.handleConnectionFailure();
        }
      }
    }, 300000); // Every 5 minutes (much less aggressive)

    // Set up automatic reconnection logic
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3; // Reduced from 5
    this.lastReconnectAttempt = 0; // Track last attempt time

    // Handle visibility change to optimize connection
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // Page is hidden, reduce connection activity
        this.reduceConnectionActivity();
      } else {
        // Page is visible, restore full activity
        this.restoreConnectionActivity();
      }
    });
  }

  // Handle connection failure
  handleConnectionFailure() {
    // Prevent multiple simultaneous reconnection attempts
    if (this.isReconnecting) {
      return;
    }

    // Throttle reconnection attempts (minimum 30 seconds between attempts)
    const now = Date.now();
    if (now - this.lastReconnectAttempt < 30000) {
      console.log("Reconnection throttled - too soon since last attempt");
      return;
    }

    this.lastReconnectAttempt = now;
    this.isReconnecting = true;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      // Update UI to show reconnecting status
      if (this.syncStatus) {
        this.syncStatus.textContent = `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`;
        this.syncStatus.classList.remove("active");
      }
      
      setTimeout(() => {
        this.attemptReconnection();
      }, 2000 * this.reconnectAttempts); // Exponential backoff
    } else {
      console.error("Max reconnection attempts reached");
      this.handlePermanentDisconnection();
      this.isReconnecting = false;
    }
  }

  // Attempt to reconnect
  async attemptReconnection() {
    try {
      if (this.session && this.currentUser && this.apiKey) {
        // Clean up existing session monitoring
        this.cleanupSessionMonitoring();
        
        // Close the existing session
        try {
          await this.session.destroy();
        } catch (error) {
          console.warn("Error destroying old session:", error);
        }
        
        // Recreate the session
        await this.initializeMultisynq();
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        console.log("Successfully reconnected to Multisynq");
        
        // Update UI to show connection restored
        if (this.syncStatus) {
          this.syncStatus.textContent = "Connected to Multisynq - ready to sync";
          this.syncStatus.classList.add("active");
        }
      }
    } catch (error) {
      console.error("Reconnection failed:", error);
      this.isReconnecting = false;
      this.handleConnectionFailure();
    }
  }

  // Handle permanent disconnection
  handlePermanentDisconnection() {
    this.isConnected = false;
    if (this.syncStatus) {
      this.syncStatus.textContent = "Connection lost - click to retry";
      this.syncStatus.classList.remove("active");
    }
  }

  // Reduce connection activity when page is hidden
  reduceConnectionActivity() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      // Set up much longer interval when hidden
      this.heartbeatInterval = setInterval(() => {
        // Only log monitoring, don't trigger failures unless absolutely necessary
        if (this.isConnected && this.session) {
          console.log("Background monitoring: Connection appears stable");
        }
      }, 600000); // Every 10 minutes when hidden
    }
  }

  // Restore full connection activity when page is visible
  restoreConnectionActivity() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      // Restore normal interval - check session health less aggressively
      this.heartbeatInterval = setInterval(() => {
        // Only check if we actually think we're connected
        if (this.isConnected && this.session) {
          // Just log that we're monitoring - don't trigger failures
          console.log("Session monitoring: Connection appears healthy");
        }
      }, 300000); // Every 5 minutes when visible (much less aggressive)
    }
  }

  // Setup session error handling
  setupSessionErrorHandling() {
    if (!this.session) return;

    // Only monitor for actual critical errors, not missing properties
    // Multisynq will handle most connection issues internally
    console.log("Session error monitoring initialized (passive mode)");
    
    // We'll rely on the existing Multisynq event system rather than
    // actively polling for session health
  }

  // Clean up session monitoring
  cleanupSessionMonitoring() {
    if (this.sessionHealthInterval) {
      clearInterval(this.sessionHealthInterval);
      this.sessionHealthInterval = null;
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new KlipyApp();
  window.app.init();
});
