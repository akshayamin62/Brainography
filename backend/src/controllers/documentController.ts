import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import StudentDocument from "../models/StudentDocument";
import Student from "../models/Student";
import path from "path";
import fs from "fs";

const DOCS_DIR = path.join(__dirname, "../../uploads/student_docs");

if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// GET /api/documents/:studentId - List documents for a student
export const listDocuments = async (req: AuthRequest, res: Response): Promise<Response> => {
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

    const docs = await StudentDocument.find({ studentId })
      .populate("uploaderId", "name")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error("List documents error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/documents/:studentId - Upload a document (one per student, replaces existing)
export const uploadDocument = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.userId;
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Remove existing document if any (one doc per student)
    const existing = await StudentDocument.findOne({ studentId });
    if (existing) {
      const oldPath = path.join(DOCS_DIR, existing.filename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      await StudentDocument.findByIdAndDelete(existing._id);
    }

    const doc = new StudentDocument({
      studentId,
      uploaderId: userId,
      filename: file.filename,
      originalName: file.originalname,
    });

    await doc.save();

    return res.status(201).json({
      success: true,
      message: "Document uploaded",
      data: doc,
    });
  } catch (err) {
    console.error("Upload document error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/documents/download/:docId - Download a document
export const downloadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { docId } = req.params;

    const doc = await StudentDocument.findById(docId);
    if (!doc) {
      res.status(404).json({ success: false, message: "Document not found" });
      return;
    }

    const filePath = path.join(DOCS_DIR, doc.filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, message: "File not found on server" });
      return;
    }

    res.download(filePath, doc.originalName);
  } catch (err) {
    console.error("Download document error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/documents/:docId - Delete a document
export const deleteDocument = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { docId } = req.params;

    const doc = await StudentDocument.findById(docId);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const filePath = path.join(DOCS_DIR, doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await StudentDocument.findByIdAndDelete(docId);

    return res.json({ success: true, message: "Document deleted" });
  } catch (err) {
    console.error("Delete document error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
