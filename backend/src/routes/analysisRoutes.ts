import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  getAnalysis,
  saveAnalysis,
} from "../controllers/analysisController";

const router = Router();

router.get(
  "/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  getAnalysis
);

router.post(
  "/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  saveAnalysis
);

export default router;
