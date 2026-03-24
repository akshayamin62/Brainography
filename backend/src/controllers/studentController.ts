import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Student from "../models/Student";
import StudentDocument from "../models/StudentDocument";
import User from "../models/User";

// GET /api/students - List students
export const listStudents = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    let filter = {};
    if (userRole === "ADMIN") {
      filter = { adminId: userId };
    }

    const students = await Student.find(filter)
      .populate("adminId", "name email")
      .sort({ createdAt: -1 });

    // Get document status for all students
    const studentIds = students.map(s => s._id);
    const docs = await StudentDocument.find({ studentId: { $in: studentIds } });
    const docMap = new Map(docs.map(d => [d.studentId.toString(), { _id: d._id, filename: d.filename, originalName: d.originalName }]));

    const studentsWithDocs = students.map(s => {
      const obj = s.toObject();
      (obj as any).document = docMap.get(s._id.toString()) || null;
      return obj;
    });

    return res.json({ success: true, data: studentsWithDocs });
  } catch (err) {
    console.error("List students error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /api/students/:id - Get single student
export const getStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Admin can only see their own students
    if (userRole === "ADMIN" && student.adminId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Populate after ownership check
    await student.populate("adminId", "name email");

    return res.json({ success: true, data: student });
  } catch (err) {
    console.error("Get student error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/students - Create student
export const createStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;
    const { name, parentName, mobile, email, university, standard, address, dob, gender, adminId } = req.body;

    if (!name || !parentName || !mobile || !email || !university || !standard || !address || !dob || !gender) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Determine the admin owner
    let assignedAdminId = userId; // Default: current user (admin)
    if (userRole === "SUPER_ADMIN" && adminId) {
      // Super admin can assign to any admin
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== "ADMIN") {
        return res.status(400).json({ success: false, message: "Invalid admin ID" });
      }
      assignedAdminId = adminId;
    }

    const student = new Student({
      adminId: assignedAdminId,
      name,
      parentName,
      mobile,
      email,
      university,
      standard,
      address,
      dob,
      gender,
    });

    await student.save();

    const populated = await Student.findById(student._id).populate("adminId", "name email");

    return res.status(201).json({
      success: true,
      message: "Student created",
      data: populated,
    });
  } catch (err) {
    console.error("Create student error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/students/:id - Update student
export const updateStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (userRole === "ADMIN" && student.adminId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { name, parentName, mobile, email, university, standard, address, dob, gender, adminId } = req.body;

    if (name) student.name = name;
    if (parentName) student.parentName = parentName;
    if (mobile) student.mobile = mobile;
    if (email) student.email = email;
    if (university) student.university = university;
    if (standard) student.standard = standard;
    if (address) student.address = address;
    if (dob) student.dob = dob;
    if (gender) student.gender = gender;
    if (userRole === "SUPER_ADMIN" && adminId) student.adminId = adminId;

    await student.save();

    const populated = await Student.findById(student._id).populate("adminId", "name email");

    return res.json({ success: true, message: "Student updated", data: populated });
  } catch (err) {
    console.error("Update student error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/students/:id - Delete student
export const deleteStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (userRole === "ADMIN" && student.adminId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await Student.findByIdAndDelete(id);

    return res.json({ success: true, message: "Student deleted" });
  } catch (err) {
    console.error("Delete student error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
