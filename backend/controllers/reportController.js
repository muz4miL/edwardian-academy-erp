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
    const teachers = await Teacher.find({ status: "active" })
      .select("name subject compensation userId")
      .populate("userId", "fullName role")
      .sort({ name: 1 })
      .lean();

    const enrichedTeachers = teachers.map(t => ({
      _id: t._id,
      name: t.name,
      fullName: t.userId?.fullName || t.name, // Alias for frontend
      subject: t.subject,
      compensationType: t.compensation?.type || "percentage",
      compensationMode: t.compensation?.type || "percentage", // Alias for frontend
      compensationSummary: getCompensationSummary(t.compensation),
      role: t.userId?.role || "TEACHER",
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

    // Get fee records for this teacher
    const feeRecords = await FeeRecord.find({
      $or: [
        { teacher: teacherId },
        { "teachers.teacherId": teacherId },
      ],
      ...dateFilter,
    }).lean();

    // Calculate earnings based on compensation type
    const compensationType = teacher.compensation?.type || "percentage";
    let earningsBreakdown = {};
    let totalEarnings = 0;
    let totalOwed = 0;

    if (compensationType === "percentage") {
      // Calculate from fee records
      const teacherShare = teacher.compensation?.teacherShare ?? 70;
      const academyShare = teacher.compensation?.academyShare ?? 30;
      
      let totalFeeCollected = 0;
      const studentEarnings = [];

      for (const fr of feeRecords) {
        const teacherEntry = fr.teachers?.find(t => t.teacherId?.toString() === teacherId);
        if (teacherEntry) {
          totalFeeCollected += fr.amount || 0;
          totalEarnings += teacherEntry.teacherShare || 0;
          studentEarnings.push({
            studentName: fr.studentName,
            className: fr.className,
            amount: fr.amount,
            teacherShare: teacherEntry.teacherShare,
            date: fr.createdAt,
          });
        }
      }

      earningsBreakdown = {
        type: "percentage",
        teacherSharePercent: teacherShare,
        academySharePercent: academyShare,
        totalFeeCollected,
        totalTeacherShare: totalEarnings,
        totalAcademyShare: totalFeeCollected - totalEarnings,
        studentCount: studentEarnings.length,
        details: studentEarnings,
      };

    } else if (compensationType === "fixed") {
      // Fixed salary
      const fixedSalary = teacher.compensation?.fixedSalary || 0;
      totalEarnings = fixedSalary;
      
      earningsBreakdown = {
        type: "fixed",
        monthlySalary: fixedSalary,
        totalOwed: fixedSalary,
        note: "Fixed monthly salary regardless of fee collections",
      };

    } else if (compensationType === "perStudent") {
      // Per-student calculation
      const perStudentAmount = teacher.compensation?.perStudentAmount || 0;
      const activeStudents = students.filter(s => s.feeStatus !== "pending").length;
      totalEarnings = activeStudents * perStudentAmount;

      const studentDetails = students.map(s => ({
        studentName: s.studentName,
        feeStatus: s.feeStatus,
        amount: s.feeStatus !== "pending" ? perStudentAmount : 0,
      }));

      earningsBreakdown = {
        type: "perStudent",
        perStudentRate: perStudentAmount,
        totalActiveStudents: activeStudents,
        totalStudents: students.length,
        totalEarnings,
        details: studentDetails,
      };

    } else if (compensationType === "hybrid") {
      // Base + profit share
      const baseSalary = teacher.compensation?.baseSalary || 0;
      const profitShare = teacher.compensation?.profitShare || 0;
      
      let totalFeeCollected = 0;
      for (const fr of feeRecords) {
        totalFeeCollected += fr.amount || 0;
      }
      
      const profitEarnings = Math.floor((totalFeeCollected * profitShare) / 100);
      totalEarnings = baseSalary + profitEarnings;

      earningsBreakdown = {
        type: "hybrid",
        baseSalary,
        profitSharePercent: profitShare,
        totalFeeCollected,
        profitEarnings,
        totalEarnings,
      };
    }

    // Get wallet balance
    const walletBalance = {
      floating: teacher.balance?.floating || 0,
      verified: teacher.balance?.verified || 0,
      pending: teacher.balance?.pending || 0,
      totalPaid: teacher.totalPaid || 0,
    };

    totalOwed = walletBalance.floating + walletBalance.verified;

    // Classes breakdown
    const classBreakdown = classes.map(cls => {
      const classStudents = students.filter(s => s.classRef?.toString() === cls._id.toString());
      const classFees = feeRecords.filter(fr => fr.class?.toString() === cls._id.toString());
      
      return {
        classId: cls.classId,
        classTitle: cls.classTitle,
        gradeLevel: cls.gradeLevel,
        group: cls.group,
        sessionName: cls.session?.name || "Unknown",
        studentCount: classStudents.length,
        feeRecordCount: classFees.length,
        totalCollected: classFees.reduce((sum, fr) => sum + (fr.amount || 0), 0),
      };
    });

    return res.json({
      success: true,
      data: {
        // Flat fields for frontend convenience
        teacherName: teacher.name,
        compensationMode: compensationType,
        teacherShare: teacher.compensation?.teacherShare ?? 70,
        academyShare: teacher.compensation?.academyShare ?? 30,
        fixedSalary: teacher.compensation?.fixedSalary || 0,
        perStudentRate: teacher.compensation?.perStudentAmount || 0,
        totalClasses: classes.length,
        totalStudents: students.length,
        totalEarned: totalEarnings,
        totalPaid: walletBalance.totalPaid || 0,
        totalPending: totalOwed,
        walletBalance: walletBalance.floating + walletBalance.verified,

        // Classes with frontend-expected field names
        classes: classBreakdown.map(cls => {
          // Find the subject-specific compensation if available
          const subjectTeacher = classes.find(c => c._id.toString() === cls._id?.toString())?.subjectTeachers?.find(st => st.teacherId?.toString() === teacherId) || {};
          return {
            className: cls.classTitle,
            subjectName: teacher.subject || "General",
            studentCount: cls.studentCount,
            compensationMode: compensationType,
            teacherShare: teacher.compensation?.teacherShare ?? 70,
            fixedSalary: teacher.compensation?.fixedSalary || 0,
            perStudentRate: teacher.compensation?.perStudentAmount || 0,
            totalEarned: cls.totalCollected * ((teacher.compensation?.teacherShare ?? 70) / 100),
            totalPaid: 0, // Would need fee record tracking
            totalPending: cls.totalCollected * ((teacher.compensation?.teacherShare ?? 70) / 100),
          };
        }),

        // Per-student earnings details (for percentage mode)
        studentDetails: earningsBreakdown.details || [],

        // Teacher Info (nested)
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

        // Compensation Details
        compensation: {
          type: compensationType,
          ...teacher.compensation,
        },

        // Earnings Breakdown
        earnings: earningsBreakdown,

        // Wallet Status
        wallet: walletBalance,

        // Summary
        summary: {
          totalEarnings,
          totalOwed,
          totalPaid: walletBalance.totalPaid,
          totalClasses: classes.length,
          totalStudents: students.length,
        },

        // Report Metadata
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
