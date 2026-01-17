const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const DailyClosing = require("../models/DailyClosing");
const DailyRevenue = require("../models/DailyRevenue");
const Notification = require("../models/Notification");
const Expense = require("../models/Expense");
const Settings = require("../models/Settings");
const User = require("../models/User");

// @desc    Close Day - Lock floating cash into verified balance
// @route   POST /api/finance/close-day
// @access  Protected (Partners Only)
exports.closeDay = async (req, res) => {
  try {
    const userId = req.user._id;
    const { notes } = req.body;

    // 1. Find all FLOATING transactions for this user
    const floatingTransactions = await Transaction.find({
      collectedBy: userId,
      status: "FLOATING",
      type: "INCOME", // Only close income, not expenses
    });

    // 2. THE ZERO CHECK: No cash to close
    if (floatingTransactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "❌ No floating cash to close. Collect some payments first!",
      });
    }

    // 3. Calculate totals and breakdown
    let totalAmount = 0;
    const breakdown = {
      chemistry: 0,
      tuition: 0,
      pool: 0,
    };

    floatingTransactions.forEach((transaction) => {
      totalAmount += transaction.amount;

      // Add to category breakdown
      if (transaction.category === "Chemistry") {
        breakdown.chemistry += transaction.amount;
      } else if (transaction.category === "Tuition") {
        breakdown.tuition += transaction.amount;
      } else if (transaction.category === "Pool") {
        breakdown.pool += transaction.amount;
      }
    });

    // 4. THE TRANSACTION: Update all to VERIFIED and create closing record
    const closingDate = new Date();

    // Create the Daily Closing document
    const dailyClosing = await DailyClosing.create({
      partnerId: userId,
      date: closingDate,
      totalAmount,
      breakdown,
      status: "VERIFIED",
      notes: notes || `Daily closing for ${closingDate.toDateString()}`,
    });

    // Update all floating transactions to VERIFIED and link to closing
    const transactionIds = floatingTransactions.map((t) => t._id);
    await Transaction.updateMany(
      { _id: { $in: transactionIds } },
      {
        $set: {
          status: "VERIFIED",
          closingId: dailyClosing._id,
        },
      },
    );

    // 5. Update User's Wallet Balance (be tolerant to historical shape)
    const user = await User.findById(userId);
    if (user) {
      if (typeof user.walletBalance === "number") {
        user.walletBalance += totalAmount;
      } else if (user.walletBalance && typeof user.walletBalance === "object") {
        user.walletBalance.verified =
          (user.walletBalance.verified || 0) + totalAmount;
        user.walletBalance.floating = user.walletBalance.floating || 0;
      }
      await user.save();
    }

    // 6. SUCCESS RESPONSE
    return res.status(200).json({
      success: true,
      message: `✅ Successfully closed PKR ${totalAmount.toLocaleString()} for ${closingDate.toDateString()}`,
      data: {
        closingId: dailyClosing._id,
        date: closingDate,
        totalAmount,
        breakdown,
        transactionsClosed: floatingTransactions.length,
      },
    });
  } catch (error) {
    console.error("❌ Error in closeDay:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while closing day",
      error: error.message,
    });
  }
};

// @desc    Get Dashboard Stats (For Owner/Partner widgets)
// @route   GET /api/finance/dashboard-stats
// @access  Protected
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    console.log("📊 Stats for:", userId, "Role:", req.user.role);

    const userRole = req.user.role;
    const collectedByMatch = { $in: [userId, userId.toString()] };

    // === DEEP DEBUGGING LOGS ===
    console.log("--- 🔍 DATABASE DIAGNOSTICS ---");
    const totalDocs = await Transaction.countDocuments();
    console.log(`1. 📚 Total Transactions in DB: ${totalDocs}`);

    console.log(`2. 👤 Target User ID: ${userId.toString()}`);

    const sampleTx = await Transaction.findOne({ collectedBy: userId });
    console.log(
      `3. 📄 Sample Transaction for User: ${sampleTx ? "FOUND" : "NOT FOUND"}`,
    );
    if (sampleTx) {
      console.log("   -> Sample ID:", sampleTx._id);
      console.log("   -> CollectedBy:", sampleTx.collectedBy);
      console.log("   -> Status:", sampleTx.status);
      console.log("   -> Date:", sampleTx.date);
    } else {
      // If not found by object ID, try checking if it's stored as a string
      const stringMatch = await Transaction.findOne({
        collectedBy: userId.toString(),
      });
      console.log(
        `   -> Check for String ID match: ${stringMatch ? "FOUND" : "NOT FOUND"}`,
      );
    }

    const floatingCount = await Transaction.countDocuments({
      collectedBy: collectedByMatch,
      status: "FLOATING",
    });
    console.log(`4. 🔎 Matching FLOATING Docs (Status only): ${floatingCount}`);

    const matchCount = await Transaction.countDocuments({
      collectedBy: collectedByMatch,
      status: "FLOATING",
      type: "INCOME",
    });
    console.log(`5. 🔎 Matching FLOATING INCOMES (Full Query): ${matchCount}`);
    console.log("-----------------------------------");
    // ============================

    // Calculate different stats based on role
    const stats = {};

    if (userRole === "OWNER" || userRole === "PARTNER") {
      // 1. Chemistry Revenue (for current user if partner, or total if owner)
      const chemistryFilter =
        userRole === "PARTNER"
          ? {
              collectedBy: collectedByMatch,
              category: "Chemistry",
              status: "VERIFIED",
              type: "INCOME",
            }
          : { category: "Chemistry", status: "VERIFIED", type: "INCOME" };

      const chemistryResult = await Transaction.aggregate([
        { $match: chemistryFilter },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      stats.chemistryRevenue = chemistryResult?.[0]?.total ?? 0;

      // 2. Floating Cash (Unverified for this user)
      const floatingResult = await Transaction.aggregate([
        {
          $match: {
            collectedBy: collectedByMatch,
            status: "FLOATING",
            type: "INCOME",
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      stats.floatingCash = floatingResult?.[0]?.total ?? 0;

      // 3. Tuition Revenue (for partners)
      if (userRole === "PARTNER") {
        const tuitionResult = await Transaction.aggregate([
          {
            $match: {
              collectedBy: collectedByMatch,
              category: "Tuition",
              status: "VERIFIED",
              type: "INCOME",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        stats.tuitionRevenue = tuitionResult?.[0]?.total ?? 0;

        // Expense Debt (what partner owes to owner)
        const totalExpenses = await Transaction.aggregate([
          {
            $match: {
              type: "EXPENSE",
              status: "VERIFIED",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const totalExpenseAmount = totalExpenses?.[0]?.total ?? 0;
        // Each partner owes 30% of total expenses
        stats.expenseDebt = totalExpenseAmount * 0.3;
      }

      // 4. Owner-specific stats
      if (userRole === "OWNER") {
        // Pending Reimbursements (Partner Debt)
        const totalExpenses = await Transaction.aggregate([
          {
            $match: {
              type: "EXPENSE",
              status: "VERIFIED",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const totalExpenseAmount = totalExpenses?.[0]?.total ?? 0;
        // Partners owe 60% of expenses (30% each)
        stats.pendingReimbursements = totalExpenseAmount * 0.6;

        // Academy Pool (30% shared revenue)
        const poolResult = await Transaction.aggregate([
          { $match: { category: "Pool", status: "VERIFIED", type: "INCOME" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        stats.poolRevenue = poolResult?.[0]?.total ?? 0;
      }
    }

    console.log("✅ Dashboard stats calculated:", stats);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("❌ Error in getDashboardStats:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard stats",
      error: error.message,
    });
  }
};

// @desc    Record a new transaction (Income or Expense)
// @route   POST /api/finance/record-transaction
// @access  Protected
exports.recordTransaction = async (req, res) => {
  try {
    const { type, category, amount, description, studentId } = req.body;
    const userId = req.user._id;

    // Validation
    if (!type || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: "Type, category, and amount are required",
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      type,
      category,
      amount,
      description,
      collectedBy: userId,
      studentId,
      status: "FLOATING", // Always starts as floating
      date: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: `✅ ${type} of PKR ${amount.toLocaleString()} recorded successfully`,
      data: transaction.getSummary(),
    });
  } catch (error) {
    console.error("❌ Error in recordTransaction:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while recording transaction",
      error: error.message,
    });
  }
};

// @desc    Collect Partner Revenue - Partner withdraws accumulated daily revenue
// @route   POST /api/finance/collect-partner-revenue
// @access  Protected (Partners Only)
exports.collectPartnerRevenue = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Find all UNCOLLECTED DailyRevenue records for this partner
    const uncollectedRecords = await DailyRevenue.find({
      partner: userId,
      status: "UNCOLLECTED",
    }).sort({ date: 1 }); // Sort by date ascending for proper range calculation

    // 2. Validation: No revenue to collect
    if (uncollectedRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: "❌ No revenue to collect. You have no uncollected earnings.",
      });
    }

    // 3. Calculate Stats
    const totalAmount = uncollectedRecords.reduce(
      (sum, record) => sum + record.amount,
      0,
    );
    const daysCollected = uncollectedRecords.length;

    // Get date range (oldest to newest)
    const oldestDate = uncollectedRecords[0].date;
    const newestDate = uncollectedRecords[uncollectedRecords.length - 1].date;
    const dateRange = `${oldestDate.toLocaleDateString("en-PK")} - ${newestDate.toLocaleDateString("en-PK")}`;

    // 4. Create Transaction Record (The Permanent Receipt)
    const withdrawalTransaction = await Transaction.create({
      type: "PARTNER_WITHDRAWAL",
      category: "Tuition", // Default category for partner revenue
      amount: totalAmount,
      description: `Withdrew revenue for ${daysCollected} day(s) (${dateRange})`,
      collectedBy: userId,
      status: "VERIFIED", // Withdrawals are immediately verified
      date: new Date(),
    });

    // 5. Bulk Update DailyRevenue records to COLLECTED
    const recordIds = uncollectedRecords.map((r) => r._id);
    const collectionTimestamp = new Date();

    await DailyRevenue.updateMany(
      { _id: { $in: recordIds } },
      {
        $set: {
          status: "COLLECTED",
          collectedAt: collectionTimestamp,
        },
      },
    );

    // 6. Reset User's Floating Wallet Balance
    const user = await User.findById(userId);
    if (user && user.walletBalance) {
      // Move floating to verified (they took the cash)
      const floatingAmount = user.walletBalance.floating || 0;
      user.walletBalance.verified =
        (user.walletBalance.verified || 0) + floatingAmount;
      user.walletBalance.floating = 0;
      await user.save();
    }

    // 7. Notify Owner about the withdrawal
    await Notification.create({
      recipientRole: "OWNER",
      message: `💸 ${req.user.username || req.user.fullName} withdrew PKR ${totalAmount.toLocaleString()} for ${daysCollected} day(s) of revenue.`,
      type: "FINANCE",
      relatedId: withdrawalTransaction._id.toString(),
    });

    // 8. Success Response
    return res.status(200).json({
      success: true,
      message: `✅ Successfully collected PKR ${totalAmount.toLocaleString()} for ${daysCollected} day(s)`,
      data: {
        transactionId: withdrawalTransaction._id,
        totalAmount,
        daysCollected,
        dateRange,
        collectedAt: collectionTimestamp,
        records: uncollectedRecords.map((r) => ({
          id: r._id,
          date: r.date,
          amount: r.amount,
          source: r.source,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error in collectPartnerRevenue:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while collecting partner revenue",
      error: error.message,
    });
  }
};

// ========================================
// MODULE 3: EXPENSE MANAGEMENT
// ========================================

// @desc    Create a shared expense with automatic split calculation
// @route   POST /api/finance/create-shared-expense
// @access  Protected (OWNER only)
exports.createSharedExpense = async (req, res) => {
  try {
    const {
      title,
      amount,
      category,
      vendorName,
      dueDate,
      description,
      splitRatio,
    } = req.body;

    // Validation
    if (!title || !amount || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, amount, and category are required",
      });
    }

    // Get partners (Zahid and Saud)
    const partners = await User.find({
      role: "PARTNER",
      isActive: true,
    });

    // DYNAMIC CONFIG: Fetch expense split from Configuration
    let ratio = splitRatio; // Use provided ratio if any

    if (!ratio) {
      // Try to get from Settings (Configuration model)
      const config = await Settings.findOne();
      if (config && config.expenseSplit) {
        ratio = {
          waqar: config.expenseSplit.waqar || 40,
          zahid: config.expenseSplit.zahid || 30,
          saud: config.expenseSplit.saud || 30,
        };
        console.log("📊 Using dynamic expense split from config:", ratio);
      } else {
        // Fallback to default 40/30/30
        ratio = { waqar: 40, zahid: 30, saud: 30 };
        console.log(
          "📊 Using default expense split (config not found):",
          ratio,
        );
      }
    }

    // Calculate shares for each partner
    const shares = partners.map((partner) => {
      // Determine which ratio key to use based on partner name
      const partnerKey = partner.fullName.toLowerCase().includes("zahid")
        ? "zahid"
        : partner.fullName.toLowerCase().includes("saud")
          ? "saud"
          : "zahid"; // default to zahid ratio for unknown

      const percentage = ratio[partnerKey] || 30;
      const shareAmount = Math.round((amount * percentage) / 100);

      return {
        partner: partner._id,
        partnerName: partner.fullName,
        amount: shareAmount,
        status: "UNPAID",
      };
    });

    // Create the expense
    const expense = await Expense.create({
      title,
      category,
      amount,
      vendorName: vendorName || "Academy Shared",
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      expenseDate: new Date(),
      description,
      status: "pending",
      paidBy: req.user._id,
      splitRatio: ratio,
      shares,
    });

    // Notify partners about their share
    for (const share of shares) {
      await Notification.create({
        recipient: share.partner,
        message: `💰 New expense "${title}": You owe PKR ${share.amount.toLocaleString()} (your share of PKR ${amount.toLocaleString()})`,
        type: "FINANCE",
        relatedId: expense._id.toString(),
      });
    }

    return res.status(201).json({
      success: true,
      message: `✅ Shared expense created. Partners notified of their shares.`,
      data: {
        expense,
        shares: shares.map((s) => ({
          partner: s.partnerName,
          amount: s.amount,
          status: s.status,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error in createSharedExpense:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating shared expense",
      error: error.message,
    });
  }
};

// @desc    Get partner's expense debt (what they owe to owner)
// @route   GET /api/finance/partner-expense-debt
// @access  Protected
exports.getPartnerExpenseDebt = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all expenses where this partner has an UNPAID share
    const expenses = await Expense.find({
      "shares.partner": userId,
      "shares.status": "UNPAID",
    });

    let totalDebt = 0;
    const debtDetails = [];

    for (const expense of expenses) {
      const myShare = expense.shares.find(
        (s) =>
          s.partner.toString() === userId.toString() && s.status === "UNPAID",
      );

      if (myShare) {
        totalDebt += myShare.amount;
        debtDetails.push({
          expenseId: expense._id,
          title: expense.title,
          category: expense.category,
          totalAmount: expense.amount,
          myShare: myShare.amount,
          dueDate: expense.dueDate,
          expenseDate: expense.expenseDate,
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalDebt,
        expenseCount: debtDetails.length,
        details: debtDetails,
      },
    });
  } catch (error) {
    console.error("❌ Error in getPartnerExpenseDebt:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching expense debt",
      error: error.message,
    });
  }
};

// @desc    Mark partner's expense share as paid (Owner action)
// @route   POST /api/finance/mark-expense-paid
// @access  Protected (OWNER only)
exports.markExpenseSharePaid = async (req, res) => {
  try {
    const { expenseId, partnerId } = req.body;

    if (!expenseId || !partnerId) {
      return res.status(400).json({
        success: false,
        message: "Expense ID and Partner ID are required",
      });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Find the partner's share
    const shareIndex = expense.shares.findIndex(
      (s) => s.partner.toString() === partnerId.toString(),
    );

    if (shareIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Partner share not found for this expense",
      });
    }

    if (expense.shares[shareIndex].status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This share is already marked as paid",
      });
    }

    // Mark as paid
    expense.shares[shareIndex].status = "PAID";
    expense.shares[shareIndex].paidAt = new Date();
    await expense.save();

    // Notify the partner
    await Notification.create({
      recipient: partnerId,
      message: `✅ Your payment of PKR ${expense.shares[shareIndex].amount.toLocaleString()} for "${expense.title}" has been received.`,
      type: "FINANCE",
      relatedId: expense._id.toString(),
    });

    return res.status(200).json({
      success: true,
      message: `✅ Payment received for ${expense.shares[shareIndex].partnerName}`,
      data: {
        expense: expense.title,
        amount: expense.shares[shareIndex].amount,
        paidAt: expense.shares[shareIndex].paidAt,
      },
    });
  } catch (error) {
    console.error("❌ Error in markExpenseSharePaid:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while marking expense as paid",
      error: error.message,
    });
  }
};

// @desc    Get Owner's reimbursement report (who owes what)
// @route   GET /api/finance/reimbursement-report
// @access  Protected (OWNER only)
exports.getReimbursementReport = async (req, res) => {
  try {
    // Find all expenses with unpaid shares
    const expenses = await Expense.find({
      "shares.status": "UNPAID",
    }).populate("shares.partner", "fullName username");

    const partnerDebts = {};
    let totalOwed = 0;

    for (const expense of expenses) {
      for (const share of expense.shares) {
        if (share.status === "UNPAID") {
          const partnerKey =
            share.partner?._id?.toString() || share.partnerName;
          const partnerName = share.partner?.fullName || share.partnerName;

          if (!partnerDebts[partnerKey]) {
            partnerDebts[partnerKey] = {
              partnerId: share.partner?._id,
              partnerName,
              totalOwed: 0,
              expenses: [],
            };
          }

          partnerDebts[partnerKey].totalOwed += share.amount;
          partnerDebts[partnerKey].expenses.push({
            expenseId: expense._id,
            title: expense.title,
            amount: share.amount,
            dueDate: expense.dueDate,
          });

          totalOwed += share.amount;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalOwed,
        partners: Object.values(partnerDebts),
      },
    });
  } catch (error) {
    console.error("❌ Error in getReimbursementReport:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching reimbursement report",
      error: error.message,
    });
  }
};

// @desc    Get Finance History (Ledger) - Role-based access
// @route   GET /api/finance/history
// @access  Protected (OWNER sees all, PARTNER sees only their own)
exports.getFinanceHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let transactions = [];
    let expenses = [];

    if (userRole === "OWNER") {
      // OWNER sees ALL transactions and expenses
      transactions = await Transaction.find()
        .populate("collectedBy", "fullName username")
        .populate("studentId", "fullName")
        .sort({ createdAt: -1 })
        .lean();

      expenses = await Expense.find()
        .populate("paidBy", "fullName username")
        .sort({ createdAt: -1 })
        .lean();
    } else if (userRole === "PARTNER") {
      // PARTNER sees only their own transactions and expense shares
      transactions = await Transaction.find({ collectedBy: userId })
        .populate("collectedBy", "fullName username")
        .populate("studentId", "fullName")
        .sort({ createdAt: -1 })
        .lean();

      // Get expenses where this partner has a share
      expenses = await Expense.find({ "shares.partner": userId })
        .populate("paidBy", "fullName username")
        .sort({ createdAt: -1 })
        .lean();
    } else {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only OWNER and PARTNER can view finance history.",
      });
    }

    // Unify the data into a consistent format
    const unifiedHistory = [];

    // Process transactions
    for (const tx of transactions) {
      unifiedHistory.push({
        _id: tx._id,
        date: tx.createdAt || tx.date,
        type: tx.type, // INCOME, EXPENSE, PARTNER_WITHDRAWAL
        description: tx.description || `${tx.category} - ${tx.type}`,
        amount: tx.amount,
        status: tx.status, // FLOATING, VERIFIED, CANCELLED
        isExpense: false,
        category: tx.category,
        collectedBy: tx.collectedBy?.fullName || "Unknown",
        studentName: tx.studentId?.fullName || null,
      });
    }

    // Process expenses
    for (const exp of expenses) {
      // For PARTNER, show their specific share amount
      let displayAmount = exp.amount;
      let shareStatus = exp.status;

      if (userRole === "PARTNER") {
        const partnerShare = exp.shares?.find(
          (s) => s.partner?.toString() === userId.toString(),
        );
        if (partnerShare) {
          displayAmount = partnerShare.amount;
          shareStatus = partnerShare.status === "PAID" ? "paid" : "pending";
        }
      }

      unifiedHistory.push({
        _id: exp._id,
        date: exp.createdAt || exp.expenseDate,
        type: "EXPENSE",
        description: exp.title || exp.description || `${exp.category} Expense`,
        amount: displayAmount,
        status: shareStatus,
        isExpense: true,
        category: exp.category,
        paidBy: exp.paidBy?.fullName || "Unknown",
        vendorName: exp.vendorName || null,
      });
    }

    // Sort by date descending
    unifiedHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.status(200).json({
      success: true,
      count: unifiedHistory.length,
      data: unifiedHistory,
    });
  } catch (error) {
    console.error("❌ Error in getFinanceHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching finance history",
      error: error.message,
    });
  }
};
