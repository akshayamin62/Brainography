import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
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
import paymentRoutes from "./routes/paymentRoutes";

// Import models to register them with Mongoose
import "./models/User";
import "./models/Student";
import "./models/Fingerprint";
import "./models/FingerprintAnalysis";
import "./models/StudentDocument";
import "./models/AdminDetail";
import "./models/Payment";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust the first proxy (nginx) so express-rate-limit and IP detection work correctly
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));

// Rate limit auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
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
app.use("/api/payments", paymentRoutes);

// Basic test route
app.get('/', (_req, res) => {
  res.send('API is running!');
});

// Health check endpoint (BE-05)
app.get('/health', (_req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy';
  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: status === 'healthy' ? 'connected' : 'disconnected',
  });
});

// BUG-032: Multer error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ success: false, message: 'File too large. Maximum file size is 10MB.' });
      return;
    }
    res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    return;
  }
  if (err) {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
    return;
  }
  next();
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // BUG-022: Validate all required environment variables at startup
    const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Warn about optional but recommended env vars
    if (!process.env.EMAIL_ADDRESS || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️  EMAIL_ADDRESS and/or EMAIL_PASSWORD not set. Emails will be logged to console only.');
    }
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn('⚠️  RAZORPAY_KEY_ID and/or RAZORPAY_KEY_SECRET not set. Payment link generation will fail.');
    } else {
      console.log('✅ Razorpay credentials configured.');
    }
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.warn('⚠️  RAZORPAY_WEBHOOK_SECRET not set. Webhook signature verification will fail.');
    }

    await mongoose.connect(process.env.MONGO_URI!, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected to MongoDB successfully');
    console.log(`Database: ${mongoose.connection.name}`);

    // BUG-039: Handle MongoDB disconnection/error after initial connect
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

    // Graceful shutdown handler (BE-04)
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
      process.exit(0);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

