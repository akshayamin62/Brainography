import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { getSettings, updateSettings } from "../controllers/settingsController";

const router = Router();

router.get("/", authenticate, authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR), getSettings);
router.put("/", authenticate, authorize(USER_ROLE.SUPER_ADMIN), updateSettings);

export default router;
