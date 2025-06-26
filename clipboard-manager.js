// Clipboard Manager - Handles clipboard monitoring and management
class ClipboardManager {
  constructor() {
    this.clips = [];
    this.maxClips = 100;
    this.isMonitoring = false;
    this.lastClipText = "";
    this.monitoringInterval = null;
    this.listeners = new Map();

    // Auto-clipboard settings
    this.autoClipboardEnabled = false;
    this.hasClipboardWritePermission = false;
    this.lastUserInteraction = Date.now();
    this.isPageFocused = document.hasFocus();

    // Check clipboard API support
    this.hasClipboardAPI = navigator.clipboard && navigator.clipboard.readText;
    this.hasClipboardWrite =
      navigator.clipboard && navigator.clipboard.writeText;

    if (!this.hasClipboardAPI) {
      console.warn("Clipboard API not supported in this browser");
    }

    // Track page focus and user interaction
    this.setupFocusTracking();
    this.setupInteractionTracking();

    // iOS Safari specific clipboard handling
    this.setupIOSClipboardSupport();

    // Enhanced background processing for tab switching
    this.setupEnhancedBackgroundProcessing();
  }

  // Event listener system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in clipboard event handler:", error);
        }
      });
    }
  }

  // Start monitoring clipboard
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    if (this.hasClipboardAPI && !this.isIOSSafari) {
      // Use enhanced monitoring system
      this.adjustMonitoringToState();

      // Also listen for focus events to check immediately
      window.addEventListener("focus", () => this.checkClipboard());
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          this.checkClipboard();
        }
      });
    } else {
      // Fallback: listen for paste events (or iOS manual mode)
      document.addEventListener("paste", this.handlePasteEvent.bind(this));
    }

    console.log("Clipboard monitoring started");
    this.emit("monitoring-started");
  }

  // Stop monitoring clipboard
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    window.removeEventListener("focus", this.checkClipboard);
    document.removeEventListener("visibilitychange", this.checkClipboard);
    document.removeEventListener("paste", this.handlePasteEvent);

    console.log("Clipboard monitoring stopped");
    this.emit("monitoring-stopped");
  }

  // Check clipboard for new content
  async checkClipboard() {
    if (!this.hasClipboardAPI || !this.isMonitoring) return;

    // Skip if on iOS Safari (uses manual paste instead)
    if (this.isIOSSafari) {
      return this.checkClipboardIOS();
    }

    try {
      // Check if we have permission to read clipboard
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({
          name: "clipboard-read",
        });
        if (permission.state === "denied") {
          console.log("Clipboard read permission denied");
          return;
        }
      }

      const text = await navigator.clipboard.readText();

      if (text && text !== this.lastClipText && text.trim().length > 0) {
        console.log(
          "New clipboard content detected:",
          text.substring(0, 50) + "..."
        );
        this.processClipboardText(text);
      }
    } catch (error) {
      // Handle different types of clipboard errors gracefully
      if (
        error.name === "NotAllowedError" ||
        error.message.includes("denied")
      ) {
        // Permission denied - normal in some contexts
        console.log("Clipboard access denied (normal when page not focused)");
      } else if (error.name === "NotFoundError") {
        // No clipboard content
        console.log("No clipboard content found");
      } else {
        // Other errors
        console.warn("Clipboard read error:", error.name, error.message);
      }

      // If clipboard API fails repeatedly, fall back to paste event listening
      this.clipboardErrorCount = (this.clipboardErrorCount || 0) + 1;
      if (this.clipboardErrorCount > 10) {
        console.warn(
          "Multiple clipboard errors, switching to paste event mode"
        );
        this.hasClipboardAPI = false;
        this.clipboardErrorCount = 0;
      }
    }
  }

  // Handle paste events (fallback method)
  handlePasteEvent(event) {
    const text = event.clipboardData?.getData("text");
    if (text && text !== this.lastClipText && text.trim().length > 0) {
      this.lastClipText = text;
      this.addClip(text);
    }
  }

  // Add a new clip to the collection
  addClip(text, fromSync = false) {
    const clip = {
      id: Date.now() + Math.random(),
      text: text.trim(),
      timestamp: new Date(),
      fromSync: fromSync,
    };

    // Check if this exact text already exists in recent clips
    const recentDuplicate = this.clips
      .slice(0, 5)
      .find((c) => c.text === clip.text);
    if (recentDuplicate) {
      console.log("Duplicate clip ignored:", text.substring(0, 50) + "...");
      return null;
    }

    // Add to beginning of array
    this.clips.unshift(clip);

    // Keep only the last maxClips entries
    if (this.clips.length > this.maxClips) {
      this.clips = this.clips.slice(0, this.maxClips);
    }

    console.log("New clip added:", text.substring(0, 50) + "...");
    this.emit("clip-added", clip);

    return clip;
  }

  // Remove a clip by ID
  removeClip(clipId) {
    const index = this.clips.findIndex((clip) => clip.id === clipId);
    if (index > -1) {
      const removedClip = this.clips.splice(index, 1)[0];
      this.emit("clip-removed", removedClip);
      return removedClip;
    }
    return null;
  }

  // Clear all clips
  clearAllClips() {
    const count = this.clips.length;
    this.clips = [];
    this.lastClipText = "";
    this.emit("clips-cleared", { count });
    return count;
  }

  // Get all clips
  getAllClips() {
    return [...this.clips];
  }

  // Get clip count
  getClipCount() {
    return this.clips.length;
  }

  // Copy text to clipboard (if supported)
  async copyToClipboard(text) {
    if (!this.hasClipboardAPI) {
      console.warn("Clipboard write not supported");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.lastClipText = text; // Update to prevent re-adding
      console.log("Text copied to clipboard");
      return true;
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return false;
    }
  }

  // Setup focus tracking
  setupFocusTracking() {
    window.addEventListener("focus", () => {
      this.isPageFocused = true;
      console.log("Page focused - auto-clipboard enabled");
    });

    window.addEventListener("blur", () => {
      this.isPageFocused = false;
      console.log("Page blurred - auto-clipboard disabled");
    });

    // Check initial focus state
    this.isPageFocused = document.hasFocus();
  }

  // Setup interaction tracking
  setupInteractionTracking() {
    const events = ["click", "keydown", "touchstart", "mousemove"];
    events.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          this.lastUserInteraction = Date.now();
        },
        { passive: true }
      );
    });
  }

  // Check if we can write to clipboard (page focused + recent interaction)
  canWriteToClipboard() {
    const recentInteraction = Date.now() - this.lastUserInteraction < 5000; // 5 seconds
    return (
      this.hasClipboardWrite &&
      this.autoClipboardEnabled &&
      this.isPageFocused &&
      recentInteraction
    );
  }

  // Request clipboard write permission
  async requestClipboardWritePermission() {
    if (!this.hasClipboardWrite) {
      return false;
    }

    try {
      // Test write permission by attempting to write empty string
      await navigator.clipboard.writeText("");
      this.hasClipboardWritePermission = true;
      console.log("Clipboard write permission granted");
      return true;
    } catch (error) {
      console.warn("Clipboard write permission denied:", error);
      this.hasClipboardWritePermission = false;
      return false;
    }
  }

  // Enable auto-clipboard mode
  async enableAutoClipboard() {
    const hasPermission = await this.requestClipboardWritePermission();
    if (hasPermission) {
      this.autoClipboardEnabled = true;
      this.emit("auto-clipboard-enabled");
      return true;
    }
    return false;
  }

  // Disable auto-clipboard mode
  disableAutoClipboard() {
    this.autoClipboardEnabled = false;
    this.emit("auto-clipboard-disabled");
  }

  // Write text to clipboard with approval
  async writeToClipboard(text, options = {}) {
    if (!this.hasClipboardWrite) {
      console.warn("Clipboard write not supported");
      return { success: false, reason: "not_supported" };
    }

    // Check if we should ask for approval
    if (options.requireApproval !== false && !options.approved) {
      return { success: false, reason: "approval_required", text };
    }

    // Check if we can write (focus + recent interaction)
    if (!this.canWriteToClipboard() && !options.force) {
      return { success: false, reason: "no_permission", text };
    }

    try {
      await navigator.clipboard.writeText(text);
      console.log(
        "Successfully wrote to clipboard:",
        text.substring(0, 50) + "..."
      );
      this.emit("clipboard-written", { text });
      return { success: true, text };
    } catch (error) {
      console.error("Failed to write to clipboard:", error);
      return {
        success: false,
        reason: "write_failed",
        error: error.message,
        text,
      };
    }
  }

  // Format timestamp for display
  static formatTimestamp(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Get monitoring status
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      clipCount: this.clips.length,
      hasClipboardAPI: this.hasClipboardAPI,
      lastClipTime: this.clips.length > 0 ? this.clips[0].timestamp : null,
    };
  }

  // iOS Safari specific clipboard handling
  setupIOSClipboardSupport() {
    // Detect iOS Safari
    const isIOSSafari =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      /Safari/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);

    this.isIOSSafari = isIOSSafari;

    if (isIOSSafari) {
      console.log(
        "iOS Safari detected - implementing fallback clipboard method"
      );

      // Disable auto clipboard monitoring for iOS
      this.autoClipboardEnabled = false;

      // Create a more accessible paste button for iOS
      this.createIOSPasteInterface();

      // Override clipboard reading for iOS
      this.checkClipboard = this.checkClipboardIOS.bind(this);

      // Show iOS-specific instructions
      this.showIOSInstructions();
    }
    
    // Also create clipboard access button for all browsers that might need permission
    this.createClipboardAccessButton();
  }

  // Create dedicated paste interface for iOS
  createIOSPasteInterface() {
    // Create a floating paste button
    this.iosPasteButton = document.createElement("div");
    this.iosPasteButton.className = "ios-paste-button";
    this.iosPasteButton.innerHTML = `
      <div class="paste-btn">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M13.5 0a.5.5 0 0 1 .5.5V2a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 2 2V.5a.5.5 0 0 1 .5-.5h11zM2 3v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V3H2zm0-1h12V1a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1z"/>
        </svg>
        Paste
      </div>
    `;

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      .ios-paste-button {
        position: fixed;
        bottom: 80px;
        right: 20px;
        z-index: 1000;
        background: #007AFF;
        border-radius: 25px;
        box-shadow: 0 4px 12px rgba(0,122,255,0.3);
        animation: bounce 2s infinite;
      }
      
      .paste-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 12px 16px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        user-select: none;
      }
      
      @keyframes bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        60% { transform: translateY(-5px); }
      }
      
      .ios-paste-button:active {
        transform: scale(0.95);
      }
    `;
    document.head.appendChild(style);

    // Create hidden textarea for pasting
    this.iosClipboardTextarea = document.createElement("textarea");
    this.iosClipboardTextarea.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      opacity: 0;
      pointer-events: none;
    `;
    document.body.appendChild(this.iosClipboardTextarea);

    // Add click handler
    this.iosPasteButton.addEventListener("click", () => {
      this.handleIOSPaste();
    });

    document.body.appendChild(this.iosPasteButton);
  }

  // Handle iOS manual paste
  async handleIOSPaste() {
    try {
      // Try modern clipboard API first (may work in some iOS contexts)
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          this.processClipboardText(text);
          return;
        }
      }
    } catch (e) {
      console.log("Modern clipboard API failed on iOS, using fallback");
    }

    // Fallback: show instructions for manual paste
    this.showManualPastePrompt();
  }

  // Show manual paste prompt
  showManualPastePrompt() {
    const prompt = document.createElement("div");
    prompt.className = "ios-paste-prompt";
    prompt.innerHTML = `
      <div class="prompt-content">
        <h3>Paste Your Content</h3>
        <p>Tap in the box below and paste (Cmd+V or long-press → Paste)</p>
        <textarea placeholder="Paste your content here..." class="paste-area"></textarea>
        <div class="prompt-buttons">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-sync">Sync to Clipboard</button>
        </div>
      </div>
    `;

    // Add styles for the prompt
    const style = document.createElement("style");
    style.textContent = `
      .ios-paste-prompt {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      }
      
      .prompt-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      }
      
      .prompt-content h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        color: #333;
      }
      
      .prompt-content p {
        margin: 0 0 16px 0;
        color: #666;
        font-size: 14px;
      }
      
      .paste-area {
        width: 100%;
        min-height: 100px;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        resize: vertical;
        margin-bottom: 16px;
      }
      
      .paste-area:focus {
        outline: none;
        border-color: #007AFF;
      }
      
      .prompt-buttons {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      .prompt-buttons button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
      }
      
      .btn-cancel {
        background: #f0f0f0;
        color: #333;
      }
      
      .btn-sync {
        background: #007AFF;
        color: white;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(prompt);

    const textarea = prompt.querySelector(".paste-area");
    const cancelBtn = prompt.querySelector(".btn-cancel");
    const syncBtn = prompt.querySelector(".btn-sync");

    // Focus the textarea
    setTimeout(() => textarea.focus(), 100);

    // Handle cancel
    cancelBtn.addEventListener("click", () => {
      prompt.remove();
    });

    // Handle sync
    syncBtn.addEventListener("click", () => {
      const text = textarea.value.trim();
      if (text) {
        this.processClipboardText(text);
      }
      prompt.remove();
    });

    // Close on background click
    prompt.addEventListener("click", (e) => {
      if (e.target === prompt) {
        prompt.remove();
      }
    });
  }

  // Process clipboard text (shared between regular and iOS)
  processClipboardText(text) {
    if (text && text !== this.lastClipText) {
      this.lastClipText = text;
      this.addClip(text);

      // Show success feedback
      this.showSyncSuccess();
    }
  }

  // Show sync success feedback
  showSyncSuccess() {
    // Create a simple success notification
    const notification = document.createElement('div');
    notification.className = 'sync-success-notification';
    notification.innerHTML = `
      <div class="sync-success-content">
        <i class="fas fa-check-circle"></i>
        <span>Synced!</span>
      </div>
    `;
    
    // Add styles
    if (!document.querySelector('#sync-success-styles')) {
      const style = document.createElement('style');
      style.id = 'sync-success-styles';
      style.textContent = `
        .sync-success-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 500;
          animation: slideInRight 0.3s ease-out;
        }
        
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .sync-success-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // iOS clipboard checking method
  async checkClipboardIOS() {
    // On iOS, we can't automatically read clipboard
    // The user will manually trigger clipboard sync via the paste button
    console.log("iOS clipboard check - manual paste mode active");
    return false; // Don't auto-check on iOS
  }

  // Show iOS-specific instructions (simplified)
  showIOSInstructions() {
    // Create a simple alert notification
    const alert = document.createElement('div');
    alert.className = 'ios-alert-notification';
    alert.innerHTML = `
      <div class="alert-content">
        <i class="fas fa-info-circle"></i>
        <div class="alert-text">
          <strong>iOS Safari Mode:</strong> Use the blue Paste button to manually sync clipboard content.
        </div>
        <button class="alert-close">&times;</button>
      </div>
    `;
    
    // Add styles
    if (!document.querySelector('#ios-alert-styles')) {
      const style = document.createElement('style');
      style.id = 'ios-alert-styles';
      style.textContent = `
        .ios-alert-notification {
          position: fixed;
          top: 20px;
          left: 20px;
          right: 20px;
          background: #fbbf24;
          color: #92400e;
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
          z-index: 1000;
          max-width: 400px;
          margin: 0 auto;
        }
        
        .alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .alert-text {
          flex: 1;
          font-size: 14px;
        }
        
        .alert-close {
          background: none;
          border: none;
          color: #92400e;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(alert);
    
    // Handle close button
    alert.querySelector('.alert-close').addEventListener('click', () => {
      alert.remove();
    });
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      alert.remove();
    }, 8000);
  }

  // Enhanced background processing for tab switching
  setupEnhancedBackgroundProcessing() {
    // Different monitoring intervals for different states
    this.originalMonitoringInterval = 1000; // 1 second when active
    this.backgroundMonitoringInterval = 2000; // 2 seconds when hidden
    this.aggressiveMonitoringInterval = 500; // 0.5 seconds for brief periods
    this.focusedMonitoringInterval = 800; // Slightly faster when focused

    // Track visibility state more accurately
    this.isPageVisible = !document.hidden;
    this.isWindowFocused = document.hasFocus();

    // Use multiple event listeners for better browser support
    this.setupVisibilityTracking();
    this.setupFocusTracking();
    this.setupActivityDetection();

    // Set up monitoring based on current state
    this.adjustMonitoringToState();
  }

  setupVisibilityTracking() {
    // Page Visibility API - better than focus/blur for tabs
    document.addEventListener("visibilitychange", () => {
      this.isPageVisible = !document.hidden;
      console.log(
        `Page visibility changed: ${this.isPageVisible ? "visible" : "hidden"}`
      );

      if (this.isPageVisible) {
        // Page became visible - check clipboard immediately
        setTimeout(() => {
          this.checkClipboard();
        }, 100);

        // Switch to focused monitoring
        this.adjustMonitoringToState();
      } else {
        // Page hidden - switch to background monitoring
        this.adjustMonitoringToState();
      }
    });
  }

  setupFocusTracking() {
    let lastFocusTime = Date.now();

    window.addEventListener("blur", () => {
      this.isWindowFocused = false;
      lastFocusTime = Date.now();
      console.log("Window lost focus - user might be copying elsewhere");

      // Start aggressive monitoring for potential clipboard changes
      this.switchToAggressiveMonitoring();
    });

    window.addEventListener("focus", () => {
      this.isWindowFocused = true;
      const timeAway = Date.now() - lastFocusTime;
      console.log(
        `Window regained focus after ${timeAway}ms - checking for new clipboard content`
      );

      // Immediately check clipboard when returning
      setTimeout(() => {
        this.checkClipboard();
      }, 100);

      // Adjust monitoring based on new state
      this.adjustMonitoringToState();
    });
  }

  setupActivityDetection() {
    // Listen for user activity that might indicate copying
    const activityEvents = ["keydown", "mousedown", "mouseup", "touchstart"];

    activityEvents.forEach((eventType) => {
      document.addEventListener(eventType, (e) => {
        // Update last interaction time
        this.lastUserInteraction = Date.now();

        // Detect copy-related shortcuts
        if (eventType === "keydown") {
          if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "x")) {
            console.log("Copy/Cut shortcut detected - monitoring clipboard");
            setTimeout(() => {
              this.checkClipboard();
            }, 200);
          }
        }
      });
    });
  }

  adjustMonitoringToState() {
    if (!this.isMonitoring) return;

    // Clear existing interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    let interval;

    if (!this.isPageVisible) {
      // Page is hidden - use background monitoring
      interval = this.backgroundMonitoringInterval;
      console.log("Switched to background monitoring (page hidden)");
    } else if (this.isWindowFocused) {
      // Page visible and focused - use normal monitoring
      interval = this.focusedMonitoringInterval;
      console.log("Switched to focused monitoring");
    } else {
      // Page visible but not focused - use normal monitoring
      interval = this.originalMonitoringInterval;
      console.log("Switched to normal monitoring");
    }

    this.monitoringInterval = setInterval(() => {
      this.checkClipboard();
    }, interval);
  }

  switchToAggressiveMonitoring() {
    if (this.aggressiveMode) return;

    this.aggressiveMode = true;
    console.log("Switching to aggressive clipboard monitoring");

    // Clear existing interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Set aggressive monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkClipboard();
    }, this.aggressiveMonitoringInterval);

    // Auto-return to normal after 30 seconds
    setTimeout(() => {
      this.switchToNormalMonitoring();
    }, 30000);
  }

  switchToNormalMonitoring() {
    if (!this.aggressiveMode) return;

    this.aggressiveMode = false;
    console.log("Returning to normal clipboard monitoring");

    // Return to state-based monitoring
    this.adjustMonitoringToState();
  }

  // Detect potential copy operations
  setupCopyDetection() {
    // Listen for common copy keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "a")) {
        console.log("Copy shortcut detected - increasing monitoring");
        this.switchToAggressiveMonitoring();
      }
    });

    // Listen for selection changes that might indicate copying
    document.addEventListener("selectionchange", () => {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        console.log("Text selection detected - user might copy");
        // Brief aggressive monitoring
        setTimeout(() => {
          this.checkClipboard();
        }, 500);
      }
    });
  }

  // Create universal clipboard access button
  createClipboardAccessButton() {
    this.clipboardAccessButton = document.createElement("div");
    this.clipboardAccessButton.className = "clipboard-access-button hidden";
    this.clipboardAccessButton.innerHTML = `
      <div class="access-btn">
        <i class="fas fa-clipboard-check"></i>
        <span>Paste Clipboard Content</span>
        <small>Click to paste what you copied</small>
      </div>
    `;

    // Add styles
    if (!document.querySelector('#clipboard-access-styles')) {
      const style = document.createElement("style");
      style.id = 'clipboard-access-styles';
      style.textContent = `
        .clipboard-access-button {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10000;
          background: #8b5cf6;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4);
          animation: pulse 2s infinite;
          cursor: pointer;
          user-select: none;
        }
        
        .clipboard-access-button.hidden {
          display: none !important;
        }
        
        .access-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 24px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-align: center;
        }
        
        .access-btn i {
          font-size: 24px;
          margin-bottom: 4px;
        }
        
        .access-btn small {
          font-size: 12px;
          font-weight: 400;
          opacity: 0.8;
        }
        
        .clipboard-access-button:hover {
          transform: translate(-50%, -50%) scale(1.05);
        }
        
        .clipboard-access-button:active {
          transform: translate(-50%, -50%) scale(0.95);
        }
        
        @keyframes pulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4); }
          50% { box-shadow: 0 8px 32px rgba(139, 92, 246, 0.6); }
        }
      `;
      document.head.appendChild(style);
    }

    // Add click handler
    this.clipboardAccessButton.addEventListener("click", async () => {
      await this.requestClipboardPermission();
    });

    document.body.appendChild(this.clipboardAccessButton);
  }

  // Request clipboard permission
  async requestClipboardPermission() {
    try {
      // Show the manual paste prompt directly instead of trying to request permission
      console.log("Showing manual paste interface...");
      this.showManualPastePrompt();
      this.hideClipboardAccessButton();
      return true;
    } catch (error) {
      console.log("Error showing paste interface:", error);
      this.showClipboardNotification("Could not show paste interface", "error", 4000);
      return false;
    }
  }

  // Show clipboard access button
  showClipboardAccessButton() {
    if (this.clipboardAccessButton) {
      this.clipboardAccessButton.classList.remove("hidden");
    }
  }

  // Hide clipboard access button
  hideClipboardAccessButton() {
    if (this.clipboardAccessButton) {
      this.clipboardAccessButton.classList.add("hidden");
    }
  }

  // Show notification helper for clipboard manager
  showClipboardNotification(message, type = "info", duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `clipboard-notification ${type}`;
    notification.textContent = message;

    // Add styles if not present
    if (!document.querySelector('#clipboard-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'clipboard-notification-styles';
      style.textContent = `
        .clipboard-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          z-index: 1000;
          max-width: 300px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          animation: slideInRight 0.3s ease-out;
        }
        
        .clipboard-notification.success {
          background: #10b981;
        }
        
        .clipboard-notification.warning {
          background: #f59e0b;
        }
        
        .clipboard-notification.info {
          background: #3b82f6;
        }
        
        .clipboard-notification.error {
          background: #ef4444;
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove
    setTimeout(() => {
      notification.style.animation = 'slideInRight 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
}

// Export for use in other scripts
window.ClipboardManager = ClipboardManager;
