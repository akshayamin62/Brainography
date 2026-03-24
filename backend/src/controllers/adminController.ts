import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";

// GET /api/admins - List all admins (Super Admin only)
export const listAdmins = async (_req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const admins = await User.find({ role: "ADMIN" })
      .select("-otp -otpExpires")
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: admins });
  } catch (err) {
    console.error("List admins error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/admins - Create a new admin (Super Admin only)
export const createAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }

    const admin = new User({
      name,
      email: email.toLowerCase(),
      phone: phone || undefined,
      role: "ADMIN",
      isActive: true,
      isVerified: false,
    });

    await admin.save();

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Create admin error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/admins/:id - Update admin
export const updateAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { name, email, phone, isActive } = req.body;

    const admin = await User.findById(id);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (email && email.toLowerCase() !== admin.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already in use" });
      }
      admin.email = email.toLowerCase();
    }

    if (name) admin.name = name;
    if (phone !== undefined) admin.phone = phone;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    return res.json({
      success: true,
      message: "Admin updated",
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        isActive: admin.isActive,
      },
    });
  } catch (err) {
    console.error("Update admin error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/admins/:id - Delete admin
export const deleteAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const admin = await User.findById(id);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    await User.findByIdAndDelete(id);

    return res.json({ success: true, message: "Admin deleted" });
  } catch (err) {
    console.error("Delete admin error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
