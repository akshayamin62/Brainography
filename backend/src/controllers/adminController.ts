import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import User from "../models/User";
import AdminDetail from "../models/AdminDetail";
import Student from "../models/Student";
import Fingerprint from "../models/Fingerprint";
import FingerprintAnalysis from "../models/FingerprintAnalysis";
import StudentDocument from "../models/StudentDocument";
import { sendAdminWelcomeEmail } from "../utils/email";
import fs from "fs";
import path from "path";

// GET /api/admins - List all admins (Super Admin only)
export const listAdmins = async (_req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const admins = await User.find({ role: "ADMIN" })
      .select("-otp -otpExpires")
      .sort({ createdAt: -1 });

    // Attach admin details
    const adminIds = admins.map(a => a._id);
    const details = await AdminDetail.find({ userId: { $in: adminIds } });
    const detailMap = new Map(details.map(d => [d.userId.toString(), d]));

    // Count students per admin
    const studentCounts = await Student.aggregate([
      { $match: { adminId: { $in: adminIds } } },
      { $group: { _id: "$adminId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(studentCounts.map(sc => [sc._id.toString(), sc.count]));

    const adminsWithDetails = admins.map(a => {
      const obj = a.toObject();
      (obj as any).details = detailMap.get(a._id.toString()) || null;
      (obj as any).studentCount = countMap.get(a._id.toString()) || 0;
      return obj;
    });

    return res.json({ success: true, data: adminsWithDetails });
  } catch (err) {
    console.error("List admins error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/admins/:id - Get single admin with details
export const getAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const admin = await User.findById(id).select("-otp -otpExpires");
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    const detail = await AdminDetail.findOne({ userId: id });
    const obj = admin.toObject();
    (obj as any).details = detail || null;
    return res.json({ success: true, data: obj });
  } catch (err) {
    console.error("Get admin error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/admins - Create a new admin (Super Admin only)
export const createAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { firstName, middleName, lastName, email, phone, countryCode, companyName, address, country, state, city } = req.body;

    if (!firstName || !lastName || !email || !companyName || !phone) {
      return res.status(400).json({ success: false, message: "First name, last name, email, company name, and mobile are required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already in use" });
    }

    const name = [firstName, middleName, lastName].filter(Boolean).join(" ");

    const admin = new User({
      name,
      email: email.toLowerCase(),
      phone: phone || undefined,
      role: "ADMIN",
      isActive: true,
      isVerified: false,
    });

    await admin.save();

    // Save admin details
    const detail = new AdminDetail({
      userId: admin._id,
      firstName,
      middleName: middleName || "",
      lastName,
      countryCode: countryCode || "+91",
      companyName: companyName || "",
      address: address || "",
      country: country || "",
      state: state || "",
      city: city || "",
    });

    await detail.save();

    // Send welcome email to the new admin
    try {
      await sendAdminWelcomeEmail(admin.email, admin.name, companyName);
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr);
      // Don't fail the request if email fails
    }

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        details: detail,
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
    const { firstName, middleName, lastName, email, phone, isActive, countryCode, companyName, address, country, state, city } = req.body;

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

    if (firstName || lastName) {
      // Merge with existing admin detail to avoid dropping name parts
      const existingDetail = await AdminDetail.findOne({ userId: id });
      const fn = firstName || existingDetail?.firstName || admin.name.split(' ')[0] || '';
      const mn = middleName !== undefined ? middleName : (existingDetail?.middleName || '');
      const ln = lastName || existingDetail?.lastName || admin.name.split(' ').pop() || '';
      admin.name = [fn, mn, ln].filter(Boolean).join(' ');
    }
    if (phone !== undefined) admin.phone = phone;
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    // Update admin details
    await AdminDetail.findOneAndUpdate(
      { userId: id },
      {
        ...(firstName && { firstName }),
        ...(middleName !== undefined && { middleName }),
        ...(lastName && { lastName }),
        ...(countryCode && { countryCode }),
        ...(companyName !== undefined && { companyName }),
        ...(address !== undefined && { address }),
        ...(country !== undefined && { country }),
        ...(state !== undefined && { state }),
        ...(city !== undefined && { city }),
      },
      { upsert: true, new: true }
    );

    const detail = await AdminDetail.findOne({ userId: id });

    return res.json({
      success: true,
      message: "Admin updated",
      data: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        isActive: admin.isActive,
        details: detail,
      },
    });
  } catch (err) {
    console.error("Update admin error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/admins/:id - Delete admin (with cascade)
export const deleteAdmin = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;

    const admin = await User.findById(id);
    if (!admin || admin.role !== "ADMIN") {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    // Find all students belonging to this admin
    const students = await Student.find({ adminId: id });
    const studentIds = students.map(s => s._id);

    if (studentIds.length > 0) {
      // Delete fingerprint files from disk
      const fingerprints = await Fingerprint.find({ studentId: { $in: studentIds } });
      const fpDir = path.join(__dirname, "../../uploads/fingerprints");
      for (const fp of fingerprints) {
        const fpPath = path.join(fpDir, fp.imagePath);
        try { await fs.promises.unlink(fpPath); } catch { /* file may not exist */ }
      }

      // Delete document files from disk
      const docs = await StudentDocument.find({ studentId: { $in: studentIds } });
      const docDir = path.join(__dirname, "../../uploads/student_docs");
      for (const doc of docs) {
        const docPath = path.join(docDir, doc.filename);
        try { await fs.promises.unlink(docPath); } catch { /* file may not exist */ }
      }

      // Delete all dependent records
      await Fingerprint.deleteMany({ studentId: { $in: studentIds } });
      await FingerprintAnalysis.deleteMany({ studentId: { $in: studentIds } });
      await StudentDocument.deleteMany({ studentId: { $in: studentIds } });
      await Student.deleteMany({ adminId: id });
    }

    // Delete counselors created by this admin
    await User.deleteMany({ role: "COUNSELOR", createdBy: id });

    // Delete admin detail
    await AdminDetail.findOneAndDelete({ userId: id });

    // Delete admin user
    await User.findByIdAndDelete(id);

    return res.json({ success: true, message: "Admin and all associated data deleted" });
  } catch (err) {
    console.error("Delete admin error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
