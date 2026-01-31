const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const DailyClosing = require("../models/DailyClosing");
const DailyRevenue = require("../models/DailyRevenue");
const Notification = require("../models/Notification");
const Expense = require("../models/Expense");
const Settings = require("../models/Settings");
const Configuration = require("../models/Configuration");
const User = require("../models/User");
const Teacher = require("../models/Teacher");

// Waqar's Protocol: Import expense debt creation from revenueHelper
const { createExpenseDebtRecords } = require("../helpers/revenueHelper");

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

        // SRS 3.0 FIX: Get LIVE debt from User.debtToOwner (not historical Expense shares)
        // This reflects actual remaining debt after payments
        const partnerUser = await User.findById(userId).lean();
        const liveDebtToOwner = partnerUser?.debtToOwner || 0;

        console.log(
          `💳 Partner ${req.user.fullName}: Live debtToOwner = PKR ${liveDebtToOwner}`,
        );

        stats.expenseDebt = liveDebtToOwner;
        stats.hasExpenseDebt = liveDebtToOwner > 0; // Alert flag for UI
        stats.expenseDebtDetails = []; // Historical details no longer needed

        // ========================================
        // WAQAR'S PROTOCOL: Net Cash Closing for Partners
        // ========================================

        // Get partner name from user profile for dividend lookup
        const partnerName = (
          req.user.fullName ||
          req.user.username ||
          ""
        ).toLowerCase();
        let dividendFilter = "Zahid"; // Default
        if (partnerName.includes("zahid")) dividendFilter = "Zahid";
        else if (partnerName.includes("saud")) dividendFilter = "Saud";

        // 1. Total Cash Collected (All verified income for this partner)
        const totalCashCollectedResult = await Transaction.aggregate([
          {
            $match: {
              collectedBy: collectedByMatch,
              status: "VERIFIED",
              type: "INCOME",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        stats.totalCashCollected = totalCashCollectedResult?.[0]?.total ?? 0;

        // 2. Pool Dividends Received (From protocol-based pool splits)
        const dividendsResult = await Transaction.aggregate([
          {
            $match: {
              category: "Dividend",
              status: "VERIFIED",
              type: "INCOME",
              "splitDetails.partnerName": dividendFilter,
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        stats.poolDividends = dividendsResult?.[0]?.total ?? 0;

        // 3. Expense Share Payable (Pending DEBT transactions for this partner)
        const expenseDebtResult = await Transaction.aggregate([
          {
            $match: {
              type: "DEBT",
              category: "ExpenseShare",
              status: "PENDING",
              "splitDetails.partnerName": dividendFilter,
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        stats.expenseSharePayable = expenseDebtResult?.[0]?.total ?? 0;

        // 4. Net Cash to Close = Total Cash Collected - Expense Share Payable
        stats.netCashToClose =
          stats.totalCashCollected - stats.expenseSharePayable;

        console.log(`💰 Partner Net Cash Closing (${dividendFilter}):
  - Total Cash Collected: PKR ${stats.totalCashCollected.toLocaleString()}
  - Pool Dividends: PKR ${stats.poolDividends.toLocaleString()}
  - Expense Share Payable: PKR ${stats.expenseSharePayable.toLocaleString()}
  - Net Cash to Close: PKR ${stats.netCashToClose.toLocaleString()}`);

        // Link Partner to Teacher profile to get Teacher floatingCash
        // Try to find Teacher by userId first, then by name match
        let linkedTeacher = await Teacher.findOne({ userId: userId });

        if (!linkedTeacher) {
          // Fallback: Try to find by matching name
          const partnerName = req.user.fullName || req.user.username || "";
          if (partnerName) {
            linkedTeacher = await Teacher.findOne({
              name: { $regex: new RegExp(partnerName.split(" ")[0], "i") },
            });
          }
        }

        if (linkedTeacher) {
          stats.teacherFloatingCash = linkedTeacher.balance?.floating || 0;
          stats.teacherVerifiedCash = linkedTeacher.balance?.verified || 0;
          stats.linkedTeacherId = linkedTeacher._id;
          stats.linkedTeacherName = linkedTeacher.name;
          console.log(`🔗 Partner linked to Teacher: ${linkedTeacher.name}`);
        } else {
          stats.teacherFloatingCash = 0;
          stats.teacherVerifiedCash = 0;
          console.log(
            `⚠️ No Teacher profile found for Partner: ${req.user.fullName}`,
          );
        }
      }

      // 4. Owner-specific stats
      if (userRole === "OWNER") {
        // SRS 3.0: Get pending reimbursements from actual Expense shares
        const pendingReimbursements = await Expense.aggregate([
          { $match: { "shares.status": "UNPAID" } },
          { $unwind: "$shares" },
          { $match: { "shares.status": "UNPAID" } },
          { $group: { _id: null, total: { $sum: "$shares.amount" } } },
        ]);

        stats.pendingReimbursements = pendingReimbursements?.[0]?.total ?? 0;

        // Academy Pool (30% from staff tuition)
        const poolResult = await Transaction.aggregate([
          {
            $match: {
              stream: { $in: ["ACADEMY_POOL", "STAFF_TUITION"] },
              status: "VERIFIED",
              type: "INCOME",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$splitDetails.academyShare" },
            },
          },
        ]);

        stats.poolRevenue = poolResult?.[0]?.total ?? 0;

        // Teacher Payables (70% owed to teachers)
        const teacherPayables = await Transaction.aggregate([
          {
            $match: {
              stream: "STAFF_TUITION",
              status: "VERIFIED",
              type: "INCOME",
              "splitDetails.isPaid": false,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$splitDetails.teacherShare" },
            },
          },
        ]);

        stats.teacherPayables = teacherPayables?.[0]?.total ?? 0;

        // === MY NET REVENUE CALCULATION WITH CATEGORIZED BREAKDOWN ===
        // Direct Teaching: Sum of 100% fees from classes where teacher = Waqar
        const waqarTeacher = await Teacher.findOne({
          $or: [{ userId: userId }, { name: { $regex: /waqar/i } }],
        });

        let directTeaching = 0;
        let revenueBreakdown = {
          matricRevenue: 0, // 9th/10th Grade
          fscRevenue: 0, // 11th/12th Grade
          chemistryRevenue: 0, // Chemistry subject (any grade)
          eteaRevenue: 0, // ETEA/MDCAT prep courses
          poolDividends: 0, // Pool distribution dividends
        };

        if (waqarTeacher) {
          // Get all owner chemistry transactions with category breakdown
          const ownerTransactions = await Transaction.find({
            stream: "OWNER_CHEMISTRY",
            status: "VERIFIED",
            type: "INCOME",
          }).lean();

          // Categorize by description or linked student's class
          for (const tx of ownerTransactions) {
            directTeaching += tx.amount;
            revenueBreakdown.chemistryRevenue += tx.amount;

            // Try to categorize by description patterns
            const desc = (tx.description || "").toLowerCase();
            if (
              desc.includes("9th") ||
              desc.includes("10th") ||
              desc.includes("matric")
            ) {
              revenueBreakdown.matricRevenue += tx.amount;
            } else if (
              desc.includes("11th") ||
              desc.includes("12th") ||
              desc.includes("fsc")
            ) {
              revenueBreakdown.fscRevenue += tx.amount;
            } else if (
              desc.includes("etea") ||
              desc.includes("mdcat") ||
              desc.includes("ecat")
            ) {
              revenueBreakdown.eteaRevenue += tx.amount;
            }
          }

          // Get ETEA revenue where Waqar is the teacher
          const eteaResult = await Transaction.aggregate([
            {
              $match: {
                stream: { $in: ["ETEA_POOL", "ETEA_ENGLISH"] },
                status: "VERIFIED",
                type: "INCOME",
                "splitDetails.teacherId": waqarTeacher._id,
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$splitDetails.teacherShare" },
              },
            },
          ]);
          const eteaTeacherEarnings = eteaResult?.[0]?.total ?? 0;
          revenueBreakdown.eteaRevenue += eteaTeacherEarnings;
          directTeaching += eteaTeacherEarnings;
        }

        // Pool Dividends: Sum of all DIVIDEND transactions where recipient = Waqar
        const poolDividendsResult = await Transaction.aggregate([
          {
            $match: {
              stream: "DIVIDEND",
              status: "VERIFIED",
              type: "INCOME",
              recipientPartner: userId,
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const poolDividends = poolDividendsResult?.[0]?.total ?? 0;
        revenueBreakdown.poolDividends = poolDividends;

        // Expenses Paid: Sum of all expenses where paidBy = Waqar
        const expensesPaidResult = await Expense.aggregate([
          {
            $match: {
              paidBy: userId,
              status: "paid",
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const expensesPaid = expensesPaidResult?.[0]?.total ?? 0;

        // Calculate Owner Net Revenue
        stats.ownerNetRevenue = directTeaching + poolDividends - expensesPaid;
        stats.revenueBreakdown = revenueBreakdown;
        stats.expensesPaid = expensesPaid;

        console.log(`💰 Owner Net Revenue Breakdown:
  - Chemistry Revenue: PKR ${revenueBreakdown.chemistryRevenue.toLocaleString()}
  - 9th/10th (Matric): PKR ${revenueBreakdown.matricRevenue.toLocaleString()}
  - 11th/12th (FSc): PKR ${revenueBreakdown.fscRevenue.toLocaleString()}
  - ETEA Revenue: PKR ${revenueBreakdown.eteaRevenue.toLocaleString()}
  - Pool Dividends: PKR ${revenueBreakdown.poolDividends.toLocaleString()}
  - Expenses Paid: PKR ${expensesPaid.toLocaleString()}
  - NET REVENUE: PKR ${stats.ownerNetRevenue.toLocaleString()}`);
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
      // Try to get from Configuration model (new Partnership config)
      const config = await Configuration.findOne();
      if (config && config.expenseSplit) {
        ratio = {
          waqar: config.expenseSplit.waqar || 40,
          zahid: config.expenseSplit.zahid || 30,
          saud: config.expenseSplit.saud || 30,
        };
        console.log(
          "📊 Using dynamic expense split from Configuration:",
          ratio,
        );
      } else {
        // Fallback to default 40/30/30
        ratio = { waqar: 40, zahid: 30, saud: 30 };
        console.log(
          "📊 Using default expense split (Configuration not found):",
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

    // CRITICAL: Debit Waqar's ledger - Create expense transaction
    // All expenses are paid from Waqar's revenue (Chemistry + Dividends)
    const owner = await User.findOne({ role: "OWNER" });
    if (owner) {
      // Create a debit transaction for Waqar
      await Transaction.create({
        type: "EXPENSE",
        category: category,
        stream: "OWNER_DRAW",
        amount: amount, // Positive amount, type EXPENSE indicates debit
        description: `Expense: ${title} (${vendorName || "Academy"})`,
        collectedBy: owner._id,
        status: "VERIFIED",
        date: new Date(),
      });

      console.log(
        `💸 Debited PKR ${amount.toLocaleString()} from ${owner.fullName}'s revenue for expense: ${title}`,
      );
      // Silent: No notification to Owner - he knows he paid it
    }

    // Notify partners about their share
    for (const share of shares) {
      await Notification.create({
        recipient: share.partner,
        message: `💰 New expense "${title}": You owe PKR ${share.amount.toLocaleString()} (your share of PKR ${amount.toLocaleString()})`,
        type: "FINANCE",
        relatedId: expense._id.toString(),
      });

      // Update partner's debtToOwner
      await User.findByIdAndUpdate(share.partner, {
        $inc: { debtToOwner: share.amount },
      });
      console.log(
        `📊 Added PKR ${share.amount} to ${share.partnerName}'s debt`,
      );
    }

    // ========================================
    // WAQAR'S PROTOCOL: Create DEBT Transaction Records
    // ========================================
    // These provide detailed transaction-level tracking for partner dashboards
    try {
      const config = await Configuration.findOne();
      const debtResult = await createExpenseDebtRecords({
        expenseAmount: amount,
        expenseId: expense._id.toString(),
        description: `Expense Share: ${title}`,
        paidById: req.user._id,
        config,
      });

      console.log(`📝 Created DEBT records for expense:
  - Zahid owes: PKR ${debtResult.zahidOwes.toLocaleString()}
  - Saud owes: PKR ${debtResult.saudOwes.toLocaleString()}
  - Total debt created: PKR ${debtResult.totalDebt.toLocaleString()}`);
    } catch (debtError) {
      // Non-critical - debt records are supplementary, User.debtToOwner is source of truth
      console.warn(
        "⚠️ Failed to create DEBT transaction records:",
        debtError.message,
      );
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
        type: tx.type, // INCOME, EXPENSE, PARTNER_WITHDRAWAL, DIVIDEND, DEBT
        description: tx.description || `${tx.category} - ${tx.type}`,
        amount: tx.amount,
        status: tx.status, // FLOATING, VERIFIED, CANCELLED
        isExpense: tx.type === "EXPENSE" || tx.type === "DEBT",
        category: tx.category,
        collectedBy: tx.collectedBy?.fullName || "Unknown",
        studentName: tx.studentId?.fullName || null,
        // NEW: Include stream and splitDetails for pool distribution tracking
        stream: tx.stream,
        splitDetails: tx.splitDetails || null,
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

// ========================================
// PARTNER PORTAL: Personalized Stats Endpoint
// ========================================

// @desc    Get Partner Portal Stats (Personalized Dashboard Data)
// @route   GET /api/finance/partner-portal-stats
// @access  Protected (PARTNER only)
exports.getPartnerPortalStats = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const userRole = req.user.role;

    // Security: Only partners can access this endpoint
    if (userRole !== "PARTNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This endpoint is for PARTNER users only.",
      });
    }

    console.log(
      "🏛️ Partner Portal Stats for:",
      req.user.fullName || req.user.username,
    );
    const collectedByMatch = { $in: [userId, userId.toString()] };

    // 1. CASH IN HAND: Floating (unverified) cash collected by this partner
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
    const cashInHand = floatingResult?.[0]?.total ?? 0;

    // 2. EXPENSE LIABILITY: What this partner owes for shared expenses
    const myExpenses = await Expense.find({
      "shares.partner": userId,
      "shares.status": "UNPAID",
    });

    let expenseLiability = 0;
    const pendingExpenseDetails = [];

    for (const exp of myExpenses) {
      const myShare = exp.shares.find(
        (s) =>
          s.partner.toString() === userId.toString() && s.status === "UNPAID",
      );
      if (myShare) {
        expenseLiability += myShare.amount;
        pendingExpenseDetails.push({
          expenseId: exp._id,
          title: exp.title,
          totalAmount: exp.amount,
          myShare: myShare.amount,
          category: exp.category,
          dueDate: exp.dueDate,
        });
      }
    }

    // 3. TOTAL EARNINGS: All verified income collected by this partner (70% of tuition)
    const verifiedResult = await Transaction.aggregate([
      {
        $match: {
          collectedBy: collectedByMatch,
          status: "VERIFIED",
          type: "INCOME",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalVerifiedCollections = verifiedResult?.[0]?.total ?? 0;

    // Calculate 70% share (their actual earnings from collections)
    const totalEarnings = Math.round(totalVerifiedCollections * 0.7);

    // 4. SETTLEMENT HISTORY: Recent closings and settlements for this partner
    const recentClosings = await DailyClosing.find({ partnerId: userId })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    const settlementHistory = recentClosings.map((closing) => ({
      _id: closing._id,
      date: closing.date,
      type: "DAY_CLOSING",
      amount: closing.totalAmount,
      status: closing.status,
      notes: closing.notes,
      breakdown: closing.breakdown,
    }));

    // 5. NET POSITION: Earnings minus liabilities
    const netPosition = totalEarnings - expenseLiability;

    // 6. TODAY'S COLLECTIONS: Quick snapshot
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCollections = await Transaction.aggregate([
      {
        $match: {
          collectedBy: collectedByMatch,
          type: "INCOME",
          createdAt: { $gte: todayStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    const todayStats = {
      amount: todayCollections?.[0]?.total ?? 0,
      count: todayCollections?.[0]?.count ?? 0,
    };

    console.log("✅ Partner Portal Stats calculated:", {
      cashInHand,
      expenseLiability,
      totalEarnings,
      netPosition,
    });

    return res.status(200).json({
      success: true,
      data: {
        // Core Metrics
        cashInHand,
        expenseLiability,
        totalEarnings,
        netPosition,

        // Today's snapshot
        todayStats,

        // Detailed breakdowns
        pendingExpenses: pendingExpenseDetails,
        settlementHistory,

        // Meta info
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ Error in getPartnerPortalStats:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching partner portal stats",
      error: error.message,
    });
  }
};

// =================================================
// SRS 3.0 MODULE 5: REFUND MECHANISM
// =================================================

// @desc    Process Student Refund (Financial Rollback)
// @route   POST /api/finance/refund
// @access  Protected (Owner/Admin Only)
exports.processRefund = async (req, res) => {
  try {
    const { studentId, amount, reason, feeRecordId } = req.body;
    const userId = req.user._id;

    console.log("\n=== REFUND PROCESSING (SRS 3.0 Module 5) ===");
    console.log("Student ID:", studentId);
    console.log("Amount:", amount);
    console.log("Reason:", reason);

    // Validation
    if (!studentId || !amount) {
      return res.status(400).json({
        success: false,
        message: "Student ID and refund amount are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Refund amount must be greater than 0",
      });
    }

    // Find the student
    const Student = require("../models/Student");
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Find the original fee record (if provided)
    let feeRecord = null;
    let originalTransaction = null;
    const FeeRecord = require("../models/FeeRecord");
    const Teacher = require("../models/Teacher");

    if (feeRecordId) {
      feeRecord = await FeeRecord.findById(feeRecordId);
    } else {
      // Find the most recent paid fee record for this student
      feeRecord = await FeeRecord.findOne({
        student: studentId,
        status: "PAID",
      }).sort({ createdAt: -1 });
    }

    // Determine the reverse logic based on subject type
    let stream = "ACADEMY_POOL";
    let teacherDeduction = 0;
    let academyDeduction = amount;
    let teacher = null;
    let isPartnerSubject = false;

    if (feeRecord) {
      // We have a specific fee record to reverse
      const subjectLower = (feeRecord.subject || "").toLowerCase();

      // Check if it was a partner subject
      if (feeRecord.isPartnerTeacher) {
        isPartnerSubject = true;

        if (
          subjectLower.includes("chemistry") ||
          feeRecord.teacherName?.toLowerCase().includes("saud")
        ) {
          stream = "PARTNER_CHEMISTRY";
        } else if (
          subjectLower.includes("physics") ||
          feeRecord.teacherName?.toLowerCase().includes("zahid")
        ) {
          stream = "PARTNER_PHYSICS";
        } else {
          stream = "ACADEMY_POOL";
        }

        // Partner subject: Full amount from partner
        academyDeduction = 0;
        teacherDeduction = amount;
      } else {
        // Staff subject: Apply reverse 70/30 logic
        stream = "STAFF_TUITION";
        const splitBreakdown = feeRecord.splitBreakdown || {
          teacherPercentage: 70,
          academyPercentage: 30,
        };

        teacherDeduction = Math.round(
          (amount * splitBreakdown.teacherPercentage) / 100,
        );
        academyDeduction = amount - teacherDeduction;

        // Find the teacher
        if (feeRecord.teacher) {
          teacher = await Teacher.findById(feeRecord.teacher);
        }
      }

      // Find original transaction to mark as refunded
      originalTransaction = await Transaction.findOne({
        studentId: studentId,
        type: "INCOME",
        amount: feeRecord.amount,
        createdAt: { $gte: feeRecord.createdAt },
      }).sort({ createdAt: 1 });
    }

    console.log(`📊 Refund Stream: ${stream}`);
    console.log(`💸 Teacher Deduction: PKR ${teacherDeduction}`);
    console.log(`🏫 Academy Deduction: PKR ${academyDeduction}`);

    // Case A: Partner Subject - Deduct from Partner Ledger
    if (isPartnerSubject && stream !== "ACADEMY_POOL") {
      console.log(`🎯 Case A: Partner Subject Refund`);

      // Find the partner user and deduct from their wallet
      const partnerName = stream === "PARTNER_CHEMISTRY" ? "saud" : "zahid";
      const partnerUser = await User.findOne({
        role: { $in: ["OWNER", "PARTNER"] },
        fullName: { $regex: new RegExp(partnerName, "i") },
      });

      if (partnerUser && partnerUser.walletBalance) {
        // Deduct from verified first, then floating
        if (typeof partnerUser.walletBalance === "object") {
          const verified = partnerUser.walletBalance.verified || 0;
          if (verified >= amount) {
            partnerUser.walletBalance.verified = verified - amount;
          } else {
            partnerUser.walletBalance.verified = 0;
            partnerUser.walletBalance.floating =
              (partnerUser.walletBalance.floating || 0) - (amount - verified);
          }
          await partnerUser.save();
          console.log(
            `✅ Deducted PKR ${amount} from ${partnerUser.fullName}'s ledger`,
          );
        }
      }
    }

    // Case B: Staff Subject - Check teacher payment status
    if (stream === "STAFF_TUITION" && teacher) {
      console.log(`🎯 Case B: Staff Subject Refund`);

      // Check if teacher was already paid their 70%
      const teacherPaid = feeRecord?.splitBreakdown?.isPaid || false;

      if (teacherPaid) {
        // Teacher already paid - create negative balance for next month
        teacher.balance = teacher.balance || { floating: 0, verified: 0 };
        teacher.balance.verified =
          (teacher.balance.verified || 0) - teacherDeduction;
        await teacher.save();
        console.log(
          `⚠️ Teacher ${teacher.name} - Negative Balance: PKR ${teacherDeduction} (to recover)`,
        );

        // Create notification
        await Notification.create({
          recipient: teacher._id,
          message: `⚠️ Refund processed for ${student.studentName}. PKR ${teacherDeduction.toLocaleString()} will be deducted from your next payment.`,
          type: "FINANCE",
        });
      } else {
        // Teacher not yet paid - reduce floating balance
        teacher.balance = teacher.balance || { floating: 0, verified: 0 };
        teacher.balance.floating = Math.max(
          0,
          (teacher.balance.floating || 0) - teacherDeduction,
        );
        await teacher.save();
        console.log(
          `✅ Reduced ${teacher.name}'s floating balance by PKR ${teacherDeduction}`,
        );
      }
    }

    // Update student's paid amount
    student.paidAmount = Math.max(0, (student.paidAmount || 0) - amount);

    // Recalculate fee status
    const balance = student.totalFee - student.paidAmount;
    if (balance <= 0) {
      student.feeStatus = "paid";
    } else if (student.paidAmount > 0) {
      student.feeStatus = "partial";
    } else {
      student.feeStatus = "pending";
    }
    await student.save();

    // Mark original transaction as refunded
    if (originalTransaction) {
      originalTransaction.status = "REFUNDED";
      await originalTransaction.save();
    }

    // Create refund transaction for audit trail
    const refundTransaction = await Transaction.create({
      type: "REFUND",
      category: "Refund",
      stream,
      amount,
      description: `Refund: ${student.studentName} - ${reason || "Student withdrawal"}`,
      collectedBy: userId,
      status: "VERIFIED",
      studentId: student._id,
      originalTransactionId: originalTransaction?._id,
      splitDetails: {
        teacherShare: teacherDeduction,
        academyShare: academyDeduction,
        teacherId: teacher?._id,
        teacherName: teacher?.name,
        isPaid: true, // Refund is processed
      },
      date: new Date(),
    });

    // Update fee record status
    if (feeRecord) {
      feeRecord.status = "REFUNDED";
      feeRecord.refundAmount = amount;
      feeRecord.refundDate = new Date();
      feeRecord.refundReason = reason;
      await feeRecord.save();
    }

    console.log("✅ Refund processed successfully");

    return res.status(200).json({
      success: true,
      message: `✅ Refund of PKR ${amount.toLocaleString()} processed for ${student.studentName}`,
      data: {
        refundTransaction,
        breakdown: {
          total: amount,
          teacherDeduction,
          academyDeduction,
          stream,
          isPartnerSubject,
        },
        student: {
          id: student._id,
          name: student.studentName,
          newPaidAmount: student.paidAmount,
          feeStatus: student.feeStatus,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error processing refund:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process refund",
      error: error.message,
    });
  }
};

// =================================================
// SRS 3.0 MODULE: POOL DISTRIBUTION (SHARED POOL)
// =================================================

// @desc    Distribute UNALLOCATED_POOL to Partners (40/30/30 Split)
// @route   POST /api/finance/distribute-pool
// @access  Protected (OWNER Only)
exports.distributePool = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Security: Only OWNER can distribute pool
    if (userRole !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can distribute the pool.",
      });
    }

    console.log("\n=== POOL DISTRIBUTION REQUEST ===");

    // 1. Sum all undistributed UNALLOCATED_POOL transactions
    const undistributedTransactions = await Transaction.find({
      stream: "UNALLOCATED_POOL",
      isDistributed: false,
      status: "VERIFIED",
    });

    if (undistributedTransactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "❌ No funds available for distribution. Pool is empty.",
      });
    }

    const totalPool = undistributedTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0,
    );

    console.log(
      `💰 Total Pool to Distribute: PKR ${totalPool.toLocaleString()}`,
    );

    // 2. Get distribution ratios from Configuration (use poolDistribution, fallback to expenseSplit, then defaults)
    const config = await Configuration.findOne();
    const distributionRatio = config?.poolDistribution ||
      config?.expenseSplit || {
        waqar: 40,
        zahid: 30,
        saud: 30,
      };

    console.log(`📊 Pool Distribution Ratio:`, distributionRatio);

    // 3. Calculate shares
    const shares = {
      waqar: Math.round((totalPool * distributionRatio.waqar) / 100),
      zahid: Math.round((totalPool * distributionRatio.zahid) / 100),
      saud: Math.round((totalPool * distributionRatio.saud) / 100),
    };

    // Handle rounding: Give any remainder to Waqar (owner)
    const shareTotal = shares.waqar + shares.zahid + shares.saud;
    if (shareTotal < totalPool) {
      shares.waqar += totalPool - shareTotal;
    }

    console.log(`💵 Calculated Shares:`, shares);

    // 4. Find partner users
    const partners = await User.find({
      role: { $in: ["OWNER", "PARTNER"] },
      isActive: true,
    });

    const partnerMap = {};
    for (const partner of partners) {
      const nameLower = (
        partner.fullName ||
        partner.username ||
        ""
      ).toLowerCase();
      if (nameLower.includes("waqar")) {
        partnerMap.waqar = partner;
      } else if (nameLower.includes("zahid")) {
        partnerMap.zahid = partner;
      } else if (nameLower.includes("saud")) {
        partnerMap.saud = partner;
      }
    }

    // 5. Create DIVIDEND transactions for each partner
    const dividendTransactions = [];
    const distributionId = new mongoose.Types.ObjectId(); // Shared distribution batch ID

    for (const [partnerKey, shareAmount] of Object.entries(shares)) {
      const partner = partnerMap[partnerKey];
      if (!partner) {
        console.log(`⚠️ Partner ${partnerKey} not found, skipping...`);
        continue;
      }

      // Create dividend transaction
      const dividendTx = await Transaction.create({
        type: "INCOME",
        category: "Pool",
        stream: "DIVIDEND",
        amount: shareAmount,
        description: `Pool Distribution: ${partnerKey.toUpperCase()} share (${distributionRatio[partnerKey]}%) of PKR ${totalPool.toLocaleString()}`,
        collectedBy: userId,
        status: "VERIFIED",
        recipientPartner: partner._id,
        recipientPartnerName: partner.fullName || partner.username,
        distributionId,
        date: new Date(),
      });

      dividendTransactions.push({
        partnerKey,
        partnerName: partner.fullName || partner.username,
        partnerId: partner._id,
        amount: shareAmount,
        percentage: distributionRatio[partnerKey],
        transactionId: dividendTx._id,
      });

      // Update partner's wallet balance
      if (partner.walletBalance) {
        if (typeof partner.walletBalance === "object") {
          partner.walletBalance.verified =
            (partner.walletBalance.verified || 0) + shareAmount;
        } else {
          partner.walletBalance = (partner.walletBalance || 0) + shareAmount;
        }
        await partner.save();
      }

      // Notify partner
      await Notification.create({
        recipient: partner._id,
        message: `💰 Pool Distribution: You received PKR ${shareAmount.toLocaleString()} (${distributionRatio[partnerKey]}% of PKR ${totalPool.toLocaleString()})`,
        type: "FINANCE",
        relatedId: dividendTx._id.toString(),
      });

      console.log(
        `✅ ${partnerKey.toUpperCase()}: PKR ${shareAmount.toLocaleString()} credited`,
      );
    }

    // 6. Mark all original transactions as distributed
    const transactionIds = undistributedTransactions.map((tx) => tx._id);
    await Transaction.updateMany(
      { _id: { $in: transactionIds } },
      {
        $set: {
          isDistributed: true,
          distributionId,
        },
      },
    );

    console.log(
      `✅ Marked ${transactionIds.length} transactions as distributed`,
    );

    return res.status(200).json({
      success: true,
      message: `✅ Pool of PKR ${totalPool.toLocaleString()} distributed successfully!`,
      data: {
        totalPool,
        transactionsProcessed: undistributedTransactions.length,
        distributionId,
        shares: dividendTransactions,
        ratio: distributionRatio,
        distributedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ Error in distributePool:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to distribute pool",
      error: error.message,
    });
  }
};

// @desc    Get Pool Status (Current undistributed amount)
// @route   GET /api/finance/pool-status
// @access  Protected (OWNER/PARTNER)
exports.getPoolStatus = async (req, res) => {
  try {
    // Sum undistributed pool
    const undistributedResult = await Transaction.aggregate([
      {
        $match: {
          stream: "UNALLOCATED_POOL",
          isDistributed: false,
          status: "VERIFIED",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    const undistributedAmount = undistributedResult?.[0]?.total ?? 0;
    const undistributedCount = undistributedResult?.[0]?.count ?? 0;

    // Get recent distributions
    const recentDistributions = await Transaction.find({
      stream: "DIVIDEND",
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get config for ratio display
    const config = await Configuration.findOne();
    const distributionRatio = config?.expenseSplit || {
      waqar: 40,
      zahid: 30,
      saud: 30,
    };

    return res.status(200).json({
      success: true,
      data: {
        currentPool: {
          amount: undistributedAmount,
          transactionCount: undistributedCount,
          canDistribute: undistributedAmount > 0,
        },
        distributionRatio,
        recentDistributions: recentDistributions.map((d) => ({
          id: d._id,
          amount: d.amount,
          recipient: d.recipientPartnerName,
          date: d.createdAt,
          description: d.description,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error in getPoolStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get pool status",
      error: error.message,
    });
  }
};

// =================================================
// SRS 3.0 MODULE: EXPENSE APPROVAL WORKFLOW
// =================================================

// @desc    Partner marks their expense share as paid (Step 1: Partner Action)
// @route   POST /api/finance/expenses/mark-paid
// @access  Protected (PARTNER)
exports.markExpenseAsPaid = async (req, res) => {
  try {
    const { expenseId } = req.body;
    const userId = req.user._id;
    const userName = req.user.fullName || req.user.username;

    console.log("\n=== EXPENSE MARK PAID REQUEST ===");
    console.log("Expense ID:", expenseId);
    console.log("Partner:", userName);

    if (!expenseId) {
      return res.status(400).json({
        success: false,
        message: "Expense ID is required",
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
      (s) => s.partner?.toString() === userId.toString(),
    );

    if (shareIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "You do not have a share in this expense",
      });
    }

    const share = expense.shares[shareIndex];

    // Check current status
    if (share.repaymentStatus === "PAID" || share.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This expense share has already been paid",
      });
    }

    if (share.repaymentStatus === "PROCESSING") {
      return res.status(400).json({
        success: false,
        message: "Payment already marked, awaiting owner confirmation",
      });
    }

    // Update to PROCESSING status
    expense.shares[shareIndex].repaymentStatus = "PROCESSING";
    expense.shares[shareIndex].markedPaidAt = new Date();
    await expense.save();

    // Notify Owner (Waqar) about the payment
    const owner = await User.findOne({ role: "OWNER", isActive: true });
    if (owner) {
      await Notification.create({
        recipient: owner._id,
        message: `💳 ${userName} has marked PKR ${share.amount.toLocaleString()} as PAID for "${expense.title}". Please confirm receipt.`,
        type: "FINANCE",
        relatedId: expense._id.toString(),
      });
    }

    console.log(
      `✅ ${userName} marked PKR ${share.amount} as paid for "${expense.title}"`,
    );

    return res.status(200).json({
      success: true,
      message: `✅ Payment marked! Awaiting ${owner?.fullName || "Owner"}'s confirmation.`,
      data: {
        expenseId: expense._id,
        expenseTitle: expense.title,
        amount: share.amount,
        repaymentStatus: "PROCESSING",
        markedPaidAt: expense.shares[shareIndex].markedPaidAt,
      },
    });
  } catch (error) {
    console.error("❌ Error in markExpenseAsPaid:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark expense as paid",
      error: error.message,
    });
  }
};

// @desc    Owner confirms receipt of partner payment (Step 2: Owner Action)
// @route   POST /api/finance/expenses/confirm-receipt
// @access  Protected (OWNER Only)
exports.confirmExpenseReceipt = async (req, res) => {
  try {
    const { expenseId, partnerId } = req.body;
    const userRole = req.user.role;

    console.log("\n=== EXPENSE CONFIRM RECEIPT REQUEST ===");
    console.log("Expense ID:", expenseId);
    console.log("Partner ID:", partnerId);

    // Security: Only OWNER can confirm receipts
    if (userRole !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can confirm expense receipts.",
      });
    }

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
      (s) => s.partner?.toString() === partnerId.toString(),
    );

    if (shareIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Partner share not found for this expense",
      });
    }

    const share = expense.shares[shareIndex];

    // Check current status
    if (share.repaymentStatus === "PAID" || share.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This expense share has already been confirmed as paid",
      });
    }

    if (share.repaymentStatus !== "PROCESSING") {
      return res.status(400).json({
        success: false,
        message:
          "Partner has not marked this expense as paid yet. Current status: " +
          share.repaymentStatus,
      });
    }

    // Confirm the payment
    expense.shares[shareIndex].repaymentStatus = "PAID";
    expense.shares[shareIndex].status = "PAID";
    expense.shares[shareIndex].confirmedAt = new Date();
    expense.shares[shareIndex].paidAt = new Date();
    await expense.save();

    // Check if all shares are now PAID to update main expense status
    const allPaid = expense.shares.every(
      (s) => s.status === "PAID" || s.status === "N/A",
    );
    if (allPaid) {
      expense.status = "paid";
      expense.paidDate = new Date();
      await expense.save();
    }

    // Notify the partner that payment was confirmed
    await Notification.create({
      recipient: share.partner,
      message: `✅ Your payment of PKR ${share.amount.toLocaleString()} for "${expense.title}" has been confirmed. Debt cleared!`,
      type: "FINANCE",
      relatedId: expense._id.toString(),
    });

    console.log(
      `✅ Confirmed receipt of PKR ${share.amount} from ${share.partnerName}`,
    );

    return res.status(200).json({
      success: true,
      message: `✅ Payment confirmed! ${share.partnerName}'s debt for "${expense.title}" is now cleared.`,
      data: {
        expenseId: expense._id,
        expenseTitle: expense.title,
        partnerName: share.partnerName,
        amount: share.amount,
        status: "PAID",
        confirmedAt: expense.shares[shareIndex].confirmedAt,
        allSharesPaid: allPaid,
      },
    });
  } catch (error) {
    console.error("❌ Error in confirmExpenseReceipt:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to confirm expense receipt",
      error: error.message,
    });
  }
};

// @desc    Get pending expense confirmations for Owner
// @route   GET /api/finance/expenses/pending-confirmations
// @access  Protected (OWNER Only)
exports.getPendingExpenseConfirmations = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Security: Only OWNER can view pending confirmations
    if (userRole !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can view pending confirmations.",
      });
    }

    // Find all expenses with shares in PROCESSING status
    const pendingExpenses = await Expense.find({
      "shares.repaymentStatus": "PROCESSING",
    })
      .populate("shares.partner", "fullName username")
      .lean();

    const pendingConfirmations = [];

    for (const expense of pendingExpenses) {
      for (const share of expense.shares) {
        if (share.repaymentStatus === "PROCESSING") {
          pendingConfirmations.push({
            expenseId: expense._id,
            expenseTitle: expense.title,
            category: expense.category,
            totalAmount: expense.amount,
            partnerId: share.partner?._id,
            partnerName: share.partner?.fullName || share.partnerName,
            shareAmount: share.amount,
            markedPaidAt: share.markedPaidAt,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      count: pendingConfirmations.length,
      data: pendingConfirmations,
    });
  } catch (error) {
    console.error("❌ Error in getPendingExpenseConfirmations:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get pending confirmations",
      error: error.message,
    });
  }
};

/**
 * REPAY DEBT TO OWNER
 * Partners can record a payment to reduce their debt to Waqar.
 * - Creates a DEBT_REPAYMENT transaction
 * - Deducts from partner's debtToOwner
 * - Notifies Waqar of the payment
 *
 * @route   POST /api/finance/repay-debt
 * @access  Protected (PARTNER only)
 */
exports.repayDebtToOwner = async (req, res) => {
  try {
    const { amount, notes } = req.body;
    const partnerId = req.user._id;
    const partnerName = req.user.fullName || req.user.username;

    // Security: Only PARTNER can repay debt
    if (req.user.role !== "PARTNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only PARTNER can record debt repayment.",
      });
    }

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid repayment amount greater than 0.",
      });
    }

    // Find the partner user
    const partner = await User.findById(partnerId);
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Partner account not found.",
      });
    }

    const currentDebt = partner.debtToOwner || 0;

    // Validate: Can't repay more than owed
    if (amount > currentDebt) {
      return res.status(400).json({
        success: false,
        message: `Cannot repay PKR ${amount.toLocaleString()}. Current debt is only PKR ${currentDebt.toLocaleString()}.`,
      });
    }

    console.log(`\n=== DEBT REPAYMENT ===`);
    console.log(`👤 Partner: ${partnerName}`);
    console.log(`💰 Current Debt: PKR ${currentDebt.toLocaleString()}`);
    console.log(`💵 Repayment Amount: PKR ${amount.toLocaleString()}`);

    // Deduct from partner's debtToOwner
    partner.debtToOwner -= amount;
    await partner.save();

    console.log(`✅ New Debt: PKR ${partner.debtToOwner.toLocaleString()}`);

    // Create a DEBT_REPAYMENT transaction for audit trail
    const transaction = await Transaction.create({
      type: "INCOME",
      category: "Debt Repayment",
      stream: "DEBT_REPAYMENT",
      amount: amount,
      description: `Debt repayment from ${partnerName}${notes ? ": " + notes : ""}`,
      collectedBy: partnerId,
      status: "VERIFIED",
      recipientPartner: partnerId,
      recipientPartnerName: partnerName,
      date: new Date(),
    });

    console.log(`📝 Transaction Created: ${transaction._id}`);

    // Find Waqar (Owner) to notify him
    const owner = await User.findOne({ role: "OWNER" });
    if (owner) {
      await Notification.create({
        recipient: owner._id,
        recipientRole: "OWNER",
        message: `💰 ${partnerName} has paid PKR ${amount.toLocaleString()} towards their debt.${notes ? " Note: " + notes : ""} Remaining: PKR ${partner.debtToOwner.toLocaleString()}`,
        type: "FINANCE",
        relatedId: transaction._id.toString(),
      });
      console.log(
        `📬 Notification sent to ${owner.fullName || owner.username}`,
      );
    }

    return res.status(200).json({
      success: true,
      message: `✅ Repayment of PKR ${amount.toLocaleString()} recorded successfully!`,
      data: {
        repaidAmount: amount,
        previousDebt: currentDebt,
        newDebt: partner.debtToOwner,
        transactionId: transaction._id,
      },
    });
  } catch (error) {
    console.error("❌ Error in repayDebtToOwner:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record debt repayment",
      error: error.message,
    });
  }
};

/**
 * Process Teacher Payout (Admin pays teacher from pending balance)
 * - Deducts from teacher.balance.pending
 * - Credits to teacher.totalPaid
 * - Creates PAYOUT transaction for audit
 *
 * @route   POST /api/finance/teacher-payout
 * @access  Protected (OWNER only)
 */
exports.processTeacherPayout = async (req, res) => {
  try {
    const { teacherId, amount, notes } = req.body;
    const Teacher = require("../models/Teacher");

    // Security: Only OWNER can process payouts
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can process teacher payouts.",
      });
    }

    // Validate inputs
    if (!teacherId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID and valid amount are required.",
      });
    }

    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const pendingBalance = teacher.balance?.pending || 0;

    // Validate: Can't pay more than pending
    if (amount > pendingBalance) {
      return res.status(400).json({
        success: false,
        message: `Cannot pay PKR ${amount.toLocaleString()}. Pending balance is only PKR ${pendingBalance.toLocaleString()}.`,
      });
    }

    console.log(`\n=== TEACHER PAYOUT ===`);
    console.log(`👤 Teacher: ${teacher.name}`);
    console.log(`💰 Pending Balance: PKR ${pendingBalance.toLocaleString()}`);
    console.log(`💵 Payout Amount: PKR ${amount.toLocaleString()}`);

    // Deduct from pending, add to totalPaid
    teacher.balance.pending -= amount;
    teacher.totalPaid = (teacher.totalPaid || 0) + amount;
    await teacher.save();

    console.log(
      `✅ New Pending: PKR ${teacher.balance.pending.toLocaleString()}`,
    );
    console.log(`✅ Total Paid: PKR ${teacher.totalPaid.toLocaleString()}`);

    // Create a PAYOUT transaction for audit trail
    const transaction = await Transaction.create({
      type: "EXPENSE",
      category: "Salaries",
      stream: "TEACHER_PAYOUT",
      amount: amount,
      description: `Payout to ${teacher.name}${notes ? ": " + notes : ""}`,
      collectedBy: req.user._id,
      status: "VERIFIED",
      splitDetails: {
        teacherId: teacher._id,
        teacherName: teacher.name,
        isPaid: true,
      },
      date: new Date(),
    });

    console.log(`📝 Payout Transaction Created: ${transaction._id}`);

    // Mark related FLOATING transactions as paid
    await Transaction.updateMany(
      {
        "splitDetails.teacherId": teacher._id,
        "splitDetails.isPaid": false,
        status: "FLOATING",
      },
      {
        $set: { "splitDetails.isPaid": true },
      },
    );

    // Notify the teacher
    if (teacher.userId) {
      await Notification.create({
        recipient: teacher.userId,
        message: `💰 You received a payout of PKR ${amount.toLocaleString()}!${notes ? " Note: " + notes : ""}`,
        type: "FINANCE",
        relatedId: transaction._id.toString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: `✅ Payout of PKR ${amount.toLocaleString()} to ${teacher.name} processed successfully!`,
      data: {
        paidAmount: amount,
        previousPending: pendingBalance,
        newPending: teacher.balance.pending,
        totalPaid: teacher.totalPaid,
        transactionId: transaction._id,
      },
    });
  } catch (error) {
    console.error("❌ Error in processTeacherPayout:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process teacher payout",
      error: error.message,
    });
  }
};

// @desc    Reset System - Wipe all financial data for clean testing
// @route   POST /api/finance/reset-system
// @access  Protected (ADMIN only)
exports.resetSystem = async (req, res) => {
  try {
    // Delete all transactions (complete ledger wipe)
    await Transaction.deleteMany({});
    console.log("✓ Wiped Transaction ledger");

    // Delete all fee records (receipt history)
    const FeeRecord = require("../models/FeeRecord");
    await FeeRecord.deleteMany({});
    console.log("✓ Wiped FeeRecord receipts");

    // Delete all expenses (CRITICAL FIX!)
    await Expense.deleteMany({});
    console.log("✓ Wiped Expense records");

    // Delete all students
    const Student = require("../models/Student");
    await Student.deleteMany({});
    console.log("✓ Wiped Student records");

    // Delete all notifications
    await Notification.deleteMany({});
    console.log("✓ Wiped Notification alerts");

    // Reset all user balances and revenue counters
    await User.updateMany(
      {},
      {
        $set: {
          "balance.verified": 0,
          "balance.floating": 0,
          "balance.pending": 0,
          totalRevenue: 0,
          totalPaid: 0,
          debtToOwner: 0,
        },
      },
    );
    console.log("✓ Reset all user balances and debts to 0");

    return res.status(200).json({
      success: true,
      message:
        "✅ System wiped. All financial history, students, expenses, and balances reset to 0. Ready for clean testing.",
      wiped: {
        transactions: "All deleted",
        feeRecords: "All deleted",
        expenses: "All deleted",
        students: "All deleted",
        notifications: "All deleted",
        userBalances: "All reset to 0",
      },
    });
  } catch (error) {
    console.error("❌ Error in resetSystem:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset system",
      error: error.message,
    });
  }
};

// @desc    Delete Single Transaction or Expense - For testing cleanup
// @route   DELETE /api/finance/transaction/:id
// @access  Protected (OWNER only)
exports.deleteTransaction = async (req, res) => {
  const { id } = req.params;
  console.log(`\n🗑️  DELETE REQUEST for ID: ${id}`);

  try {
    // Validate ID format
    if (!id || id.length !== 24) {
      console.log(`❌ Invalid ID length: ${id?.length}`);
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    let recordId;
    try {
      recordId = new mongoose.Types.ObjectId(id);
      console.log(`✓ ID converted successfully`);
    } catch (err) {
      console.log(`❌ ObjectId conversion failed: ${err.message}`);
      return res.status(400).json({
        success: false,
        message: "Invalid ID format: " + err.message,
      });
    }

    // First, try as Transaction
    console.log(`📋 Looking for Transaction...`);
    let transaction = await Transaction.findById(recordId);

    if (transaction) {
      console.log(`✓ Found Transaction: ${transaction.description}`);
      const amount = transaction.amount;
      const description = transaction.description;

      // Delete transaction
      await Transaction.findByIdAndDelete(recordId);
      console.log(`✓ Deleted Transaction\n`);

      return res.status(200).json({
        success: true,
        message: `✅ Transaction deleted: ${description}`,
        deleted: {
          type: "Transaction",
          description,
          amount,
        },
      });
    }

    // Not a transaction, try as Expense
    console.log(`📋 Looking for Expense...`);
    const Expense = require("../models/Expense");
    let expense = await Expense.findById(recordId).populate(
      "shares.partner",
      "_id fullName",
    );

    if (expense) {
      console.log(`✓ Found Expense: ${expense.title}`);
      const amount = expense.amount;
      const title = expense.title;

      // Clean up partner debts
      if (expense.shares && expense.shares.length > 0) {
        console.log(`📍 Cleaning ${expense.shares.length} partner shares...`);

        for (const share of expense.shares) {
          if (share.partner && share.partner._id) {
            console.log(`  ├─ Processing ${share.partner.fullName}...`);

            // Find and delete debt transactions
            const debtsToDelete = await Transaction.find({
              type: "DEBT",
              category: "ExpenseShare",
              collectedBy: share.partner._id,
            });

            console.log(
              `     Found ${debtsToDelete.length} DEBT transactions to delete`,
            );

            for (const debt of debtsToDelete) {
              await Transaction.findByIdAndDelete(debt._id);
            }

            // Update partner balance
            const partner = await User.findById(share.partner._id);
            if (partner && partner.balance) {
              const oldBalance = partner.balance.pending || 0;
              partner.balance.pending = Math.max(
                0,
                oldBalance - (share.amount || 0),
              );
              await partner.save();
              console.log(
                `     ✓ Updated balance: PKR ${oldBalance.toLocaleString()} → PKR ${partner.balance.pending.toLocaleString()}`,
              );
            } else if (partner) {
              console.log(
                `     ⚠️  Partner has no balance object, skipping balance update`,
              );
            }
          }
        }
      }

      // Delete the expense
      await Expense.findByIdAndDelete(recordId);
      console.log(`✓ Deleted Expense\n`);

      return res.status(200).json({
        success: true,
        message: `✅ Expense deleted: ${title}\n✓ Partner shares cleared`,
        deleted: {
          type: "Expense",
          description: title,
          amount,
        },
      });
    }

    // Not found as either
    console.log(`❌ Record not found as Transaction or Expense\n`);
    return res.status(404).json({
      success: false,
      message: "Record not found",
    });
  } catch (error) {
    console.error(`\n❌ DELETION ERROR: ${error.message}`);
    console.error(error.stack);
    return res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
    });
  }
};
