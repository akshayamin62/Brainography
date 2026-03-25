/**
 * Email service utility using Nodemailer
 */

import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Create email transporter
 */
const createTransporter = () => {
  const emailAddress = process.env.EMAIL_ADDRESS;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailAddress || !emailPassword) {
    console.warn("⚠️  Email credentials not configured. Emails will be logged to console only.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail", // Using Gmail service
    auth: {
      user: emailAddress,
      pass: emailPassword,
    },
  });
};

/**
 * Send email
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = createTransporter();

  // If no transporter (missing credentials), log to console
  if (!transporter) {
    console.log("=".repeat(50));
    console.log("📧 EMAIL (Development Mode - No Credentials)");
    console.log("=".repeat(50));
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    console.log("Body:", options.text || options.html);
    console.log("=".repeat(50));
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Community Platform" <${process.env.EMAIL_ADDRESS}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    
    console.log(`✅ Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    // Log email details for debugging
    console.log("Failed email details:");
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    throw new Error("Failed to send email");
  }
};

/**
 * Send OTP email
 */
export const sendOTPEmail = async (
  email: string,
  name: string,
  otp: string,
  purpose: 'signup' | 'login' = 'login'
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #2563eb; text-align: center; margin-bottom: 30px;">Your OTP Code</h2>
        <p>Hi ${name},</p>
        <p>Your ${purpose === 'signup' ? 'signup' : 'login'} verification code is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); color: white; padding: 20px; border-radius: 10px; display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
            ${otp}
          </div>
        </div>
        <p style="text-align: center; color: #666; font-size: 14px;">
          <strong>This code will expire in 10 minutes.</strong>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't ${purpose === 'signup' ? 'sign up' : 'request this code'}, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Your OTP Code
    
    Hi ${name},
    
    Your ${purpose === 'signup' ? 'signup' : 'login'} verification code is: ${otp}
    
    This code will expire in 10 minutes.
    
    If you didn't ${purpose === 'signup' ? 'sign up' : 'request this code'}, please ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: `Your ${purpose === 'signup' ? 'Signup' : 'Login'} Verification Code`,
    html,
    text,
  });
};

/**
 * Send welcome email to newly created admin
 */
export const sendAdminWelcomeEmail = async (
  email: string,
  name: string,
  companyName: string
): Promise<void> => {
  const systemUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Brainography</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">Brainography</h1>
          <p style="color: #666; font-size: 14px; margin-top: 5px;">Student Assessment Platform</p>
        </div>
        <h2 style="color: #1e293b; margin-bottom: 20px;">Welcome, ${name}!</h2>
        <p>Your admin account for <strong>${companyName}</strong> has been successfully created on the Brainography platform.</p>
        <p>You can now log in to the system to manage your students, track assessments, and access all admin features.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 0; font-size: 14px;"><strong>Login Method:</strong> OTP-based (a verification code will be sent to your email)</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${systemUrl}/login" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
            Login to Brainography
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">Or visit: <a href="${systemUrl}" style="color: #2563eb;">${systemUrl}</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          If you did not expect this email, please contact your system administrator.<br>
          &copy; ${new Date().getFullYear()} Brainography. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Brainography!

Hi ${name},

Your admin account for ${companyName} has been created on the Brainography platform.

Login Email: ${email}
Login Method: OTP-based (a verification code will be sent to your email)

Login here: ${systemUrl}/login

If you did not expect this email, please contact your system administrator.
  `;

  await sendEmail({
    to: email,
    subject: "Welcome to Brainography - Your Admin Account is Ready",
    html,
    text,
  });
};

