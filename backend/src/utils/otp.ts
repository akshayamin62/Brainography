/**
 * Generate a 4-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Hash OTP for storage (simple hash for 4-digit OTP)
 */
export const hashOTP = (otp: string): string => {
  // Simple hash for OTP (you can use bcrypt if needed, but for 4-digit OTP this is sufficient)
  // For better security, you might want to use bcrypt with lower rounds
  return Buffer.from(otp).toString('base64');
};

/**
 * Compare OTP
 */
export const compareOTP = (otp: string, hashedOTP: string): boolean => {
  const hashedInput = Buffer.from(otp).toString('base64');
  return hashedInput === hashedOTP;
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

