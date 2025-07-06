const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const rateLimit = require("express-rate-limit");
const CryptoJS = require("crypto-js");

// Load environment variables
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET =
  process.env.JWT_SECRET || "klipy-secret-key-change-in-production";

let db;

// Beta configuration
const BETA_CONFIG = {
  maxUsers: 50,
  registrationEnabled: true,
  requireInviteCode: false,
  inviteCode: process.env.BETA_INVITE_CODE || "klipy-beta-2025",
};

// Rate limiting middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === "development" ? 50 : 5, // Higher limit for development
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: NODE_ENV === "development" ? 20 : 3, // Higher limit for development
  message: "Too many registration attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Email check rate limiter
const emailCheckLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 email checks per 5 minutes
  message: "Too many email check attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// API key validation rate limiter
const apiKeyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // limit each IP to 10 API key operations per 10 minutes
  message: "Too many API key operations, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(globalLimiter);
const corsOptions = {
  origin: function (origin, callback) {
    // In production, allow specific origins, in development allow all
    if (NODE_ENV === "development") {
      callback(null, true);
    } else if (
      !origin ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.match(/^https?:\/\/192\.168\.\d+\.\d+/) ||
      origin.match(/^https?:\/\/10\.\d+\.\d+\.\d+/) ||
      origin.match(/^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/) ||
      origin.includes("render.com") ||
      origin.includes("onrender.com")
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static("."));

// Connect to MongoDB
MongoClient.connect(MONGODB_URI)
  .then((client) => {
    console.log("Connected to MongoDB");
    db = client.db("klipy");
  })
  .catch((error) => console.error("MongoDB connection error:", error));

// Routes

// Serve the main app
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: db ? "connected" : "disconnected",
  });
});

// User Routes - Apply rate limiting to authentication
app.post("/api/users", async (req, res) => {
  try {
    const { action, data } = req.body;

    // Apply different rate limiting based on action
    if (action === "authenticate") {
      return loginLimiter(req, res, async () => {
        await handleUserAuthentication(req, res, data);
      });
    } else if (action === "create") {
      return signupLimiter(req, res, async () => {
        await handleUserCreation(req, res, data);
      });
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("User API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Handle user creation
async function handleUserCreation(req, res, data) {
  try {
    // Check beta user limit
    const userCount = await db.collection("Users").countDocuments();
    if (userCount >= BETA_CONFIG.maxUsers) {
      return res.status(429).json({
        error: "Beta is full",
        message: `We've reached our beta limit of ${BETA_CONFIG.maxUsers} users. Please check back later!`,
      });
    }

    // Check if registration is enabled
    if (!BETA_CONFIG.registrationEnabled) {
      return res.status(403).json({
        error: "Registration disabled",
        message: "New registrations are currently disabled",
      });
    }

    // Check invite code if required
    if (
      BETA_CONFIG.requireInviteCode &&
      data.inviteCode !== BETA_CONFIG.inviteCode
    ) {
      return res.status(403).json({
        error: "Invalid invite code",
        message: "A valid invite code is required for beta access",
      });
    }

    // Check if user already exists
    const existingUser = await db
      .collection("Users")
      .findOne({ email: data.email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password strength
    if (data.password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      apiKey: data.apiKey,
      hasStoredApiKey: false, // By default, API key is not stored
      encryptedApiKey: undefined, // Will be set if user chooses to store
      createdAt: new Date(),
      lastLogin: new Date(),
    };

    const result = await db.collection("Users").insertOne(user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId, email: data.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      user: {
        id: result.insertedId,
        name: user.name,
        email: user.email,
        apiKey: user.apiKey,
      },
      token,
    });
  } catch (error) {
    console.error("User creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Handle user authentication
async function handleUserAuthentication(req, res, data) {
  try {
    // Rate limit login attempts per IP + email
    const loginAttempts = await db.collection("LoginAttempts").findOne({
      ip: req.ip,
      email: data.email,
    });

    if (loginAttempts && loginAttempts.attempts >= 5) {
      const timeSinceLastAttempt = Date.now() - loginAttempts.lastAttempt;
      if (timeSinceLastAttempt < 15 * 60 * 1000) {
        // 15 minutes
        return res.status(429).json({
          error: "Too many login attempts",
          message: "Please wait 15 minutes before trying again",
        });
      }
    }

    // Find user
    const user = await db.collection("Users").findOne({ email: data.email });
    if (!user) {
      // Record failed attempt
      await db.collection("LoginAttempts").updateOne(
        { ip: req.ip, email: data.email },
        {
          $inc: { attempts: 1 },
          $set: { lastAttempt: Date.now() },
        },
        { upsert: true }
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      // Record failed attempt
      await db.collection("LoginAttempts").updateOne(
        { ip: req.ip, email: data.email },
        {
          $inc: { attempts: 1 },
          $set: { lastAttempt: Date.now() },
        },
        { upsert: true }
      );
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Clear failed attempts on successful login
    await db.collection("LoginAttempts").deleteOne({
      ip: req.ip,
      email: data.email,
    });

    // Update last login
    await db
      .collection("Users")
      .updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        apiKey: user.apiKey,
      },
      token,
    });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Token validation endpoint
app.post("/api/users/validate", async (req, res) => {
  try {
    const token =
      req.headers.authorization?.replace("Bearer ", "") || req.body.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: "No token provided" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user still exists
    const { ObjectId } = require("mongodb");
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        apiKey: user.apiKey,
      },
    });
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(401).json({ success: false, error: "Invalid token" });
  }
});

// Device Routes
app.post("/api/devices", async (req, res) => {
  try {
    const { action, data } = req.body;

    if (action === "register") {
      // Check if device already exists
      const existingDevice = await db.collection("Devices").findOne({
        deviceId: data.deviceId,
      });

      if (existingDevice) {
        // Update existing device
        await db.collection("Devices").updateOne(
          { deviceId: data.deviceId },
          {
            $set: {
              lastSeen: new Date(),
              isActive: data.isActive || false,
              deviceName: data.deviceName,
              userId: data.userId,
            },
          }
        );
        res.json({ success: true, message: "Device updated" });
      } else {
        // Create new device
        const device = {
          deviceId: data.deviceId,
          userId: data.userId,
          deviceName: data.deviceName,
          isActive: data.isActive || false,
          createdAt: new Date(),
          lastSeen: new Date(),
        };

        await db.collection("Devices").insertOne(device);
        res.status(201).json({ success: true, message: "Device registered" });
      }
    }
  } catch (error) {
    console.error("Device API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/devices", async (req, res) => {
  try {
    const { userId, active } = req.query;

    let query = {};
    if (userId) query.userId = userId;
    if (active === "true") query.isActive = true;

    const devices = await db.collection("Devices").find(query).toArray();
    res.json({ success: true, devices });
  } catch (error) {
    console.error("Device API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/devices", async (req, res) => {
  try {
    const { action, deviceId, isActive } = req.body;

    if (action === "updateStatus") {
      await db.collection("Devices").updateOne(
        { deviceId },
        {
          $set: {
            isActive,
            lastSeen: new Date(),
          },
        }
      );
      res.json({ success: true, message: "Device status updated" });
    }
  } catch (error) {
    console.error("Device API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Session Routes
app.post("/api/sessions", async (req, res) => {
  try {
    const { action, data } = req.body;

    if (action === "create") {
      const session = {
        userId: data.userId,
        sessionName: data.sessionName,
        password: data.password,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      const result = await db.collection("Sessions").insertOne(session);
      res.status(201).json({ success: true, sessionId: result.insertedId });
    }
  } catch (error) {
    console.error("Session API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Check if email has stored API key
app.post("/api/users/check-email", emailCheckLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
        hasStoredKey: false,
      });
    }

    // Check if user exists and has stored API key
    const user = await db.collection("Users").findOne({ email });
    const hasStoredKey = user && user.hasStoredApiKey === true;

    res.json({
      hasStoredKey,
      message: hasStoredKey
        ? "User has stored API key"
        : "User needs to provide API key",
    });
  } catch (error) {
    console.error("Error checking email:", error);
    res.status(500).json({
      error: "Server error",
      hasStoredKey: false,
    });
  }
});

// Validate API key
app.post("/api/users/validate-api-key", apiKeyLimiter, async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        valid: false,
        error: "API key is required",
      });
    }

    // Basic validation - check if it looks like a valid API key
    // MultiSynq API keys are typically 32-64 characters, alphanumeric with dashes
    const apiKeyRegex = /^[a-zA-Z0-9-_]{16,64}$/;
    if (!apiKeyRegex.test(apiKey)) {
      return res.status(400).json({
        valid: false,
        error: "Invalid API key format",
      });
    }

    // TODO: Add actual API key validation against MultiSynq service
    // For now, we'll assume it's valid if it matches the format
    res.json({
      valid: true,
      message: "API key format is valid",
    });
  } catch (error) {
    console.error("Error validating API key:", error);
    res.status(500).json({
      valid: false,
      error: "Server error during validation",
    });
  }
});

// Update user's API key storage preference
app.post("/api/users/update-api-key", apiKeyLimiter, async (req, res) => {
  try {
    const { token, newApiKey, shouldStore } = req.body;

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user exists
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    // Validate API key format
    if (newApiKey) {
      const apiKeyRegex = /^[a-zA-Z0-9-_]{16,64}$/;
      if (!apiKeyRegex.test(newApiKey)) {
        return res.status(400).json({
          error: "Invalid API key format",
        });
      }
    }

    // Update API key and storage preference
    const updateData = { apiKey: newApiKey };

    if (shouldStore !== undefined) {
      if (shouldStore && newApiKey) {
        // Encrypt and store the API key
        const encryptedApiKey = CryptoJS.AES.encrypt(
          newApiKey,
          process.env.API_KEY_SECRET || "default-secret"
        ).toString();
        updateData.encryptedApiKey = encryptedApiKey;
        updateData.hasStoredApiKey = true;
      } else {
        // Remove stored API key
        updateData.encryptedApiKey = null;
        updateData.hasStoredApiKey = false;
      }
    }

    await db
      .collection("Users")
      .updateOne({ _id: user._id }, { $set: updateData });

    res.json({
      success: true,
      message: "API key updated",
      hasStoredKey: updateData.hasStoredApiKey || false,
    });
  } catch (error) {
    console.error("API key update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's API key storage status
app.get("/api/users/api-key-status", async (req, res) => {
  try {
    const token =
      req.headers.authorization?.replace("Bearer ", "") || req.body.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, error: "No token provided" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user exists
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      hasStoredKey: user.hasStoredApiKey === true,
      email: user.email,
    });
  } catch (error) {
    console.error("Error getting API key status:", error);
    res.status(500).json({
      error: "Server error",
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (NODE_ENV === "production") {
    res.status(500).json({
      error: "Something went wrong!",
      message: "Please try again later.",
    });
  } else {
    res.status(500).json({
      error: err.message,
      stack: err.stack,
    });
  }
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found.",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Klipy server running on http://localhost:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(
    `CORS enabled for: ${
      NODE_ENV === "development" ? "all origins" : "production origins"
    }`
  );
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nReceived SIGINT. Graceful shutdown...");
  if (client) {
    await client.close();
    console.log("MongoDB connection closed");
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Graceful shutdown...");
  if (client) {
    await client.close();
    console.log("MongoDB connection closed");
  }
  process.exit(0);
});
