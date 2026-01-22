const Student = require("../models/Student");
const Class = require("../models/Class");

/**
 * Gatekeeper Controller - Smart Gate Scanner Module
 *
 * Handles barcode scanning for physical security at entry points.
 * Supports: Student ID, Barcode ID, and Unique Receipt Tokens
 * Enforces: Fee Status AND Class Schedule (Day/Time)
 */

/**
 * Helper: Parse time string (e.g., "14:00" or "02:00 PM") to minutes from midnight
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;

  // Handle 24h format (14:00)
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1]) * 60 + parseInt(match24[2]);
  }

  // Handle 12h format (02:00 PM)
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = parseInt(match12[2]);
    const period = match12[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  return null;
};

/**
 * Helper: Get current day abbreviation (Mon, Tue, Wed, etc.)
 */
const getCurrentDayAbbrev = () => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[new Date().getDay()];
};

/**
 * Helper: Format minutes to readable time
 */
const formatMinutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHour}:${mins.toString().padStart(2, "0")} ${period}`;
};

// @desc    Verify student by barcode scan (Supports Token, StudentID, BarcodeID)
// @route   POST /api/gatekeeper/scan
// @access  Protected (OWNER, OPERATOR)
exports.scanBarcode = async (req, res) => {
  try {
    const { barcodeId } = req.body;

    if (!barcodeId || barcodeId.length < 5) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: "Invalid barcode format",
      });
    }

    console.log(`🔍 Scanning: ${barcodeId}`);

    let student = null;
    let usedReceipt = null;

    // ========================================
    // STEP 1: IDENTIFY STUDENT (Token, ID, or Barcode)
    // ========================================

    // Check if it's a Receipt Token (TOKEN-260001-XXXX-V1)
    if (barcodeId.startsWith("TOKEN-")) {
      console.log("   🎫 Token-based lookup...");
      student = await Student.findOne({
        "printHistory.receiptId": barcodeId,
      }).populate("classRef");

      if (student) {
        usedReceipt = student.printHistory.find(
          (p) => p.receiptId === barcodeId,
        );
        console.log(
          `   ✅ Found via token: ${student.studentName} (Receipt v${usedReceipt?.version})`,
        );
      }
    }

    // If not found by token, try direct ID lookup
    if (!student) {
      student = await Student.findOne({
        $or: [
          { barcodeId: barcodeId },
          { studentId: barcodeId },
          { barcodeId: { $regex: new RegExp(`^${barcodeId}$`, "i") } },
        ],
      }).populate("classRef");
    }

    if (!student) {
      console.log(`❌ Unknown barcode: ${barcodeId}`);
      return res.status(404).json({
        success: false,
        status: "unknown",
        message: "Unknown Student - Barcode not registered",
        barcodeId,
      });
    }

    // ========================================
    // STEP 2: CHECK STUDENT STATUS (Expelled/Suspended)
    // ========================================
    if (
      student.studentStatus === "Expelled" ||
      student.studentStatus === "Suspended"
    ) {
      console.log(
        `🚫 Blocked: ${student.studentName} (${student.studentStatus})`,
      );
      return res.status(403).json({
        success: false,
        status: "blocked",
        message: `Entry Denied - Student is ${student.studentStatus}`,
        student: {
          name: student.studentName,
          studentId: student.studentId,
          status: student.studentStatus,
          photo: student.photo,
        },
      });
    }

    // ========================================
    // STEP 3: CHECK FEE STATUS
    // ========================================
    const hasDefaulted =
      student.feeStatus === "pending" && student.paidAmount === 0;
    const balance = Math.max(
      0,
      (student.totalFee || 0) - (student.paidAmount || 0),
    );

    if (hasDefaulted) {
      console.log(`💰 Fee defaulter: ${student.studentName}`);
      return res.status(403).json({
        success: false,
        status: "defaulter",
        message: "⚠️ Entry Denied - FEES PENDING",
        reason: "FEES_PENDING",
        student: {
          _id: student._id,
          studentId: student.studentId,
          name: student.studentName,
          fatherName: student.fatherName,
          class: student.class,
          group: student.group,
          photo: student.photo,
          feeStatus: student.feeStatus,
          totalFee: student.totalFee,
          paidAmount: student.paidAmount,
          balance,
        },
      });
    }

    // ========================================
    // STEP 4: CHECK CLASS SCHEDULE (Day & Time)
    // ========================================
    const classDoc = student.classRef;
    const currentDay = getCurrentDayAbbrev();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let scheduleStatus = "allowed";
    let scheduleMessage = null;
    let classStartTime = null;
    let classEndTime = null;

    if (classDoc && classDoc.days && classDoc.startTime) {
      classStartTime = classDoc.startTime;
      classEndTime = classDoc.endTime;
      const classDays = classDoc.days || [];

      console.log(
        `   📅 Checking schedule: ${classDays.join(",")} @ ${classStartTime}`,
      );

      // Check if today is a class day
      if (!classDays.includes(currentDay)) {
        scheduleStatus = "no_class_today";
        scheduleMessage = `NO CLASS TODAY - Next: ${classDays.join(", ")}`;
        console.log(`   ❌ No class today (${currentDay})`);
      } else {
        // Check time window (60 min before start, until 30 min before end)
        const startMinutes = parseTimeToMinutes(classStartTime);
        const endMinutes = parseTimeToMinutes(classEndTime);

        if (startMinutes !== null) {
          const allowedEntryFrom = startMinutes - 60; // 1 hour before
          const allowedEntryUntil = endMinutes
            ? endMinutes - 30
            : startMinutes + 180; // 30 min before end or 3 hours after start

          if (currentMinutes < allowedEntryFrom) {
            scheduleStatus = "too_early";
            scheduleMessage = `TOO EARLY - Class starts at ${formatMinutesToTime(startMinutes)}`;
            console.log(
              `   ⏰ Too early (now: ${formatMinutesToTime(currentMinutes)}, class: ${formatMinutesToTime(startMinutes)})`,
            );
          } else if (currentMinutes > allowedEntryUntil) {
            scheduleStatus = "too_late";
            scheduleMessage = `TOO LATE - Class ended`;
            console.log(`   ⏰ Too late`);
          }
        }
      }
    }

    // If schedule check failed, return denial
    if (scheduleStatus !== "allowed") {
      return res.status(403).json({
        success: false,
        status: scheduleStatus,
        message: `⏰ Entry Denied - ${scheduleMessage}`,
        reason: scheduleStatus.toUpperCase(),
        student: {
          _id: student._id,
          studentId: student.studentId,
          name: student.studentName,
          fatherName: student.fatherName,
          class: student.class,
          group: student.group,
          photo: student.photo,
          classTime: classStartTime,
          classDays: classDoc?.days,
        },
        schedule: {
          classStartTime,
          classEndTime,
          classDays: classDoc?.days,
          currentTime: formatMinutesToTime(currentMinutes),
          currentDay,
        },
      });
    }

    // ========================================
    // STEP 5: SUCCESS - ENTRY PERMITTED
    // ========================================
    const isPartial = student.feeStatus === "partial";
    let verificationStatus = "success";
    let statusMessage = "✅ Entry Permitted - Fees Paid";

    if (isPartial) {
      verificationStatus = "partial";
      statusMessage = `✅ Entry Permitted - Balance: PKR ${balance.toLocaleString()}`;
    }

    console.log(`✅ VERIFIED: ${student.studentName} (${verificationStatus})`);

    return res.status(200).json({
      success: true,
      status: verificationStatus,
      message: statusMessage,
      student: {
        _id: student._id,
        studentId: student.studentId,
        barcodeId: student.barcodeId,
        name: student.studentName,
        fatherName: student.fatherName,
        class: student.class,
        group: student.group,
        photo: student.photo,
        feeStatus: student.feeStatus,
        totalFee: student.totalFee,
        paidAmount: student.paidAmount,
        balance,
        studentStatus: student.studentStatus || "Active",
      },
      schedule: {
        classStartTime,
        classEndTime,
        classDays: classDoc?.days,
        currentTime: formatMinutesToTime(currentMinutes),
      },
      usedReceipt: usedReceipt
        ? {
            receiptId: usedReceipt.receiptId,
            version: usedReceipt.version,
          }
        : null,
      scannedAt: new Date(),
    });
  } catch (error) {
    console.error("❌ Error in scanBarcode:", error);
    return res.status(500).json({
      success: false,
      status: "error",
      message: "Server error during scan",
      error: error.message,
    });
  }
};

// @desc    Search student by name/phone for manual lookup
// @route   GET /api/gatekeeper/search
// @access  Protected (OWNER, OPERATOR)
exports.searchStudent = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const students = await Student.find({
      $or: [
        { studentName: { $regex: query, $options: "i" } },
        { studentId: { $regex: query, $options: "i" } },
        { parentCell: { $regex: query, $options: "i" } },
        { barcodeId: { $regex: query, $options: "i" } },
      ],
    })
      .select(
        "studentId barcodeId studentName fatherName class group photo feeStatus studentStatus",
      )
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    console.error("❌ Error in searchStudent:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during search",
      error: error.message,
    });
  }
};

// @desc    Generate or regenerate barcode for a student
// @route   POST /api/gatekeeper/generate-barcode/:id
// @access  Protected (OWNER, OPERATOR)
exports.generateBarcode = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Generate barcode ID
    await student.generateBarcodeId();
    await student.save();

    return res.status(200).json({
      success: true,
      message: `✅ Barcode generated: ${student.barcodeId}`,
      barcodeId: student.barcodeId,
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.studentName,
        barcodeId: student.barcodeId,
      },
    });
  } catch (error) {
    console.error("❌ Error in generateBarcode:", error);
    return res.status(500).json({
      success: false,
      message: "Server error generating barcode",
      error: error.message,
    });
  }
};

// @desc    Increment reprint count and return updated student
// @route   POST /api/gatekeeper/reprint/:id
// @access  Protected (OWNER, OPERATOR)
exports.recordReprint = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Increment reprint count
    student.reprintCount = (student.reprintCount || 0) + 1;
    await student.save();

    console.log(
      `📄 Reprint recorded for ${student.studentName}: Copy #${student.reprintCount}`,
    );

    return res.status(200).json({
      success: true,
      message: `Reprint recorded. This is copy #${student.reprintCount}`,
      reprintCount: student.reprintCount,
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.studentName,
        barcodeId: student.barcodeId,
        reprintCount: student.reprintCount,
      },
    });
  } catch (error) {
    console.error("❌ Error in recordReprint:", error);
    return res.status(500).json({
      success: false,
      message: "Server error recording reprint",
      error: error.message,
    });
  }
};
