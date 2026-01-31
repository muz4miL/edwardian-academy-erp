/**
 * Revenue Split Helper - Edwardian Academy Financial Engine
 */

const Configuration = require("../models/Configuration");
const Teacher = require("../models/Teacher");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

/**
 * Calculate Revenue Split based on Edwardian Standard
 */
async function calculateRevenueSplit({
  fee,
  gradeLevel,
  sessionType,
  subject,
  teacherId,
  teacherRole,
  config = null,
}) {
  try {
    if (!config) config = await Configuration.findOne();

    const staffTeacherShare = config?.salaryConfig?.teacherShare || 70;
    const staffAcademyShare = config?.salaryConfig?.academyShare || 30;
    const partner100Rule = config?.partner100Rule !== false;
    const eteaCommission = config?.eteaConfig?.perStudentCommission || 3000;

    const isETEA =
      sessionType === "etea" ||
      sessionType === "mdcat" ||
      (gradeLevel && (gradeLevel.includes("MDCAT") || gradeLevel.includes("ECAT")));

    const isPartner = teacherRole === "OWNER" || teacherRole === "PARTNER";

    let teacherCommission = 0;
    let teacherTuition = 0;
    let poolRevenue = 0;
    let stream = "STAFF_TUITION";
    let splitType = "STAFF_70_30";

    if (isETEA) {
      const isEnglish = subject && subject.toLowerCase().trim() === "english";
      
      if (isPartner && partner100Rule) {
        teacherCommission = eteaCommission;
        teacherTuition = fee - eteaCommission;
        poolRevenue = 0;
        splitType = "ETEA_PARTNER_100";
        stream = teacherRole === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_ETEA";
      } else if (isEnglish) {
        teacherCommission = 0;
        teacherTuition = 0;
        poolRevenue = fee;
        splitType = "ETEA_ENGLISH_FIXED";
        stream = "ETEA_ENGLISH_POOL";
      } else {
        teacherCommission = eteaCommission;
        teacherTuition = 0;
        poolRevenue = fee - eteaCommission;
        splitType = "ETEA_STAFF_COMMISSION";
        stream = "ETEA_POOL";
      }
    } else if (partner100Rule && isPartner) {
      teacherCommission = 0;
      teacherTuition = fee;
      poolRevenue = 0;
      splitType = "PARTNER_100";
      stream = teacherRole === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO";
    } else {
      const totalTeacher = Math.round((fee * staffTeacherShare) / 100);
      teacherCommission = 0;
      teacherTuition = totalTeacher;
      poolRevenue = fee - totalTeacher;
      stream = "STAFF_TUITION";
      splitType = "STAFF_70_30";
    }

    return {
      totalFee: fee,
      teacherRevenue: teacherCommission + teacherTuition,
      teacherCommission,
      teacherTuition,
      poolRevenue,
      stream,
      splitType,
      teacherId,
      teacherRole,
      isETEA,
      isPartner,
      config: { staffTeacherShare, staffAcademyShare, partner100Rule, eteaCommission }
    };
  } catch (error) {
    console.error("❌ Error in calculateRevenueSplit:", error);
    throw error;
  }
}

/**
 * Get teacher role
 */
async function getTeacherRole(teacher) {
  if (!teacher) return "STAFF";
  if (teacher.role === "OWNER") return "OWNER";
  if (teacher.role === "PARTNER") return "PARTNER";
  
  const nameLower = (teacher.name || "").toLowerCase();
  if (nameLower.includes("waqar")) return "OWNER";
  if (nameLower.includes("zahid")) return "PARTNER";
  if (nameLower.includes("saud")) return "PARTNER";
  return "STAFF";
}

/**
 * Distribute Pool Revenue (Waqar's Protocol) - NO TRANSACTIONS
 */
async function distributePoolRevenue({
  poolAmount,
  isETEA = false,
  studentId,
  collectedById,
  description,
  config = null
}) {
  try {
    if (!config) config = await Configuration.findOne();

    let poolSplit;
    if (isETEA) {
      poolSplit = config?.eteaPoolSplit || { waqar: 40, zahid: 30, saud: 30 };
    } else {
      poolSplit = config?.tuitionPoolSplit || { waqar: 50, zahid: 30, saud: 20 };
    }

    const waqarShare = Math.round((poolAmount * poolSplit.waqar) / 100);
    const zahidShare = Math.round((poolAmount * poolSplit.zahid) / 100);
    const saudShare = poolAmount - waqarShare - zahidShare;

    const poolType = isETEA ? "ETEA_POOL" : "TUITION_POOL";
    const protocolLabel = isETEA ? "ETEA Protocol" : "Tuition Protocol";

    const dividends = [
      { name: "Waqar", share: waqarShare, percent: poolSplit.waqar, stream: "OWNER_DIVIDEND" },
      { name: "Zahid", share: zahidShare, percent: poolSplit.zahid, stream: "PARTNER_DIVIDEND" },
      { name: "Saud", share: saudShare, percent: poolSplit.saud, stream: "PARTNER_DIVIDEND" }
    ];

    for (const partner of dividends) {
      if (partner.share > 0) {
        await Transaction.create({
          type: "DIVIDEND",
          category: "Dividend",
          stream: partner.stream,
          amount: partner.share,
          description: `${description} - ${partner.name}'s Share (${partner.percent}%) [${protocolLabel}]`,
          collectedBy: collectedById,
          studentId: studentId,
          status: "VERIFIED",
          splitDetails: {
            partnerName: partner.name,
            percentage: partner.percent,
            poolType: poolType,
          },
          date: new Date()
        });
      }
    }

    return { waqarShare, zahidShare, saudShare, poolSplit, protocol: isETEA ? "ETEA" : "TUITION" };
  } catch (error) {
    console.error("⚠️ Pool distribution error:", error);
    // Return null instead of throwing so the main fee collection continues
    return null;
  }
}

/**
 * Create Expense Debt Records
 */
async function createExpenseDebtRecords({
  expenseAmount,
  expenseId,
  description,
  paidById,
  config = null
}) {
  try {
    if (!config) config = await Configuration.findOne();
    
    const expenseSplit = config?.expenseSplit || { waqar: 40, zahid: 30, saud: 30 };
    const zahidOwes = Math.round((expenseAmount * expenseSplit.zahid) / 100);
    const saudOwes = Math.round((expenseAmount * expenseSplit.saud) / 100);

    const debtRecords = [];
    
    const debts = [
      { name: "Zahid", amount: zahidOwes, percent: expenseSplit.zahid },
      { name: "Saud", amount: saudOwes, percent: expenseSplit.saud }
    ];

    for (const debt of debts) {
      if (debt.amount > 0) {
        const record = await Transaction.create({
          type: "DEBT",
          category: "ExpenseShare",
          stream: "PARTNER_EXPENSE_DEBT",
          amount: debt.amount,
          description: `Expense Share: ${description} - ${debt.name} owes (${debt.percent}%)`,
          collectedBy: paidById,
          status: "PENDING",
          splitDetails: {
            partnerName: debt.name,
            percentage: debt.percent,
            expenseId: expenseId,
            paidByWaqar: true
          },
          date: new Date()
        });
        debtRecords.push(record);
      }
    }

    return { debtRecords, zahidOwes, saudOwes, totalDebt: zahidOwes + saudOwes, expenseSplit };
  } catch (error) {
    console.error("⚠️ Expense debt creation error:", error);
    return { debtRecords: [], zahidOwes: 0, saudOwes: 0, totalDebt: 0, expenseSplit: { zahid: 30, saud: 30 } };
  }
}

/**
 * Process Multi-Subject Revenue (Simplified)
 */
async function processMultiSubjectRevenue({ student, classDoc, paidAmount, collectedById }) {
  console.log("Multi-subject revenue processing (simplified)");
  // For now, treat as single payment
  return { totalTeacher: 0, totalPool: paidAmount, transactions: [] };
}

module.exports = {
  calculateRevenueSplit,
  getTeacherRole,
  distributePoolRevenue,
  createExpenseDebtRecords,
  processMultiSubjectRevenue
};