import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";
import Student from "../models/Student";

// GET /api/dashboard/stats
export const getStats = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userRole = req.user?.role;

    if (userRole === "SUPER_ADMIN") {
      const [totalAdmins, totalStudents, totalUsers] = await Promise.all([
        User.countDocuments({ role: "ADMIN" }),
        Student.countDocuments(),
        User.countDocuments(),
      ]);

      return res.json({
        success: true,
        data: { totalAdmins, totalStudents, totalUsers },
      });
    }

    if (userRole === "ADMIN") {
      const adminId = req.user?.userId;
      const totalStudents = await Student.countDocuments({ adminId });

      return res.json({
        success: true,
        data: { totalStudents },
      });
    }

    return res.status(403).json({ success: false, message: "Access denied" });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
