import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import FingerprintAnalysis from "../models/FingerprintAnalysis";
import Student from "../models/Student";

// GET /api/fingerprint-analysis/:studentId
export const getAnalysis = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const records = await FingerprintAnalysis.find({ studentId });
    const data: Record<string, { pattern: string; ridgeCount: number }> = {};
    for (const r of records) {
      data[r.fingerPosition] = {
        pattern: r.pattern,
        ridgeCount: r.ridgeCount,
      };
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("Get analysis error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

// POST /api/fingerprint-analysis/:studentId
// Body: { data: { L1: { pattern, ridgeCount }, ... } }
export const saveAnalysis = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const { data } = req.body;

    if (!data || typeof data !== "object") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid data" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const validPositions = [
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "R1",
      "R2",
      "R3",
      "R4",
      "R5",
    ];

    const ops = [];
    for (const pos of validPositions) {
      if (data[pos]) {
        const { pattern, ridgeCount } = data[pos];
        if (!pattern || ridgeCount === undefined || ridgeCount === null) continue;
        const rc = Number(ridgeCount);
        if (isNaN(rc) || rc < 0 || rc > 24) continue;
        ops.push({
          updateOne: {
            filter: { studentId, fingerPosition: pos },
            update: { $set: { pattern, ridgeCount: rc } },
            upsert: true,
          },
        });
      }
    }

    if (ops.length > 0) {
      await FingerprintAnalysis.bulkWrite(ops);
    }

    return res.json({
      success: true,
      message: `Saved analysis for ${ops.length} fingers`,
    });
  } catch (err) {
    console.error("Save analysis error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};
