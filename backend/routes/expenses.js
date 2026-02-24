const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const Configuration = require("../models/Configuration");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

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
      .populate("paidBy", "fullName username")
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
    const expense = await Expense.findById(req.params.id).populate(
      "paidBy",
      "fullName username",
    );

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
// @desc    Create new expense with automatic partner split
// @access  Protected
router.post("/", protect, async (req, res) => {
  try {
    const {
      title,
      category,
      amount,
      vendorName,
      dueDate,
      expenseDate,
      description,
      billNumber,
    } = req.body;

    // Validation
    if (!title || !category || !amount || !vendorName) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, category, amount, and vendor name",
      });
    }

    const parsedAmount = parseFloat(amount);

    // --- Dynamic Partner Expense Split Logic ---
    // Read configuration for expense shares
    let config = await Configuration.findOne();
    const shares = [];
    const splitRatioForRecord = {};

    // Use dynamic expenseShares if available, otherwise fall back to legacy
    if (config?.expenseShares && config.expenseShares.length > 0) {
      for (const share of config.expenseShares) {
        const pct = share.percentage || 0;
        if (pct <= 0 || !share.userId) continue;
        const shareAmount = Math.round((parsedAmount * pct) / 100);
        shares.push({
          partner: share.userId,
          partnerName: share.fullName || "Partner",
          partnerKey: null, // No hardcoded key in dynamic mode
          percentage: pct,
          amount: shareAmount,
          status: "UNPAID",
          repaymentStatus: "PENDING",
        });
        splitRatioForRecord[share.userId.toString()] = pct;
      }
    } else {
      // Legacy fallback: hardcoded waqar/zahid/saud keys
      const splitRatio = config?.expenseSplit || { waqar: 40, zahid: 30, saud: 30 };
      const partnerIds = config?.partnerIds || {};
      const partnerKeys = ["waqar", "zahid", "saud"];
      const partnerLabels = { waqar: "Sir Waqar", zahid: "Dr. Zahid", saud: "Sir Saud" };

      for (const key of partnerKeys) {
        const pct = splitRatio[key] || 0;
        if (pct <= 0) continue;
        const shareAmount = Math.round((parsedAmount * pct) / 100);
        shares.push({
          partner: partnerIds[key] || null,
          partnerName: partnerLabels[key],
          partnerKey: key,
          percentage: pct,
          amount: shareAmount,
          status: "UNPAID",
          repaymentStatus: "PENDING",
        });
      }
      Object.assign(splitRatioForRecord, splitRatio);
    }

    const expense = await Expense.create({
      title,
      category,
      amount: parsedAmount,
      vendorName,
      dueDate: dueDate ? new Date(dueDate) : null,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      description,
      billNumber,
      status: "pending",
      paidByType: "ACADEMY_CASH",
      paidBy: req.user._id,
      splitRatio: splitRatioForRecord,
      shares,
      hasPartnerDebt: shares.length > 0,
    });

    // Create main EXPENSE transaction
    await Transaction.create({
      type: "EXPENSE",
      category,
      amount: parsedAmount,
      description: `Expense: ${title}${description ? ` - ${description}` : ""}`,
      date: expense.expenseDate || new Date(),
      collectedBy: req.user._id,
      status: "VERIFIED",
    });

    // Update each partner's expenseDebt on User document
    for (const share of shares) {
      if (share.partner) {
        await User.findByIdAndUpdate(share.partner, {
          $inc: { expenseDebt: share.amount, debtToOwner: share.amount },
        });
      }
    }

    // Notify owner about the expense
    try {
      await Notification.create({
        recipient: req.user._id,
        message: `Expense recorded: "${title}" - PKR ${parsedAmount.toLocaleString()} (split: ${shares.map(s => `${s.partnerName} ${s.percentage}%`).join(", ")})`,
        type: "FINANCE",
      });
    } catch (_) {
      /* non-critical */
    }

    res.status(201).json({
      success: true,
      message: "Expense created with partner split",
      data: expense,
    });
  } catch (error) {
    console.error("Expense creation error:", error.message);
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

module.exports = router;
