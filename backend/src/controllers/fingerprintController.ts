import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Fingerprint from "../models/Fingerprint";
import Student from "../models/Student";
import path from "path";
import fs from "fs";
import archiver from "archiver";

const FINGERPRINTS_DIR = path.join(__dirname, "../../uploads/fingerprints");

// Ensure directory exists (async IIFE)
(async () => {
  try {
    await fs.promises.access(FINGERPRINTS_DIR);
  } catch {
    await fs.promises.mkdir(FINGERPRINTS_DIR, { recursive: true });
  }
})();

// GET /api/fingerprints/:studentId - Get all fingerprints for a student
export const getFingerprints = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (userRole === "ADMIN" && student.adminId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const fingerprints = await Fingerprint.find({ studentId }).sort({ createdAt: -1 });

    const data: Record<string, any> = {};
    for (const fp of fingerprints) {
      const key = `${fp.fingerPosition}_${fp.fingerType}`;
      const filePath = path.join(FINGERPRINTS_DIR, fp.imagePath);
      let fileExists = false;
      try { await fs.promises.access(filePath); fileExists = true; } catch { /* not found */ }
      data[key] = {
        id: fp._id,
        fingerPosition: fp.fingerPosition,
        fingerType: fp.fingerType,
        filename: fp.imagePath,
        fileExists,
        createdAt: fp.createdAt,
      };
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("Get fingerprints error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/fingerprints/upload - Upload a fingerprint (base64 image)
export const uploadFingerprint = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, fingerPosition, fingerType, imageData } = req.body;

    if (!studentId || !fingerPosition || !fingerType || !imageData) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Ownership check
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    if (userRole === "ADMIN" && student.adminId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (userRole === "COUNSELOR" && student.counselorId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Decode base64 image
    const imgBuffer = Buffer.from(imageData, "base64");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `fp_${studentId}_${fingerPosition}_${fingerType}_${timestamp}.png`;
    const filePath = path.join(FINGERPRINTS_DIR, filename);

    await fs.promises.writeFile(filePath, imgBuffer);

    // Upsert fingerprint record
    const existing = await Fingerprint.findOne({ studentId, fingerPosition, fingerType });

    if (existing) {
      // Delete old file
      const oldPath = path.join(FINGERPRINTS_DIR, existing.imagePath);
      try { await fs.promises.unlink(oldPath); } catch { /* file may not exist */ }
      existing.imagePath = filename;
      await existing.save();
    } else {
      await Fingerprint.create({ studentId, fingerPosition, fingerType, imagePath: filename });
    }

    return res.json({
      success: true,
      message: "Fingerprint saved",
      data: { imageUrl: `/uploads/fingerprints/${filename}` },
    });
  } catch (err) {
    console.error("Upload fingerprint error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/fingerprints/save - Save fingerprint from file upload
export const saveFingerprint = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId, fingerPosition, fingerType } = req.body;
    const file = req.file;

    if (!studentId || !fingerPosition || !fingerType || !file) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Ownership check
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    if (userRole === "ADMIN" && student.adminId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (userRole === "COUNSELOR" && student.counselorId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const filename = file.filename;

    // Upsert fingerprint record
    const existing = await Fingerprint.findOne({ studentId, fingerPosition, fingerType });

    if (existing) {
      const oldPath = path.join(FINGERPRINTS_DIR, existing.imagePath);
      try { await fs.promises.unlink(oldPath); } catch { /* file may not exist */ }
      existing.imagePath = filename;
      await existing.save();
    } else {
      await Fingerprint.create({ studentId, fingerPosition, fingerType, imagePath: filename });
    }

    return res.json({
      success: true,
      message: "Fingerprint saved",
      data: { imageUrl: `/uploads/fingerprints/${filename}` },
    });
  } catch (err) {
    console.error("Save fingerprint error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/fingerprints/:id - Delete a fingerprint
export const deleteFingerprint = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const fp = await Fingerprint.findById(id);
    if (!fp) {
      return res.status(404).json({ success: false, message: "Fingerprint not found" });
    }

    // Ownership check
    const student = await Student.findById(fp.studentId);
    if (student) {
      const userRole = req.user?.role;
      const userId = req.user?.userId;
      if (userRole === "ADMIN" && student.adminId?.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      if (userRole === "COUNSELOR" && student.counselorId?.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    const filePath = path.join(FINGERPRINTS_DIR, fp.imagePath);
    try { await fs.promises.unlink(filePath); } catch { /* file may not exist */ }

    await Fingerprint.findByIdAndDelete(id);

    return res.json({ success: true, message: "Fingerprint deleted" });
  } catch (err) {
    console.error("Delete fingerprint error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/fingerprints/download/:studentId - Download all fingerprints as zip
export const downloadFingerprints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).populate("adminId", "name email");
    if (!student) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const fingerprints = await Fingerprint.find({ studentId });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${student.name.replace(/\s+/g, "_")}_fingerprints.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    // Add student details text
    const adminName = (student.adminId as any)?.name || "Unassigned";
    const details = `STUDENT INFORMATION\n==================\nName: ${student.name}\nParent: ${student.parentName}\nMobile: ${student.mobile}\nEmail: ${student.email}\nUniversity: ${student.university}\nStandard: ${student.standard}\nAddress: ${student.address}\nDOB: ${student.dob}\nGender: ${student.gender}\nAdmin: ${adminName}\n\nTotal Fingerprints: ${fingerprints.length}`;
    archive.append(details, { name: "student_details.txt" });

    // Add fingerprint images
    for (const fp of fingerprints) {
      const filePath = path.join(FINGERPRINTS_DIR, fp.imagePath);
      try {
        await fs.promises.access(filePath);
        archive.file(filePath, { name: `fingerprints/${fp.fingerPosition}_${fp.fingerType}.png` });
      } catch { /* file may not exist */ }
    }

    await archive.finalize();
  } catch (err) {
    console.error("Download fingerprints error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
