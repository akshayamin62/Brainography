import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { listAdmins, getAdmin, createAdmin, updateAdmin } from "../controllers/adminController";

const router = Router();

router.get("/", authenticate, authorize(USER_ROLE.SUPER_ADMIN), listAdmins);
router.get("/:id", authenticate, authorize(USER_ROLE.SUPER_ADMIN), getAdmin);
router.post("/", authenticate, authorize(USER_ROLE.SUPER_ADMIN), createAdmin);
router.put("/:id", authenticate, authorize(USER_ROLE.SUPER_ADMIN), updateAdmin);

export default router;
