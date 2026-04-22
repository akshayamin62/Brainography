import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  studentId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  // Who initiated the payment link
  initiatedBy: mongoose.Types.ObjectId;
  initiatedByRole: string;
  // Razorpay fields
  razorpayLinkId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  // Payment details
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "expired";
  // Link validity
  linkGeneratedAt: Date;
  linkExpiresAt: Date;
  paidAt?: Date;
  // Payment link URL
  paymentLinkUrl: string;
  // Short link URL
  shortUrl?: string;
  // Stable invoice number generated once on first invoice creation
  invoiceNo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    initiatedByRole: {
      type: String,
      required: true,
    },
    razorpayLinkId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: undefined,
    },
    razorpaySignature: {
      type: String,
      default: undefined,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "expired"],
      default: "pending",
    },
    linkGeneratedAt: {
      type: Date,
      required: true,
    },
    linkExpiresAt: {
      type: Date,
      required: true,
    },
    paidAt: {
      type: Date,
      default: undefined,
    },
    paymentLinkUrl: {
      type: String,
      required: true,
    },
    shortUrl: {
      type: String,
      default: undefined,
    },
    invoiceNo: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>("Payment", paymentSchema);
