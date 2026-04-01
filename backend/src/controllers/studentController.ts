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
    } else if (userRole === "COUNSELOR") {
      filter = { counselorId: userId };
    }

    const students = await Student.find(filter)
      .populate("adminId", "name email")
      .populate("counselorId", "name email")
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

    // Counselor can only see their own students
    if (userRole === "COUNSELOR" && student.counselorId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Populate after ownership check
    await student.populate("adminId", "name email");
    await student.populate("counselorId", "name email");

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
      adminId, standard,
    } = req.body;

    if (!firstName || !lastName || !dob || !gender || !mobile || !email ||
        !educationLevel || !institutionName || !institutionCountry || !mediumOfTeaching ||
        !address || !country || !state || !city ||
        !familyStructure || !motherActivity || !fatherActivity || !games) {
      return res.status(400).json({ success: false, message: "All required fields must be provided" });
    }

    // Determine the admin owner
    let assignedAdminId = userId; // Default: current user (admin)
    let assignedCounselorId = undefined;
    if (userRole === "SUPER_ADMIN" && adminId) {
      // Super admin can assign to any admin
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== "ADMIN") {
        return res.status(400).json({ success: false, message: "Invalid admin ID" });
      }
      assignedAdminId = adminId;
    } else if (userRole === "COUNSELOR") {
      // Counselor: assign to the admin who created this counselor
      const counselor = await User.findById(userId);
      if (!counselor || !counselor.createdBy) {
        return res.status(400).json({ success: false, message: "Counselor not linked to an admin" });
      }
      assignedAdminId = counselor.createdBy.toString();
      assignedCounselorId = userId;
    }

    const name = [firstName, middleName, lastName].filter(Boolean).join(" ");

    // Atomically generate a unique report number.
    // The unique index on reportNo acts as the concurrency guard:
    // if two requests race and pick the same number, the second save
    // will throw a duplicate-key error (code 11000) and we retry.
    const PREFIX = "KS";
    const START_NUM = 2100;
    let populated = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const lastStudent = await Student.findOne(
        { reportNo: { $exists: true } },
        { reportNo: 1 }
      ).sort({ reportNo: -1 });
      let nextNum = START_NUM;
      if (lastStudent?.reportNo) {
        const numPart = parseInt(lastStudent.reportNo.replace(PREFIX, ""), 10);
        if (!isNaN(numPart) && numPart >= START_NUM) nextNum = numPart + 1;
      }
      const reportNo = `${PREFIX}${String(nextNum).padStart(6, "0")}`;

      const student = new Student({
        adminId: assignedAdminId,
        counselorId: assignedCounselorId || undefined,
        reportNo,
        firstName, middleName: middleName || "", lastName,
        dob, gender, countryCode: countryCode || "+91", mobile, email,
        educationLevel, board: board || "", boardFullName: boardFullName || "",
        institutionName, institutionCountry, fieldOfStudy: fieldOfStudy || "", mediumOfTeaching,
        address, country, state, city,
        siblings: siblings ?? 0, familyStructure, motherActivity, fatherActivity,
        hobbies: hobbies || "", games, otherGames: otherGames || "",
        standard: standard || "",
        name,
      });

      try {
        await student.save();
        populated = await Student.findById(student._id).populate("adminId", "name email").populate("counselorId", "name email");
        break; // success — exit retry loop
      } catch (saveErr: any) {
        if (saveErr.code === 11000 && saveErr.keyPattern?.reportNo) {
          continue; // another concurrent request grabbed this number — retry
        }
        throw saveErr; // unrelated error — propagate
      }
    }

    if (!populated) {
      return res.status(500).json({ success: false, message: "Failed to assign a unique report number. Please try again." });
    }

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

    if (userRole === "COUNSELOR" && student.counselorId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const {
      firstName, middleName, lastName, dob, gender, countryCode, mobile, email,
      educationLevel, board, boardFullName, institutionName, institutionCountry, fieldOfStudy, mediumOfTeaching,
      address, country, state, city,
      siblings, familyStructure, motherActivity, fatherActivity,
      hobbies, games, otherGames,
      adminId, standard,
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
    if (standard !== undefined) student.standard = standard;
    if (userRole === "SUPER_ADMIN" && adminId) student.adminId = adminId;

    // Recompute name
    student.name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");

    await student.save();

    const populated = await Student.findById(student._id).populate("adminId", "name email").populate("counselorId", "name email");

    return res.json({ success: true, message: "Student updated", data: populated });
  } catch (err) {
    console.error("Update student error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
