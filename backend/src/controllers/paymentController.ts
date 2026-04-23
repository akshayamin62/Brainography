import { Response, Request } from "express";
import { AuthRequest } from "../middleware/auth";
import Payment from "../models/Payment";
import Student from "../models/Student";
import crypto from "crypto";
import { sendEmail } from "../utils/email";
import Razorpay from "razorpay";
import { generateInvoicePDF, generateInvoiceNumber } from "../services/invoiceService";
import { getAppSettings } from "./settingsController";

const REVIEWER_EMAIL = "reviewer@admitra.io";

/**
 * Returns the invoice number for a paid payment.
 * If one hasn't been assigned yet, generates a new sequential number,
 * persists it on the payment document, and returns it.
 * This makes every subsequent call (download, resend, webhook) use the same number.
 */
async function getOrCreateInvoiceNo(payment: InstanceType<typeof import("../models/Payment").default>): Promise<string> {
  if (payment.invoiceNo) return payment.invoiceNo;
  const no = await generateInvoiceNumber(payment.paidAt ?? new Date());
  payment.invoiceNo = no;
  await payment.save();
  return no;
}

const LINK_VALIDITY_MINUTES = 15;
const PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || "INR";

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
  }
  return new Razorpay({ key_id, key_secret });
};

// Extract a readable error message from Razorpay SDK errors or standard errors
const extractErrorMessage = (err: any): string => {
  // Razorpay SDK wraps API errors in err.error
  if (err?.error?.description) return err.error.description;
  if (err?.error?.reason) return err.error.reason;
  if (err?.error?.code) return `Razorpay error: ${err.error.code}`;
  // Standard Error
  if (err?.message) return err.message;
  // Razorpay HTTP errors
  if (typeof err === "string") return err;
  return "Internal server error";
};

// Sanitize phone number for Razorpay: must be digits only (no +, spaces, dashes)
const sanitizePhone = (countryCode: string, mobile: string): string => {
  const combined = `${countryCode}${mobile}`.replace(/[^\d]/g, "");
  return combined;
};

// POST /api/payments/reviewer-link
export const generateReviewerPaymentLink = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const requesterEmail = req.user?.email?.toLowerCase();

    if (requesterEmail !== REVIEWER_EMAIL) {
      return res.status(403).json({ success: false, message: "Unauthorized reviewer access" });
    }

    const razorpay = getRazorpayInstance();
    const { baseAmount: PAYMENT_AMOUNT, gstEnabled } = await getAppSettings();
    const totalAmount = gstEnabled ? Math.round(PAYMENT_AMOUNT * 1.18) : PAYMENT_AMOUNT;

    const paymentLink = await (razorpay.paymentLink as any).create({
      amount: totalAmount * 100,
      currency: PAYMENT_CURRENCY,
      accept_partial: false,
      description: "Brainography Assessment Reviewer Payment",
      customer: {
        name: "Razorpay Reviewer",
        email: REVIEWER_EMAIL,
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      callback_url: `${process.env.FRONTEND_URL}/reviewer/payment`,
      callback_method: "get",
    });

    return res.json({
      success: true,
      data: {
        paymentUrl: paymentLink.short_url || paymentLink.url,
        amount: totalAmount,
        currency: PAYMENT_CURRENCY,
      },
    });
  } catch (err: any) {
    console.error("Generate reviewer payment link error:", JSON.stringify(err?.error || err?.message || err));
    return res.status(500).json({ success: false, message: extractErrorMessage(err) });
  }
};

// POST /api/payments/generate-link/:studentId
export const generatePaymentLink = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Check if there's already a successful payment for this student
    const existingPaid = await Payment.findOne({ studentId, status: "paid" });
    if (existingPaid) {
      return res.status(400).json({ success: false, message: "Payment already completed for this student" });
    }

    // Check if there's a pending (non-expired) payment link
    const now = new Date();
    const existingPending = await Payment.findOne({
      studentId,
      status: "pending",
      linkExpiresAt: { $gt: now },
    });
    if (existingPending) {
      const remainingMs = existingPending.linkExpiresAt.getTime() - now.getTime();
      const remainingSec = Math.ceil(remainingMs / 1000);

      // If the existing pending link has a valid Razorpay URL, resend the email
      // instead of blocking — this handles the case where the previous attempt
      // created the link but failed to send the email (causing a false 500).
      if (existingPending.paymentLinkUrl) {
        let emailSent = true;
        try {
          await sendEmail({
            to: student.email,
            subject: "Payment Link - Brainography",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Brainography Assessment- Payment Link</h2>
                <p>Dear ${student.firstName} ${student.lastName},</p>
                <p>A payment link has been generated for you. Please complete the payment using the link below:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${existingPending.paymentLinkUrl}"
                     style="display: inline-block; background-color: #ffffff; color: #000000; padding: 12px 28px; text-decoration: none; border: 2px solid #000000; border-radius: 4px; font-size: 16px; font-weight: 600;">
                    Complete Payment
                  </a>
                  <p style="margin-top: 12px; font-size: 13px; color: #555555;">If the button above doesn't work, copy and open this link in your browser:</p>
                  <p style="font-size: 13px; word-break: break-all;"><a href="${existingPending.paymentLinkUrl}" style="color: #2563eb;">${existingPending.paymentLinkUrl}</a></p>
                </div>
                <p style="color: #dc2626; font-weight: bold;">⚠️ This link will expire in ${Math.ceil(remainingSec / 60)} minute(s).</p>
                <p>If you face any issues, please contact hello@admitra.io</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="color: #6b7280; font-size: 12px;">This is an automated email from Brainography. Please do not reply.</p>
              </div>
            `,
          });
        } catch (emailErr: any) {
          emailSent = false;
          console.error("⚠️ Re-send payment link email failed:", emailErr.message);
        }
        return res.json({
          success: true,
          message: emailSent
            ? "Payment link already active — resent to student's email"
            : "Payment link already active (email notification could not be sent)",
          data: {
            paymentId: existingPending._id,
            linkExpiresAt: existingPending.linkExpiresAt,
            remainingSeconds: remainingSec,
            status: "pending",
            emailSent,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: `A payment link is already active. Please wait ${Math.ceil(remainingSec / 60)} minute(s) before generating a new one.`,
        data: {
          linkExpiresAt: existingPending.linkExpiresAt,
          remainingSeconds: remainingSec,
        },
      });
    }

    // Expire any old pending payments
    await Payment.updateMany(
      { studentId, status: "pending", linkExpiresAt: { $lte: now } },
      { $set: { status: "expired" } }
    );

    // Create Razorpay payment link
    const razorpay = getRazorpayInstance();
    // Internal expiry: 15 minutes for our DB tracking
    const expiresAt = new Date(now.getTime() + LINK_VALIDITY_MINUTES * 60 * 1000);
    // Razorpay requires expire_by to be STRICTLY more than 15 minutes in the future.
    // Add 1 extra minute as the minimum buffer to satisfy their API constraint.
    // Our verifyPayment already rejects callbacks where our DB status is 'expired',
    // so this 1-minute window on Razorpay's side cannot be used to complete a payment.
    const razorpayExpiresAt = new Date(now.getTime() + (LINK_VALIDITY_MINUTES + 1) * 60 * 1000);

    const { baseAmount: PAYMENT_AMOUNT, gstEnabled } = await getAppSettings();
    const totalAmount = gstEnabled ? Math.round(PAYMENT_AMOUNT * 1.18) : PAYMENT_AMOUNT;

    const paymentLink = await (razorpay.paymentLink as any).create({
      amount: totalAmount * 100, // Razorpay accepts amount in paise
      currency: PAYMENT_CURRENCY,
      accept_partial: false,
      description: `Payment for Brainography - ${student.firstName} ${student.lastName}`,
      customer: {
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        contact: sanitizePhone(student.countryCode || "+91", student.mobile),
      },
      notify: {
        sms: false,
        email: false, // We'll send our own email
      },
      reminder_enable: false,
      notes: {
        studentId: studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        initiatedBy: userId,
        initiatedByRole: userRole,
      },
      callback_url: `${process.env.FRONTEND_URL}/payment/verify?studentId=${studentId}`,
      callback_method: "get",
      expire_by: Math.floor(razorpayExpiresAt.getTime() / 1000),
    });

    // Save payment record
    const payment = new Payment({
      studentId,
      adminId: student.adminId,
      initiatedBy: userId,
      initiatedByRole: userRole,
      razorpayLinkId: paymentLink.id,
      amount: totalAmount,
      currency: PAYMENT_CURRENCY,
      status: "pending",
      linkGeneratedAt: now,
      linkExpiresAt: expiresAt,
      paymentLinkUrl: paymentLink.short_url || paymentLink.url || "",
      shortUrl: paymentLink.short_url || "",
    });
    await payment.save();

    // Send payment link email to student (non-blocking — email failure should not fail the request)
    let emailSent = true;
    try {
      await sendEmail({
        to: student.email,
        subject: "Payment Link - Brainography",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Brainography Assessment - Payment Link</h2>
            <p>Dear ${student.firstName} ${student.lastName},</p>
            <p>A payment link has been generated for you. Please complete the payment using the link below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${paymentLink.short_url || paymentLink.url}"
                 style="display: inline-block; background-color: #ffffff; color: #000000; padding: 12px 28px; text-decoration: none; border: 2px solid #000000; border-radius: 4px; font-size: 16px; font-weight: 600;">
                Complete Payment
              </a>
              <p style="margin-top: 12px; font-size: 13px; color: #555555;">If the button above doesn't work, copy and open this link in your browser:</p>
              <p style="font-size: 13px; word-break: break-all;"><a href="${paymentLink.short_url || paymentLink.url}" style="color: #2563eb;">${paymentLink.short_url || paymentLink.url}</a></p>
            </div>
            <p style="color: #dc2626; font-weight: bold;">⚠️ This link will expire in ${LINK_VALIDITY_MINUTES} minutes.</p>
            <p>If you face any issues, please contact hello@admitra.io.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">This is an automated email from Brainography. Please do not reply.</p>
          </div>
        `,
      });
    } catch (emailErr: any) {
      emailSent = false;
      console.error("⚠️ Payment link created but email notification failed:", emailErr.message);
    }

    return res.json({
      success: true,
      message: emailSent
        ? "Payment link generated and sent to student's email"
        : "Payment link generated successfully (email notification could not be sent)",
      data: {
        paymentId: payment._id,
        linkExpiresAt: expiresAt,
        status: "pending",
        emailSent,
      },
    });
  } catch (err: any) {
    console.error("Generate payment link error:", JSON.stringify(err?.error || err?.message || err));
    return res.status(500).json({ success: false, message: extractErrorMessage(err) });
  }
};

// GET /api/payments/status/:studentId
export const getPaymentStatus = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;

    // Expire any old pending payments first
    const now = new Date();
    await Payment.updateMany(
      { studentId, status: "pending", linkExpiresAt: { $lte: now } },
      { $set: { status: "expired" } }
    );

    // Get the latest payment
    const payment = await Payment.findOne({ studentId })
      .populate("initiatedBy", "name email role")
      .sort({ createdAt: -1 });

    if (!payment) {
      return res.json({
        success: true,
        data: { status: "none", canGenerateLink: true },
      });
    }

    const isPaid = payment.status === "paid";
    const isPending = payment.status === "pending" && payment.linkExpiresAt > now;
    const remainingSeconds = isPending
      ? Math.ceil((payment.linkExpiresAt.getTime() - now.getTime()) / 1000)
      : 0;

    return res.json({
      success: true,
      data: {
        _id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        initiatedBy: payment.initiatedBy,
        initiatedByRole: payment.initiatedByRole,
        linkGeneratedAt: payment.linkGeneratedAt,
        linkExpiresAt: payment.linkExpiresAt,
        paidAt: payment.paidAt,
        razorpayPaymentId: payment.razorpayPaymentId,
        canGenerateLink: !isPaid && !isPending,
        isPending,
        remainingSeconds,
      },
    });
  } catch (err) {
    console.error("Get payment status error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/payments/logs/:studentId
export const getPaymentLogs = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;

    const payments = await Payment.find({ studentId })
      .populate("initiatedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: payments });
  } catch (err) {
    console.error("Get payment logs error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/payments/webhook - Razorpay webhook (no auth needed)
export const razorpayWebhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return res.status(500).json({ success: false });
    }

    // Verify webhook signature
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Webhook signature mismatch");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "payment_link.paid") {
      const paymentLinkEntity = payload.payment_link?.entity;
      const paymentEntity = payload.payment?.entity;

      if (paymentLinkEntity) {
        const payment = await Payment.findOne({ razorpayLinkId: paymentLinkEntity.id });
        if (payment) {
          payment.status = "paid";
          payment.razorpayPaymentId = paymentEntity?.id || "";
          payment.paidAt = new Date();
          await payment.save();
          console.log(`✅ Payment completed for student ${payment.studentId}`);

          // Auto-send invoice to student (non-blocking)
          try {
            const student = await Student.findById(payment.studentId);
            if (student?.email) {
              const { gstEnabled: webhookGstEnabled } = await getAppSettings();
              const invoiceNo = await getOrCreateInvoiceNo(payment);
              const pdfBuffer = await generateInvoicePDF({
                student: {
                  name: `${student.firstName} ${student.lastName}`,
                  email: student.email,
                  mobile: student.mobile,
                  countryCode: student.countryCode,
                  city: student.city,
                  state: student.state,
                  country: student.country,
                },
                payment: {
                  _id: (payment._id as any).toString(),
                  amount: payment.amount,
                  currency: payment.currency,
                  razorpayPaymentId: payment.razorpayPaymentId,
                  paidAt: payment.paidAt!,
                },
                gstEnabled: webhookGstEnabled,
                invoiceNo,
              });
              await sendEmail({
                to: student.email,
                subject: "Payment Invoice – IMPACT Fingerprint Intelligence Assessment",
                html: `<p>Dear ${student.firstName},</p><p>Thank you for your payment. Please find your invoice attached.</p><p>Regards,<br/>IMPACT Team</p>`,
                attachments: [{ filename: `Invoice_${(payment._id as any).toString()}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
              });
              console.log(`📧 Invoice emailed to ${student.email}`);
            }
          } catch (invoiceErr) {
            console.error("Failed to send invoice email:", invoiceErr);
          }
        }
      }
    } else if (event === "payment_link.expired") {
      const paymentLinkEntity = payload.payment_link?.entity;
      if (paymentLinkEntity) {
        const payment = await Payment.findOne({ razorpayLinkId: paymentLinkEntity.id });
        if (payment && payment.status === "pending") {
          payment.status = "expired";
          await payment.save();
          console.log(`⏰ Payment link expired for student ${payment.studentId}`);
        }
      }
    } else if (event === "payment_link.cancelled") {
      const paymentLinkEntity = payload.payment_link?.entity;
      if (paymentLinkEntity) {
        const payment = await Payment.findOne({ razorpayLinkId: paymentLinkEntity.id });
        if (payment && payment.status === "pending") {
          payment.status = "failed";
          await payment.save();
        }
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ success: false });
  }
};

// GET /api/payments/verify-payment - Public route called after payment callback
export const verifyPayment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { razorpay_payment_id, razorpay_payment_link_id, razorpay_payment_link_status, razorpay_signature, studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ success: false, message: "Student ID is required" });
    }

    // Mark any stale pending payments as expired
    const now = new Date();
    await Payment.updateMany(
      { studentId: studentId as string, status: "pending", linkExpiresAt: { $lte: now } },
      { $set: { status: "expired" } }
    );

    // If razorpay provides the payment link status as paid
    if (razorpay_payment_link_status === "paid" && razorpay_payment_link_id) {
      const payment = await Payment.findOne({ razorpayLinkId: razorpay_payment_link_id as string });
      if (payment) {
        // If the link was already expired in our system, reject — the user paid on an expired link.
        // This can happen if Razorpay somehow processed a payment after our expiry.
        if (payment.status === "expired") {
          return res.status(410).json({
            success: false,
            message: "This payment link has expired. Please request a new payment link from your counsellor.",
            data: { status: "expired" },
          });
        }

        // Verify signature
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (secret && razorpay_payment_link_id && razorpay_payment_id && razorpay_signature) {
          const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${razorpay_payment_link_id}|${razorpay_payment_id}|${razorpay_payment_link_status}`)
            .digest("hex");

          if (generatedSignature === razorpay_signature) {
            payment.status = "paid";
            payment.razorpayPaymentId = razorpay_payment_id as string;
            payment.razorpaySignature = razorpay_signature as string;
            payment.paidAt = new Date();
            await payment.save();

            return res.json({ success: true, message: "Payment verified successfully", data: { status: "paid" } });
          }
        }

        // Even without full signature verification, if the link status shows paid, update
        if (payment.status !== "paid") {
          payment.status = "paid";
          payment.razorpayPaymentId = (razorpay_payment_id as string) || "";
          payment.paidAt = new Date();
          await payment.save();
        }
        return res.json({ success: true, message: "Payment completed", data: { status: "paid" } });
      }
    }

    // Check current status from DB
    const payment = await Payment.findOne({ studentId: studentId as string }).sort({ createdAt: -1 });
    if (payment?.status === "paid") {
      return res.json({ success: true, message: "Payment already completed", data: { status: "paid" } });
    }

    if (payment?.status === "expired") {
      return res.status(410).json({
        success: false,
        message: "This payment link has expired. Please request a new payment link from your counsellor.",
        data: { status: "expired" },
      });
    }

    return res.json({ success: false, message: "Payment verification pending", data: { status: payment?.status || "unknown" } });
  } catch (err) {
    console.error("Verify payment error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/payments/all-logs - Get all payment logs (for dashboard)
export const getAllPaymentLogs = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    let filter: Record<string, any> = {};
    if (userRole === "ADMIN") {
      filter = { adminId: userId };
    } else if (userRole === "COUNSELOR") {
      // Get students assigned to this counselor
      const students = await Student.find({ counselorId: userId }).select("_id");
      const studentIds = students.map((s) => s._id);
      filter = { studentId: { $in: studentIds } };
    }
    // SUPER_ADMIN sees all

    const payments = await Payment.find(filter)
      .populate("studentId", "firstName lastName email reportNo name")
      .populate("initiatedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: payments });
  } catch (err) {
    console.error("Get all payment logs error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/payments/invoice/:paymentId/download
export const downloadInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      res.status(404).json({ success: false, message: "Payment not found" });
      return;
    }
    if (payment.status !== "paid") {
      res.status(400).json({ success: false, message: "Invoice is only available for paid payments" });
      return;
    }
    const student = await Student.findById(payment.studentId);
    if (!student) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const { gstEnabled: downloadGstEnabled } = await getAppSettings();
    const invoiceNo = await getOrCreateInvoiceNo(payment);
    const pdfBuffer = await generateInvoicePDF({
      student: {
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        mobile: student.mobile,
        countryCode: student.countryCode,
        city: student.city,
        state: student.state,
        country: student.country,
      },
      payment: {
        _id: (payment._id as any).toString(),
        amount: payment.amount,
        currency: payment.currency,
        razorpayPaymentId: payment.razorpayPaymentId,
        paidAt: payment.paidAt!,
      },
      gstEnabled: downloadGstEnabled,
      invoiceNo,
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice_${(payment._id as any).toString()}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Download invoice error:", err);
    res.status(500).json({ success: false, message: "Failed to generate invoice" });
  }
};

// POST /api/payments/invoice/:paymentId/send
export const sendInvoiceToStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    if (payment.status !== "paid") return res.status(400).json({ success: false, message: "Invoice is only available for paid payments" });

    const student = await Student.findById(payment.studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const { gstEnabled: sendGstEnabled } = await getAppSettings();
    const invoiceNo = await getOrCreateInvoiceNo(payment);
    const pdfBuffer = await generateInvoicePDF({
      student: {
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        mobile: student.mobile,
        countryCode: student.countryCode,
        city: student.city,
        state: student.state,
        country: student.country,
      },
      payment: {
        _id: (payment._id as any).toString(),
        amount: payment.amount,
        currency: payment.currency,
        razorpayPaymentId: payment.razorpayPaymentId,
        paidAt: payment.paidAt!,
      },
      gstEnabled: sendGstEnabled,
      invoiceNo,
    });

    await sendEmail({
      to: student.email,
      subject: "Payment Invoice – IMPACT Fingerprint Intelligence Assessment",
      html: `<p>Dear ${student.firstName},</p><p>Please find your payment invoice attached.</p><p>Regards,<br/>IMPACT Team</p>`,
      attachments: [{ filename: `Invoice_${(payment._id as any).toString()}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
    });

    return res.json({ success: true, message: "Invoice sent to student email" });
  } catch (err) {
    console.error("Send invoice error:", err);
    return res.status(500).json({ success: false, message: "Failed to send invoice" });
  }
};

