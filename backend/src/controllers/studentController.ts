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
    const {
      firstName, middleName, lastName, dob, gender, countryCode, mobile, email,
      educationLevel, board, boardFullName, institutionName, institutionCountry, fieldOfStudy, mediumOfTeaching,
      address, country, state, city,
      siblings, familyStructure, motherActivity, fatherActivity,
      hobbies, games, otherGames,
      adminId,
    } = req.body;

    if (!firstName || !lastName || !dob || !gender || !mobile || !email ||
        !educationLevel || !institutionName || !institutionCountry || !mediumOfTeaching ||
        !address || !country || !state || !city ||
        !familyStructure || !motherActivity || !fatherActivity || !games) {
      return res.status(400).json({ success: false, message: "All required fields must be provided" });
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

    const name = [firstName, middleName, lastName].filter(Boolean).join(" ");

    const student = new Student({
      adminId: assignedAdminId,
      firstName, middleName: middleName || "", lastName,
      dob, gender, countryCode: countryCode || "+91", mobile, email,
      educationLevel, board: board || "", boardFullName: boardFullName || "",
      institutionName, institutionCountry, fieldOfStudy: fieldOfStudy || "", mediumOfTeaching,
      address, country, state, city,
      siblings: siblings ?? 0, familyStructure, motherActivity, fatherActivity,
      hobbies: hobbies || "", games, otherGames: otherGames || "",
      name,
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

    const {
      firstName, middleName, lastName, dob, gender, countryCode, mobile, email,
      educationLevel, board, boardFullName, institutionName, institutionCountry, fieldOfStudy, mediumOfTeaching,
      address, country, state, city,
      siblings, familyStructure, motherActivity, fatherActivity,
      hobbies, games, otherGames,
      adminId,
    } = req.body;

    if (firstName !== undefined) student.firstName = firstName;
    if (middleName !== undefined) student.middleName = middleName;
    if (lastName !== undefined) student.lastName = lastName;
    if (dob) student.dob = dob;
    if (gender) student.gender = gender;
    if (countryCode) student.countryCode = countryCode;
    if (mobile) student.mobile = mobile;
    if (email) student.email = email;
    if (educationLevel) student.educationLevel = educationLevel;
    if (board !== undefined) student.board = board;
    if (boardFullName !== undefined) student.boardFullName = boardFullName;
    if (institutionName) student.institutionName = institutionName;
    if (institutionCountry) student.institutionCountry = institutionCountry;
    if (fieldOfStudy !== undefined) student.fieldOfStudy = fieldOfStudy;
    if (mediumOfTeaching) student.mediumOfTeaching = mediumOfTeaching;
    if (address) student.address = address;
    if (country) student.country = country;
    if (state) student.state = state;
    if (city) student.city = city;
    if (siblings !== undefined) student.siblings = siblings;
    if (familyStructure) student.familyStructure = familyStructure;
    if (motherActivity) student.motherActivity = motherActivity;
    if (fatherActivity) student.fatherActivity = fatherActivity;
    if (hobbies !== undefined) student.hobbies = hobbies;
    if (games) student.games = games;
    if (otherGames !== undefined) student.otherGames = otherGames;
    if (userRole === "SUPER_ADMIN" && adminId) student.adminId = adminId;

    // Recompute name
    student.name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");

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
