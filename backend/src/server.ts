import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import adminRoutes from "./routes/adminRoutes";
import studentRoutes from "./routes/studentRoutes";
import fingerprintRoutes from "./routes/fingerprintRoutes";
import documentRoutes from "./routes/documentRoutes";
import analysisRoutes from "./routes/analysisRoutes";
import reportRoutes from "./routes/reportRoutes";
import counselorRoutes from "./routes/counselorRoutes";

// Import models to register them with Mongoose
import "./models/User";
import "./models/Student";
import "./models/Fingerprint";
import "./models/FingerprintAnalysis";
import "./models/StudentDocument";
import "./models/AdminDetail";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));

// Rate limit auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 20 requests per window
  message: { success: false, message: "Too many requests, please try again later." },
});

// Serve uploaded files (require auth token as query param)
app.use("/uploads", (req, res, next) => {
  const token = req.query.token as string || req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  try {
    require("./utils/jwt").verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
}, express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/fingerprints", fingerprintRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/fingerprint-analysis", analysisRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/counselors", counselorRoutes);

// Basic test route
app.get('/', (_req, res) => {
  res.send('API is running!');
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected to MongoDB successfully');
    console.log(`Database: ${mongoose.connection.name}`);
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

startServer();

