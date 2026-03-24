import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from "../controllers/adminController";

const router = Router();

router.get("/", authenticate, authorize(USER_ROLE.SUPER_ADMIN), listAdmins);
router.post("/", authenticate, authorize(USER_ROLE.SUPER_ADMIN), createAdmin);
router.put("/:id", authenticate, authorize(USER_ROLE.SUPER_ADMIN), updateAdmin);
router.delete("/:id", authenticate, authorize(USER_ROLE.SUPER_ADMIN), deleteAdmin);

export default router;
