import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  listStudents,
  getStudent,
  createStudent,
  updateStudent,
} from "../controllers/studentController";

const router = Router();

router.get("/", authenticate, authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR), listStudents);
router.get("/:id", authenticate, authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR), getStudent);
router.post("/", authenticate, authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR), createStudent);
router.put("/:id", authenticate, authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR), updateStudent);

export default router;
