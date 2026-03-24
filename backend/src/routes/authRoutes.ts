import { Router } from "express";
import {
  login,
  verifyOTP,
  getProfile,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/login", login);
router.post("/verify-otp", verifyOTP);

// Protected routes
router.get("/profile", authenticate, getProfile);

export default router;
