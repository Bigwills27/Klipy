// MongoDB Integration for Klipy
class KlipyDatabase {
  constructor() {
    this.MONGODB_URI =
      "mongodb+srv://yudtkme:yudtkme20@tabmc.zhquyvw.mongodb.net/klipy";
    this.dbName = "klipy";
    this.collections = {
      users: "Users",
      devices: "Devices",
      sessions: "Sessions",
    };

    // Detect API base URL for cross-device access
    this.baseUrl = this.detectApiBaseUrl();
    console.log("Database API base URL:", this.baseUrl);
  }

  // Detect the correct API base URL
  detectApiBaseUrl() {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const protocol = window.location.protocol;

    // For production deployment (like Render)
    if (hostname.includes("onrender.com") || hostname.includes("render.com")) {
      return window.location.origin;
    }

    // For localhost development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:3000`;
    }

    // For mobile access using laptop IP or other network access
    return window.location.origin;
  }

  // User Management
  async createUser(userData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          data: userData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async authenticateUser(email, password) {
    try {
      console.log(
        "Attempting authentication for:",
        email,
        "using API:",
        `${this.baseUrl}/api/users`
      );

      const response = await fetch(`${this.baseUrl}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "authenticate",
          data: { email, password },
        }),
      });

      console.log("Authentication response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Authentication failed:", response.status, errorText);
        throw new Error(
          `Authentication failed: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log(
        "Authentication result:",
        result.success ? "Success" : "Failed"
      );
      return result;
    } catch (error) {
      console.error("Error authenticating user:", error);
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        throw new Error(
          "Network error: Cannot connect to server. Check your connection and try again."
        );
      }
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update",
          userId,
          data: updateData,
        }),
      });
      return await response.json();
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  // Device Management
  async registerDevice(deviceData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "register",
          data: deviceData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error registering device:", error);
      throw error;
    }
  }

  async getActiveDevices(userId) {
    try {
      const response = await fetch(`/api/devices?userId=${userId}&active=true`);
      return await response.json();
    } catch (error) {
      console.error("Error getting active devices:", error);
      throw error;
    }
  }

  async updateDeviceStatus(deviceId, isActive) {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateStatus",
          deviceId,
          isActive,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating device status:", error);
      throw error;
    }
  }

  // Session Management
  async createSession(sessionData) {
    try {
      const response = await fetch(`${this.baseUrl}/api/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          data: sessionData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }
}

// Export for global access
window.KlipyDatabase = KlipyDatabase;
