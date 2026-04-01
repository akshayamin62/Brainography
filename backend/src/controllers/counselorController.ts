import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";
import Student from "../models/Student";

// GET /api/counselors - List all counselors for the current admin
export const listCounselors = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminId = req.user?.userId;

    const counselors = await User.find({ role: "COUNSELOR", createdBy: adminId })
      .select("-otp -otpExpires")
      .sort({ createdAt: -1 });

    // Count students per counselor
    const counselorIds = counselors.map(c => c._id);
    const studentCounts = await Student.aggregate([
      { $match: { counselorId: { $in: counselorIds } } },
      { $group: { _id: "$counselorId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(studentCounts.map(sc => [sc._id.toString(), sc.count]));

    const counselorsWithCounts = counselors.map(c => {
      const obj = c.toObject();
      (obj as any).studentCount = countMap.get(c._id.toString()) || 0;
      return obj;
    });

    return res.json({ success: true, data: counselorsWithCounts });
  } catch (err) {
    console.error("List counselors error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/counselors/:id - Get single counselor
export const getCounselor = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;

    const counselor = await User.findById(id).select("-otp -otpExpires");
    if (!counselor || counselor.role !== "COUNSELOR" || counselor.createdBy?.toString() !== adminId) {
      return res.status(404).json({ success: false, message: "Counselor not found" });
    }

    return res.json({ success: true, data: counselor });
  } catch (err) {
    console.error("Get counselor error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/counselors - Create a new counselor (Admin only)
export const createCounselor = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const adminId = req.user?.userId;
    const { firstName, middleName, lastName, email, phone } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ success: false, message: "First name, last name, email, and phone are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }

    const name = [firstName, middleName, lastName].filter(Boolean).join(" ");

    const counselor = new User({
      name,
      email: email.toLowerCase(),
      phone: phone || undefined,
      role: "COUNSELOR",
      isActive: true,
      isVerified: false,
      createdBy: adminId,
    });

    await counselor.save();

    return res.status(201).json({
      success: true,
      message: "Counselor created successfully",
      data: {
        id: counselor._id,
        name: counselor.name,
        email: counselor.email,
        phone: counselor.phone,
        role: counselor.role,
      },
    });
  } catch (err) {
    console.error("Create counselor error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/counselors/:id - Update counselor
export const updateCounselor = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.userId;
    const { firstName, middleName, lastName, email, phone, isActive } = req.body;

    const counselor = await User.findById(id);
    if (!counselor || counselor.role !== "COUNSELOR" || counselor.createdBy?.toString() !== adminId) {
      return res.status(404).json({ success: false, message: "Counselor not found" });
    }

    if (email && email.toLowerCase() !== counselor.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already in use" });
      }
      counselor.email = email.toLowerCase();
    }

    if (firstName || lastName) {
      const name = [firstName, middleName, lastName].filter(Boolean).join(" ");
      counselor.name = name;
    }
    if (phone !== undefined) counselor.phone = phone;
    if (isActive !== undefined) counselor.isActive = isActive;

    await counselor.save();

    return res.json({
      success: true,
      message: "Counselor updated",
      data: {
        id: counselor._id,
        name: counselor.name,
        email: counselor.email,
        phone: counselor.phone,
        isActive: counselor.isActive,
      },
    });
  } catch (err) {
    console.error("Update counselor error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
