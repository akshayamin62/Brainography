import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  listDocuments,
  uploadDocument,
  downloadDocument,
} from "../controllers/documentController";

const DOCS_DIR = path.join(__dirname, "../../uploads/student_docs");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DOCS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(pdf|doc|docx|png|jpg|jpeg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, DOCX, and image files are allowed"));
    }
  },
});

const router = Router();

router.get(
  "/download/:docId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  downloadDocument
);

// These must be LAST - catch-all param routes
router.get(
  "/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  listDocuments
);

router.post(
  "/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN),
  upload.single("document"),
  uploadDocument
);

export default router;
