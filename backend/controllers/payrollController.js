const PayoutRequest = require("../models/PayoutRequest");
const Teacher = require("../models/Teacher");
const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");
const Configuration = require("../models/Configuration");
const User = require("../models/User");
const Notification = require("../models/Notification");
const TeacherDeposit = require("../models/TeacherDeposit");
const FeeRecord = require("../models/FeeRecord");

// @desc    Teacher requests a cash payout
// @route   POST /api/payroll/request
// @access  Protected (Teacher)
exports.createPayoutRequest = async (req, res) => {
  try {
    const { teacherId, amount } = req.body;

    // Validate input
    if (!teacherId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID and valid amount are required",
      });
    }

    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Check if teacher has sufficient verified balance
    const verifiedBalance = teacher.balance?.verified || 0;
    if (verifiedBalance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: PKR ${verifiedBalance.toLocaleString()}`,
      });
    }

    // Check for existing pending request
    const existingRequest = await PayoutRequest.findOne({
      teacherId: teacher._id,
      status: "PENDING",
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: `You already have a pending request for PKR ${existingRequest.amount.toLocaleString()}. Please wait for approval.`,
      });
    }

    // Create payout request
    const payoutRequest = await PayoutRequest.create({
      teacherId: teacher._id,
      teacherName: teacher.name,
      amount: amount,
      status: "PENDING",
      requestDate: new Date(),
    });

    // Notify Owner about new payout request
    const owners = await User.find({ role: "OWNER" });
    for (const owner of owners) {
      await Notification.create({
        recipient: owner._id,
        message: `🏦 ${teacher.name} has requested a cash payout of PKR ${amount.toLocaleString()}`,
        type: "FINANCE",
        relatedId: payoutRequest._id.toString(),
      });
    }

    return res.status(201).json({
      success: true,
      message: `✅ Payout request for PKR ${amount.toLocaleString()} submitted successfully`,
      data: payoutRequest,
    });
  } catch (error) {
    console.error("❌ Error in createPayoutRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating payout request",
      error: error.message,
    });
  }
};

// @desc    Get all payout requests
// @route   GET /api/payroll/requests
// @access  Protected (OWNER only)
exports.getAllPayoutRequests = async (req, res) => {
  try {
    const { status, teacherId } = req.query;

    const query = {};
    if (status) query.status = status;
    if (teacherId) query.teacherId = teacherId;

    const requests = await PayoutRequest.find(query)
      .populate("teacherId", "name phone subject balance")
      .populate("approvedBy", "fullName")
      .sort({ requestDate: -1 });

    // Calculate summary stats
    const pendingCount = await PayoutRequest.countDocuments({
      status: "PENDING",
    });
    const pendingTotal = await PayoutRequest.aggregate([
      { $match: { status: "PENDING" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    return res.status(200).json({
      success: true,
      count: requests.length,
      summary: {
        pendingCount,
        pendingTotal: pendingTotal[0]?.total || 0,
      },
      data: requests,
    });
  } catch (error) {
    console.error("❌ Error in getAllPayoutRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payout requests",
      error: error.message,
    });
  }
};

// @desc    Get teacher's own payout requests
// @route   GET /api/payroll/my-requests/:teacherId
// @access  Protected
exports.getTeacherPayoutRequests = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const requests = await PayoutRequest.find({ teacherId })
      .sort({ requestDate: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("❌ Error in getTeacherPayoutRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payout requests",
      error: error.message,
    });
  }
};

// @desc    Approve a payout request (OWNER only)
// @route   POST /api/payroll/approve/:requestId
// @access  Protected (OWNER only)
exports.approvePayoutRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;

    // Find the request
    const payoutRequest = await PayoutRequest.findById(requestId);
    if (!payoutRequest) {
      return res.status(404).json({
        success: false,
        message: "Payout request not found",
      });
    }

    if (payoutRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${payoutRequest.status.toLowerCase()}`,
      });
    }

    // Find the teacher
    const teacher = await Teacher.findById(payoutRequest.teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Verify teacher still has sufficient balance
    const verifiedBalance = teacher.balance?.verified || 0;
    if (verifiedBalance < payoutRequest.amount) {
      return res.status(400).json({
        success: false,
        message: `Teacher's balance has changed. Available: PKR ${verifiedBalance.toLocaleString()}, Requested: PKR ${payoutRequest.amount.toLocaleString()}`,
      });
    }

    // ========================================
    // APPROVAL LOGIC
    // ========================================

    // 1. Deduct amount from teacher's verified balance
    teacher.balance.verified = verifiedBalance - payoutRequest.amount;
    await teacher.save();

    // 2. Create a Transaction of type EXPENSE with category SALARY
    const transaction = await Transaction.create({
      type: "EXPENSE",
      category: "Salaries",
      subCategory: "Teacher Payout",
      amount: payoutRequest.amount,
      description: `Salary payout to ${teacher.name}`,
      collectedBy: req.user._id,
      status: "VERIFIED",
      date: new Date(),
      metadata: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        payoutRequestId: payoutRequest._id,
      },
    });

    // 3. Create an Expense record for tracking
    const config = await Configuration.findOne();
    const splitRatio = config?.expenseSplit || {
      waqar: 40,
      zahid: 30,
      saud: 30,
    };

    // Find partners and calculate shares
    const partners = await User.find({
      role: { $in: ["OWNER", "PARTNER"] },
      isActive: { $ne: false },
    });

    const shares = [];
    for (const partner of partners) {
      const nameKey = partner.fullName.toLowerCase();
      let percentage = 0;

      if (nameKey.includes("waqar")) percentage = splitRatio.waqar;
      else if (nameKey.includes("zahid")) percentage = splitRatio.zahid;
      else if (nameKey.includes("saud")) percentage = splitRatio.saud;

      if (percentage > 0) {
        const shareAmount = Math.round(
          (payoutRequest.amount * percentage) / 100,
        );
        shares.push({
          partner: partner._id,
          partnerName: partner.fullName,
          amount: shareAmount,
          percentage,
          status: "PAID", // Already paid from teacher earnings
        });

        // Deduct from partner's wallet
        if (
          partner.walletBalance &&
          typeof partner.walletBalance === "object"
        ) {
          partner.walletBalance.verified =
            (partner.walletBalance.verified || 0) - shareAmount;
          await partner.save();
        }
      }
    }

    const expense = await Expense.create({
      title: `Salary: ${teacher.name}`,
      category: "Salaries",
      amount: payoutRequest.amount,
      vendorName: teacher.name,
      dueDate: new Date(),
      expenseDate: new Date(),
      status: "paid",
      paidDate: new Date(),
      description: `Approved payout request ${payoutRequest.requestId}`,
      splitRatio,
      shares,
    });

    // 4. Update the payout request
    payoutRequest.status = "APPROVED";
    payoutRequest.approvedBy = req.user._id;
    payoutRequest.approvedAt = new Date();
    payoutRequest.approvalNotes = notes || "Approved by Owner";
    payoutRequest.transactionId = transaction._id;
    await payoutRequest.save();

    // 5. Notify the teacher
    await Notification.create({
      recipient: teacher._id,
      message: `✅ Your payout request of PKR ${payoutRequest.amount.toLocaleString()} has been APPROVED! Cash is ready for collection.`,
      type: "FINANCE",
      relatedId: payoutRequest._id.toString(),
    });

    return res.status(200).json({
      success: true,
      message: `✅ Payout of PKR ${payoutRequest.amount.toLocaleString()} to ${teacher.name} approved successfully`,
      data: {
        payoutRequest,
        transaction,
        expense,
        newTeacherBalance: teacher.balance.verified,
      },
    });
  } catch (error) {
    console.error("❌ Error in approvePayoutRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while approving payout request",
      error: error.message,
    });
  }
};

// @desc    Reject a payout request (OWNER only)
// @route   POST /api/payroll/reject/:requestId
// @access  Protected (OWNER only)
exports.rejectPayoutRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const payoutRequest = await PayoutRequest.findById(requestId);
    if (!payoutRequest) {
      return res.status(404).json({
        success: false,
        message: "Payout request not found",
      });
    }

    if (payoutRequest.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${payoutRequest.status.toLowerCase()}`,
      });
    }

    // Update request
    payoutRequest.status = "REJECTED";
    payoutRequest.rejectedBy = req.user._id;
    payoutRequest.rejectedAt = new Date();
    payoutRequest.rejectionReason = reason || "Rejected by Owner";
    await payoutRequest.save();

    // Notify the teacher
    const teacher = await Teacher.findById(payoutRequest.teacherId);
    if (teacher) {
      await Notification.create({
        recipient: teacher._id,
        message: `❌ Your payout request of PKR ${payoutRequest.amount.toLocaleString()} was rejected. Reason: ${reason || "No reason provided"}`,
        type: "FINANCE",
        relatedId: payoutRequest._id.toString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: `Payout request rejected`,
      data: payoutRequest,
    });
  } catch (error) {
    console.error("❌ Error in rejectPayoutRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while rejecting payout request",
      error: error.message,
    });
  }
};

// @desc    Get payroll dashboard stats
// @route   GET /api/payroll/dashboard
// @access  Protected (OWNER only)
exports.getPayrollDashboard = async (req, res) => {
  try {
    // Pending requests summary
    const pendingRequests = await PayoutRequest.find({ status: "PENDING" })
      .populate("teacherId", "name phone subject balance")
      .sort({ requestDate: -1 });

    const pendingTotal = pendingRequests.reduce((sum, r) => sum + r.amount, 0);

    // This month's approved payouts
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyApproved = await PayoutRequest.aggregate([
      {
        $match: {
          status: "APPROVED",
          approvedAt: { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    // All teachers with balances
    const teachersWithBalances = await Teacher.find({
      "balance.verified": { $gt: 0 },
    }).select("name subject balance");

    const totalTeacherLiability = teachersWithBalances.reduce(
      (sum, t) => sum + (t.balance?.verified || 0),
      0,
    );

    return res.status(200).json({
      success: true,
      data: {
        pendingRequests,
        pendingTotal,
        monthlyApproved: {
          total: monthlyApproved[0]?.total || 0,
          count: monthlyApproved[0]?.count || 0,
        },
        teachersWithBalances,
        totalTeacherLiability,
      },
    });
  } catch (error) {
    console.error("❌ Error in getPayrollDashboard:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching payroll dashboard",
      error: error.message,
    });
  }
};

// =====================================================================
// TEACHER DEPOSITS - Arbitrary Payments (Advance, Bonus, Reimbursement)
// =====================================================================

// @desc    Deposit arbitrary amount to teacher
// @route   POST /api/payroll/deposit
// @access  Protected (OWNER only)
exports.createTeacherDeposit = async (req, res) => {
  try {
    const { teacherId, amount, depositType, reason, paymentMethod } = req.body;

    // Validation
    if (!teacherId || !amount || amount <= 0 || !reason) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID, valid amount, and reason are required",
      });
    }

    // Find teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Create deposit record
    const deposit = await TeacherDeposit.create({
      teacherId: teacher._id,
      teacherName: teacher.name,
      amount,
      depositType: depositType || "OTHER",
      reason,
      depositedBy: req.user._id,
      depositedByName: req.user.fullName,
      paymentMethod: paymentMethod || "CASH",
      status: "COMPLETED",
    });

    // Update teacher's balance
    if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
    
    // Deposits go directly to verified balance (already given cash)
    teacher.balance.verified = (teacher.balance.verified || 0) + amount;
    await teacher.save();

    // Create transaction record
    const transaction = await Transaction.create({
      type: "EXPENSE",
      category: depositType === "ADVANCE" ? "Teacher Advance" : depositType === "BONUS" ? "Teacher Credit" : "Miscellaneous",
      subCategory: "Teacher Deposit",
      amount,
      description: `${depositType || "Deposit"} to ${teacher.name}: ${reason}`,
      collectedBy: req.user._id,
      status: "VERIFIED",
      date: new Date(),
      metadata: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        depositId: deposit._id,
        depositType,
      },
    });

    // Update deposit with transaction reference
    deposit.transactionId = transaction._id;
    await deposit.save();

    // Notify teacher
    await Notification.create({
      recipient: teacher._id,
      message: `💰 You received a ${depositType || "deposit"} of PKR ${amount.toLocaleString()} from ${req.user.fullName}. Reason: ${reason}`,
      type: "FINANCE",
      relatedId: deposit._id.toString(),
    });

    return res.status(201).json({
      success: true,
      message: `Deposited PKR ${amount.toLocaleString()} to ${teacher.name}`,
      data: {
        deposit,
        transaction,
        newBalance: teacher.balance.verified,
      },
    });
  } catch (error) {
    console.error("❌ Error in createTeacherDeposit:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating deposit",
      error: error.message,
    });
  }
};

// @desc    Get deposit history for a teacher
// @route   GET /api/payroll/deposits/:teacherId
// @access  Protected (OWNER only)
exports.getTeacherDeposits = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { limit = 50 } = req.query;

    const deposits = await TeacherDeposit.getDepositsForTeacher(teacherId, {
      limit: parseInt(limit),
    });

    const totalStats = await TeacherDeposit.getTotalDeposited(teacherId);

    return res.status(200).json({
      success: true,
      data: {
        deposits,
        summary: {
          totalDeposited: totalStats.total,
          depositCount: totalStats.count,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getTeacherDeposits:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching deposits",
      error: error.message,
    });
  }
};

// @desc    Reverse a deposit (in case of mistake)
// @route   POST /api/payroll/deposits/:depositId/reverse
// @access  Protected (OWNER only)
exports.reverseTeacherDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const { reason } = req.body;

    const deposit = await TeacherDeposit.findById(depositId);
    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: "Deposit not found",
      });
    }

    if (deposit.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: `Cannot reverse deposit with status: ${deposit.status}`,
      });
    }

    // Find teacher and deduct balance
    const teacher = await Teacher.findById(deposit.teacherId);
    if (teacher) {
      teacher.balance.verified = Math.max(0, (teacher.balance.verified || 0) - deposit.amount);
      await teacher.save();
    }

    // Reverse the deposit
    await deposit.reverse(req.user, reason || "Reversed by Owner");

    // Create reversal transaction
    await Transaction.create({
      type: "INCOME",
      category: "Reversal",
      subCategory: "Deposit Reversal",
      amount: deposit.amount,
      description: `Reversal of deposit to ${deposit.teacherName}: ${reason || "No reason provided"}`,
      collectedBy: req.user._id,
      status: "VERIFIED",
      date: new Date(),
      metadata: {
        teacherId: deposit.teacherId,
        teacherName: deposit.teacherName,
        originalDepositId: deposit._id,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Deposit of PKR ${deposit.amount.toLocaleString()} reversed`,
      data: {
        deposit,
        newBalance: teacher?.balance?.verified || 0,
      },
    });
  } catch (error) {
    console.error("❌ Error in reverseTeacherDeposit:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while reversing deposit",
      error: error.message,
    });
  }
};

// @desc    Get teacher earnings breakdown (detailed)
// @route   GET /api/payroll/teacher-earnings/:teacherId
// @access  Protected (OWNER only)
exports.getTeacherEarningsBreakdown = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;

    const teacher = await Teacher.findById(teacherId).lean();
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get fee records where this teacher received a share
    const feeRecords = await FeeRecord.find({
      $or: [
        { teacher: teacherId },
        { "teachers.teacherId": teacherId },
      ],
      ...dateFilter,
    })
      .select("amount studentName className subject subjectBreakdown createdAt splitBreakdown teachers totalDiscountBreakdown")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Calculate earnings by class and subject
    const earningsByClass = {};
    const earningsBySubject = {};
    let totalEarnings = 0;
    let totalDiscountImpact = 0;

    for (const fee of feeRecords) {
      // Check subject breakdown for this teacher's share
      for (const sb of (fee.subjectBreakdown || [])) {
        if (sb.teacherId?.toString() === teacherId) {
          const amount = sb.teacherShare || 0;
          totalEarnings += amount;

          // Track discount impact
          if (sb.teacherShareReduction > 0) {
            totalDiscountImpact += sb.teacherShareReduction;
          }

          // By class
          const className = fee.className || "Unknown";
          if (!earningsByClass[className]) {
            earningsByClass[className] = { className, total: 0, count: 0, records: [] };
          }
          earningsByClass[className].total += amount;
          earningsByClass[className].count++;
          earningsByClass[className].records.push({
            studentName: fee.studentName,
            subject: sb.subject,
            amount,
            originalAmount: sb.teacherShareBeforeDiscount || amount,
            discountReduction: sb.teacherShareReduction || 0,
            date: fee.createdAt,
          });

          // By subject
          const subject = sb.subject || "Unknown";
          if (!earningsBySubject[subject]) {
            earningsBySubject[subject] = { subject, total: 0, count: 0 };
          }
          earningsBySubject[subject].total += amount;
          earningsBySubject[subject].count++;
        }
      }
    }

    // Get deposit history
    const deposits = await TeacherDeposit.getDepositsForTeacher(teacherId, { limit: 20 });
    const depositTotal = await TeacherDeposit.getTotalDeposited(teacherId);

    // Get payout history
    const payouts = await PayoutRequest.find({
      teacherId,
      status: "APPROVED",
      ...dateFilter,
    })
      .select("amount approvedAt approvalNotes")
      .sort({ approvedAt: -1 })
      .limit(20)
      .lean();

    const payoutTotal = payouts.reduce((sum, p) => sum + p.amount, 0);

    return res.status(200).json({
      success: true,
      data: {
        teacher: {
          _id: teacher._id,
          name: teacher.name,
          subject: teacher.subject,
          balance: teacher.balance,
        },
        earnings: {
          total: totalEarnings,
          discountImpact: totalDiscountImpact,
          byClass: Object.values(earningsByClass).sort((a, b) => b.total - a.total),
          bySubject: Object.values(earningsBySubject).sort((a, b) => b.total - a.total),
        },
        deposits: {
          records: deposits,
          total: depositTotal.total,
          count: depositTotal.count,
        },
        payouts: {
          records: payouts,
          total: payoutTotal,
          count: payouts.length,
        },
        netPosition: {
          earned: totalEarnings,
          deposited: depositTotal.total,
          paidOut: payoutTotal,
          currentBalance: (teacher.balance?.floating || 0) + (teacher.balance?.verified || 0),
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getTeacherEarningsBreakdown:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching earnings breakdown",
      error: error.message,
    });
  }
};
