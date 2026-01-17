const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const Configuration = require("../models/Configuration");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Settlement = require("../models/Settlement");

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { category, startDate, endDate, limit } = req.query;

    let query = {};

    // Filter by category
    if (category && category !== "all") {
      query.category = category;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .sort({ expenseDate: -1 })
      .limit(limit ? parseInt(limit) : 100);

    // Calculate total for PAID expenses only
    const totalResult = await Expense.aggregate([
      { $match: { ...query, status: "paid" } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]);

    res.json({
      success: true,
      count: expenses.length,
      totalAmount: totalResult[0]?.totalAmount || 0,
      data: expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching expenses",
      error: error.message,
    });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching expense",
      error: error.message,
    });
  }
});

// @route   POST /api/expenses
// @desc    Create new expense with automatic partnership split
// @access  Public
router.post("/", async (req, res) => {
  try {
    console.log("📝 Expense creation request received:", req.body);

    const {
      title,
      category,
      amount,
      vendorName,
      dueDate,
      expenseDate,
      description,
      billNumber,
      paidByType = "ACADEMY_CASH", // NEW: Who actually paid for this
    } = req.body;

    // Validation
    if (!title || !category || !amount || !vendorName || !dueDate) {
      console.log("❌ Validation failed - missing fields");
      return res.status(400).json({
        success: false,
        message:
          "Please provide title, category, amount, vendor name, and due date",
      });
    }

    // ========================================
    // DYNAMIC PARTNERSHIP SPLIT LOGIC
    // ========================================

    // 1. Fetch expense split percentages from Configuration
    let splitRatio = { waqar: 40, zahid: 30, saud: 30 }; // Defaults
    const config = await Configuration.findOne();
    if (config && config.expenseSplit) {
      splitRatio = {
        waqar: config.expenseSplit.waqar || 40,
        zahid: config.expenseSplit.zahid || 30,
        saud: config.expenseSplit.saud || 30,
      };
      console.log(
        "📊 Using dynamic expense split from Configuration:",
        splitRatio,
      );
    }

    // 2. Find all partners (OWNER + PARTNER roles)
    const partners = await User.find({
      role: { $in: ["OWNER", "PARTNER"] },
      isActive: { $ne: false },
    });

    // 3. Calculate shares for each partner
    const parsedAmount = parseFloat(amount);
    const shares = [];
    let hasPartnerDebt = false;
    let payingPartnerId = null;
    let payingPartnerName = null;

    // Identify who paid if it's a partner (not academy cash)
    if (paidByType !== "ACADEMY_CASH") {
      const payerPartner = partners.find((p) => {
        const name = p.fullName.toLowerCase();
        return (
          (paidByType === "WAQAR" && name.includes("waqar")) ||
          (paidByType === "ZAHID" && name.includes("zahid")) ||
          (paidByType === "SAUD" && name.includes("saud"))
        );
      });
      if (payerPartner) {
        payingPartnerId = payerPartner._id;
        payingPartnerName = payerPartner.fullName;
      }
    }

    for (const partner of partners) {
      const nameKey = partner.fullName.toLowerCase();
      let percentage = 0;
      let partnerKey = null;

      if (nameKey.includes("waqar")) {
        percentage = splitRatio.waqar;
        partnerKey = "waqar";
      } else if (nameKey.includes("zahid")) {
        percentage = splitRatio.zahid;
        partnerKey = "zahid";
      } else if (nameKey.includes("saud")) {
        percentage = splitRatio.saud;
        partnerKey = "saud";
      }

      if (percentage > 0) {
        const shareAmount = Math.round((parsedAmount * percentage) / 100);

        // Determine the status of this share based on who paid
        let shareStatus = "UNPAID";

        if (paidByType === "ACADEMY_CASH") {
          // Academy paid - everyone's share is from academy funds
          shareStatus = "N/A"; // Not applicable - no inter-partner debt
        } else if (paidByType.toUpperCase() === partnerKey?.toUpperCase()) {
          // This partner paid the expense - their share is automatically "PAID"
          shareStatus = "PAID";
        } else {
          // Another partner paid - this partner owes them money
          shareStatus = "UNPAID";
          hasPartnerDebt = true;

          // Update the partner's debtToOwner if Sir Waqar paid
          if (paidByType === "WAQAR") {
            partner.debtToOwner = (partner.debtToOwner || 0) + shareAmount;
            await partner.save();
            console.log(
              `💳 Added PKR ${shareAmount} debt for ${partner.fullName} → Sir Waqar`,
            );
          }
        }

        shares.push({
          partner: partner._id,
          partnerName: partner.fullName,
          partnerKey,
          amount: shareAmount,
          percentage: percentage,
          status: shareStatus,
        });

        // 4. Only deduct from wallets if ACADEMY paid (normal flow)
        if (paidByType === "ACADEMY_CASH") {
          if (
            partner.walletBalance &&
            typeof partner.walletBalance === "object"
          ) {
            partner.walletBalance.verified =
              (partner.walletBalance.verified || 0) - shareAmount;
            await partner.save();
            console.log(
              `💸 Deducted PKR ${shareAmount} from ${partner.fullName}'s wallet`,
            );
          }
        }

        // 5. Create notification for partner
        const notificationMessage =
          paidByType === "ACADEMY_CASH"
            ? `💰 New expense "${title}": Your share is PKR ${shareAmount.toLocaleString()} (${percentage}% of PKR ${parsedAmount.toLocaleString()})`
            : `💳 ${payingPartnerName || paidByType} paid for "${title}": Your share is PKR ${shareAmount.toLocaleString()} (${percentage}%)`;

        await Notification.create({
          recipient: partner._id,
          message: notificationMessage,
          type: "FINANCE",
        });
      }
    }

    const expenseData = {
      title,
      category,
      amount: parsedAmount,
      vendorName,
      dueDate: new Date(dueDate),
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      description,
      billNumber,
      status: "pending",
      paidByType,
      paidBy: payingPartnerId,
      splitRatio,
      shares,
      hasPartnerDebt,
    };

    console.log("💾 Creating expense with data:", expenseData);

    const expense = new Expense(expenseData);
    await expense.save();

    console.log("✅ Expense created successfully:", expense._id);

    res.status(201).json({
      success: true,
      message:
        paidByType === "ACADEMY_CASH"
          ? "Expense created successfully with partnership split"
          : `Expense recorded - Paid by ${paidByType}. Partner debts generated.`,
      data: expense,
      shares: shares.map((s) => ({
        partner: s.partnerName,
        amount: s.amount,
        percentage: s.percentage,
        status: s.status,
      })),
      debtGenerated: hasPartnerDebt,
    });
  } catch (error) {
    console.error("❌ Expense creation error:", error.message);
    console.error("Stack:", error.stack);
    res.status(400).json({
      success: false,
      message: "Error creating expense",
      error: error.message,
    });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Public
router.put("/:id", async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating expense",
      error: error.message,
    });
  }
});

// @route   PATCH /api/expenses/:id/mark-paid
// @desc    Mark expense as paid
// @access  Public
router.patch("/:id/mark-paid", async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (expense.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Expense is already marked as paid",
      });
    }

    expense.status = "paid";
    expense.paidDate = new Date();

    await expense.save();

    res.json({
      success: true,
      message: "Expense marked as paid successfully",
      data: expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking expense as paid",
      error: error.message,
    });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Public
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.json({
      success: true,
      message: "Expense deleted successfully",
      data: expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting expense",
      error: error.message,
    });
  }
});

// ================================================
// SETTLEMENT ROUTES - Inter-Partner Debt Management
// ================================================

// @route   GET /api/expenses/settlements/overview
// @desc    Get settlement overview (debts owed to owner)
// @access  Public (should be OWNER only in production)
router.get("/settlements/overview", async (req, res) => {
  try {
    // Get all partners
    const partners = await User.find({
      role: "PARTNER",
      isActive: { $ne: false },
    }).select("fullName debtToOwner walletBalance");

    // Get summary of debts from expenses
    const expensesWithDebt = await Expense.find({
      paidByType: "WAQAR",
      hasPartnerDebt: true,
    }).populate("shares.partner", "fullName");

    // Calculate per-partner stats
    const partnerStats = {};
    for (const partner of partners) {
      const name = partner.fullName.toLowerCase();
      let key = null;
      if (name.includes("zahid")) key = "zahid";
      else if (name.includes("saud")) key = "saud";

      if (key) {
        // Get unpaid shares for this partner
        let unpaidTotal = 0;
        let paidTotal = 0;
        const unpaidExpenses = [];
        const paidExpenses = [];

        for (const expense of expensesWithDebt) {
          const share = expense.shares.find(
            (s) => s.partner?.toString() === partner._id.toString(),
          );
          if (share) {
            if (share.status === "UNPAID") {
              unpaidTotal += share.amount;
              unpaidExpenses.push({
                expenseId: expense._id,
                title: expense.title,
                amount: share.amount,
                date: expense.expenseDate,
              });
            } else if (share.status === "PAID") {
              paidTotal += share.amount;
              paidExpenses.push({
                expenseId: expense._id,
                title: expense.title,
                amount: share.amount,
                date: expense.expenseDate,
                paidAt: share.paidAt,
              });
            }
          }
        }

        partnerStats[key] = {
          partnerId: partner._id,
          partnerName: partner.fullName,
          debtToOwner: partner.debtToOwner || 0,
          unpaidTotal,
          paidTotal,
          unpaidCount: unpaidExpenses.length,
          paidCount: paidExpenses.length,
          unpaidExpenses,
          paidExpenses,
        };
      }
    }

    // Get settlement history
    const settlements = await Settlement.find({ status: "COMPLETED" })
      .sort({ date: -1 })
      .limit(20)
      .populate("partnerId", "fullName")
      .populate("recordedBy", "fullName");

    const totalReceivable = Object.values(partnerStats).reduce(
      (sum, p) => sum + (p.unpaidTotal || 0),
      0,
    );

    res.json({
      success: true,
      data: {
        totalReceivable,
        partners: partnerStats,
        recentSettlements: settlements,
      },
    });
  } catch (error) {
    console.error("❌ Settlement overview error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching settlement overview",
      error: error.message,
    });
  }
});

// @route   POST /api/expenses/settlements/record
// @desc    Record a repayment from partner to owner
// @access  Public (should be OWNER only in production)
router.post("/settlements/record", async (req, res) => {
  try {
    const {
      partnerId,
      amount,
      method = "CASH",
      notes,
      expenseIds, // Optional: specific expenses to settle
    } = req.body;

    // Validation
    if (!partnerId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Partner ID and amount are required",
      });
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    // Find the partner
    const partner = await User.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner not found",
      });
    }

    // Find owner (Sir Waqar)
    const owner = await User.findOne({ role: "OWNER" });
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Owner not found",
      });
    }

    // Create settlement record
    const settlement = await Settlement.create({
      partnerId: partner._id,
      partnerName: partner.fullName,
      amount: parsedAmount,
      date: new Date(),
      method,
      notes,
      recordedBy: owner._id,
      status: "COMPLETED",
    });

    // Reduce partner's debtToOwner
    const oldDebt = partner.debtToOwner || 0;
    partner.debtToOwner = Math.max(0, oldDebt - parsedAmount);
    await partner.save();

    // Mark specific expense shares as PAID if expenseIds provided
    let settledExpenses = [];
    if (expenseIds && expenseIds.length > 0) {
      for (const expenseId of expenseIds) {
        const expense = await Expense.findById(expenseId);
        if (expense) {
          const shareIndex = expense.shares.findIndex(
            (s) => s.partner?.toString() === partnerId,
          );
          if (
            shareIndex !== -1 &&
            expense.shares[shareIndex].status === "UNPAID"
          ) {
            expense.shares[shareIndex].status = "PAID";
            expense.shares[shareIndex].paidAt = new Date();
            expense.shares[shareIndex].settlementId = settlement._id;
            await expense.save();
            settledExpenses.push(expense.title);
          }
        }
      }
    } else {
      // Auto-settle oldest unpaid expenses up to the amount
      let remainingAmount = parsedAmount;
      const expenses = await Expense.find({
        paidByType: "WAQAR",
        "shares.partner": partnerId,
        "shares.status": "UNPAID",
      }).sort({ expenseDate: 1 });

      for (const expense of expenses) {
        if (remainingAmount <= 0) break;

        const shareIndex = expense.shares.findIndex(
          (s) => s.partner?.toString() === partnerId && s.status === "UNPAID",
        );

        if (shareIndex !== -1) {
          const shareAmount = expense.shares[shareIndex].amount;
          if (remainingAmount >= shareAmount) {
            expense.shares[shareIndex].status = "PAID";
            expense.shares[shareIndex].paidAt = new Date();
            expense.shares[shareIndex].settlementId = settlement._id;
            await expense.save();
            settledExpenses.push(expense.title);
            remainingAmount -= shareAmount;
          }
        }
      }
    }

    // Notify the partner
    await Notification.create({
      recipient: partner._id,
      message: `✅ Payment of PKR ${parsedAmount.toLocaleString()} received. Your debt reduced to PKR ${partner.debtToOwner.toLocaleString()}.`,
      type: "FINANCE",
    });

    res.status(201).json({
      success: true,
      message: `Settlement recorded: PKR ${parsedAmount.toLocaleString()} from ${partner.fullName}`,
      data: {
        settlement: settlement.getSummary(),
        previousDebt: oldDebt,
        newDebt: partner.debtToOwner,
        settledExpenses,
      },
    });
  } catch (error) {
    console.error("❌ Settlement recording error:", error);
    res.status(500).json({
      success: false,
      message: "Error recording settlement",
      error: error.message,
    });
  }
});

// @route   GET /api/expenses/settlements/history
// @desc    Get all settlements history
// @access  Public
router.get("/settlements/history", async (req, res) => {
  try {
    const { partnerId, limit = 50 } = req.query;

    let query = { status: "COMPLETED" };
    if (partnerId) {
      query.partnerId = partnerId;
    }

    const settlements = await Settlement.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .populate("partnerId", "fullName")
      .populate("recordedBy", "fullName")
      .populate("expenseId", "title amount");

    res.json({
      success: true,
      count: settlements.length,
      data: settlements,
    });
  } catch (error) {
    console.error("❌ Settlement history error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching settlement history",
      error: error.message,
    });
  }
});

// @route   GET /api/expenses/partner-debts
// @desc    Get expenses paid by Waqar with partner debt details
// @access  Public
router.get("/partner-debts", async (req, res) => {
  try {
    const expenses = await Expense.find({
      paidByType: "WAQAR",
    })
      .sort({ expenseDate: -1 })
      .populate("shares.partner", "fullName")
      .lean();

    // Add status summary to each expense
    const expensesWithStatus = expenses.map((expense) => {
      const unpaidShares =
        expense.shares?.filter((s) => s.status === "UNPAID") || [];
      const paidShares =
        expense.shares?.filter((s) => s.status === "PAID") || [];

      return {
        ...expense,
        debtSummary: {
          totalUnpaid: unpaidShares.reduce((sum, s) => sum + s.amount, 0),
          totalPaid: paidShares.reduce((sum, s) => sum + s.amount, 0),
          unpaidPartners: unpaidShares.map((s) => s.partnerName),
          paidPartners: paidShares.map((s) => s.partnerName),
        },
      };
    });

    res.json({
      success: true,
      count: expenses.length,
      data: expensesWithStatus,
    });
  } catch (error) {
    console.error("❌ Partner debts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching partner debts",
      error: error.message,
    });
  }
});

module.exports = router;
