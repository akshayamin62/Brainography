import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  generatePaymentLink,
  generateReviewerPaymentLink,
  getPaymentStatus,
  getPaymentLogs,
  razorpayWebhook,
  verifyPayment,
  getAllPaymentLogs,
  downloadInvoice,
  sendInvoiceToStudent,
} from "../controllers/paymentController";

const router = Router();

// Protected routes (require auth)
router.post(
  "/generate-link/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  generatePaymentLink
);

router.post(
  "/reviewer-link",
  authenticate,
  authorize(USER_ROLE.REVIEWER),
  generateReviewerPaymentLink
);

router.get(
  "/status/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  getPaymentStatus
);

router.get(
  "/logs/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  getPaymentLogs
);

router.get(
  "/all-logs",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  getAllPaymentLogs
);

// Public routes (no auth needed)
router.post("/webhook", razorpayWebhook);
router.get("/verify-payment", verifyPayment);

// Invoice routes
router.get(
  "/invoice/:paymentId/download",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  downloadInvoice
);
router.post(
  "/invoice/:paymentId/send",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN),
  sendInvoiceToStudent
);

export default router;
