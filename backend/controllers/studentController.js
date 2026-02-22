const Student = require("../models/Student");
const FeeRecord = require("../models/FeeRecord");
const Transaction = require("../models/Transaction");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Configuration = require("../models/Configuration");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Minimal revenue helper inline to avoid import errors
const calculateRevenueSplit = async ({ fee, teacherRole, config }) => {
  const isPartner = teacherRole === "OWNER" || teacherRole === "PARTNER";
  const staffShare = config?.salaryConfig?.teacherShare || 70;

  if (isPartner) {
    return {
      teacherRevenue: fee,
      poolRevenue: 0,
      isPartner: true,
      isETEA: false,
      stream: teacherRole === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO",
      splitType: "PARTNER_100",
    };
  }

  const teacherAmt = Math.round((fee * staffShare) / 100);
  return {
    teacherRevenue: teacherAmt,
    poolRevenue: fee - teacherAmt,
    isPartner: false,
    isETEA: false,
    stream: "STAFF_TUITION",
    splitType: "STAFF_70_30",
    config: {
      staffTeacherShare: staffShare,
      staffAcademyShare: 100 - staffShare,
    },
  };
};

const getTeacherRole = async (teacher) => {
  if (!teacher) return "STAFF";
  if (teacher.role === "OWNER") return "OWNER";
  if (teacher.role === "PARTNER") return "PARTNER";

  const name = (teacher.name || "").toLowerCase();
  if (name.includes("waqar")) return "OWNER";
  if (name.includes("zahid") || name.includes("saud")) return "PARTNER";
  return "STAFF";
};

const distributePoolRevenue = async ({ poolAmount, isETEA }) => {
  // Simplified - actually implement your full logic later
  const split = isETEA
    ? { waqar: 40, zahid: 30, saud: 30 }
    : { waqar: 50, zahid: 30, saud: 20 };
  return {
    waqarShare: Math.round((poolAmount * split.waqar) / 100),
    zahidShare: Math.round((poolAmount * split.zahid) / 100),
    saudShare:
      poolAmount -
      Math.round((poolAmount * split.waqar) / 100) -
      Math.round((poolAmount * split.zahid) / 100),
    protocol: isETEA ? "ETEA" : "TUITION",
  };
};

// GET all students
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single student
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Calculate Fee Status based on strict logic
const calculateFeeStatus = (paidAmount, totalFee) => {
  if (paidAmount === 0) return "Pending";
  if (paidAmount > 0 && paidAmount < totalFee) return "Partial";
  if (paidAmount >= totalFee) return "Paid";
  return "Pending"; // default fallback
};

// CREATE student
exports.createStudent = async (req, res) => {
  try {
    const studentData = { ...req.body };
    
    // Calculate fee status on admission
    const paidAmount = studentData.paidAmount || 0;
    const totalFee = studentData.totalFee || 0;
    studentData.feeStatus = calculateFeeStatus(paidAmount, totalFee);
    
    const student = await Student.create(studentData);
    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// UPDATE student
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE student
exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Student deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// COLLECT FEE - Simplified but Working Version
exports.collectFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, month, subject, teacherId, paymentMethod, notes } =
      req.body;

    console.log("Collecting fee:", { id, amount, month, subject });

    if (!amount || !month) {
      return res
        .status(400)
        .json({ success: false, message: "Amount and month required" });
    }

    const student = await Student.findById(id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    // Find teacher
    let teacher = null;
    if (teacherId) {
      teacher = await Teacher.findById(teacherId);
    }

    // Get role and calculate split
    const teacherRole = teacher ? await getTeacherRole(teacher) : "STAFF";
    const config = await Configuration.findOne();
    const split = await calculateRevenueSplit({
      fee: Number(amount),
      teacherRole,
      config,
    });

    // Create Fee Record
    const feeRecord = await FeeRecord.create({
      student: student._id,
      studentName: student.studentName,
      className: student.class,
      subject: subject || "General",
      amount: Number(amount),
      month,
      status: "PAID",
      collectedBy: req.user?._id,
      collectedByName: req.user?.fullName || "Staff",
      teacher: teacher?._id,
      teacherName: teacher?.name,
      isPartnerTeacher: split.isPartner,
      revenueSource: split.splitType,
      splitBreakdown: {
        teacherShare: split.teacherRevenue,
        academyShare: split.poolRevenue,
        teacherPercentage: split.isPartner ? 100 : 70,
        academyPercentage: split.isPartner ? 0 : 30,
      },
      paymentMethod: paymentMethod || "CASH",
      notes,
    });

    // Update student with strict fee status calculation
    student.paidAmount = (student.paidAmount || 0) + Number(amount);
    student.feeStatus = calculateFeeStatus(student.paidAmount, student.totalFee || 0);
    await student.save();

    // Update teacher balance
    if (teacher && split.teacherRevenue > 0) {
      if (!teacher.balance)
        teacher.balance = { floating: 0, verified: 0, pending: 0 };

      if (split.isPartner) {
        teacher.balance.verified =
          (teacher.balance.verified || 0) + split.teacherRevenue;
      } else {
        teacher.balance.floating =
          (teacher.balance.floating || 0) + split.teacherRevenue;
      }
      await teacher.save();

      // Notification (non-critical)
      try {
        await Notification.create({
          recipient: teacher._id,
          message: `Fee received: ${student.studentName} - ${month}: PKR ${split.teacherRevenue}`,
          type: "FINANCE",
          relatedId: feeRecord._id.toString(),
        });
      } catch (e) {
        console.log("Notification skipped");
      }
    }

    // Create transaction record
    await Transaction.create({
      type: "INCOME",
      category: "Tuition",
      stream: split.stream,
      amount: Number(amount),
      description: `Fee: ${student.studentName} - ${month}`,
      collectedBy: req.user?._id,
      status: split.isPartner ? "VERIFIED" : "FLOATING",
      studentId: student._id,
      splitDetails: {
        teacherShare: split.teacherRevenue,
        academyShare: split.poolRevenue,
        teacherId: teacher?._id,
        teacherName: teacher?.name,
      },
    });

    // Update collector's totalCash for partner retention system
    if (req.user?._id && !split.isPartner) {
      // Only for non-partner teachers (FLOATING status)
      try {
        const collector = await User.findById(req.user._id);
        if (collector && collector.role === "PARTNER") {
          collector.totalCash = (collector.totalCash || 0) + Number(amount);
          await collector.save();
        }
      } catch (e) {
        console.log("TotalCash update skipped:", e.message);
      }
    }

    // Handle pool distribution if academy gets share
    if (split.poolRevenue > 0 && !split.isPartner) {
      try {
        const distribution = await distributePoolRevenue({
          poolAmount: split.poolRevenue,
          isETEA: false,
        });
        console.log("Pool distributed:", distribution);
      } catch (e) {
        console.log("Pool distribution skipped:", e.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Fee collected! Receipt: ${feeRecord.receiptNumber}`,
      data: { feeRecord, split },
    });
  } catch (error) {
    console.error("CollectFee Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.getFeeHistory = async (req, res) => {
  try {
    const records = await FeeRecord.find({ student: req.params.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.trackPrint = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const version = (student.printHistory?.length || 0) + 1;
    const receiptId = `TOKEN-${student.studentId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}-V${version}`;

    student.printHistory = student.printHistory || [];
    student.printHistory.push({ receiptId, printedAt: new Date(), version });
    await student.save();

    // Enrich subjects with teacher names from the Class model
    let enrichedStudent = student.toObject();
    try {
      let classDoc = null;
      if (student.classRef) {
        classDoc = await Class.findById(student.classRef);
      }
      if (!classDoc && student.class) {
        classDoc = await Class.findOne({ classTitle: student.class });
      }
      if (!classDoc && student.class) {
        // Fallback: try regex match on classTitle
        classDoc = await Class.findOne({ classTitle: { $regex: student.class, $options: "i" } });
      }

      if (classDoc && classDoc.subjectTeachers && classDoc.subjectTeachers.length > 0) {
        const teacherMap = {};
        classDoc.subjectTeachers.forEach((st) => {
          if (st.subject && st.teacherName) {
            teacherMap[st.subject.toLowerCase().trim()] = st.teacherName;
          }
        });

        enrichedStudent.subjects = (enrichedStudent.subjects || []).map((sub) => ({
          ...sub,
          teacherName: teacherMap[sub.name.toLowerCase().trim()] || null,
        }));
        console.log(`📄 Receipt enriched with teacher names for ${student.studentId}`);
      }
    } catch (enrichErr) {
      console.log("Subject teacher enrichment skipped:", enrichErr.message);
    }

    res.json({
      success: true,
      data: {
        receiptId,
        version,
        isOriginal: version === 1,
        printedAt: new Date(),
        student: enrichedStudent,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.findByToken = async (req, res) => {
  try {
    const student = await Student.findOne({
      "printHistory.receiptId": req.params.token,
    });
    if (!student)
      return res.status(404).json({ success: false, message: "Invalid token" });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
