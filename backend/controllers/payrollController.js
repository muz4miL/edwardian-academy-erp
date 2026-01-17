const PayoutRequest = require("../models/PayoutRequest");
const Teacher = require("../models/Teacher");
const Transaction = require("../models/Transaction");
const Expense = require("../models/Expense");
const Configuration = require("../models/Configuration");
const User = require("../models/User");
const Notification = require("../models/Notification");

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
