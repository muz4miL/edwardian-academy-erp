/**
 * ================================================================
 * EDWARDIAN ACADEMY — REPORT CONTROLLER
 * ================================================================
 * Comprehensive reporting with class rosters, teacher earnings,
 * and financial summaries for PDF/Excel export.
 * ================================================================
 */

const mongoose = require("mongoose");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const FeeRecord = require("../models/FeeRecord");
const User = require("../models/User");
const Session = require("../models/Session");
const Transaction = require("../models/Transaction");
const DailyClosing = require("../models/DailyClosing");
const Timetable = require("../models/Timetable");

/**
 * Get all classes for report dropdown
 */
exports.getAllClassesForReport = async (req, res) => {
  try {
    const classes = await Class.find({ status: "active" })
      .select("classId classTitle gradeLevel group shift enrolledCount maxCapacity session")
      .populate("session", "name year")
      .sort({ classTitle: 1 })
      .lean();

    // Also get student counts
    const classStudentCounts = await Student.aggregate([
      { $match: { status: { $in: ["active", "graduated"] } } },
      { $group: { _id: "$classRef", count: { $sum: 1 } } }
    ]);
    const countMap = {};
    classStudentCounts.forEach(c => { countMap[c._id?.toString()] = c.count; });

    const enrichedClasses = classes.map(cls => ({
      _id: cls._id,
      classId: cls.classId,
      title: cls.classTitle, // Alias for frontend
      classTitle: cls.classTitle,
      gradeLevel: cls.gradeLevel,
      group: cls.group,
      shift: cls.shift,
      studentCount: countMap[cls._id?.toString()] || cls.enrolledCount || 0,
      enrolledCount: cls.enrolledCount || 0,
      maxCapacity: cls.maxCapacity || 30,
      sessionName: cls.session?.name || "Unknown Session",
      sessionYear: cls.session?.year || "",
      displayName: `${cls.classTitle} (${cls.gradeLevel} - ${cls.group || "General"})`,
    }));

    return res.json({
      success: true,
      data: enrichedClasses,
      total: enrichedClasses.length,
    });
  } catch (error) {
    console.error("getAllClassesForReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all teachers for report dropdown
 */
exports.getAllTeachersForReport = async (req, res) => {
  try {
    // Include ALL non-suspended teachers (active + inactive) so every teacher
    // that appears in Teacher Finance / Owner Dashboard also appears here.
    // Some teachers (e.g. "Academy MDCAT" pseudo-teacher, or imported teachers)
    // may not have status="active" set but still have live financial activity.
    const teachers = await Teacher.find({ status: { $ne: "suspended" } })
      .select("name subject compensation userId status")
      .populate("userId", "fullName role")
      .sort({ name: 1 })
      .lean();

    const enrichedTeachers = teachers.map(t => ({
      _id: t._id,
      name: t.name,
      fullName: t.userId?.fullName || t.name,
      subject: t.subject,
      compensationType: t.compensation?.type || "percentage",
      compensationMode: t.compensation?.type || "percentage",
      compensationSummary: getCompensationSummary(t.compensation),
      role: t.userId?.role || "TEACHER",
      status: t.status || "active",
      displayName: `${t.name} (${t.subject || "General"})`,
    }));

    return res.json({
      success: true,
      data: enrichedTeachers,
      total: enrichedTeachers.length,
    });
  } catch (error) {
    console.error("getAllTeachersForReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all students for report dropdown
 */
exports.getAllStudentsForReport = async (req, res) => {
  try {
    const students = await Student.find({
      status: { $in: ["active", "graduated"] },
    })
      .select("studentId studentName fatherName class group feeStatus totalFee paidAmount")
      .sort({ studentName: 1 })
      .lean();

    const data = students.map((s) => ({
      _id: s._id,
      studentId: s.studentId,
      studentName: s.studentName,
      fatherName: s.fatherName || "-",
      className: s.class || "-",
      group: s.group || "-",
      feeStatus: s.feeStatus || "pending",
      totalFee: s.totalFee || 0,
      paidAmount: s.paidAmount || 0,
      displayName: `${s.studentName} (${s.studentId || "No ID"})`,
    }));

    return res.json({
      success: true,
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("getAllStudentsForReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get comprehensive class report with full student roster
 */
exports.getClassReport = async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    // Get class details
    const classDoc = await Class.findById(classId)
      .populate("session", "name year startDate endDate")
      .populate("assignedTeacher", "name subject compensation")
      .lean();

    if (!classDoc) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    // Get all students in this class
    const students = await Student.find({ 
      classRef: classId,
      status: { $in: ["active", "graduated"] }
    })
      .select("studentId studentName fatherName phone address admissionDate totalFee paidAmount discountAmount subjects feeStatus group")
      .sort({ studentName: 1 })
      .lean();

    // Get fee records for this class
    const feeQuery = { class: classId };
    if (startDate && endDate) {
      feeQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    const feeRecords = await FeeRecord.find(feeQuery).lean();

    // Get subject teachers for this class
    const subjectTeachers = await getSubjectTeachersWithDetails(classDoc);

    // Calculate summary statistics
    const totalStudents = students.length;
    const totalExpectedFee = students.reduce((sum, s) => sum + (s.totalFee || 0), 0);
    const totalCollected = students.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const totalBalance = students.reduce((sum, s) => sum + Math.max(0, (s.totalFee || 0) - (s.paidAmount || 0)), 0);
    const totalDiscounts = students.reduce((sum, s) => sum + (s.discountAmount || 0), 0);

    const feeStatusCounts = {
      paid: students.filter(s => s.feeStatus === "paid").length,
      partial: students.filter(s => s.feeStatus === "partial").length,
      pending: students.filter(s => s.feeStatus === "pending").length,
    };

    // Build student roster with serial numbers
    const studentRoster = students.map((s, index) => ({
      sNo: index + 1,
      studentId: s.studentId,
      studentName: s.studentName,
      fatherName: s.fatherName || "-",
      phone: s.phone || "-",
      address: s.address || "-",
      admissionDate: s.admissionDate,
      group: s.group || classDoc.group || "-",
      totalFee: s.totalFee || 0,
      paidAmount: s.paidAmount || 0,
      balance: Math.max(0, (s.totalFee || 0) - (s.paidAmount || 0)),
      discount: s.discountAmount || 0,
      feeStatus: s.feeStatus || "pending",
      subjects: s.subjects || [],
    }));

    // Subject fee breakdown
    const subjectBreakdown = (classDoc.subjects || []).map(subj => {
      const teacher = subjectTeachers.find(st => 
        st.subject?.toLowerCase() === subj.name?.toLowerCase()
      );
      return {
        subject: subj.name,
        fee: subj.fee || classDoc.baseFee || 0,
        teacherName: teacher?.teacherName || "Not Assigned",
        teacherId: teacher?.teacherId || null,
        compensationType: teacher?.compensationType || "percentage",
        compensationDetails: teacher?.compensationDetails || null,
      };
    });

    return res.json({
      success: true,
      data: {
        // Flat fields for frontend convenience
        classTitle: classDoc.classTitle,
        session: classDoc.session?.name || "Current",
        totalStudents,
        totalFeeExpected: totalExpectedFee,
        totalCollected,
        totalOutstanding: totalBalance,
        collectionRate: totalExpectedFee > 0 
          ? Math.round((totalCollected / totalExpectedFee) * 100) 
          : 0,
        feeStatusBreakdown: feeStatusCounts,
        
        // Teachers assigned to this class
        teachers: subjectTeachers.map(st => ({
          teacherName: st.teacherName,
          subjectName: st.subject,
          compensationMode: st.compensationType || "percentage",
          teacherShare: st.compensationDetails?.teacherShare ?? 70,
          academyShare: st.compensationDetails?.academyShare ?? 30,
          fixedSalary: st.compensationDetails?.fixedSalary || 0,
          perStudentRate: st.compensationDetails?.perStudentAmount || 0,
        })),

        // Student roster with frontend-expected field names
        students: studentRoster.map(s => ({
          _id: s._id,
          studentId: s.studentId,
          studentName: s.studentName,
          fatherName: s.fatherName,
          phone: s.phone,
          admissionDate: s.admissionDate,
          totalFee: s.totalFee,
          totalPaid: s.paidAmount,
          balance: s.balance,
          feeStatus: (s.feeStatus || "pending").toUpperCase(),
        })),

        // Class Info (nested for detailed use)
        classInfo: {
          _id: classDoc._id,
          classId: classDoc.classId,
          classTitle: classDoc.classTitle,
          gradeLevel: classDoc.gradeLevel,
          group: classDoc.group,
          shift: classDoc.shift,
          sessionName: classDoc.session?.name || "Unknown",
          sessionYear: classDoc.session?.year || "",
          days: classDoc.days || [],
          startTime: classDoc.startTime,
          endTime: classDoc.endTime,
          roomNumber: classDoc.roomNumber,
          maxCapacity: classDoc.maxCapacity || 30,
          revenueMode: classDoc.revenueMode || "standard",
        },

        // Summary Stats (nested)
        summary: {
          totalStudents,
          totalExpectedFee,
          totalCollected,
          totalBalance,
          totalDiscounts,
          collectionRate: totalExpectedFee > 0 
            ? Math.round((totalCollected / totalExpectedFee) * 100) 
            : 0,
          feeStatusCounts,
        },

        // Subject & Teacher Breakdown
        subjects: subjectBreakdown,
        subjectTeachers,

        // Report Metadata
        generatedAt: new Date(),
        reportPeriod: startDate && endDate 
          ? { startDate, endDate } 
          : { type: "all-time" },
      },
    });
  } catch (error) {
    console.error("getClassReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get comprehensive teacher report with earnings breakdown
 */
exports.getTeacherReport = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;

    // Get teacher details
    const teacher = await Teacher.findById(teacherId)
      .populate("userId", "fullName role email phone")
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get classes where this teacher is assigned
    const classes = await Class.find({
      $or: [
        { assignedTeacher: teacherId },
        { "subjectTeachers.teacherId": teacherId },
        { "subjectTeachers.coTeachers.teacherId": teacherId },
      ],
      status: "active",
    })
      .populate("session", "name year")
      .lean();

    // Get students taught by this teacher
    const classIds = classes.map(c => c._id);
    const students = await Student.find({
      classRef: { $in: classIds },
      status: { $in: ["active", "graduated"] },
    })
      .select("studentId studentName classRef totalFee paidAmount feeStatus subjects")
      .lean();

    // ─── Fetch fee records by CLASS — include subjectBreakdown for per-subject extraction
    const allClassFeeRecords = classIds.length
      ? await FeeRecord.find({
          class: { $in: classIds },
          ...(Object.keys(dateFilter).length ? dateFilter : {}),
        })
          .select("student studentName className class amount teachers subjectBreakdown receiptNumber createdAt paymentMethod")
          .sort({ createdAt: -1 })
          .lean()
      : [];

    // ─── Compensation helpers ──────────────────────────────────────────────────
    const teacherSharePct = teacher.compensation?.teacherShare ?? 70;
    const academySharePct = teacher.compensation?.academyShare ?? 30;
    const perStudentRate  = teacher.compensation?.perStudentAmount || 0;
    const fixedSalary     = teacher.compensation?.fixedSalary || 0;
    const baseSalary      = teacher.compensation?.baseSalary || 0;
    const profitSharePct  = teacher.compensation?.profitShare || 0;

    // ─── Compensation type — MUST be declared before computeShares closure ───────
    const compensationType = teacher.compensation?.type || "percentage";

    // ─── Extract this teacher's subject fee from a FeeRecord ─────────────────
    // Each FeeRecord has a `subjectBreakdown` array with per-subject amounts,
    // teacherId, teacherShare, and academyShare. We use this to extract ONLY
    // the fee portion for this teacher's subject — not the full class fee.
    const teacherSubject = (teacher.subject || "").toLowerCase().trim();

    const extractTeacherSubjectFee = (fr) => {
      // 1. Try subjectBreakdown — the gold standard
      const breakdown = fr.subjectBreakdown || [];
      if (breakdown.length > 0) {
        // Find entry matching this teacher by teacherId
        let entry = breakdown.find(
          sb => sb.teacherId?.toString() === teacherId
        );
        // Fallback: match by subject name
        if (!entry && teacherSubject) {
          entry = breakdown.find(
            sb => (sb.subject || "").toLowerCase().trim() === teacherSubject
          );
        }
        if (entry) {
          return {
            subjectFee: entry.effectivePrice || entry.subjectPrice || 0,
            teacherAmt: entry.teacherShare || 0,
            academyAmt: entry.academyShare || 0,
            subjectName: entry.subject || teacher.subject || "—",
            fromBreakdown: true,
          };
        }
      }

      // 2. Try teachers[] array — older records may have this
      const tEntry = (fr.teachers || []).find(
        t => t.teacherId?.toString() === teacherId
      );
      if (tEntry && (tEntry.teacherShare || 0) > 0) {
        const subjectFee = tEntry.teacherShare / (teacherSharePct / 100) || fr.amount || 0;
        return {
          subjectFee: Math.round(subjectFee),
          teacherAmt: tEntry.teacherShare,
          academyAmt: Math.round(subjectFee) - tEntry.teacherShare,
          subjectName: tEntry.subject || teacher.subject || "—",
          fromBreakdown: false,
        };
      }

      // 3. Fallback: if only one subject in the class or teacher is the sole
      //    teacher, use the full amount with the formula
      const fullAmt = fr.amount || 0;
      if (compensationType === "percentage") {
        const tAmt = Math.round(fullAmt * teacherSharePct / 100);
        return {
          subjectFee: fullAmt,
          teacherAmt: tAmt,
          academyAmt: fullAmt - tAmt,
          subjectName: teacher.subject || "—",
          fromBreakdown: false,
        };
      }
      // For fixed/perStudent/hybrid — show the fee but no per-payment teacher split
      return {
        subjectFee: fullAmt,
        teacherAmt: 0,
        academyAmt: fullAmt,
        subjectName: teacher.subject || "—",
        fromBreakdown: false,
      };
    };

    // ─── Calculate earnings ────────────────────────────────────────────────────
    let earningsBreakdown = {};
    let totalEarnings = 0;
    let totalSubjectFeeCollected = 0;

    if (compensationType === "percentage") {
      const studentEarnings = [];
      for (const fr of allClassFeeRecords) {
        const ext = extractTeacherSubjectFee(fr);
        totalSubjectFeeCollected += ext.subjectFee;
        totalEarnings += ext.teacherAmt;
        studentEarnings.push({
          studentName: fr.studentName || "—",
          className: fr.className || "—",
          subjectName: ext.subjectName,
          feePaid: ext.subjectFee,
          amount: ext.subjectFee,
          teacherShare: ext.teacherAmt,
          academyShare: ext.academyAmt,
          teacherEarning: ext.teacherAmt,
          date: fr.createdAt,
        });
      }
      earningsBreakdown = {
        type: "percentage",
        teacherSharePercent: teacherSharePct,
        academySharePercent: academySharePct,
        totalFeeCollected: totalSubjectFeeCollected,
        totalTeacherShare: totalEarnings,
        totalAcademyShare: totalSubjectFeeCollected - totalEarnings,
        studentCount: studentEarnings.length,
        details: studentEarnings,
      };

    } else if (compensationType === "fixed") {
      totalEarnings = fixedSalary;
      const studentEarnings = [];
      for (const fr of allClassFeeRecords) {
        const ext = extractTeacherSubjectFee(fr);
        totalSubjectFeeCollected += ext.subjectFee;
        studentEarnings.push({
          studentName: fr.studentName || "—",
          className: fr.className || "—",
          subjectName: ext.subjectName,
          feePaid: ext.subjectFee,
          amount: ext.subjectFee,
          teacherShare: 0,
          academyShare: ext.subjectFee,
          teacherEarning: 0,
          date: fr.createdAt,
        });
      }
      earningsBreakdown = {
        type: "fixed",
        monthlySalary: fixedSalary,
        totalOwed: fixedSalary,
        totalFeeCollected: totalSubjectFeeCollected,
        note: "Fixed monthly salary — teacher gets " + fixedSalary + " regardless of collections",
        details: studentEarnings,
      };

    } else if (compensationType === "perStudent") {
      const paidStudentIds = new Set();
      const studentEarnings = [];
      for (const fr of allClassFeeRecords) {
        if (fr.student) paidStudentIds.add(fr.student.toString());
        const ext = extractTeacherSubjectFee(fr);
        totalSubjectFeeCollected += ext.subjectFee;
        studentEarnings.push({
          studentName: fr.studentName || "—",
          className: fr.className || "—",
          subjectName: ext.subjectName,
          feePaid: ext.subjectFee,
          amount: ext.subjectFee,
          teacherShare: perStudentRate,
          academyShare: Math.max(0, ext.subjectFee - perStudentRate),
          teacherEarning: perStudentRate,
          date: fr.createdAt,
        });
      }
      const activeStudents = paidStudentIds.size || students.length;
      totalEarnings = activeStudents * perStudentRate;
      earningsBreakdown = {
        type: "perStudent",
        perStudentRate,
        totalActiveStudents: activeStudents,
        totalStudents: students.length,
        totalEarnings,
        totalFeeCollected: totalSubjectFeeCollected,
        details: studentEarnings,
      };

    } else if (compensationType === "hybrid") {
      const studentEarnings = [];
      for (const fr of allClassFeeRecords) {
        const ext = extractTeacherSubjectFee(fr);
        totalSubjectFeeCollected += ext.subjectFee;
        studentEarnings.push({
          studentName: fr.studentName || "—",
          className: fr.className || "—",
          subjectName: ext.subjectName,
          feePaid: ext.subjectFee,
          amount: ext.subjectFee,
          teacherShare: 0,
          academyShare: ext.subjectFee,
          teacherEarning: 0,
          date: fr.createdAt,
        });
      }
      const profitEarnings = Math.floor((totalSubjectFeeCollected * profitSharePct) / 100);
      totalEarnings = baseSalary + profitEarnings;
      earningsBreakdown = {
        type: "hybrid",
        baseSalary,
        profitSharePercent: profitSharePct,
        totalFeeCollected: totalSubjectFeeCollected,
        profitEarnings,
        totalEarnings,
        details: studentEarnings,
      };
    }

    // ─── Wallet balance ────────────────────────────────────────────────────────
    const walletFloat = teacher.balance?.floating || 0;
    const walletVerified = teacher.balance?.verified || 0;
    const walletPending = teacher.balance?.pending || 0;
    const walletTotalPaid = teacher.balance?.totalPaid || teacher.totalPaid || 0;

    // For fixed salary teachers: wallet = fixedSalary (what they're owed)
    // For percentage/perStudent: wallet = computed earnings from fee records
    const effectiveWallet =
      compensationType === "fixed"
        ? fixedSalary
        : compensationType === "hybrid"
        ? totalEarnings
        : (walletFloat + walletVerified) || totalEarnings;

    const walletBalance = {
      floating: walletFloat,
      verified: walletVerified,
      pending: walletPending,
      totalPaid: walletTotalPaid,
    };

    // ─── Per-class breakdown with subject-specific student rows ────────────────
    const classBreakdown = classes.map(cls => {
      const classStudents = students.filter(
        s => s.classRef?.toString() === cls._id.toString()
      );
      const classFees = allClassFeeRecords.filter(
        fr => fr.class?.toString() === cls._id.toString()
      );

      // Extract subject-specific amounts per student row
      let clsSubjectTotal = 0;
      let clsTeacherTotal = 0;
      let clsAcademyTotal = 0;
      const studentRows = classFees.map(fr => {
        const ext = extractTeacherSubjectFee(fr);
        clsSubjectTotal += ext.subjectFee;
        clsTeacherTotal += ext.teacherAmt;
        clsAcademyTotal += ext.academyAmt;
        return {
          studentName: fr.studentName || "—",
          subjectName: ext.subjectName,
          feePaid: ext.subjectFee,
          teacherShare: ext.teacherAmt,
          academyShare: ext.academyAmt,
          date: fr.createdAt,
          receiptNumber: fr.receiptNumber || null,
        };
      });

      // For fixed: class-level teacher earned = 0 (salary is global, not per-class)
      // The fixed salary is shown in the KPI card, not split per class
      const clsTotalEarned =
        compensationType === "fixed" ? 0
        : compensationType === "hybrid" ? 0
        : clsTeacherTotal;

      return {
        classId: cls.classId || cls._id,
        classTitle: cls.classTitle,
        gradeLevel: cls.gradeLevel,
        group: cls.group,
        sessionName: cls.session?.name || "Unknown",
        studentCount: classStudents.length,
        feeRecordCount: classFees.length,
        totalCollected: clsSubjectTotal,
        totalEarned: clsTotalEarned,
        totalAcademyShare: clsAcademyTotal,
        studentRows,
      };
    });

    // ─── Grand total ──────────────────────────────────────────────────────────
    const grandTotalEarned = totalEarnings;

    return res.json({
      success: true,
      data: {
        teacherName: teacher.name,
        compensationMode: compensationType,
        teacherShare: teacherSharePct,
        academyShare: academySharePct,
        fixedSalary,
        perStudentRate,
        totalClasses: classes.length,
        totalStudents: students.length,
        totalEarned: grandTotalEarned,
        totalSubjectFeeCollected,
        totalPaid: walletTotalPaid,
        totalPending: Math.max(0, grandTotalEarned - walletTotalPaid),
        walletBalance: effectiveWallet,

        classes: classBreakdown.map(cls => ({
          className: cls.classTitle,
          subjectName: teacher.subject || "General",
          studentCount: cls.studentCount,
          compensationMode: compensationType,
          teacherShare: teacherSharePct,
          fixedSalary,
          perStudentRate,
          totalCollected: cls.totalCollected,
          totalEarned: cls.totalEarned,
          totalAcademyShare: cls.totalAcademyShare,
          totalPaid: 0,
          totalPending: cls.totalEarned,
          studentRows: cls.studentRows,
        })),

        studentDetails: earningsBreakdown.details || [],

        teacherInfo: {
          _id: teacher._id,
          name: teacher.name,
          subject: teacher.subject,
          phone: teacher.phone || teacher.userId?.phone || "-",
          email: teacher.userId?.email || "-",
          role: teacher.userId?.role || "TEACHER",
          status: teacher.status,
          compensationType,
          compensationSummary: getCompensationSummary(teacher.compensation),
        },
        compensation: { type: compensationType, ...teacher.compensation },
        earnings: earningsBreakdown,
        wallet: walletBalance,
        summary: {
          totalEarnings: grandTotalEarned,
          totalOwed: Math.max(0, grandTotalEarned - walletTotalPaid),
          totalPaid: walletTotalPaid,
          totalClasses: classes.length,
          totalStudents: students.length,
        },
        generatedAt: new Date(),
        reportPeriod: startDate && endDate
          ? { startDate, endDate }
          : { type: "all-time" },
      },
    });
  } catch (error) {
    console.error("getTeacherReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * Get student-wise report with subject and fee details
 */
exports.getStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId)
      .populate("classRef", "classTitle gradeLevel group shift")
      .populate("sessionRef", "name year sessionName")
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const feeHistory = await FeeRecord.find({ student: student._id })
      .select("receiptNumber amount month status paymentMethod createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const subjects = (student.subjects || []).map((subject) => {
      if (typeof subject === "string") {
        return {
          name: subject,
          fee: 0,
          discount: 0,
          discountEnabled: false,
          effectiveFee: 0,
          teacherName: "Undecided (Demo)",
        };
      }

      const fee = Number(subject.fee) || 0;
      const discountEnabled = Boolean(subject.discountEnabled);
      const discount = discountEnabled ? Math.min(Number(subject.discount) || 0, fee) : 0;
      return {
        name: subject.name,
        fee,
        discount,
        discountEnabled,
        discountReason: subject.discountReason || "",
        effectiveFee: Math.max(0, fee - discount),
        teacherId: subject.teacherId || null,
        teacherName: subject.teacherName || "Undecided (Demo)",
      };
    });

    const totalSubjectFee = subjects.reduce((sum, s) => sum + (s.fee || 0), 0);
    const totalSubjectDiscount = subjects.reduce((sum, s) => sum + (s.discount || 0), 0);
    const overallDiscount = Number(student.discountAmount) || 0;
    const totalDiscount = totalSubjectDiscount + overallDiscount;
    const effectiveTotalFee = Math.max(0, (Number(student.totalFee) || 0));
    const paidAmount = Number(student.paidAmount) || 0;
    const balance = Math.max(0, effectiveTotalFee - paidAmount);

    return res.json({
      success: true,
      data: {
        student: {
          _id: student._id,
          studentId: student.studentId,
          studentName: student.studentName,
          fatherName: student.fatherName || "-",
          className: student.class || student.classRef?.classTitle || "-",
          group: student.group || student.classRef?.group || "-",
          parentCell: student.parentCell || "-",
          studentCell: student.studentCell || "-",
          address: student.address || "-",
          photo: student.photo || null,
          imageUrl: student.imageUrl || null,
          admissionDate: student.admissionDate,
          feeStatus: student.feeStatus || "pending",
          studentStatus: student.studentStatus || "Active",
          totalFee: effectiveTotalFee,
          paidAmount,
          balance,
          totalSubjectFee,
          totalDiscount,
          session:
            student.sessionRef?.sessionName ||
            student.sessionRef?.name ||
            "Current",
        },
        subjects,
        feeHistory,
        summary: {
          totalSubjects: subjects.length,
          totalSubjectFee,
          totalDiscount,
          totalFee: effectiveTotalFee,
          paidAmount,
          balance,
          paymentCount: feeHistory.length,
        },
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("getStudentReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get academy-wide summary report
 */
exports.getAcademySummaryReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get counts
    const [
      totalClasses,
      totalStudents,
      totalTeachers,
      activeStudents,
      feeRecords,
      sessions,
    ] = await Promise.all([
      Class.countDocuments({ status: "active" }),
      Student.countDocuments({}),
      Teacher.countDocuments({ status: "active" }),
      Student.countDocuments({ status: "active" }),
      FeeRecord.find(dateFilter).lean(),
      Session.find({ status: "active" }).select("name year").lean(),
    ]);

    // Calculate financial summary
    const totalCollected = feeRecords.reduce((sum, fr) => sum + (fr.amount || 0), 0);
    const totalRefunded = feeRecords.reduce((sum, fr) => sum + (fr.refundAmount || 0), 0);

    // Fee status breakdown
    const studentFeeStatus = await Student.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$feeStatus", count: { $sum: 1 }, totalFee: { $sum: "$totalFee" }, totalPaid: { $sum: "$paidAmount" } } },
    ]);

    const feeStatusMap = {};
    for (const status of studentFeeStatus) {
      feeStatusMap[status._id || "pending"] = {
        count: status.count,
        totalFee: status.totalFee,
        totalPaid: status.totalPaid,
      };
    }

    // Teacher compensation breakdown
    const teacherCompensation = await Teacher.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$compensation.type", count: { $sum: 1 } } },
    ]);

    const compensationMap = {};
    for (const comp of teacherCompensation) {
      compensationMap[comp._id || "percentage"] = comp.count;
    }

    // Class enrollment stats
    const classStats = await Class.aggregate([
      { $match: { status: "active" } },
      { 
        $group: { 
          _id: "$gradeLevel", 
          count: { $sum: 1 }, 
          totalEnrolled: { $sum: "$enrolledCount" },
          totalCapacity: { $sum: "$maxCapacity" },
        } 
      },
    ]);

    // Get total expected fee from students
    const studentTotals = await Student.aggregate([
      { $match: { status: "active" } },
      { 
        $group: { 
          _id: null, 
          totalFee: { $sum: "$totalFee" }, 
          totalPaid: { $sum: "$paidAmount" } 
        } 
      },
    ]);

    const totalFeeExpected = studentTotals[0]?.totalFee || 0;
    const totalStudentPaid = studentTotals[0]?.totalPaid || 0;
    const totalOutstanding = totalFeeExpected - totalStudentPaid;
    const collectionRate = totalFeeExpected > 0 ? Math.round((totalStudentPaid / totalFeeExpected) * 100) : 0;

    // Get top classes by revenue
    const topClassesData = await Class.aggregate([
      { $match: { status: "active" } },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "classRef",
          as: "classStudents",
        },
      },
      {
        $project: {
          _id: 1,
          title: "$classTitle",
          studentCount: { $size: "$classStudents" },
          totalExpected: { $sum: "$classStudents.totalFee" },
          totalCollected: { $sum: "$classStudents.paidAmount" },
        },
      },
      {
        $addFields: {
          collectionRate: {
            $cond: [
              { $gt: ["$totalExpected", 0] },
              { $multiply: [{ $divide: ["$totalCollected", "$totalExpected"] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { totalCollected: -1 } },
      { $limit: 5 },
    ]);

    return res.json({
      success: true,
      data: {
        // Flat fields for frontend
        totalStudents,
        activeStudents,
        totalTeachers,
        activeTeachers: totalTeachers, // Assuming active filter was applied
        totalClasses,
        activeClasses: totalClasses, // Assuming active filter was applied
        totalFeeExpected,
        totalCollected: totalStudentPaid,
        totalOutstanding,
        collectionRate,
        feeStatusBreakdown: {
          paid: feeStatusMap.paid?.count || 0,
          partial: feeStatusMap.partial?.count || 0,
          pending: feeStatusMap.pending?.count || 0,
        },
        topClasses: topClassesData,

        // Overview Counts (nested)
        overview: {
          totalClasses,
          totalStudents,
          activeStudents,
          totalTeachers,
          activeSessions: sessions.length,
        },

        // Financial Summary (nested)
        financial: {
          totalCollected,
          totalRefunded,
          netCollected: totalCollected - totalRefunded,
          feeRecordCount: feeRecords.length,
        },

        // Fee Status Distribution
        feeStatus: feeStatusMap,

        // Teacher Compensation Types
        teacherCompensation: compensationMap,

        // Class Stats by Grade
        classStats,

        // Active Sessions
        sessions: sessions.map(s => ({
          name: s.name,
          year: s.year,
        })),

        // Report Metadata
        generatedAt: new Date(),
        reportPeriod: startDate && endDate 
          ? { startDate, endDate } 
          : { type: "all-time" },
      },
    });
  } catch (error) {
    console.error("getAcademySummaryReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get financial overview report with detailed breakdown
 */
exports.getFinancialOverviewReport = async (req, res) => {
  try {
    const { period = "month", startDate, endDate } = req.query;

    // Build date filter based on period
    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (period === "today") {
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      dateFilter = { $gte: todayStart };
    } else if (period === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { $gte: weekAgo };
    } else if (period === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { $gte: monthAgo };
    }

    // Get fee records
    const feeRecords = await FeeRecord.find(
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
    )
      .populate("class", "classTitle gradeLevel")
      .populate("teacher", "name subject")
      .lean();

    // Get transactions
    const transactions = await Transaction.find(
      Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}
    ).lean();

    // Get daily closings
    const closings = await DailyClosing.find(
      Object.keys(dateFilter).length > 0 ? { closedAt: dateFilter } : {}
    ).lean();

    // Calculate revenue by class
    const revenueByClass = {};
    for (const fr of feeRecords) {
      const classKey = fr.className || fr.class?.classTitle || "Unknown";
      if (!revenueByClass[classKey]) {
        revenueByClass[classKey] = {
          className: classKey,
          gradeLevel: fr.class?.gradeLevel || "",
          totalCollected: 0,
          feeCount: 0,
          students: new Set(),
        };
      }
      revenueByClass[classKey].totalCollected += fr.amount || 0;
      revenueByClass[classKey].feeCount += 1;
      if (fr.studentName) revenueByClass[classKey].students.add(fr.studentName);
    }

    // Convert to array and finalize
    const classRevenue = Object.values(revenueByClass).map(c => ({
      ...c,
      studentCount: c.students.size,
      students: undefined,
    }));

    // Calculate revenue by teacher
    const revenueByTeacher = {};
    for (const fr of feeRecords) {
      for (const t of (fr.teachers || [])) {
        const teacherKey = t.teacherId?.toString() || "unknown";
        if (!revenueByTeacher[teacherKey]) {
          revenueByTeacher[teacherKey] = {
            teacherId: t.teacherId,
            teacherName: t.teacherName,
            compensationType: t.compensationType,
            totalFeeCollected: 0,
            totalTeacherShare: 0,
            feeCount: 0,
          };
        }
        revenueByTeacher[teacherKey].totalFeeCollected += fr.amount || 0;
        revenueByTeacher[teacherKey].totalTeacherShare += t.teacherShare || 0;
        revenueByTeacher[teacherKey].feeCount += 1;
      }
    }

    const teacherRevenue = Object.values(revenueByTeacher);

    // Summary
    const totalRevenue = feeRecords.reduce((sum, fr) => sum + (fr.amount || 0), 0);
    const totalTeacherPayout = teacherRevenue.reduce((sum, t) => sum + t.totalTeacherShare, 0);
    const totalAcademyShare = totalRevenue - totalTeacherPayout;

    // Get total expenses
    const Expense = require("../models/Expense");
    const expenses = await Expense.find(
      Object.keys(dateFilter).length > 0 ? { expenseDate: dateFilter } : {}
    ).lean();
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Recent transactions for display
    const recentTransactions = feeRecords.slice(0, 20).map(fr => ({
      date: fr.createdAt,
      studentName: fr.studentName,
      className: fr.className || fr.class?.classTitle || "Unknown",
      amount: fr.amount,
      method: fr.paymentMethod || "CASH",
      type: "Fee Payment",
    }));

    return res.json({
      success: true,
      data: {
        // Flat fields for frontend
        totalRevenue,
        academyShare: totalAcademyShare,
        teacherPayments: totalTeacherPayout,
        totalExpenses,
        
        // Revenue by class with frontend-expected fields
        revenueByClass: classRevenue.sort((a, b) => b.totalCollected - a.totalCollected).map(c => ({
          className: c.className,
          studentCount: c.studentCount,
          totalExpected: c.totalCollected * 1.2, // Estimate if not available
          totalCollected: c.totalCollected,
          totalOutstanding: c.totalCollected * 0.2, // Estimate
        })),
        
        // Recent transactions
        recentTransactions,

        // Summary (nested)
        summary: {
          totalRevenue,
          totalTeacherPayout,
          totalAcademyShare,
          feeRecordCount: feeRecords.length,
          closingCount: closings.length,
          totalClosed: closings.reduce((sum, c) => sum + (c.totalAmount || 0), 0),
        },

        // Revenue by Class (nested)
        byClass: classRevenue.sort((a, b) => b.totalCollected - a.totalCollected),

        // Revenue by Teacher (nested)
        byTeacher: teacherRevenue.sort((a, b) => b.totalTeacherShare - a.totalTeacherShare),

        // Recent Closings (nested)
        recentClosings: closings.slice(0, 10).map(c => ({
          date: c.closedAt,
          amount: c.totalAmount,
          closedBy: c.closedByName,
        })),

        // Report Metadata
        generatedAt: new Date(),
        period,
        reportPeriod: startDate && endDate 
          ? { startDate, endDate } 
          : { type: period },
      },
    });
  } catch (error) {
    console.error("getFinancialOverviewReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============ HELPER FUNCTIONS ============

/**
 * Get subject teachers with full details
 */
/**
 * Single-Subject Enrollment Report
 *
 * Lists every student whose `subjects` array has exactly one entry (single-subject
 * enrollment — e.g. a student who signed up for Botany only). Returns:
 *   - per-student details (name, class, subject, teacher, fees, balance, status)
 *   - recent fee payments for each student
 *   - subject-level aggregates (count of enrollments + money collected per subject)
 *   - a top-level summary for the UI cards
 *
 * Optional query params:
 *   ?subject=Botany    → filter rows down to a single subject
 *   ?status=paid|partial|pending → filter by fee status
 */
exports.getSingleSubjectReport = async (req, res) => {
  try {
    const { subject: subjectFilter, status: statusFilter } = req.query;

    // When a subject filter is provided, include ALL students who have that
    // subject in their `subjects` array — regardless of how many subjects
    // they have total (single or multi-subject enrollments). This lets
    // Waqar filter by e.g. "Chemistry" and see every student paying for
    // Chemistry, even if that student also paid for Botany.
    //
    // When no subject filter is given, include all students who have at
    // least one subject (the legacy single-subject-only behaviour was too
    // restrictive — it hid multi-subject students from the report entirely).
    const query = {
      "subjects.0": { $exists: true }, // at least one subject
      status: { $in: ["active", "graduated"] },
    };
    if (subjectFilter) {
      // Subject names stored case-insensitively; use regex for resilience.
      query["subjects.name"] = { $regex: new RegExp(`^${subjectFilter.trim()}$`, "i") };
    }

    const students = await Student.find(query)
      .select(
        "studentId studentName fatherName class group classRef sessionRef subjects totalFee paidAmount discountAmount feeStatus status admissionDate photo imageUrl parentCell studentCell email address cnic createdAt",
      )
      .populate("classRef", "classTitle gradeLevel group")
      .populate("sessionRef", "sessionName startDate endDate")
      .sort({ admissionDate: -1, studentName: 1 })
      .lean();

    // Pre-fetch fee history for all matching students in one go (avoids N+1 queries).
    // We intentionally fetch the FULL history (no slice) so the UI can show every
    // single payment a client has made — this is what the owner asked for.
    const studentIds = students.map((s) => s._id);
    const allFeeRecords = await FeeRecord.find({ student: { $in: studentIds } })
      .select("student receiptNumber amount month status paymentMethod collectedBy createdAt notes")
      .sort({ createdAt: -1 })
      .lean();

    const feeHistoryMap = new Map();
    for (const rec of allFeeRecords) {
      const key = String(rec.student);
      if (!feeHistoryMap.has(key)) feeHistoryMap.set(key, []);
      feeHistoryMap.get(key).push(rec);
    }

    // Resolve each student to their *live* class document. A student's
    // `classRef` can be stale — the class may have been deleted/recreated,
    // leaving the student pointing at a dead ID. In that case we fall back to
    // matching the stored `class` name string against the current Class docs.
    //
    // We produce, per student:
    //   effectiveClassId  — the ID we should key timetable lookups on
    //   effectiveClassDoc — the class document (has `subjectTeachers` for
    //                        authoritative teacher lookup)
    const originalClassIds = students
      .map((s) => s.classRef?._id || s.classRef)
      .filter(Boolean)
      .map((id) => String(id));

    // 1) Fetch classes by the IDs the students reference (some may not exist).
    const classesById = originalClassIds.length
      ? await Class.find({ _id: { $in: originalClassIds } })
          .select("classTitle group subjectTeachers")
          .lean()
      : [];
    const classByIdMap = new Map(classesById.map((c) => [String(c._id), c]));

    // 2) Fetch *every* class whose title matches a student's stored class name —
    //    not just orphans. The data can have duplicates (e.g. a class with the
    //    same title was recreated). For a stable report we need to consider
    //    *all* classes that share a title, so if the original classRef has no
    //    timetable entries we can still pull slots from the sibling class.
    const allTitles = new Set(
      students.map((s) => String(s.class || "").trim()).filter(Boolean),
    );
    const classesByTitle = allTitles.size
      ? await Class.find({ classTitle: { $in: Array.from(allTitles) } })
          .select("classTitle group subjectTeachers")
          .lean()
      : [];
    // Map title -> list of class docs (there may be multiple).
    const classesByTitleMap = new Map();
    for (const c of classesByTitle) {
      const key = String(c.classTitle || "").trim().toLowerCase();
      if (!classesByTitleMap.has(key)) classesByTitleMap.set(key, []);
      classesByTitleMap.get(key).push(c);
      // Make sure they're in classByIdMap too so resolveClassForStudent can find them.
      if (!classByIdMap.has(String(c._id))) classByIdMap.set(String(c._id), c);
    }

    // `candidateClassesForStudent` returns every class doc we should consider
    // when looking up time slots / subject-teacher mappings for this student.
    // Ordered: the exact classRef first (if it exists), then any siblings that
    // share the class title. That way a primary lookup stays authoritative, but
    // we have fallbacks if the primary is empty.
    const candidateClassesForStudent = (s) => {
      const out = [];
      const seen = new Set();
      const pushUnique = (c) => {
        if (!c || !c._id) return;
        const id = String(c._id);
        if (seen.has(id)) return;
        seen.add(id);
        out.push(c);
      };
      const origId = String(s.classRef?._id || s.classRef || "");
      pushUnique(classByIdMap.get(origId));
      const title = String(s.class || "").trim().toLowerCase();
      (classesByTitleMap.get(title) || []).forEach(pushUnique);
      return out;
    };

    const resolveClassForStudent = (s) => candidateClassesForStudent(s)[0] || null;

    // 3) Fetch timetable entries for every live class ID we may need — the
    //    student's own classRef AND all same-title siblings. This correctly
    //    handles orphaned classRefs and "class was rebuilt" scenarios.
    const effectiveClassIds = new Set();
    for (const s of students) {
      candidateClassesForStudent(s).forEach((c) => {
        if (c && c._id) effectiveClassIds.add(String(c._id));
      });
    }
    const timetableEntries = effectiveClassIds.size
      ? await Timetable.find({
          classId: { $in: Array.from(effectiveClassIds) },
          status: "active",
        })
          .select("classId subject day startTime endTime room teacherName teacherId")
          .sort({ startTime: 1 })
          .lean()
      : [];

    // Group timetable by `${classId}::${subjectLower}` for fast lookup.
    const timetableByClassSubject = new Map();
    for (const e of timetableEntries) {
      const key = `${String(e.classId)}::${String(e.subject || "").toLowerCase().trim()}`;
      if (!timetableByClassSubject.has(key)) timetableByClassSubject.set(key, []);
      timetableByClassSubject.get(key).push(e);
    }

    // Second lookup dimension: every timetable entry across the academy, keyed
    // by `${teacherId}::${subjectLower}`. We need this as a fallback when a
    // student's own class has no timetable entries — e.g. MDCAT repeater
    // students whose class record has no schedule. In that case the reasonable
    // assumption is the student attends the slots where their assigned teacher
    // teaches that subject, so we derive their schedule from the teacher.
    const globalTimetableEntries = await Timetable.find({ status: "active" })
      .select("classId subject day startTime endTime room teacherName teacherId")
      .sort({ startTime: 1 })
      .lean();
    const timetableByTeacherSubject = new Map();
    for (const e of globalTimetableEntries) {
      if (!e.teacherId) continue;
      const key = `${String(e.teacherId)}::${String(e.subject || "").toLowerCase().trim()}`;
      if (!timetableByTeacherSubject.has(key)) timetableByTeacherSubject.set(key, []);
      timetableByTeacherSubject.get(key).push(e);
    }

    // Pre-resolve ALL teachers that could be referenced — by the student
    // snapshot, by the class's subjectTeachers mapping, or by the timetable
    // entry. We need their `name`, `subject`, `phone` for display.
    const teacherIds = new Set();
    for (const s of students) {
      const tid = s.subjects?.[0]?.teacherId;
      if (tid) teacherIds.add(String(tid));
    }
    for (const c of [...classesById, ...classesByTitle]) {
      (c.subjectTeachers || []).forEach((st) => {
        if (st.teacherId) teacherIds.add(String(st.teacherId));
      });
    }
    for (const e of timetableEntries) {
      if (e.teacherId) teacherIds.add(String(e.teacherId));
    }
    const teacherDocs = teacherIds.size
      ? await Teacher.find({ _id: { $in: Array.from(teacherIds) } })
          .select("name subject phone")
          .lean()
      : [];
    const teacherMap = new Map(teacherDocs.map((t) => [String(t._id), t]));

    // Also build a by-name map so we can correct stale `subjects[].teacherId`
    // values. Keys are lowercased, spaces collapsed.
    const normalizeName = (n) =>
      String(n || "").toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
    const teacherByName = new Map();
    for (const t of teacherDocs) {
      if (t.name) teacherByName.set(normalizeName(t.name), t);
    }

    const daysOfWeek = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const sortSlots = (list) =>
      list.slice().sort((a, b) => {
        const da = daysOfWeek.indexOf(a.day);
        const db = daysOfWeek.indexOf(b.day);
        if (da !== db) return da - db;
        return String(a.startTime || "").localeCompare(String(b.startTime || ""));
      });

    const rows = [];
    for (const s of students) {
      // When a subject filter is active, iterate EVERY matching subject so
      // a multi-subject student produces one row per matched subject.
      // Without a filter, still emit one row per subject (all subjects).
      const subjectsToProcess = subjectFilter
        ? (s.subjects || []).filter((sub) => {
            const name = typeof sub === "string" ? sub : sub?.name;
            return String(name || "").toLowerCase().trim() ===
              String(subjectFilter).toLowerCase().trim();
          })
        : (s.subjects || []);

      for (const sub of subjectsToProcess) {
      if (!sub) continue;

      const subjectName = typeof sub === "string" ? sub : sub.name;
      if (!subjectName) continue;
      // (filter already applied above when building subjectsToProcess)

      const fee = Number(sub?.fee) || 0;
      const discountEnabled = Boolean(sub?.discountEnabled);
      const discount = discountEnabled ? Math.min(Number(sub?.discount) || 0, fee) : 0;
      const effectiveFee = Math.max(0, fee - discount);

      const totalFee = Number(s.totalFee) || effectiveFee;
      const paidAmount = Number(s.paidAmount) || 0;
      const balance = Math.max(0, totalFee - paidAmount);

      // Canonical fee status — prefer the stored value, fall back to derived status
      const derivedStatus =
        paidAmount <= 0 ? "pending" : paidAmount >= totalFee ? "paid" : "partial";
      const feeStatus = (s.feeStatus || derivedStatus).toLowerCase();

      if (statusFilter && feeStatus !== String(statusFilter).toLowerCase()) continue;

      // Candidate list: the student's classRef first, then any same-title
      // siblings. We'll try each for timeslots / subject-teachers until we hit.
      const candidates = candidateClassesForStudent(s);
      const liveClass = candidates[0] || null;
      const subKey = String(subjectName).toLowerCase().trim();

      // --- TIME SLOTS (class-based pass) ---
      // Walk every candidate class; take the first one that has timetable
      // entries for this subject. This handles duplicated class docs where
      // the student's classRef is an empty shell but a sibling holds the
      // actual schedule. If we find nothing here we'll fall back to the
      // teacher's global schedule later (see the teacher-based pass below).
      let slotsSource = [];
      let effectiveClassId = String(
        liveClass?._id || s.classRef?._id || s.classRef || "",
      );
      for (const c of candidates) {
        const cid = String(c._id);
        const entries = timetableByClassSubject.get(`${cid}::${subKey}`);
        if (entries && entries.length) {
          slotsSource = entries;
          effectiveClassId = cid;
          break;
        }
      }

      // --- TEACHER (authoritative, current) ---
      // Priority chain — the earliest match wins:
      //   1. Active timetable entry for (class, subject) — source of truth.
      //   2. Live class.subjectTeachers mapping for this subject.
      //   3. The student's stale snapshot (subjects[0].teacherId/teacherName).
      //   4. Match the snapshot `teacherName` string against a Teacher doc by name.
      //   5. Pick any Teacher whose `subject` field equals this subject.
      //   6. "Undecided (Demo)".
      let currentTeacherId = null;
      let currentTeacherName = null;

      // (1) timetable — pick the first slot we found via the class-based pass.
      // If that's empty the teacher stays unresolved at this stage and we fall
      // through to the class.subjectTeachers / snapshot / subject-match logic.
      const ttLead = slotsSource[0];
      if (ttLead) {
        if (ttLead.teacherId) currentTeacherId = String(ttLead.teacherId);
        if (ttLead.teacherName) currentTeacherName = ttLead.teacherName;
      }

      // (2) class.subjectTeachers — walk every candidate class (original +
      // siblings sharing the same title) until we find a mapping for this
      // subject with a concrete teacherId.
      if (!currentTeacherId || !currentTeacherName) {
        for (const c of candidates) {
          const mapping = (c.subjectTeachers || []).find(
            (st) =>
              String(st.subject || "").toLowerCase().trim() === subKey &&
              (st.teacherId || st.teacherName),
          );
          if (mapping) {
            if (!currentTeacherId && mapping.teacherId)
              currentTeacherId = String(mapping.teacherId);
            if (!currentTeacherName && mapping.teacherName)
              currentTeacherName = mapping.teacherName;
            if (currentTeacherId) break;
          }
        }
      }

      // (3) stale student snapshot — only if we still don't have a teacher
      if (!currentTeacherId && sub?.teacherId) currentTeacherId = String(sub.teacherId);
      if (!currentTeacherName && sub?.teacherName) currentTeacherName = sub.teacherName;

      // (4) Lookup by snapshot teacherName string against live teachers
      if (!currentTeacherId && currentTeacherName) {
        const byName = teacherByName.get(normalizeName(currentTeacherName));
        if (byName) currentTeacherId = String(byName._id);
      }

      // (5) Sanity check: if the resolved teacher's `subject` doesn't match
      // this subject, try to find a teacher whose subject DOES match. This
      // catches the "Shah Khalid (Botany) is cached as Chemistry teacher"
      // class of bug — we override the stale snapshot with the correct one.
      const resolvedTeacherDoc = currentTeacherId
        ? teacherMap.get(currentTeacherId)
        : null;
      const subjectMatchesTeacher =
        resolvedTeacherDoc &&
        String(resolvedTeacherDoc.subject || "").toLowerCase().trim() ===
          String(subjectName).toLowerCase().trim();
      if (!subjectMatchesTeacher) {
        // Prefer a subjectTeachers mapping from ANY candidate class.
        let mapping = null;
        for (const c of candidates) {
          mapping = (c.subjectTeachers || []).find(
            (st) =>
              String(st.subject || "").toLowerCase().trim() === subKey &&
              st.teacherId,
          );
          if (mapping) break;
        }
        if (mapping) {
          currentTeacherId = String(mapping.teacherId);
          const mDoc = teacherMap.get(currentTeacherId);
          if (mDoc?.name) currentTeacherName = mDoc.name;
          else if (mapping.teacherName) currentTeacherName = mapping.teacherName;
        } else {
          // Fall back to any teacher who teaches this subject.
          const bySubject = teacherDocs.find(
            (t) =>
              String(t.subject || "").toLowerCase().trim() === subKey,
          );
          if (bySubject) {
            currentTeacherId = String(bySubject._id);
            currentTeacherName = bySubject.name;
          }
        }
      }

      const teacherDoc = currentTeacherId ? teacherMap.get(currentTeacherId) : null;
      const teacherName = teacherDoc?.name || currentTeacherName || "Undecided (Demo)";
      const teacherIdOut = currentTeacherId || null;

      // --- TIME SLOTS (teacher-based pass) ---
      // If the class-based pass yielded nothing (e.g. the student's class has
      // no timetable at all), use the resolved teacher's *global* schedule
      // for this subject instead. This is the natural model for single-subject
      // enrollments: the student attends whenever their teacher teaches that
      // subject. Deduplicated by `${day}::${startTime}::${endTime}::${room}`
      // so if the teacher has the same slot on multiple classes (e.g. Pre-Eng
      // vs Pre-Med) we only keep the distinct schedule times.
      if (!slotsSource.length && teacherIdOut) {
        const global = timetableByTeacherSubject.get(`${teacherIdOut}::${subKey}`) || [];
        const seenSlot = new Set();
        slotsSource = [];
        for (const e of global) {
          const k = `${e.day}::${e.startTime}::${e.endTime}::${e.room || ""}`;
          if (seenSlot.has(k)) continue;
          seenSlot.add(k);
          slotsSource.push(e);
        }
      }
      const slots = sortSlots(slotsSource);

      const history = feeHistoryMap.get(String(s._id)) || [];
      const lastPayment = history[0] || null;

      // Days since admission — useful narrative in the UI ("enrolled 6m ago")
      let enrolledDays = null;
      if (s.admissionDate) {
        const diffMs = Date.now() - new Date(s.admissionDate).getTime();
        enrolledDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      rows.push({
        _id: s._id,
        studentId: s.studentId,
        studentName: s.studentName,
        fatherName: s.fatherName || "-",
        cnic: s.cnic || "",
        email: s.email || "",
        address: s.address || "",
        className: s.class || s.classRef?.classTitle || liveClass?.classTitle || "-",
        classId: effectiveClassId || null,
        classGroup: s.group || s.classRef?.group || liveClass?.group || "-",
        session: s.sessionRef
          ? {
              _id: s.sessionRef._id,
              sessionName: s.sessionRef.sessionName,
              startDate: s.sessionRef.startDate || null,
              endDate: s.sessionRef.endDate || null,
            }
          : null,
        parentCell: s.parentCell || "-",
        studentCell: s.studentCell || "-",
        photo: s.photo || null,
        imageUrl: s.imageUrl || null,
        status: s.status || "active",
        admissionDate: s.admissionDate,
        createdAt: s.createdAt,
        enrolledDays,
        subject: {
          name: subjectName,
          // Emit the *authoritative* (current) teacher, not the stale snapshot.
          // This is what the Teacher dropdown on the report filters off of, so
          // the dropdown now reflects reality instead of historical admission data.
          teacherId: teacherIdOut,
          teacherName,
          teacherPhone: teacherDoc?.phone || null,
          // Keep the snapshot available as a debug / audit trail, in case the
          // UI ever wants to show "was assigned to X, now assigned to Y".
          snapshotTeacherId: sub?.teacherId ? String(sub.teacherId) : null,
          snapshotTeacherName: sub?.teacherName || null,
          fee,
          discount,
          discountEnabled,
          discountReason: sub?.discountReason || "",
          effectiveFee,
        },
        // Timetable slots the student attends for this subject.
        // Each slot: { day, startTime, endTime, room, teacherName, subject }
        timeSlots: slots.map((e) => ({
          day: e.day,
          startTime: e.startTime,
          endTime: e.endTime,
          room: e.room || "",
          teacherName: e.teacherName || teacherName,
          subject: e.subject || subjectName,
        })),
        discountAmount: Number(s.discountAmount) || 0,
        totalFee,
        paidAmount,
        balance,
        feeStatus,
        // Full payment history (descending) + convenience fields
        feeHistory: history,
        paymentCount: history.length,
        lastPayment: lastPayment
          ? {
              receiptNumber: lastPayment.receiptNumber,
              amount: lastPayment.amount,
              month: lastPayment.month,
              paymentMethod: lastPayment.paymentMethod,
              collectedBy: lastPayment.collectedBy,
              createdAt: lastPayment.createdAt,
            }
          : null,
      });
      } // end inner for-loop over subjectsToProcess
    } // end outer for-loop over students

    // Subject-level aggregates for the sub-cards in the UI
    const subjectAggregates = {};
    for (const row of rows) {
      const name = row.subject.name;
      if (!subjectAggregates[name]) {
        subjectAggregates[name] = {
          subject: name,
          studentCount: 0,
          expectedFee: 0,
          collected: 0,
          outstanding: 0,
          paidCount: 0,
          partialCount: 0,
          pendingCount: 0,
        };
      }
      const agg = subjectAggregates[name];
      agg.studentCount += 1;
      agg.expectedFee += row.totalFee;
      agg.collected += row.paidAmount;
      agg.outstanding += row.balance;
      if (row.feeStatus === "paid") agg.paidCount += 1;
      else if (row.feeStatus === "partial") agg.partialCount += 1;
      else agg.pendingCount += 1;
    }

    const summary = {
      totalStudents: rows.length,
      totalExpectedFee: rows.reduce((sum, r) => sum + r.totalFee, 0),
      totalCollected: rows.reduce((sum, r) => sum + r.paidAmount, 0),
      totalOutstanding: rows.reduce((sum, r) => sum + r.balance, 0),
      paidCount: rows.filter((r) => r.feeStatus === "paid").length,
      partialCount: rows.filter((r) => r.feeStatus === "partial").length,
      pendingCount: rows.filter((r) => r.feeStatus === "pending").length,
      uniqueSubjects: Object.keys(subjectAggregates).length,
    };

    return res.json({
      success: true,
      data: {
        rows,
        subjects: Object.values(subjectAggregates).sort(
          (a, b) => b.studentCount - a.studentCount,
        ),
        summary,
        filters: {
          subject: subjectFilter || null,
          status: statusFilter || null,
        },
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("getSingleSubjectReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

async function getSubjectTeachersWithDetails(classDoc) {
  const results = [];
  
  for (const st of (classDoc.subjectTeachers || [])) {
    const teacher = st.teacherId 
      ? await Teacher.findById(st.teacherId).select("name subject compensation userId").populate("userId", "role").lean()
      : null;
    
    results.push({
      subject: st.subject,
      teacherId: st.teacherId,
      teacherName: st.teacherName || teacher?.name || "Not Assigned",
      compensationType: teacher?.compensation?.type || "percentage",
      compensationDetails: teacher?.compensation || null,
      compensationSummary: getCompensationSummary(teacher?.compensation),
      role: teacher?.userId?.role || "TEACHER",
      coTeachers: (st.coTeachers || []).map(ct => ({
        teacherId: ct.teacherId,
        teacherName: ct.teacherName,
        compensationType: ct.compensationType || "percentage",
      })),
    });
  }

  return results;
}

/**
 * Generate human-readable compensation summary
 */
function getCompensationSummary(compensation) {
  if (!compensation) return "70% / 30% Split (Default)";
  
  const type = compensation.type || "percentage";
  
  switch (type) {
    case "percentage":
      const ts = compensation.teacherShare ?? 70;
      const as = compensation.academyShare ?? 30;
      return `${ts}% / ${as}% Split`;
    case "fixed":
      return `PKR ${(compensation.fixedSalary || 0).toLocaleString()} /month`;
    case "hybrid":
      return `PKR ${(compensation.baseSalary || 0).toLocaleString()} + ${compensation.profitShare || 0}% Bonus`;
    case "perStudent":
      return `PKR ${(compensation.perStudentAmount || 0).toLocaleString()} /student`;
    default:
      return "70% / 30% Split (Default)";
  }
}

module.exports = exports;
