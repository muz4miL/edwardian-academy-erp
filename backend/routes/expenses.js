const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const Configuration = require("../models/Configuration");
const User = require("../models/User");
const Notification = require("../models/Notification");

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

    for (const partner of partners) {
      const nameKey = partner.fullName.toLowerCase();
      let percentage = 0;

      if (nameKey.includes("waqar")) {
        percentage = splitRatio.waqar;
      } else if (nameKey.includes("zahid")) {
        percentage = splitRatio.zahid;
      } else if (nameKey.includes("saud")) {
        percentage = splitRatio.saud;
      }

      if (percentage > 0) {
        const shareAmount = Math.round((parsedAmount * percentage) / 100);
        shares.push({
          partner: partner._id,
          partnerName: partner.fullName,
          amount: shareAmount,
          percentage: percentage,
          status: "UNPAID",
        });

        // 4. Deduct from partner's verified wallet balance
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

        // 5. Create notification for partner
        await Notification.create({
          recipient: partner._id,
          message: `💰 New expense "${title}": Your share is PKR ${shareAmount.toLocaleString()} (${percentage}% of PKR ${parsedAmount.toLocaleString()})`,
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
      splitRatio,
      shares,
    };

    console.log("💾 Creating expense with data:", expenseData);

    const expense = new Expense(expenseData);
    await expense.save();

    console.log("✅ Expense created successfully:", expense._id);

    res.status(201).json({
      success: true,
      message: "Expense created successfully with partnership split",
      data: expense,
      shares: shares.map((s) => ({
        partner: s.partnerName,
        amount: s.amount,
        percentage: s.percentage,
      })),
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

module.exports = router;
