import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { calculateReport, generatePdfReport } from "../controllers/reportController";

const router = Router();

router.post(
  "/calculate/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  calculateReport
);

router.get(
  "/generate/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  generatePdfReport
);

export default router;
