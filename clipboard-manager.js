// Clipboard Manager - Handles clipboard monitoring and management
class ClipboardManager {
  constructor() {
    this.clips = [];
    this.maxClips = 100;
    this.isMonitoring = false;
    this.lastClipText = "";
    this.monitoringInterval = null;
    this.listeners = new Map();

    // Check clipboard API support
    this.hasClipboardAPI = navigator.clipboard && navigator.clipboard.readText;
    this.hasClipboardWrite = navigator.clipboard && navigator.clipboard.writeText;

    if (!this.hasClipboardAPI) {
      console.warn("Clipboard API not supported in this browser");
    }

    // Track page focus for clipboard monitoring
    this.isPageFocused = document.hasFocus();
    this.setupFocusTracking();
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
      this.listeners.get(event).forEach((callback) => callback(data));
    }
  }

  // Setup focus tracking
  setupFocusTracking() {
    window.addEventListener("focus", () => {
      this.isPageFocused = true;
    });

    window.addEventListener("blur", () => {
      this.isPageFocused = false;
    });
  }

  // Check and request clipboard permission
  async checkClipboardPermission() {
    if (!this.hasClipboardAPI) {
      throw new Error("Clipboard API not supported");
    }

    try {
      // Try to read clipboard to check permission
      await navigator.clipboard.readText();
      return true;
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        // Show permission prompt
        alert('Clipboard access is required for sync to work. Please allow clipboard access when prompted.');
        try {
          // Try again after user sees the message
          await navigator.clipboard.readText();
          return true;
        } catch (secondError) {
          throw new Error('Clipboard permission denied. Please enable in browser settings.');
        }
      }
      throw error;
    }
  }

  // Start monitoring clipboard
  async startMonitoring() {
    if (!this.hasClipboardAPI) {
      throw new Error("Clipboard API not supported");
    }

    if (this.isMonitoring) {
      console.log("Clipboard monitoring already active");
      return true;
    }

    try {
      // Check permission first
      await this.checkClipboardPermission();
      
      // Set current clipboard as baseline to avoid immediate trigger
      const currentClipboard = await navigator.clipboard.readText();
      this.lastClipText = currentClipboard;
      
      this.isMonitoring = true;
      this.monitoringInterval = setInterval(() => {
        this.checkClipboard();
      }, 1000); // Check every second

      console.log("Clipboard monitoring started");
      this.emit("monitoringStarted");
      return true;
    } catch (error) {
      console.error("Failed to start clipboard monitoring:", error);
      throw error;
    }
  }

  // Stop monitoring clipboard
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log("Clipboard monitoring stopped");
    this.emit("monitoringStopped");
  }

  // Check clipboard for changes
  async checkClipboard() {
    if (!this.hasClipboardAPI || !this.isPageFocused) return;

    try {
      const text = await navigator.clipboard.readText();
      if (text && text !== this.lastClipText && text.trim().length > 0) {
        this.lastClipText = text;
        this.addClip(text);
        this.emit("clipboardChanged", text);
        console.log("New clipboard content detected:", text.substring(0, 50) + "...");
      }
    } catch (error) {
      // Silently handle permission errors during monitoring
      if (!error.message.includes("not allowed")) {
        console.warn("Clipboard check failed:", error);
      }
    }
  }

  // Manually check clipboard for changes (useful for refresh button)
  async manualCheckClipboard() {
    if (!this.hasClipboardAPI) {
      throw new Error("Clipboard API not supported");
    }

    try {
      const text = await navigator.clipboard.readText();
      console.log("Manual clipboard check - current content:", text ? text.substring(0, 50) + "..." : "empty");
      
      if (!text || text.trim().length === 0) {
        console.log("Manual check: clipboard is empty");
        return false;
      }
      
      // Check if it's already in our clips history (avoid duplicates)
      if (this.hasRecentClip(text)) {
        console.log("Manual check: content already exists in history");
        return false;
      }
      
      // Check if it's different from last known clipboard text
      if (text === this.lastClipText) {
        console.log("Manual check: content hasn't changed since last check");
        return false;
      }
      
      // Add the new content
      this.lastClipText = text;
      this.addClip(text);
      this.emit("clipboardChanged", text);
      console.log("Manual check found new clipboard content:", text.substring(0, 50) + "...");
      return true; // New content found and added
    } catch (error) {
      console.error("Manual clipboard check failed:", error);
      throw error;
    }
  }

  // Check if text already exists in recent clips (avoid duplicates)
  hasRecentClip(text) {
    if (!text || text.trim().length === 0) return false;
    
    // Check if exact text already exists in clips
    return this.clips.some(clip => clip.text === text);
  }

  // Add current clipboard content if it doesn't already exist (for sync activation/reconnection)
  async addCurrentClipboardIfNew() {
    if (!this.hasClipboardAPI) {
      console.log("Clipboard API not supported, skipping current clipboard check");
      return false;
    }

    try {
      const currentText = await navigator.clipboard.readText();
      
      if (!currentText || currentText.trim().length === 0) {
        console.log("No clipboard content found");
        return false;
      }

      if (this.hasRecentClip(currentText)) {
        console.log("Current clipboard content already exists in history, skipping duplicate");
        return false;
      }

      // Add current clipboard content to history
      // 📋 Found something interesting in your clipboard! Adding it to the collection! 🗃️
      this.addClip(currentText);
      return true;
    } catch (error) {
      console.warn("Could not check current clipboard content:", error);
      return false;
    }
  }

  // Add clipboard item
  addClip(text) {
    const clip = {
      id: Date.now(),
      text: text,
      timestamp: new Date(),
      device: navigator.userAgent.includes("Mobile") ? "Mobile" : "Desktop",
    };

    // Remove duplicate if exists
    const originalCount = this.clips.length;
    this.clips = this.clips.filter((c) => c.text !== text);
    
    if (originalCount !== this.clips.length) {
      console.log("Removed", originalCount - this.clips.length, "duplicate(s) for:", text.substring(0, 30) + "...");
    }

    // Add to beginning
    this.clips.unshift(clip);

    // Limit number of clips
    if (this.clips.length > this.maxClips) {
      this.clips = this.clips.slice(0, this.maxClips);
    }

    console.log("Clip added. Total clips:", this.clips.length);
    this.emit("clipAdded", clip);
    return clip;
  }

  // Copy text to clipboard
  async copyToClipboard(text) {
    if (!this.hasClipboardWrite) {
      throw new Error("Clipboard write not supported");
    }

    try {
      await navigator.clipboard.writeText(text);
      this.lastClipText = text; // Update to prevent duplicate detection
      console.log("Text copied to clipboard");
      return true;
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      throw error;
    }
  }

  // Get all clips
  getClips() {
    return this.clips;
  }

  // Clear all clips
  clearClips() {
    this.clips = [];
    this.emit("clipsCleared");
  }

  // Remove specific clip
  removeClip(id) {
    this.clips = this.clips.filter((clip) => clip.id !== id);
    this.emit("clipRemoved", id);
  }

  // Format timestamp for display
  static formatTimestamp(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  // Get monitoring status
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      hasClipboardAPI: this.hasClipboardAPI,
      hasClipboardWrite: this.hasClipboardWrite,
      clipCount: this.clips.length,
    };
  }
}