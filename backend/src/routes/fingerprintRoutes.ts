import { Router } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  getFingerprints,
  uploadFingerprint,
  saveFingerprint,
  downloadFingerprints,
} from "../controllers/fingerprintController";

const FINGERPRINTS_DIR = path.join(__dirname, "../../uploads/fingerprints");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FINGERPRINTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(png|jpg|jpeg|bmp|tiff)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const router = Router();

router.post(
  "/upload",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  uploadFingerprint
);

router.post(
  "/save",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  upload.single("fingerprint"),
  saveFingerprint
);

router.get(
  "/download/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  downloadFingerprints
);

// This must be LAST - catch-all param route
router.get(
  "/:studentId",
  authenticate,
  authorize(USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.COUNSELOR),
  getFingerprints
);

export default router;
