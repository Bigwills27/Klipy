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

    if (this.hasClipboardAPI) {
      // Use Clipboard API with polling
      this.monitoringInterval = setInterval(() => {
        this.checkClipboard();
      }, 1000); // Check every second

      // Also listen for focus events to check immediately
      window.addEventListener("focus", () => this.checkClipboard());
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          this.checkClipboard();
        }
      });
    } else {
      // Fallback: listen for paste events
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

    try {
      const text = await navigator.clipboard.readText();

      if (text && text !== this.lastClipText && text.trim().length > 0) {
        this.lastClipText = text;
        this.addClip(text);
      }
    } catch (error) {
      // Clipboard access might be denied - this is normal
      // Only log if it's not a permission error
      if (
        !error.message.includes("denied") &&
        !error.message.includes("permission")
      ) {
        console.warn("Error reading clipboard:", error);
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
}

// Export for use in other scripts
window.ClipboardManager = ClipboardManager;
