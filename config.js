// Klipy Configuration for Production/Beta

class KlipyConfig {
  constructor() {
    this.environment = this.detectEnvironment();
    this.maxUsers = 50; // Beta limit
    this.connectionLimits = {
      maxConcurrentConnections: 50,
      reconnectDelay: 2000,
      maxReconnectAttempts: 5,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      pingInterval: 30000, // 30 seconds
    };

    this.renderOptimizations = {
      keepAlive: true,
      healthCheckEndpoint: "/health",
      gracefulShutdown: true,
    };

    this.monitoring = {
      logLevel: this.environment === "production" ? "warn" : "debug",
      trackUserMetrics: true,
      trackPerformance: true,
    };
  }

  detectEnvironment() {
    if (window.location.hostname.includes("render.com")) {
      return "production";
    } else if (window.location.hostname === "localhost") {
      return "development";
    } else {
      return "staging";
    }
  }

  // Render.com specific optimizations
  getOptimizedSettings() {
    return {
      // Aggressive keep-alive for Render free tier
      keepAliveInterval: 10 * 60 * 1000, // 10 minutes

      // Connection pool management
      maxConnectionPool: Math.min(this.maxUsers, 25),

      // Bandwidth optimization
      compressionEnabled: true,
      batchUpdates: true,

      // Memory management
      clipboardHistoryLimit: 100,
      sessionCleanupInterval: 60 * 60 * 1000, // 1 hour
    };
  }

  // User capacity monitoring
  checkUserCapacity(currentUsers) {
    const usage = (currentUsers / this.maxUsers) * 100;

    if (usage > 90) {
      return { status: "critical", message: "Near capacity limit" };
    } else if (usage > 75) {
      return { status: "warning", message: "High usage detected" };
    } else {
      return { status: "ok", message: "Normal operation" };
    }
  }

  // Performance recommendations for Render.com
  getRenderRecommendations() {
    return {
      deployment: {
        nodejs: "18.x",
        startCommand: "node server.js",
        healthCheck: "/health",
        environment: {
          NODE_ENV: "production",
          PORT: process.env.PORT || 3000,
        },
      },

      optimization: {
        staticFileServing: true,
        gzipCompression: true,
        caching: {
          staticAssets: "1y",
          apiResponses: "5m",
        },
      },

      monitoring: {
        uptime: "https://render.com/docs/web-service-health-checks",
        logs: "Enable structured logging",
        alerts: "Set up Render dashboard alerts",
      },
    };
  }
}

// Export configuration
window.KlipyConfig = new KlipyConfig();

// Production monitoring
if (window.KlipyConfig.environment === "production") {
  // Simple analytics/monitoring
  window.KlipyMonitor = {
    userCount: 0,
    connectionErrors: 0,
    lastHealthCheck: Date.now(),

    track(event, data) {
      console.log(`[MONITOR] ${event}:`, data);
      // In production, send to your analytics service
    },

    healthCheck() {
      return {
        status: "healthy",
        userCount: this.userCount,
        errors: this.connectionErrors,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
      };
    },
  };

  // Start time tracking
  this.startTime = Date.now();
}

// Export for global use
window.KlipyConfig = KlipyConfig;
