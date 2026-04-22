import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  listCounselors,
  listAllCounselors,
  getCounselor,
  createCounselor,
  createCounselorForAdmin,
  updateCounselor,
} from "../controllers/counselorController";

const router = Router();

// Super Admin routes
router.get("/all", authenticate, authorize(USER_ROLE.SUPER_ADMIN), listAllCounselors);
router.post("/super-admin", authenticate, authorize(USER_ROLE.SUPER_ADMIN), createCounselorForAdmin);

// Admin routes
router.get("/", authenticate, authorize(USER_ROLE.ADMIN), listCounselors);
router.get("/:id", authenticate, authorize(USER_ROLE.ADMIN), getCounselor);
router.post("/", authenticate, authorize(USER_ROLE.ADMIN), createCounselor);
router.put("/:id", authenticate, authorize(USER_ROLE.ADMIN, USER_ROLE.SUPER_ADMIN), updateCounselor);

export default router;
