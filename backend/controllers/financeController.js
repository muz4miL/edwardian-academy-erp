/**
 * ================================================================
 * GENIUS ACADEMY — FINANCE CONTROLLER (Clean Single-Owner Edition)
 * ================================================================
 * All partner/pool/split logic removed. This is a sole-proprietor
 * system: Owner collects 30% academy share, Teachers earn 70%.
 * ================================================================
 */

const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const DailyClosing = require("../models/DailyClosing");
const Notification = require("../models/Notification");
const Expense = require("../models/Expense");
const Configuration = require("../models/Configuration");
const User = require("../models/User");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const Class = require("../models/Class");
const FeeRecord = require("../models/FeeRecord");
const Session = require("../models/Session");
const TeacherPayment = require("../models/TeacherPayment");

// =====================================================================
// CLOSE DAY — Lock floating cash into verified balance
// =====================================================================
exports.closeDay = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all floating (unverified) income for this user
    const floatingTransactions = await Transaction.find({
      collectedBy: userId,
      status: "FLOATING",
      type: "INCOME",
    });

    if (floatingTransactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No floating transactions to close.",
      });
    }

    let totalAmount = 0;
    for (const tx of floatingTransactions) {
      totalAmount += tx.amount;
    }

    // Create daily closing record
    const closing = await DailyClosing.create({
      closedBy: userId,
      closedByName: req.user.fullName,
      totalAmount,
      transactionCount: floatingTransactions.length,
      date: new Date(),
      status: "VERIFIED",
    });

    // Mark all floating → verified
    await Transaction.updateMany(
      { collectedBy: userId, status: "FLOATING", type: "INCOME" },
      { $set: { status: "VERIFIED", closingId: closing._id } },
    );

    // Move teacher floating balances → verified
    const teacherIds = [
      ...new Set(
        floatingTransactions
          .filter((tx) => tx.splitDetails?.teacherId)
          .map((tx) => tx.splitDetails.teacherId.toString()),
      ),
    ];

    for (const tid of teacherIds) {
      const teacher = await Teacher.findById(tid);
      if (teacher && teacher.balance) {
        const floatingBal = teacher.balance.floating || 0;
        teacher.balance.verified =
          (teacher.balance.verified || 0) + floatingBal;
        teacher.balance.floating = 0;
        await teacher.save();
      }
    }

    return res.json({
      success: true,
      message: `Day closed! ${floatingTransactions.length} transactions verified.`,
      data: {
        closingId: closing._id,
        totalAmount,
        transactionCount: floatingTransactions.length,
      },
    });
  } catch (error) {
    console.error("CloseDay Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET DASHBOARD STATS — Single-Owner Academy Dashboard
// =====================================================================
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total students
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ studentStatus: "Active" });

    // Student status breakdown
    const statusBreakdownResult = await Student.aggregate([
      {
        $group: {
          _id: "$studentStatus",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Transform to object with all statuses (Active, Pending, Alumni, Expelled, Suspended)
    const studentsByStatus = {
      Active: 0,
      Pending: 0,
      Alumni: 0,
      Expelled: 0,
      Suspended: 0
    };
    statusBreakdownResult.forEach(item => {
      if (item._id && studentsByStatus.hasOwnProperty(item._id)) {
        studentsByStatus[item._id] = item.count;
      }
    });

    // Total teachers
    const totalTeachers = await Teacher.countDocuments({ status: "active" });

    // Monthly income (from transactions)
    const monthlyIncomeResult = await Transaction.aggregate([
      {
        $match: {
          type: "INCOME",
          date: { $gte: startOfMonth },
          status: { $in: ["FLOATING", "VERIFIED"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyIncome = monthlyIncomeResult[0]?.total || 0;

    // Monthly expenses
    const monthlyExpenseResult = await Transaction.aggregate([
      { $match: { type: "EXPENSE", date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyExpenses = monthlyExpenseResult[0]?.total || 0;

    // Today's income
    const todayIncomeResult = await Transaction.aggregate([
      { $match: { type: "INCOME", date: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const todayIncome = todayIncomeResult[0]?.total || 0;

    // Floating (unverified) cash
    const floatingResult = await Transaction.aggregate([
      { $match: { type: "INCOME", status: "FLOATING" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const floatingCash = floatingResult[0]?.total || 0;

    // Fee collection stats
    const [totalExpectedFees, totalCollectedFees] = await Promise.all([
      Student.aggregate([
        { $group: { _id: null, total: { $sum: "$totalFee" } } },
      ]),
      Student.aggregate([
        { $group: { _id: null, total: { $sum: "$paidAmount" } } },
      ]),
    ]);
    const totalExpected = totalExpectedFees[0]?.total || 0;
    const totalCollected = totalCollectedFees[0]?.total || 0;
    const totalPending = totalExpected - totalCollected;

    // Teacher liabilities (what academy owes teachers — manual credits)
    const teacherLiabilities = await Teacher.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          totalFloating: { $sum: "$balance.floating" },
          totalVerified: { $sum: "$balance.verified" },
          totalPending: { $sum: "$balance.pending" },
        },
      },
    ]);
    const teacherOwed =
      (teacherLiabilities[0]?.totalFloating || 0) +
      (teacherLiabilities[0]?.totalVerified || 0) +
      (teacherLiabilities[0]?.totalPending || 0);

    // Total manual credits (LIABILITY transactions) this month
    const monthlyLiabilityResult = await Transaction.aggregate([
      { $match: { type: "LIABILITY", date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const monthlyLiabilities = monthlyLiabilityResult[0]?.total || 0;

    // Net Revenue = Total Cash In - Total Cash Out (Expenses only, not liabilities)
    const netRevenue = monthlyIncome - monthlyExpenses;

    return res.json({
      success: true,
      data: {
        // Core KPIs
        totalStudents,
        activeStudents,
        studentsByStatus,  // Student status breakdown
        totalTeachers,
        monthlyIncome,
        monthlyExpenses,
        todayIncome,
        floatingCash,

        // Fee stats
        totalExpected,
        totalCollected,
        totalPending,
        collectionRate:
          totalExpected > 0
            ? Math.round((totalCollected / totalExpected) * 100)
            : 0,

        // Teacher financials
        teacherOwed,
        monthlyLiabilities,

        // Owner summary (Cash-Based: Income minus actual Payouts)
        ownerNetRevenue: netRevenue,
        netProfit: netRevenue,

        // Legacy compat (frontend may still reference these)
        academyShare: monthlyIncome,
        chemistryRevenue: 0,
        pendingReimbursements: 0,
        poolRevenue: 0,
      },
    });
  } catch (error) {
    console.error("getDashboardStats Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// RECORD STUDENT MISC PAYMENT — Trip, Test, Lab, Event fees etc.
// =====================================================================
exports.recordStudentMiscPayment = async (req, res) => {
  try {
    const { studentId, amount, paymentType, description, paymentMethod } = req.body;

    if (!studentId || !amount || !paymentType) {
      return res.status(400).json({
        success: false,
        message: "Student, amount, and payment type are required.",
      });
    }

    const amountNum = Number(amount);
    if (amountNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0.",
      });
    }

    // Find the student
    const Student = require("../models/Student");
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    // Map payment types to Transaction categories
    const categoryMap = {
      trip: "Trip_Fee",
      test: "Test_Fee",
      lab: "Lab_Fee",
      library: "Library_Fee",
      sports: "Sports_Fee",
      event: "Event_Fee",
      misc: "Student_Misc",
    };

    const category = categoryMap[paymentType] || "Student_Misc";
    const paymentLabel = paymentType.charAt(0).toUpperCase() + paymentType.slice(1);

    // Generate receipt ID
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptId = `MISC-${student.studentId}-${dateStr}-${randomSuffix}`;

    // Create transaction in ledger
    const transaction = await Transaction.create({
      type: "INCOME",
      category,
      amount: amountNum,
      description: description || `${paymentLabel} fee from ${student.studentName} (${student.studentId})`,
      date: now,
      collectedBy: req.user._id,
      status: "FLOATING",
      studentId: student._id,
    });

    // Send notification to owner
    try {
      const Notification = require("../models/Notification");
      const User = require("../models/User");
      const owner = await User.findOne({ role: "OWNER" });

      if (owner) {
        await Notification.create({
          recipient: owner._id,
          recipientRole: "OWNER",
          message: `${paymentLabel} fee of PKR ${amountNum.toLocaleString()} collected from ${student.studentName} (${student.studentId})`,
          type: "FINANCE",
          relatedId: transaction._id.toString(),
        });
      }
    } catch (notifErr) {
      console.log("Notification skipped:", notifErr.message);
    }

    // Track collector's cash
    if (req.user?._id) {
      try {
        const User = require("../models/User");
        const collector = await User.findById(req.user._id);
        if (collector) {
          collector.totalCash = (collector.totalCash || 0) + amountNum;
          await collector.save();
        }
      } catch (e) {
        console.log("TotalCash update skipped:", e.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: `${paymentLabel} fee of PKR ${amountNum.toLocaleString()} collected from ${student.studentName}.`,
      data: {
        transaction,
        receiptData: {
          receiptId,
          studentId: student.studentId,
          studentName: student.studentName,
          fatherName: student.fatherName || "-",
          class: student.class || "-",
          contact: student.parentCell || student.studentCell || "-",
          paymentType: paymentLabel,
          category,
          amount: amountNum,
          description: description || `${paymentLabel} Fee`,
          paymentMethod: paymentMethod || "Cash",
          paymentDate: now,
          collectedBy: req.user?.fullName || "Staff",
        },
      },
    });
  } catch (error) {
    console.error("RecordStudentMiscPayment Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET STUDENT MISC PAYMENT HISTORY
// =====================================================================
exports.getStudentMiscPayments = async (req, res) => {
  try {
    const miscCategories = ["Trip_Fee", "Test_Fee", "Lab_Fee", "Library_Fee", "Sports_Fee", "Event_Fee", "Student_Misc"];

    const transactions = await Transaction.find({
      category: { $in: miscCategories },
    })
      .populate("studentId", "studentName studentId class fatherName parentCell")
      .populate("collectedBy", "fullName")
      .sort({ date: -1 })
      .limit(200);

    return res.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("GetStudentMiscPayments Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// RECORD TRANSACTION — Create a new income or expense transaction
// =====================================================================
exports.recordTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, date } = req.body;

    if (!type || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: "Type, category, and amount are required.",
      });
    }

    const transaction = await Transaction.create({
      type,
      category,
      amount: Number(amount),
      description: description || `${type}: ${category}`,
      date: date ? new Date(date) : new Date(),
      collectedBy: req.user._id,
      status: type === "EXPENSE" ? "VERIFIED" : "FLOATING",
    });

    return res.status(201).json({
      success: true,
      message: `${type} of PKR ${amount} recorded.`,
      data: transaction,
    });
  } catch (error) {
    console.error("RecordTransaction Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET FINANCE HISTORY — Unified chronological ledger
// =====================================================================
exports.getFinanceHistory = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, startDate, endDate } = req.query;

    let query = {};
    if (type && type !== "ALL") query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Also get expenses
    let expenseQuery = {};
    if (startDate || endDate) {
      expenseQuery.expenseDate = {};
      if (startDate) expenseQuery.expenseDate.$gte = new Date(startDate);
      if (endDate) expenseQuery.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(expenseQuery)
      .sort({ expenseDate: -1 })
      .lean();

    // Get teacher payments (payouts)
    let teacherPaymentQuery = {};
    if (startDate || endDate) {
      teacherPaymentQuery.paymentDate = {};
      if (startDate) teacherPaymentQuery.paymentDate.$gte = new Date(startDate);
      if (endDate) teacherPaymentQuery.paymentDate.$lte = new Date(endDate);
    }

    const teacherPayments = await TeacherPayment.find(teacherPaymentQuery)
      .sort({ paymentDate: -1 })
      .lean();

    // Merge and sort
    const combined = [
      ...transactions.map((t) => ({
        ...t,
        sortDate: t.date || t.createdAt,
        source: "transaction",
      })),
      ...expenses
        .filter(() => !type || type === "ALL" || type === "EXPENSE")
        .map((e) => ({
          ...e,
          type: "EXPENSE",
          amount: e.amount,
          description: e.title || e.description,
          category: e.category,
          date: e.expenseDate || e.createdAt,
          sortDate: e.expenseDate || e.createdAt,
          source: "expense",
        })),
      ...teacherPayments
        .filter(() => !type || type === "ALL" || type === "EXPENSE")
        .map((tp) => ({
          ...tp,
          type: "EXPENSE",
          amount: tp.amountPaid,
          description: `Teacher Payout: ${tp.teacherName} (${tp.subject}) - ${tp.voucherId}`,
          category: "Teacher Payout",
          date: tp.paymentDate,
          sortDate: tp.paymentDate,
          source: "teacher-payment",
          teacherPaymentId: tp._id,
          voucherId: tp.voucherId,
        })),
    ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));

    const total = await Transaction.countDocuments(query);

    return res.json({
      success: true,
      count: combined.length,
      total,
      data: combined,
    });
  } catch (error) {
    console.error("getFinanceHistory Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// PROCESS TEACHER PAYOUT — Owner pays teacher from verified balance
// =====================================================================
exports.processTeacherPayout = async (req, res) => {
  try {
    const { teacherId, amount, notes } = req.body;

    if (!teacherId || !amount) {
      return res.status(400).json({
        success: false,
        message: "teacherId and amount are required.",
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher not found." });
    }

    const payoutAmount = Number(amount);
    const compType = teacher.compensation?.type || "percentage";

    const verifiedBal = teacher.balance?.verified || 0;
    const floatingBal = teacher.balance?.floating || 0;
    const pendingBal = teacher.balance?.pending || 0;

    const availableBalance = pendingBal;

    if (payoutAmount > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: PKR ${availableBalance}`,
      });
    }

    const originalBalance = {
      verified: verifiedBal,
      floating: floatingBal,
      pending: pendingBal,
    };
    const originalTotalPaid = teacher.totalPaid || 0;

    teacher.balance.pending = pendingBal - payoutAmount;

    teacher.totalPaid = originalTotalPaid + payoutAmount;
    await teacher.save();

    const activeSession = await Session.findOne({ status: "active" })
      .sort({ startDate: -1 })
      .lean();

    let paymentRecord;
    try {
      paymentRecord = await TeacherPayment.create({
        teacherId: teacher._id,
        teacherName: teacher.name,
        subject: teacher.subject,
        amountPaid: payoutAmount,
        compensationType: compType,
        month: new Date().toLocaleString("en-US", { month: "long" }),
        year: new Date().getFullYear(),
        paymentMethod: "cash",
        status: "paid",
        notes: notes || "Teacher payout",
        sessionId: activeSession?._id,
        sessionName: activeSession?.sessionName,
      });
    } catch (paymentError) {
      teacher.balance.verified = originalBalance.verified;
      teacher.balance.floating = originalBalance.floating;
      teacher.balance.pending = originalBalance.pending;
      teacher.totalPaid = originalTotalPaid;
      await teacher.save();
      throw paymentError;
    }

    // Record payout transaction
    await Transaction.create({
      type: "EXPENSE",
      category: "Teacher Payout",
      amount: payoutAmount,
      description: `Payout to ${teacher.name}: PKR ${payoutAmount}${notes ? ` — ${notes}` : ""}`,
      date: new Date(),
      collectedBy: req.user._id,
      status: "VERIFIED",
      splitDetails: {
        teacherId: teacher._id,
        teacherName: teacher.name,
      },
    });

    // Notification
    try {
      await Notification.create({
        recipient: teacher._id,
        message: `Payout received: PKR ${payoutAmount}`,
        type: "FINANCE",
      });

      await Notification.create({
        recipient: req.user._id,
        message: `PKR ${payoutAmount} paid to ${teacher.name}.`,
        type: "FINANCE",
      });
    } catch (e) {
      /* non-critical */
    }

    return res.json({
      success: true,
      message: `PKR ${payoutAmount} paid to ${teacher.name}.`,
      data: {
        teacher: teacher.name,
        paid: payoutAmount,
        voucher: {
          voucherId: paymentRecord.voucherId,
          teacherName: paymentRecord.teacherName,
          subject: paymentRecord.subject,
          amountPaid: paymentRecord.amountPaid,
          paymentDate: paymentRecord.paymentDate,
          paymentMethod: paymentRecord.paymentMethod,
          notes: paymentRecord.notes,
          sessionName: paymentRecord.sessionName,
        },
        remainingBalance: teacher.balance?.pending || 0,
      },
    });
  } catch (error) {
    console.error("processTeacherPayout Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// PROCESS MANUAL PAYOUT — Owner gives advance/salary to any user
// =====================================================================
exports.processManualPayout = async (req, res) => {
  try {
    const { userId, amount, type: payoutType, notes } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: "userId and amount are required.",
      });
    }

    const payoutAmount = Number(amount);

    // Try finding as teacher first
    const teacher = await Teacher.findById(userId);
    if (teacher) {
      teacher.totalPaid = (teacher.totalPaid || 0) + payoutAmount;
      await teacher.save();

      await Transaction.create({
        type: "EXPENSE",
        category:
          payoutType === "advance" ? "Teacher Advance" : "Teacher Salary",
        amount: payoutAmount,
        description: `${payoutType || "Payout"} to ${teacher.name}: PKR ${amount}${notes ? ` — ${notes}` : ""}`,
        date: new Date(),
        collectedBy: req.user._id,
        status: "VERIFIED",
        splitDetails: { teacherId: teacher._id, teacherName: teacher.name },
      });

      return res.json({
        success: true,
        message: `PKR ${amount} paid to ${teacher.name} as ${payoutType || "payout"}.`,
      });
    }

    // Try as User
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.walletBalance = (user.walletBalance || 0) - payoutAmount;
    await user.save();

    await Transaction.create({
      type: "EXPENSE",
      category: payoutType === "advance" ? "Advance" : "Salary",
      amount: payoutAmount,
      description: `${payoutType || "Payout"} to ${user.fullName}: PKR ${amount}${notes ? ` — ${notes}` : ""}`,
      date: new Date(),
      collectedBy: req.user._id,
      status: "VERIFIED",
    });

    return res.json({
      success: true,
      message: `PKR ${amount} paid to ${user.fullName}.`,
    });
  } catch (error) {
    console.error("processManualPayout Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// UPDATE MANUAL BALANCE — Set what academy owes a user
// =====================================================================
exports.updateManualBalance = async (req, res) => {
  try {
    const { userId, amount, action } = req.body;

    if (!userId || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "userId and amount are required.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (action === "set") {
      user.manualBalance = Number(amount);
    } else {
      user.manualBalance = (user.manualBalance || 0) + Number(amount);
    }
    await user.save();

    return res.json({
      success: true,
      message: `Balance updated for ${user.fullName}: PKR ${user.manualBalance}`,
      data: { userId: user._id, manualBalance: user.manualBalance },
    });
  } catch (error) {
    console.error("updateManualBalance Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET TEACHER PAYROLL DATA — All teachers with balances
// =====================================================================
exports.getTeacherPayrollData = async (req, res) => {
  try {
    const teachers = await Teacher.find({ status: "active" })
      .select(
        "name subject teacherId balance totalPaid compensation profileImage",
      )
      .lean();

    const payrollData = teachers.map((t) => ({
      _id: t._id,
      teacherId: t.teacherId,
      name: t.name,
      subject: t.subject,
      profileImage: t.profileImage,
      compensation: t.compensation,
      balance: {
        floating: t.balance?.floating || 0,
        verified: t.balance?.verified || 0,
        pending: t.balance?.pending || 0,
        total:
          (t.balance?.floating || 0) +
          (t.balance?.verified || 0) +
          (t.balance?.pending || 0),
        payable:
          t.compensation?.type === "fixed"
            ? t.balance?.pending || 0
            : (t.balance?.floating || 0) + (t.balance?.verified || 0),
      },
      totalPaid: t.totalPaid || 0,
    }));

    return res.json({
      success: true,
      count: payrollData.length,
      data: payrollData,
    });
  } catch (error) {
    console.error("getTeacherPayrollData Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GET PAYOUT HISTORY — Transaction history for a specific user
// =====================================================================
exports.getPayoutHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const isOwner = req.user.role === "OWNER";

    if (!isOwner && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own payout history.",
      });
    }

    const payouts = await Transaction.find({
      $or: [
        { "splitDetails.teacherId": userId },
        {
          collectedBy: userId,
          type: "EXPENSE",
          category: {
            $in: [
              "Teacher Payout",
              "Teacher Advance",
              "Teacher Salary",
              "Advance",
              "Salary",
            ],
          },
        },
      ],
    })
      .sort({ date: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      count: payouts.length,
      data: payouts,
    });
  } catch (error) {
    console.error("getPayoutHistory Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// DELETE TRANSACTION
// =====================================================================
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    let doc = await Transaction.findByIdAndDelete(id);
    if (doc) {
      return res.json({
        success: true,
        message: "Transaction deleted.",
        data: doc,
      });
    }

    doc = await Expense.findByIdAndDelete(id);
    if (doc) {
      return res.json({
        success: true,
        message: "Expense deleted.",
        data: doc,
      });
    }

    return res
      .status(404)
      .json({ success: false, message: "Record not found." });
  } catch (error) {
    console.error("deleteTransaction Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// RESET SYSTEM — DANGER: Wipe all financial data (dev/testing only)
// =====================================================================
exports.resetSystem = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "System reset is disabled in production.",
      });
    }

    await Promise.all([
      Transaction.deleteMany({}),
      DailyClosing.deleteMany({}),
      FeeRecord.deleteMany({}),
      Expense.deleteMany({}),
      Notification.deleteMany({}),
    ]);

    await Teacher.updateMany(
      {},
      {
        $set: {
          "balance.floating": 0,
          "balance.verified": 0,
          "balance.pending": 0,
          totalPaid: 0,
        },
      },
    );

    await User.updateMany(
      {},
      { $set: { walletBalance: 0, totalCash: 0, manualBalance: 0 } },
    );

    await Student.updateMany(
      {},
      { $set: { paidAmount: 0, feeStatus: "Pending" } },
    );

    return res.json({
      success: true,
      message: "All financial data has been wiped. System is clean.",
    });
  } catch (error) {
    console.error("resetSystem Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// ANALYTICS DASHBOARD — Charts data for Owner
// =====================================================================
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Monthly Revenue & Expenses
    const [monthlyRevenue, monthlyExpenses] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: "INCOME", date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Transaction.aggregate([
        { $match: { type: "EXPENSE", date: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    const revenueVsExpenses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = `${monthNames[d.getMonth()]} ${year}`;
      const rev = monthlyRevenue.find(
        (r) => r._id.year === year && r._id.month === month,
      );
      const exp = monthlyExpenses.find(
        (e) => e._id.year === year && e._id.month === month,
      );
      revenueVsExpenses.push({
        month: label,
        revenue: rev ? rev.total : 0,
        expenses: exp ? exp.total : 0,
        profit: (rev ? rev.total : 0) - (exp ? exp.total : 0),
      });
    }

    // Student Enrollment Growth
    const studentGrowth = await Student.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          newStudents: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    let cumulativeStudents = await Student.countDocuments({
      createdAt: { $lt: sixMonthsAgo },
    });
    const enrollmentData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = `${monthNames[d.getMonth()]} ${year}`;
      const growth = studentGrowth.find(
        (g) => g._id.year === year && g._id.month === month,
      );
      const newCount = growth ? growth.newStudents : 0;
      cumulativeStudents += newCount;
      enrollmentData.push({
        month: label,
        newStudents: newCount,
        totalStudents: cumulativeStudents,
      });
    }

    // Fee Collection Status - Using Student feeStatus and paidAmount
    const feeStats = await Student.aggregate([
      { $match: { studentStatus: "Active" } },
      {
        $group: {
          _id: "$feeStatus",
          total: { $sum: "$paidAmount" },
          count: { $sum: 1 },
        },
      },
    ]);
    const feeCollection = {
      paid: { amount: 0, count: 0 },
      pending: { amount: 0, count: 0 },
    };
    feeStats.forEach((f) => {
      const key = f._id?.toLowerCase();
      if (key === "paid") {
        feeCollection.paid = { amount: f.total, count: f.count };
      } else if (key === "pending" || key === "partial") {
        // Combine pending and partial into one "Pending" category
        feeCollection.pending.amount += f.total;
        feeCollection.pending.count += f.count;
      }
    });

    // Expense Breakdown
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const expenseBreakdown = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: startOfMonth },
          status: { $ne: "REJECTED" },
        },
      },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);
    const expenseCategories = expenseBreakdown.map((e) => ({
      category: e._id || "Uncategorized",
      amount: e.total,
      count: e.count,
    }));

    // Quick Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tmr = new Date(today);
    tmr.setDate(tmr.getDate() + 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const [todayRev, weeklyRev, monthlyRev] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: "INCOME", date: { $gte: today, $lt: tmr } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { type: "INCOME", date: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Transaction.aggregate([
        { $match: { type: "INCOME", date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();

    return res.json({
      success: true,
      data: {
        revenueVsExpenses,
        enrollmentData,
        feeCollection,
        expenseCategories,
        quickStats: {
          todayRevenue: todayRev[0]?.total || 0,
          weeklyRevenue: weeklyRev[0]?.total || 0,
          monthlyRevenue: monthlyRev[0]?.total || 0,
          totalStudents,
          totalTeachers,
        },
      },
    });
  } catch (error) {
    console.error("Analytics Dashboard Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =====================================================================
// GENERATE FINANCIAL REPORT — Printable report for any period
// =====================================================================
exports.generateFinancialReport = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    let dateFilter = {};
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === "today") {
      const tmr = new Date(today);
      tmr.setDate(tmr.getDate() + 1);
      dateFilter = { $gte: today, $lt: tmr };
    } else if (period === "week") {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      dateFilter = { $gte: weekStart };
    } else if (period === "month") {
      dateFilter = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    } else if (period === "custom" && startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      dateFilter = { $gte: today };
    }

    const [revenueByCategory, expenseByCategory] = await Promise.all([
      Transaction.aggregate([
        { $match: { type: "INCOME", date: dateFilter } },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
      Transaction.aggregate([
        { $match: { type: "EXPENSE", date: dateFilter } },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    ]);

    const totalRevenue = revenueByCategory.reduce((s, r) => s + r.total, 0);
    const totalExpenses = expenseByCategory.reduce((s, e) => s + e.total, 0);

    const feesSummary = await FeeRecord.aggregate([
      { $match: { updatedAt: dateFilter, status: "PAID" } },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const periodLabels = {
      today: "Today's",
      week: "This Week's",
      month: "This Month's",
      custom: "Custom Period",
    };

    return res.json({
      success: true,
      data: {
        period: periodLabels[period] || "Today's",
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        revenueByCategory: revenueByCategory.map((r) => ({
          category: r._id || "Uncategorized",
          amount: r.total,
          transactions: r.count,
        })),
        expenseByCategory: expenseByCategory.map((e) => ({
          category: e._id || "Uncategorized",
          amount: e.total,
          transactions: e.count,
        })),
        feesCollected: {
          total: feesSummary[0]?.totalCollected || 0,
          count: feesSummary[0]?.count || 0,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Generate Report Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.distributeRevenue = async ({ studentId, paidAmount, feeRecordId }) => {
  try {
    const normalizeSubjectName = (value) => {
      if (!value) return "";
      if (typeof value === "string") return value.trim();
      if (typeof value === "object") {
        return (
          value.name ||
          value.subject ||
          value.subName ||
          value.title ||
          ""
        ).trim();
      }
      return "";
    };

    const normalizeSubjectList = (list) => {
      if (!Array.isArray(list)) return [];
      return list
        .map(normalizeSubjectName)
        .filter(Boolean)
        .map((s) => s.toLowerCase());
    };

    let resolvedStudentId = studentId;
    let resolvedPaidAmount = paidAmount;

    if (feeRecordId) {
      const feeRecord = await FeeRecord.findById(feeRecordId).lean();
      if (!feeRecord) {
        throw new Error("Fee record not found");
      }
      if (!resolvedStudentId) {
        resolvedStudentId = feeRecord.student;
      }
      if (!resolvedPaidAmount) {
        resolvedPaidAmount = feeRecord.amount;
      }
    }

    if (!resolvedStudentId) {
      throw new Error("Student reference is missing");
    }
    if (!resolvedPaidAmount || resolvedPaidAmount <= 0) {
      throw new Error("Paid amount is missing or invalid");
    }

    const student = await Student.findById(resolvedStudentId).lean();
    if (!student) {
      throw new Error("Student not found");
    }

    const config = await Configuration.findOne().lean();
    const teacherSharePct = config?.salaryConfig?.teacherShare ?? 70;
    const teacherPool = Math.floor(
      resolvedPaidAmount * (teacherSharePct / 100),
    );
    const academyShare = resolvedPaidAmount - teacherPool;

    const classQuery = student.classRef
      ? { _id: student.classRef }
      : { $or: [{ classTitle: student.class }, { gradeLevel: student.class }] };
    const classDoc = await Class.findOne(classQuery).lean();

    const enrolledSubjects = normalizeSubjectList(student.subjects || []);
    let subjectCandidates = enrolledSubjects;

    if (subjectCandidates.length === 0) {
      subjectCandidates = normalizeSubjectList(
        (classDoc?.subjectTeachers || []).map((entry) => entry.subject),
      );
    }
    if (subjectCandidates.length === 0) {
      subjectCandidates = normalizeSubjectList(classDoc?.subjects || []);
    }

    subjectCandidates = [...new Set(subjectCandidates)];

    let teacherUpdates = [];
    let transactionCreates = [];
    let sharePerSubject = 0;
    let unallocatedAmount = 0;
    let allocatedAmount = 0;

    if (subjectCandidates.length > 0) {
      sharePerSubject = Math.floor(teacherPool / subjectCandidates.length);

      const subjectTeacherMap = new Map();
      (classDoc?.subjectTeachers || []).forEach((entry) => {
        const subjectName = normalizeSubjectName(entry?.subject)
          .toLowerCase()
          .trim();
        if (!subjectName) return;
        const existing = subjectTeacherMap.get(subjectName) || [];
        existing.push(entry);
        subjectTeacherMap.set(subjectName, existing);
      });

      for (const subjectName of subjectCandidates) {
        const matchingEntries = subjectTeacherMap.get(subjectName) || [];
        const validEntries = matchingEntries.filter((e) => e?.teacherId);
        if (validEntries.length === 0) {
          console.log(
            `⚠️ No teacher for ${subjectName} - Funds diverted to Unallocated`,
          );
          unallocatedAmount += sharePerSubject;
          continue;
        }

        const perTeacherShare = Math.floor(
          sharePerSubject / validEntries.length,
        );

        for (const entry of validEntries) {
          const teacherId = entry.teacherId;
          const teacherName = entry.teacherName || "";
          const displaySubject =
            normalizeSubjectName(entry.subject) || subjectName;

          if (perTeacherShare > 0) {
            teacherUpdates.push({
              updateOne: {
                filter: { _id: teacherId },
                update: { $inc: { "balance.pending": perTeacherShare } },
              },
            });

            transactionCreates.push({
              type: "CREDIT",
              category: "Teacher Share",
              amount: perTeacherShare,
              description: `Credit: Share from ${student.studentName} - ${displaySubject}`,
              date: new Date(),
              status: "VERIFIED",
              splitDetails: {
                teacherId: teacherId,
                teacherName: teacherName,
                studentId: resolvedStudentId,
                studentName: student.studentName,
                subject: displaySubject,
                shareType: "SESSION_SPLIT",
              },
            });
            allocatedAmount += perTeacherShare;
          }
        }

        const remainderForSubject =
          sharePerSubject - perTeacherShare * validEntries.length;
        if (remainderForSubject > 0) {
          unallocatedAmount += remainderForSubject;
        }
      }
    } else if (classDoc?.assignedTeacher) {
      const classTeacher = await Teacher.findById(
        classDoc.assignedTeacher,
      ).lean();
      if (classTeacher) {
        sharePerSubject = teacherPool;
        teacherUpdates.push({
          updateOne: {
            filter: { _id: classTeacher._id },
            update: { $inc: { "balance.pending": teacherPool } },
          },
        });

        transactionCreates.push({
          type: "CREDIT",
          category: "Teacher Share",
          amount: teacherPool,
          description: `Credit: Share from ${student.studentName} - Class Teacher`,
          date: new Date(),
          status: "VERIFIED",
          splitDetails: {
            teacherId: classTeacher._id,
            teacherName: classTeacher.name,
            studentId: resolvedStudentId,
            studentName: student.studentName,
            shareType: "CLASS_TEACHER_FALLBACK",
          },
        });
        allocatedAmount = teacherPool;
      }
    } else {
      unallocatedAmount = teacherPool;
    }

    const totalAllocated = allocatedAmount + unallocatedAmount;
    if (teacherPool > totalAllocated) {
      unallocatedAmount += teacherPool - totalAllocated;
    }

    if (unallocatedAmount > 0) {
      transactionCreates.push({
        type: "CREDIT",
        category: "Unallocated Pool",
        amount: unallocatedAmount,
        description: `Unallocated teacher share from ${student.studentName}`,
        date: new Date(),
        status: "VERIFIED",
        splitDetails: {
          studentId: resolvedStudentId,
          studentName: student.studentName,
          shareType: "UNALLOCATED_POOL",
        },
      });
    }

    if (teacherUpdates.length > 0) {
      await Teacher.bulkWrite(teacherUpdates);
    }

    if (transactionCreates.length > 0) {
      await Transaction.insertMany(transactionCreates);
    }

    await Transaction.create({
      type: "INCOME",
      category: "Academy Share",
      amount: academyShare,
      description: `Academy share from ${student.studentName}`,
      date: new Date(),
      status: "VERIFIED",
      splitDetails: {
        studentId: resolvedStudentId,
        studentName: student.studentName,
        shareType: "ACADEMY_SPLIT",
      },
    });

    return {
      success: true,
      teacherPool,
      academyShare,
      teachersCount: teacherUpdates.length,
      sharePerTeacher: sharePerSubject,
      unallocatedAmount,
      teacherUpdates: teacherUpdates.length,
      transactionsCreated: transactionCreates.length + 1,
    };
  } catch (error) {
    console.error("Revenue distribution error:", error);
    throw error;
  }
};
