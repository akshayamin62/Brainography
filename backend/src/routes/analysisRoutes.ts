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
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  getAnalysis
);

router.post(
  "/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  saveAnalysis
);

export default router;
