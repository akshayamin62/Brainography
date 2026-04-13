import { Router } from "express";
import {
  login,
  verifyOTP,
  getProfile,
  generateCaptcha,
} from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes
router.get("/captcha", generateCaptcha);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);

// Protected routes
router.get("/profile", authenticate, getProfile);

export default router;
