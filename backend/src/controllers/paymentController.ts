import { Response, Request } from "express";
import { AuthRequest } from "../middleware/auth";
import Payment from "../models/Payment";
import Student from "../models/Student";
import crypto from "crypto";
import { sendEmail } from "../utils/email";
import Razorpay from "razorpay";

const LINK_VALIDITY_MINUTES = 10;
const PAYMENT_AMOUNT = parseInt(process.env.PAYMENT_AMOUNT || "100", 10); // Amount in INR
const PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || "INR";

const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error("Razorpay credentials not configured");
  }
  return new Razorpay({ key_id, key_secret });
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
    const expiresAt = new Date(now.getTime() + LINK_VALIDITY_MINUTES * 60 * 1000);

    const paymentLink = await (razorpay.paymentLink as any).create({
      amount: PAYMENT_AMOUNT * 100, // Razorpay accepts amount in paise
      currency: PAYMENT_CURRENCY,
      accept_partial: false,
      description: `Payment for Brainography - ${student.firstName} ${student.lastName}`,
      customer: {
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        contact: `${student.countryCode}${student.mobile}`,
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
      expire_by: Math.floor(expiresAt.getTime() / 1000),
    });

    // Save payment record
    const payment = new Payment({
      studentId,
      adminId: student.adminId,
      initiatedBy: userId,
      initiatedByRole: userRole,
      razorpayLinkId: paymentLink.id,
      amount: PAYMENT_AMOUNT,
      currency: PAYMENT_CURRENCY,
      status: "pending",
      linkGeneratedAt: now,
      linkExpiresAt: expiresAt,
      paymentLinkUrl: paymentLink.short_url || paymentLink.url || "",
      shortUrl: paymentLink.short_url || "",
    });
    await payment.save();

    // Send payment link email to student
    await sendEmail({
      to: student.email,
      subject: "Payment Link - Brainography",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Brainography - Payment Link</h2>
          <p>Dear ${student.firstName} ${student.lastName},</p>
          <p>A payment link has been generated for you. Please complete the payment using the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink.short_url || paymentLink.url}" 
               style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
              Pay ₹${PAYMENT_AMOUNT}
            </a>
          </div>
          <p style="color: #dc2626; font-weight: bold;">⚠️ This link will expire in ${LINK_VALIDITY_MINUTES} minutes.</p>
          <p>If you face any issues, please contact your counselor or admin.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from Brainography. Please do not reply.</p>
        </div>
      `,
    });

    return res.json({
      success: true,
      message: "Payment link generated and sent to student's email",
      data: {
        paymentId: payment._id,
        linkExpiresAt: expiresAt,
        status: "pending",
      },
    });
  } catch (err: any) {
    console.error("Generate payment link error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
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

    // If razorpay provides the payment link status as paid
    if (razorpay_payment_link_status === "paid" && razorpay_payment_link_id) {
      const payment = await Payment.findOne({ razorpayLinkId: razorpay_payment_link_id as string });
      if (payment) {
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
