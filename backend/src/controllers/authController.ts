import { Response, Request } from "express";
import crypto from "crypto";
import User from "../models/User";
import { generateToken } from "../utils/jwt";
import { sendOTPEmail } from "../utils/email";
import {
  generateOTP,
  hashOTP,
  compareOTP,
  isOTPExpired,
  getOTPExpiration,
} from "../utils/otp";
import { AuthRequest } from "../middleware/auth";

// Server-side captcha store: Map<captchaId, { text, expiresAt }>
const captchaStore = new Map<string, { text: string; expiresAt: number }>();

// Clean expired captchas every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of captchaStore) {
    if (val.expiresAt < now) captchaStore.delete(key);
  }
}, 5 * 60 * 1000);

// Generate a server-side captcha
export const generateCaptcha = (_req: Request, res: Response): Response => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ2345689';
  let text = '';
  for (let i = 0; i < 6; i++) {
    text += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  const captchaId = crypto.randomUUID();
  captchaStore.set(captchaId, { text, expiresAt: Date.now() + 5 * 60 * 1000 });
  return res.json({ success: true, data: { captchaId, captchaText: text } });
};

interface LoginRequest extends Request {
  body: {
    email: string;
    captchaId: string;
    captchaInput: string;
    // Legacy fields for backward compatibility
    captcha?: string;
  };
}

interface VerifyOTPRequest extends Request {
  body: {
    email: string;
    otp: string;
  };
}

// Request OTP for login
export const login = async (req: LoginRequest, res: Response): Promise<Response> => {
  try {
    const { email, captchaInput, captchaId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!captchaId || !captchaInput) {
      return res.status(400).json({
        success: false,
        message: "Captcha is required",
      });
    }

    // Server-side captcha validation
    const storedCaptcha = captchaStore.get(captchaId);
    if (!storedCaptcha) {
      return res.status(400).json({
        success: false,
        message: "Captcha expired or invalid. Please refresh the captcha.",
      });
    }
    captchaStore.delete(captchaId); // One-time use

    if (storedCaptcha.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Captcha has expired. Please refresh the captcha.",
      });
    }

    if (storedCaptcha.text.toUpperCase() !== captchaInput.toUpperCase()) {
      return res.status(400).json({
        success: false,
        message: "Invalid captcha. Please try again.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = await hashOTP(otp);
    const otpExpires = getOTPExpiration(10);

    user.otp = hashedOTP;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email
    await sendOTPEmail(user.email, user.name, otp, "login");

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email.",
      data: { email: user.email },
    });
  } catch (err: unknown) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Verify OTP and login
export const verifyOTP = async (req: VerifyOTPRequest, res: Response): Promise<Response> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or OTP",
      });
    }

    if (!user.otp || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP.",
      });
    }

    if (isOTPExpired(user.otpExpires)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (!(await compareOTP(otp, user.otp))) {
      return res.status(401).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    // Mark verified on first login
    if (!user.isVerified) {
      user.isVerified = true;
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        token,
      },
    });
  } catch (err: unknown) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (err: unknown) {
    console.error("Get profile error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

