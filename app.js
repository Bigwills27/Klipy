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
    this.userNameSpan = document.getElementById("user-name");
    this.logoutBtn = document.getElementById("logout-btn");
    this.syncToggleBtn = document.getElementById("sync-toggle");
    this.syncStatus = document.getElementById("sync-status");
    this.entriesCount = document.getElementById("entries-count");
    this.clipboardEntries = document.getElementById("clipboard-entries");

    // Dev controls
    this.testClipBtn = document.getElementById("test-clip-btn");
    this.clearClipsBtn = document.getElementById("clear-clips-btn");
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
      alert("Please fill in all fields including your Multisynq API key");
      return;
    }

    // Set loading state
    loginBtn.classList.add("loading");
    loginBtn.disabled = true;
    loginBtn.textContent = "Signing In...";

    try {
      // Authenticate with database
      const result = await this.database.authenticateUser(email, password);

      if (result.success) {
        // Store API key and user data
        this.apiKey = apiKey;
        this.currentUser = result.user;

        // Store token for future requests
        localStorage.setItem("klipy-token", result.token);

        await this.showDashboard();
      } else {
        alert(`Login failed: ${result.error || "Invalid credentials"}`);
      }
    } catch (error) {
      console.error("Login error:", error);

      // Provide more specific error messages
      if (error.message.includes("Failed to fetch")) {
        alert(
          "Cannot connect to server. Please check your internet connection and make sure the server is running."
        );
      } else if (error.message.includes("NetworkError")) {
        alert(
          "Network error. If you're on mobile, make sure you're connected to the same network as the server."
        );
      } else {
        alert(`Login failed: ${error.message || "Please try again."}`);
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
      alert("Please fill in all fields including your Multisynq API key");
      return;
    }

    // Set loading state
    signupBtn.classList.add("loading");
    signupBtn.disabled = true;
    signupBtn.textContent = "Creating Account...";

    try {
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

        await this.showDashboard();
      } else {
        alert(`Signup failed: ${result.error || "Please try again"}`);
      }
    } catch (error) {
      console.error("Signup error:", error);

      // Provide more specific error messages
      if (error.message.includes("Failed to fetch")) {
        alert(
          "Cannot connect to server. Please check your internet connection and make sure the server is running."
        );
      } else if (error.message.includes("NetworkError")) {
        alert(
          "Network error. If you're on mobile, make sure you're connected to the same network as the server."
        );
      } else {
        alert(`Signup failed: ${error.message || "Please try again."}`);
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

    // Update user info in header
    const userNameElement = document.querySelector(".user-name");
    const userRoleElement = document.querySelector(".user-role");

    if (userNameElement) {
      userNameElement.textContent = this.currentUser.name || "User";
    }
    if (userRoleElement) {
      userRoleElement.textContent = "Premium User"; // You can customize this based on user data
    }

    // Initialize Multisynq session
    await this.initializeMultisynq();

    console.log("Dashboard shown for user:", this.currentUser.email);
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

    // Clear local storage
    localStorage.removeItem("klipy-token");

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

      // Update sync status
      if (this.syncStatus) {
        this.syncStatus.textContent = "Connected to Multisynq - ready to sync";
        this.syncStatus.classList.add("active");
      }

      // Setup connection stability features
      this.setupConnectionStability();

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

  // Initialize and setup functionality
  //  init() {
  //    this.bindEvents();
  //    this.loadInitialData();
  //    this.setupKeyboardShortcuts();
  //    this.setupConnectionStability();
  //  }
  async init() {
    this.bindEvents();
    this.loadInitialData();
    this.setupKeyboardShortcuts();
    // Attempt to restore previous session state
    if (this.restoreSessionState()) {
      try {
        await this.initializeMultisynq();
        await this.showDashboard();
      } catch (e) {
        console.warn("Auto session restore failed:", e);
      }
    }
    this.setupConnectionStability();
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector(".search-input");
        if (searchInput) {
          searchInput.focus();
        }
      }
    });
  }

  // Load initial data and setup
  loadInitialData() {
    console.log("Loading initial app data...");
    // Additional initialization can be added here
  }

  // Setup connection stability features
  setupConnectionStability() {
    // 1. Keep-alive mechanism - ping every 30 seconds
    this.keepAliveInterval = setInterval(() => {
      this.pingSession();
    }, 30000);

    // 2. Handle page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        console.log("Tab became hidden - maintaining connection");
        this.handleTabHidden();
      } else {
        console.log("Tab became visible - checking connection");
        this.handleTabVisible();
      }
    });

    // 3. Handle page focus/blur
    window.addEventListener("focus", () => {
      console.log("Window focused - checking connection");
      this.checkAndReconnect();
    });

    window.addEventListener("blur", () => {
      console.log("Window blurred - saving state");
      this.saveSessionState();
    });

    // 4. Handle beforeunload to maintain session
    window.addEventListener("beforeunload", () => {
      console.log("Page unloading - saving session state");
      this.saveSessionState();
    });

    // 5. Network status monitoring
    window.addEventListener("online", () => {
      console.log("Network came online - reconnecting");
      this.checkAndReconnect();
    });

    window.addEventListener("offline", () => {
      console.log("Network went offline");
      this.handleNetworkOffline();
    });

    // 6. Connection monitoring timer
    this.connectionCheckInterval = setInterval(() => {
      this.monitorConnection();
    }, 5000); // Check every 5 seconds
  }

  // Ping session to keep it alive
  async pingSession() {
    if (!this.session || !this.isConnected) return;

    try {
      // Send a lightweight ping to keep the session active
      if (this.clipboardView) {
        this.clipboardView.publish("clipboard", "ping", {
          deviceId: this.clipboardView.deviceId,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.warn("Session ping failed:", error);
      this.handleConnectionLoss();
    }
  }

  // Handle tab becoming hidden
  handleTabHidden() {
    if (this.session && this.isConnected) {
      // Reduce ping frequency when hidden but keep connection
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = setInterval(() => {
        this.pingSession();
      }, 60000); // Ping every minute when hidden

      // Save current state
      this.saveSessionState();
    }
  }

  // Handle tab becoming visible
  async handleTabVisible() {
    // Restore normal ping frequency
    clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = setInterval(() => {
      this.pingSession();
    }, 30000);

    // Check connection and reconnect if needed
    await this.checkAndReconnect();
  }

  // Save session state to localStorage
  saveSessionState() {
    if (this.session && this.currentUser && this.apiKey) {
      const sessionState = {
        user: this.currentUser,
        apiKey: this.apiKey,
        appId: this.appId,
        timestamp: Date.now(),
        isConnected: this.isConnected,
      };
      localStorage.setItem("klipy-session-state", JSON.stringify(sessionState));
    }
  }

  // Restore session state from localStorage
  restoreSessionState() {
    try {
      const savedState = localStorage.getItem("klipy-session-state");
      if (savedState) {
        const state = JSON.parse(savedState);
        // Only restore if saved within last 30 minutes
        if (Date.now() - state.timestamp < 30 * 60 * 1000) {
          this.currentUser = state.user;
          this.apiKey = state.apiKey;
          this.appId = state.appId;
          return true;
        }
      }
    } catch (error) {
      console.warn("Failed to restore session state:", error);
    }
    return false;
  }

  // Check connection and reconnect if needed
  async checkAndReconnect() {
    if (!this.session || !this.isConnected) {
      console.log("Attempting to reconnect...");
      await this.attemptReconnection();
      return;
    }

    // Test if session is still active
    try {
      if (this.clipboardView) {
        // Try to communicate with the session
        this.clipboardView.publish("clipboard", "connection-test", {
          deviceId: this.clipboardView.deviceId,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.log("Connection test failed, reconnecting...", error);
      await this.attemptReconnection();
    }
  }

  // Attempt to reconnect to session
  async attemptReconnection() {
    if (this.reconnecting) return; // Prevent multiple simultaneous reconnection attempts
    this.reconnecting = true;

    try {
      console.log("Attempting session reconnection...");

      // Update UI to show reconnecting status
      if (this.syncStatus) {
        this.syncStatus.textContent = "Reconnecting...";
        this.syncStatus.classList.remove("active");
      }

      // Clean up old session
      if (this.session) {
        try {
          await this.session.leave();
        } catch (error) {
          console.warn("Error leaving old session:", error);
        }
      }

      // Restore session state if available
      if (!this.currentUser || !this.apiKey) {
        if (!this.restoreSessionState()) {
          console.log("No valid session state to restore");
          this.redirectToLogin();
          return;
        }
      }

      // Reinitialize connection
      await this.initializeMultisynq();

      if (this.isConnected) {
        console.log("Successfully reconnected to session");

        // Update UI
        if (this.syncStatus) {
          this.syncStatus.textContent = "Reconnected - syncing active";
          this.syncStatus.classList.add("active");
        }
      }
    } catch (error) {
      console.error("Reconnection failed:", error);

      // Update UI to show failure
      if (this.syncStatus) {
        this.syncStatus.textContent = "Connection lost - click to reconnect";
        this.syncStatus.classList.remove("active");
      }

      // Schedule retry
      setTimeout(() => {
        this.attemptReconnection();
      }, 10000); // Retry in 10 seconds
    } finally {
      this.reconnecting = false;
    }
  }

  // Monitor connection health
  monitorConnection() {
    if (!this.session || !this.isConnected) return;

    // Check if we're still properly connected
    try {
      // Check if session object is still valid
      if (!this.session.model || !this.session.view) {
        console.warn("Session objects missing, connection may be lost");
        this.handleConnectionLoss();
        return;
      }

      // Update last seen timestamp
      this.lastConnectionCheck = Date.now();
    } catch (error) {
      console.warn("Connection monitor error:", error);
      this.handleConnectionLoss();
    }
  }

  // Handle connection loss
  handleConnectionLoss() {
    if (this.isConnected) {
      console.log("Connection loss detected");
      this.isConnected = false;

      // Update UI
      if (this.syncStatus) {
        this.syncStatus.textContent = "Connection lost - reconnecting...";
        this.syncStatus.classList.remove("active");
      }

      // Attempt reconnection
      this.attemptReconnection();
    }
  }

  // Handle network offline
  handleNetworkOffline() {
    this.isConnected = false;
    if (this.syncStatus) {
      this.syncStatus.textContent = "No internet connection";
      this.syncStatus.classList.remove("active");
    }
  }

  // Redirect to login if session cannot be restored
  redirectToLogin() {
    console.log("Redirecting to login due to session loss");
    this.isConnected = false;

    // Clear stored session
    localStorage.removeItem("klipy-session-state");
    localStorage.removeItem("klipy-token");

    // Show login screen
    if (this.authContainer) {
      this.authContainer.style.display = "flex";
    }
    if (this.dashboardContainer) {
      this.dashboardContainer.style.display = "none";
    }
  }

  // Cleanup intervals and listeners
  cleanup() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new KlipyApp();
  window.app.init();
});
