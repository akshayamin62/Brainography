import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import FingerprintAnalysis from "../models/FingerprintAnalysis";
import Student from "../models/Student";
import AdminDetail from "../models/AdminDetail";
import { runCalculations, AnalysisInput } from "../services/calculationService";
import { generateReport, StudentData } from "../services/pdfService";

const VALID_POSITIONS = ["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"];

// POST /api/reports/calculate/:studentId — run calculations, return JSON
export const calculateReport = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const records = await FingerprintAnalysis.find({ studentId });
    if (records.length < 10) {
      return res.status(400).json({
        success: false,
        message: "All 10 finger analyses must be saved before generating a report",
      });
    }

    const patterns: Record<string, string> = {};
    const ridgeCounts: Record<string, number> = {};
    for (const r of records) {
      if (VALID_POSITIONS.includes(r.fingerPosition)) {
        patterns[r.fingerPosition] = r.pattern;
        ridgeCounts[r.fingerPosition] = r.ridgeCount;
      }
    }

    const input: AnalysisInput = { patterns, ridgeCounts };
    const result = runCalculations(input);

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("Calculate report error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/reports/generate/:studentId — generate PDF and stream it
export const generatePdfReport = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      res.status(404).json({ success: false, message: "Student not found" });
      return;
    }

    const records = await FingerprintAnalysis.find({ studentId });
    if (records.length < 10) {
      res.status(400).json({
        success: false,
        message: "All 10 finger analyses must be saved before generating a report",
      });
      return;
    }

    const patterns: Record<string, string> = {};
    const ridgeCounts: Record<string, number> = {};
    for (const r of records) {
      if (VALID_POSITIONS.includes(r.fingerPosition)) {
        patterns[r.fingerPosition] = r.pattern;
        ridgeCounts[r.fingerPosition] = r.ridgeCount;
      }
    }

    const input: AnalysisInput = { patterns, ridgeCounts };
    const calcResult = runCalculations(input);

    // Get admin company name for CENTER field
    let centerName = "Kareer Studio";
    if (student.adminId) {
      const adminDetail = await AdminDetail.findOne({ userId: student.adminId });
      if (adminDetail?.companyName) centerName = adminDetail.companyName;
    }

    const now = new Date();
    const createdOn = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) + " " + now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const studentData: StudentData = {
      name: student.name || `${student.firstName} ${student.lastName}`,
      dob: student.dob || "",
      standard: student.standard || student.educationLevel || "",
      board: student.board || student.boardFullName || "",
      institute: student.institutionName || student.university || "",
      contact: `${student.countryCode || ""}${student.mobile || ""}`,
      email: student.email || "",
      analysisNo: student.reportNo || "",
      centerName,
      createdOn,
    };

    const pdfBuffer = await generateReport(studentData, calcResult);

    const safeName = (student.name || "Student").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Brainography_Report_${safeName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.stack || err.message : String(err);
    console.error("Generate PDF error:", errMsg);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
