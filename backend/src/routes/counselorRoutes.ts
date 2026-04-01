import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  listCounselors,
  getCounselor,
  createCounselor,
  updateCounselor,
} from "../controllers/counselorController";

const router = Router();

// Only admins can manage counselors
router.get("/", authenticate, authorize(USER_ROLE.ADMIN), listCounselors);
router.get("/:id", authenticate, authorize(USER_ROLE.ADMIN), getCounselor);
router.post("/", authenticate, authorize(USER_ROLE.ADMIN), createCounselor);
router.put("/:id", authenticate, authorize(USER_ROLE.ADMIN), updateCounselor);

export default router;
