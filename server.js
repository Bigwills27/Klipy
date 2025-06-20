const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

// Load environment variables
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://yudtkme:yudtkme20@tabmc.zhquyvw.mongodb.net/klipy";
const JWT_SECRET =
  process.env.JWT_SECRET || "klipy-secret-key-change-in-production";

let db;

// Middleware
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

// User Routes
app.post("/api/users", async (req, res) => {
  try {
    const { action, data } = req.body;

    if (action === "create") {
      // Check if user already exists
      const existingUser = await db
        .collection("Users")
        .findOne({ email: data.email });
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        apiKey: data.apiKey,
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
    } else if (action === "authenticate") {
      // Find user
      const user = await db.collection("Users").findOne({ email: data.email });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check password
      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

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
    }
  } catch (error) {
    console.error("User API error:", error);
    res.status(500).json({ error: "Internal server error" });
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
