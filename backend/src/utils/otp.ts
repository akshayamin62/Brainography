import crypto from "crypto";
import bcrypt from "bcrypt";

/**
 * Generate a 6-digit OTP using cryptographically secure random
 */
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hash OTP for storage using bcrypt
 */
export const hashOTP = async (otp: string): Promise<string> => {
  return bcrypt.hash(otp, 10);
};

/**
 * Compare OTP against hashed value
 */
export const compareOTP = async (otp: string, hashedOTP: string): Promise<boolean> => {
  return bcrypt.compare(otp, hashedOTP);
};

/**
 * Check if OTP is expired
 */
export const isOTPExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

/**
 * Get OTP expiration time (default: 10 minutes)
 */
export const getOTPExpiration = (minutes: number = 10): Date => {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + minutes);
  return expires;
};

