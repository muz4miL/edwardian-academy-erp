const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const Class = require("../models/Class");
const { protect, restrictTo } = require("../middleware/authMiddleware");

// ============================================================
// GET /api/attendance
// Fetch attendance records with flexible filtering
// Query params: date, from, to, studentId, classId, type, page, limit
// ============================================================
router.get("/", protect, async (req, res) => {
  try {
    const {
      date,
      from,
      to,
      studentId,
      classId,
      type,
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};

    // Single date filter
    if (date) {
      query.date = date;
    }

    // Date range filter
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    // Student filter
    if (studentId) {
      query.$or = [
        { studentId: studentId },
        { studentNumericId: studentId },
      ];
    }

    // Class filter
    if (classId) {
      query.classRef = classId;
    }

    // Type filter (check-in / check-out)
    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("studentId", "studentName studentId class group photo")
        .populate("classRef", "classTitle gradeLevel")
        .lean(),
      Attendance.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: records,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching attendance records",
      error: error.message,
    });
  }
});

// ============================================================
// GET /api/attendance/daily-summary
// Get summary for a specific date: total present, by class, etc.
// ============================================================
router.get("/daily-summary", protect, async (req, res) => {
  try {
    const today = new Date();
    const dateStr =
      req.query.date ||
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Get unique students who checked in today
    const checkIns = await Attendance.aggregate([
      { $match: { date: dateStr, type: "check-in" } },
      {
        $group: {
          _id: "$studentId",
          studentName: { $first: "$studentName" },
          studentNumericId: { $first: "$studentNumericId" },
          class: { $first: "$class" },
          classRef: { $first: "$classRef" },
          group: { $first: "$group" },
          firstScan: { $min: "$timestamp" },
          lastScan: { $max: "$timestamp" },
          scanCount: { $sum: 1 },
          status: { $first: "$status" },
          feeStatus: { $first: "$feeStatus" },
        },
      },
      { $sort: { firstScan: -1 } },
    ]);

    // By class breakdown
    const byClass = await Attendance.aggregate([
      { $match: { date: dateStr, type: "check-in" } },
      {
        $group: {
          _id: { classRef: "$classRef", class: "$class" },
          uniqueStudents: { $addToSet: "$studentId" },
        },
      },
      {
        $project: {
          class: "$_id.class",
          classRef: "$_id.classRef",
          count: { $size: "$uniqueStudents" },
        },
      },
      { $sort: { class: 1 } },
    ]);

    // Get total enrolled students for percentage calculation
    const totalStudents = await Student.countDocuments({
      studentStatus: { $in: ["Active", "active"] },
    });

    // Get class-wise enrollment for percentage
    const classEnrollment = await Student.aggregate([
      { $match: { studentStatus: { $in: ["Active", "active"] } } },
      {
        $group: {
          _id: "$classRef",
          className: { $first: "$class" },
          total: { $sum: 1 },
        },
      },
    ]);

    const enrollmentMap = {};
    classEnrollment.forEach((c) => {
      if (c._id) enrollmentMap[c._id.toString()] = c.total;
    });

    // Merge enrollment data with attendance
    const classBreakdown = byClass.map((cls) => ({
      class: cls.class,
      classRef: cls.classRef,
      present: cls.count,
      total: cls.classRef ? enrollmentMap[cls.classRef.toString()] || 0 : 0,
      percentage: cls.classRef && enrollmentMap[cls.classRef.toString()]
        ? Math.round((cls.count / enrollmentMap[cls.classRef.toString()]) * 100)
        : 0,
    }));

    // Hourly distribution
    const hourlyDist = await Attendance.aggregate([
      { $match: { date: dateStr, type: "check-in" } },
      {
        $group: {
          _id: { $hour: "$timestamp" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        date: dateStr,
        totalPresent: checkIns.length,
        totalEnrolled: totalStudents,
        attendanceRate: totalStudents
          ? Math.round((checkIns.length / totalStudents) * 100)
          : 0,
        students: checkIns,
        byClass: classBreakdown,
        hourlyDistribution: hourlyDist.map((h) => ({
          hour: h._id,
          label: `${h._id > 12 ? h._id - 12 : h._id || 12}${h._id >= 12 ? "PM" : "AM"}`,
          count: h.count,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching daily summary:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching daily summary",
      error: error.message,
    });
  }
});

// ============================================================
// GET /api/attendance/student/:studentId
// Get attendance history for a specific student
// ============================================================
router.get("/student/:studentId", protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const query = {
      $or: [
        { studentNumericId: req.params.studentId },
      ],
    };

    // Try ObjectId match too
    if (req.params.studentId.match(/^[0-9a-fA-F]{24}$/)) {
      query.$or.push({ studentId: req.params.studentId });
    }

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const records = await Attendance.find(query)
      .sort({ timestamp: -1 })
      .limit(200)
      .lean();

    // Calculate stats
    const uniqueDates = [...new Set(records.filter(r => r.type === "check-in").map((r) => r.date))];
    const lateCount = records.filter(r => r.status === "late").length;

    res.json({
      success: true,
      data: {
        records,
        stats: {
          totalDays: uniqueDates.length,
          lateDays: lateCount,
          onTimeDays: uniqueDates.length - lateCount,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student attendance",
      error: error.message,
    });
  }
});

// ============================================================
// GET /api/attendance/monthly-overview
// Get month-wide attendance overview for heatmap/calendar view
// ============================================================
router.get("/monthly-overview", protect, async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const dailyData = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          type: "check-in",
        },
      },
      {
        $group: {
          _id: "$date",
          uniqueStudents: { $addToSet: "$studentId" },
          totalScans: { $sum: 1 },
        },
      },
      {
        $project: {
          date: "$_id",
          present: { $size: "$uniqueStudents" },
          totalScans: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    const totalStudents = await Student.countDocuments({
      studentStatus: { $in: ["Active", "active"] },
    });

    res.json({
      success: true,
      data: {
        year,
        month,
        totalEnrolled: totalStudents,
        days: dailyData.map((d) => ({
          date: d.date,
          present: d.present,
          totalScans: d.totalScans,
          rate: totalStudents
            ? Math.round((d.present / totalStudents) * 100)
            : 0,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching monthly overview:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching monthly overview",
      error: error.message,
    });
  }
});

// ============================================================
// POST /api/attendance/manual
// Manually mark attendance (for admin use)
// ============================================================
router.post(
  "/manual",
  protect,
  restrictTo("OWNER", "ADMIN", "STAFF"),
  async (req, res) => {
    try {
      const { studentId, date, status, type } = req.body;

      const student = await Student.findById(studentId).populate("classRef");
      if (!student) {
        return res.status(404).json({ success: false, message: "Student not found" });
      }

      const dateStr =
        date ||
        (() => {
          const now = new Date();
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        })();

      const record = await Attendance.create({
        studentId: student._id,
        studentNumericId: student.studentId,
        studentName: student.studentName,
        class: student.class,
        classRef: student.classRef?._id || student.classRef,
        group: student.group,
        type: type || "check-in",
        date: dateStr,
        timestamp: new Date(),
        status: status || "present",
        scanMethod: "manual",
        scannedBy: req.user._id,
        feeStatus: student.feeStatus,
      });

      res.status(201).json({
        success: true,
        message: `Attendance marked for ${student.studentName}`,
        data: record,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(200).json({
          success: true,
          alreadyMarked: true,
          message: "Attendance already recorded for this student today",
        });
      }
      console.error("Error marking manual attendance:", error);
      res.status(500).json({
        success: false,
        message: "Error marking attendance",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET /api/attendance/today — Real-time today's summary + records
// Auto-refreshes every 30 seconds from frontend
// ============================================================
router.get("/today", protect, async (req, res) => {
  try {
    const today = Attendance.getTodayDateStr();
    const { classFilter } = req.query;

    const query = { date: today };
    if (classFilter && classFilter !== "all") {
      query.class = classFilter;
    }

    const records = await Attendance.find(query)
      .populate("studentId", "studentName studentId class group photo imageUrl feeStatus")
      .sort({ timestamp: -1 });

    // Total enrolled students for percentage
    const studentQuery = {};
    if (classFilter && classFilter !== "all") {
      studentQuery.class = classFilter;
    }
    const totalStudents = await Student.countDocuments({
      ...studentQuery,
      $or: [
        { studentStatus: { $in: ["Active", "active"] } },
        { studentStatus: { $exists: false } },
      ],
    });

    const present = records.filter((r) => r.status === "present" || r.status === "Present").length;
    const late = records.filter((r) => r.status === "late" || r.status === "Late").length;
    const excused = records.filter((r) => r.status === "Excused").length;
    const absent = Math.max(0, totalStudents - present - late - excused);

    return res.status(200).json({
      success: true,
      date: today,
      stats: {
        totalStudents,
        present,
        late,
        absent,
        excused,
        rate: totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0,
      },
      records,
    });
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch attendance" });
  }
});

// ============================================================
// GET /api/attendance/range — Date range report
// ============================================================
router.get("/range", protect, async (req, res) => {
  try {
    const { startDate, endDate, classFilter } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate required" });
    }

    const query = { date: { $gte: startDate, $lte: endDate } };
    if (classFilter && classFilter !== "all") {
      query.class = classFilter;
    }

    const records = await Attendance.find(query)
      .populate("studentId", "studentName studentId class group photo imageUrl")
      .sort({ date: -1, timestamp: -1 });

    // Group by date for daily breakdown
    const dailyMap = {};
    records.forEach((r) => {
      const dateKey = r.date;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, present: 0, late: 0, absent: 0, excused: 0, records: [] };
      }
      const statusLower = (r.status || "present").toLowerCase();
      if (dailyMap[dateKey][statusLower] !== undefined) {
        dailyMap[dateKey][statusLower]++;
      } else {
        dailyMap[dateKey].present++;
      }
      dailyMap[dateKey].records.push(r);
    });

    return res.status(200).json({
      success: true,
      dateRange: { startDate, endDate },
      totalRecords: records.length,
      dailyBreakdown: Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date)),
      records,
    });
  } catch (error) {
    console.error("Error fetching range attendance:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch range" });
  }
});

// ============================================================
// PUT /api/attendance/:id — Admin update attendance status
// ============================================================
router.put(
  "/:id",
  protect,
  restrictTo("OWNER", "ADMIN", "STAFF", "OPERATOR"),
  async (req, res) => {
    try {
      const { status, notes } = req.body;
      const attendance = await Attendance.findByIdAndUpdate(
        req.params.id,
        { status, notes, markedBy: "Admin", scannedBy: req.user?._id },
        { new: true, runValidators: true }
      );
      if (!attendance) {
        return res.status(404).json({ success: false, message: "Record not found" });
      }
      return res.status(200).json({ success: true, attendance });
    } catch (error) {
      console.error("Error updating attendance:", error);
      return res.status(500).json({ success: false, message: "Failed to update" });
    }
  }
);

// ============================================================
// GET /api/attendance/classes — Class list for dropdown filter
// ============================================================
router.get("/classes", protect, async (req, res) => {
  try {
    const classes = await Student.distinct("class", {
      $or: [
        { studentStatus: { $in: ["Active", "active"] } },
        { studentStatus: { $exists: false } },
      ],
    });
    return res.status(200).json({ success: true, classes: classes.filter(Boolean).sort() });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch classes" });
  }
});

module.exports = router;
