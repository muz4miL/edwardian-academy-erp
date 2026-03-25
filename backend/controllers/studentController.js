const Student = require("../models/Student");
const FeeRecord = require("../models/FeeRecord");
const Transaction = require("../models/Transaction");
const Teacher = require("../models/Teacher");
const Class = require("../models/Class");
const Configuration = require("../models/Configuration");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Timetable = require("../models/Timetable");
const DailyRevenue = require("../models/DailyRevenue");
const {
  detectClassRevenueMode,
  calculateTuitionSplit,
  calculateAcademySplit,
  splitFeeAmongTeachers,
  distributeAcademyShare,
  createDailyRevenueEntries,
} = require("../helpers/revenueEngine");

const normalizeTeacherId = (teacherRef) => {
  if (!teacherRef) return null;
  if (typeof teacherRef === "string") return teacherRef;
  if (teacherRef._id) return teacherRef._id.toString();
  if (typeof teacherRef.toString === "function") return teacherRef.toString();
  return null;
};

const toSafeInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
};

// Minimal revenue helper inline to avoid import errors
const calculateRevenueSplit = async ({ fee, teacherRole, config }) => {
  const isPartner = teacherRole === "OWNER" || teacherRole === "PARTNER";
  const staffShare = config?.salaryConfig?.teacherShare || 70;

  if (isPartner) {
    return {
      teacherRevenue: fee,
      poolRevenue: 0,
      isPartner: true,
      isETEA: false,
      stream: teacherRole === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO",
      splitType: "PARTNER_100",
    };
  }

  const teacherAmt = Math.round((fee * staffShare) / 100);
  return {
    teacherRevenue: teacherAmt,
    poolRevenue: fee - teacherAmt,
    isPartner: false,
    isETEA: false,
    stream: "STAFF_TUITION",
    splitType: "STAFF_70_30",
    config: {
      staffTeacherShare: staffShare,
      staffAcademyShare: 100 - staffShare,
    },
  };
};

const getTeacherRole = async (teacher) => {
  if (!teacher) return "STAFF";
  if (teacher.role === "OWNER") return "OWNER";
  if (teacher.role === "PARTNER") return "PARTNER";

  const name = (teacher.name || "").toLowerCase();
  if (name.includes("waqar")) return "OWNER";
  if (name.includes("zahid") || name.includes("saud")) return "PARTNER";
  return "STAFF";
};

const distributePoolRevenue = async ({ poolAmount, isETEA }) => {
  // Simplified - actually implement your full logic later
  const split = isETEA
    ? { waqar: 40, zahid: 30, saud: 30 }
    : { waqar: 50, zahid: 30, saud: 20 };
  return {
    waqarShare: Math.round((poolAmount * split.waqar) / 100),
    zahidShare: Math.round((poolAmount * split.zahid) / 100),
    saudShare:
      poolAmount -
      Math.round((poolAmount * split.waqar) / 100) -
      Math.round((poolAmount * split.zahid) / 100),
    protocol: isETEA ? "ETEA" : "TUITION",
  };
};

// GET all students
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET single student
exports.getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Calculate Fee Status based on strict logic
const calculateFeeStatus = (paidAmount, totalFee) => {
  if (paidAmount === 0) return "pending";
  if (paidAmount > 0 && paidAmount < totalFee) return "partial";
  if (paidAmount >= totalFee) return "paid";
  return "pending"; // default fallback
};

// CREATE student (with initial payment processing via Revenue Engine)
exports.createStudent = async (req, res) => {
  try {
    const studentData = { ...req.body };
    const initialPayment = Number(studentData.paidAmount) || 0;

    // Create student first with 0 paidAmount (will be updated after fee processing)
    studentData.paidAmount = 0;
    studentData.feeStatus = "Pending";

    const student = await Student.create(studentData);

    // If there's an initial payment, process it through the revenue engine
    if (initialPayment > 0) {
      try {
        console.log('💰 Processing initial payment:', initialPayment);
        const config = await Configuration.findOne();

        // Look up class for revenue mode detection
        let classDoc = null;
        if (student.classRef) {
          classDoc = await Class.findById(student.classRef).lean();
        }
        if (!classDoc && student.class) {
          classDoc = await Class.findOne({
            $or: [{ classTitle: student.class }, { className: student.class }],
          }).lean();
        }
        console.log('📚 Class found:', classDoc?.classTitle, 'subjectTeachers:', classDoc?.subjectTeachers?.length);

        // Auto-detect revenue mode (async function returns {mode, ownerPartnerTeachers, regularTeachers})
        const modeResult = await detectClassRevenueMode(classDoc);
        const mode = modeResult.mode;
        console.log('🎯 Revenue mode:', mode, 'ownerPartnerTeachers:', modeResult.ownerPartnerTeachers?.length);
        const month = new Date().toLocaleString("default", { month: "long", year: "numeric" });

        // Get owner/partner teachers from the detection result or query manually
        let ownerPartnerTeachers = modeResult.ownerPartnerTeachers || [];
        if (ownerPartnerTeachers.length === 0) {
          const ownerPartners = await User.find({ role: { $in: ["OWNER", "PARTNER"] } }).lean();
          for (const op of ownerPartners) {
            const linkedTeacher = await Teacher.findOne({ userId: op._id }).lean();
            if (linkedTeacher) {
              ownerPartnerTeachers.push({
                ...linkedTeacher,
                userId: op._id,
                role: op.role,
              });
            }
          }
        }

        let totalTeacherShare = 0;
        let totalAcademyShare = 0;
        const creditTransactions = [];
        const dailyRevenueEntries = [];
        let primaryTeacherId = null;
        let primaryTeacherName = null;

        if (mode === "MIXED" && classDoc?.subjectTeachers?.length > 0) {
          // Mixed mode: distribute per subject
          const subjectMap = classDoc.subjectTeachers;
          const perSubjectAmount = Math.floor(initialPayment / subjectMap.length);

          for (const stEntry of subjectMap) {
            const subjShare = perSubjectAmount;
            const subjName = stEntry.subject || "Subject";

            // Check if this subject is taught by Owner/Partner
            const opEntry = ownerPartnerTeachers.find(
              (op) => op._id.toString() === stEntry.teacherId?.toString()
            );

            if (opEntry) {
              // Owner/Partner gets 100%
              const teacher = await Teacher.findById(opEntry._id);
              if (teacher) {
                if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
                teacher.balance.floating = (teacher.balance.floating || 0) + subjShare;
                await teacher.save();
              }

              totalTeacherShare += subjShare;
              if (!primaryTeacherId) {
                primaryTeacherId = opEntry._id;
                primaryTeacherName = opEntry.name;
              }

              creditTransactions.push({
                type: "INCOME",
                category: "Tuition",
                stream: opEntry.role === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO",
                amount: subjShare,
                description: `Admission fee (${subjName}): ${student.studentName} — ${opEntry.name} [${opEntry.role}]`,
                collectedBy: req.user?._id,
                status: "FLOATING",
                date: new Date(),
              });

              dailyRevenueEntries.push({
                userId: opEntry.userId,
                amount: subjShare,
                revenueType: "TUITION_SHARE",
                classRef: classDoc?._id,
                className: classDoc?.classTitle || student.class,
                studentRef: student._id,
                studentName: student.studentName,
                splitDetails: {
                  totalFee: initialPayment,
                  description: `Admission fee (${subjName}): ${student.studentName} — ${opEntry.name}`,
                },
              });
            } else {
              // Regular teacher: academy split
              const subjectTeacher = await Teacher.findById(stEntry.teacherId);
              if (subjectTeacher) {
                const split = await calculateAcademySplit(subjShare, subjectTeacher, config);

                if (split.teacherAmount > 0) {
                  if (!subjectTeacher.balance) subjectTeacher.balance = { floating: 0, verified: 0, pending: 0 };
                  subjectTeacher.balance.floating = (subjectTeacher.balance.floating || 0) + split.teacherAmount;
                  await subjectTeacher.save();

                  creditTransactions.push({
                    type: "INCOME",
                    category: "Tuition",
                    stream: "STAFF_TUITION",
                    amount: split.teacherAmount,
                    description: `Admission fee (${subjName}) teacher share: ${student.studentName}`,
                    collectedBy: req.user?._id,
                    status: "FLOATING",
                    date: new Date(),
                  });
                }

                totalTeacherShare += split.teacherAmount;
                totalAcademyShare += split.academyAmount;

                if (!primaryTeacherId) {
                  primaryTeacherId = subjectTeacher._id;
                  primaryTeacherName = subjectTeacher.name;
                }

                // Update Owner/Partner wallets for academy share with FULL PROOF METADATA
                for (const dist of split.academyDistribution) {
                  if (dist.amount > 0 && dist.userId) {
                    // ═══════════════════════════════════════════════════════════════
                    // CALCULATION PROOF METADATA - For Admission Academy Share
                    // ═══════════════════════════════════════════════════════════════
                    const admissionProofMetadata = {
                      studentId: student._id,
                      studentName: student.studentName,
                      totalFee: initialPayment,
                      subjectFee: subjShare,
                      subject: subjName,
                      teacherDeductions: split.teacherAmount,
                      teacherName: subjectTeacher.name,
                      compensationType: split.compensationType,
                      netPoolBeforeSplit: split.academyAmount,
                      stakeholderPercentage: `${dist.percentage}% of Academy Pool`,
                      finalAmount: dist.amount,
                      calculationProof: `PKR ${subjShare} (${subjName}) - PKR ${split.teacherAmount} (teacher) = PKR ${split.academyAmount} × ${dist.percentage}% = PKR ${dist.amount}`,
                      eventType: "ADMISSION",
                      collectedAt: new Date(),
                    };

                    dailyRevenueEntries.push({
                      userId: dist.userId,
                      amount: dist.amount,
                      revenueType: "ACADEMY_SHARE",
                      classRef: classDoc?._id,
                      className: classDoc?.classTitle || student.class,
                      studentRef: student._id,
                      studentName: student.studentName,
                      splitDetails: admissionProofMetadata,
                    });

                    // Create FLOATING transaction for stakeholder
                    creditTransactions.push({
                      type: "INCOME",
                      category: "Academy Share",
                      stream: "ACADEMY_POOL",
                      amount: dist.amount,
                      description: `Admission academy share (${subjName}, ${dist.percentage}%): ${student.studentName} → ${dist.fullName}`,
                      collectedBy: req.user?._id,
                      status: "FLOATING",
                      date: new Date(),
                      splitDetails: admissionProofMetadata,
                    });

                    const user = await User.findById(dist.userId);
                    if (user) {
                      if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
                      user.walletBalance.floating = (user.walletBalance.floating || 0) + dist.amount;
                      await user.save();
                    }
                  }
                }
              }
            }
          }
        } else if (mode === "TUITION" && ownerPartnerTeachers.length > 0) {
          // Tuition mode: split among Owner/Partners
          console.log('✅ TUITION MODE - Processing splits for', ownerPartnerTeachers.length, 'owners/partners');
          const splits = await calculateTuitionSplit(initialPayment, ownerPartnerTeachers);
          console.log('📊 Splits:', JSON.stringify(splits));

          for (const split of splits) {
            console.log('💵 Processing split for', split.teacherName, ':', split.amount);
            if (split.teacherId) {
              const teacher = await Teacher.findById(split.teacherId);
              if (teacher) {
                if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
                teacher.balance.floating = (teacher.balance.floating || 0) + split.amount;
                await teacher.save();
                console.log('  ✓ Teacher balance updated:', teacher.name, teacher.balance.floating);
              }
            }
            if (split.userId) {
              const user = await User.findById(split.userId);
              if (user) {
                if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
                user.walletBalance.floating = (user.walletBalance.floating || 0) + split.amount;
                await user.save();
                console.log('  ✓ User wallet updated:', user.fullName, user.walletBalance.floating);
              }
            }
            totalTeacherShare += split.amount;

            // ═══════════════════════════════════════════════════════════════
            // CALCULATION PROOF METADATA - For Admission TUITION mode
            // ═══════════════════════════════════════════════════════════════
            const admissionTuitionProof = {
              studentId: student._id,
              studentName: student.studentName,
              totalFee: initialPayment,
              teacherDeductions: 0,
              netPoolBeforeSplit: initialPayment,
              stakeholderPercentage: `${split.percentage}% of Tuition Pool`,
              finalAmount: split.amount,
              role: split.role,
              revenueMode: "TUITION",
              calculationProof: `PKR ${initialPayment} (admission fee) × ${split.percentage}% (${split.role} share) = PKR ${split.amount}`,
              eventType: "ADMISSION",
              collectedAt: new Date(),
            };

            creditTransactions.push({
              type: "INCOME",
              category: "Tuition",
              stream: split.role === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO",
              amount: split.amount,
              description: `Admission fee: ${student.studentName} — ${split.teacherName} [${split.role}]`,
              collectedBy: req.user?._id,
              status: "FLOATING",
              date: new Date(),
              splitDetails: admissionTuitionProof,
            });

            dailyRevenueEntries.push({
              userId: split.userId,
              amount: split.amount,
              revenueType: "TUITION_SHARE",
              classRef: classDoc?._id,
              className: classDoc?.classTitle || student.class,
              studentRef: student._id,
              studentName: student.studentName,
              splitDetails: admissionTuitionProof,
            });
          }
        }

        // Create FeeRecord
        const feeRecord = await FeeRecord.create({
          student: student._id,
          studentName: student.studentName,
          class: classDoc?._id,
          className: classDoc?.classTitle || student.class,
          amount: initialPayment,
          month,
          collectedBy: req.user?._id,
          feeBreakdown: { admission: initialPayment },
          paymentMethod: "CASH",
          notes: "Admission fee",
        });

        // Update student paidAmount
        student.paidAmount = initialPayment;
        student.feeStatus = calculateFeeStatus(initialPayment, student.totalFee || 0);
        await student.save();

        // Save transactions
        if (creditTransactions.length > 0) {
          await Transaction.insertMany(creditTransactions);
        }

        // Create DailyRevenue entries
        if (dailyRevenueEntries.length > 0) {
          for (const entry of dailyRevenueEntries) {
            entry.feeRecordRef = feeRecord._id;
          }
          await createDailyRevenueEntries(dailyRevenueEntries);
        }

        // Update collector's totalCash
        if (req.user?._id) {
          const collector = await User.findById(req.user._id);
          if (collector) {
            collector.totalCash = (collector.totalCash || 0) + initialPayment;
            await collector.save();
          }
        }

      } catch (feeError) {
        console.error("Initial payment processing error:", feeError);
        // Student is created, but fee processing failed - continue anyway
      }
    }

    // Reload student with updated data
    const updatedStudent = await Student.findById(student._id);
    res.status(201).json({ success: true, data: updatedStudent });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// UPDATE student
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    Object.assign(student, req.body);

    const paidAmount = Number(student.paidAmount) || 0;
    const totalFee = Number(student.totalFee) || 0;
    student.feeStatus = calculateFeeStatus(paidAmount, totalFee).toLowerCase();

    await student.save();
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE student with CASCADE cleanup
exports.deleteStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    console.log(`🗑️  Deleting student: ${student.studentName} (${studentId})`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Mark all pending/unpaid FeeRecords as REFUNDED
    // ═══════════════════════════════════════════════════════════════
    const pendingFees = await FeeRecord.find({
      student: studentId,
      status: { $in: ["PENDING", "PARTIAL"] },
    });

    if (pendingFees.length > 0) {
      await FeeRecord.updateMany(
        { student: studentId, status: { $in: ["PENDING", "PARTIAL"] } },
        { $set: { status: "REFUNDED", refundedAt: new Date() } }
      );
      console.log(`   ✅ Marked ${pendingFees.length} pending fee records as REFUNDED`);
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Create REFUND transactions for paid fees
    // Reverse any FLOATING or VERIFIED income that hasn't been closed yet
    // ═══════════════════════════════════════════════════════════════
    const paidFees = await FeeRecord.find({
      student: studentId,
      status: "PAID",
    }).lean();

    let totalRefundAmount = 0;
    const refundTransactions = [];

    for (const fee of paidFees) {
      // Create refund transaction
      const refundTx = {
        type: "EXPENSE",
        category: "Refund",
        amount: fee.amount || 0,
        description: `Refund: ${student.studentName} (student deleted/withdrawn)`,
        date: new Date(),
        status: "VERIFIED",
        refundDetails: {
          studentId: student._id,
          studentName: student.studentName,
          feeRecordId: fee._id,
          originalAmount: fee.amount,
          reason: "Student deleted/withdrawn",
        },
      };

      refundTransactions.push(refundTx);
      totalRefundAmount += fee.amount || 0;

      // Mark fee record as REFUNDED
      await FeeRecord.findByIdAndUpdate(fee._id, {
        status: "REFUNDED",
        refundedAt: new Date(),
      });
    }

    if (refundTransactions.length > 0) {
      await Transaction.insertMany(refundTransactions);
      console.log(`   ✅ Created ${refundTransactions.length} REFUND transactions (total: ${totalRefundAmount} PKR)`);
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Reverse DailyRevenue entries (for Owner/Partner dashboards)
    // Create negative adjustment entries to deduct from their closeable amounts
    // ═══════════════════════════════════════════════════════════════
    const dailyRevenueEntries = await DailyRevenue.find({
      studentRef: studentId,
      status: "UNCOLLECTED", // Only reverse uncollected revenue
    }).lean();

    if (dailyRevenueEntries.length > 0) {
      const reversalEntries = dailyRevenueEntries.map((entry) => ({
        partner: entry.partner,
        date: new Date(),
        amount: -Math.abs(entry.amount), // Negative to deduct
        source: "TUITION",
        revenueType: "WITHDRAWAL_ADJUSTMENT",
        status: "UNCOLLECTED",
        studentRef: studentId,
        studentName: student.studentName,
        className: entry.className,
        splitDetails: {
          description: `Refund adjustment: ${student.studentName} withdrawn`,
          originalAmount: entry.amount,
          originalEntryId: entry._id,
        },
      }));

      await DailyRevenue.insertMany(reversalEntries);
      console.log(`   ✅ Created ${reversalEntries.length} reversal entries in DailyRevenue`);

      // Mark original entries as CANCELLED
      await DailyRevenue.updateMany(
        { studentRef: studentId, status: "UNCOLLECTED" },
        { $set: { status: "CANCELLED" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Mark student as Withdrawn instead of hard delete
    // (Better for audit trail - can still see historical data)
    // ═══════════════════════════════════════════════════════════════
    student.status = "Withdrawn";
    student.withdrawnAt = new Date();
    await student.save();

    console.log(`   ✅ Marked student as Withdrawn`);
    console.log(`\n✅ Student deletion cascade complete for ${student.studentName}`);

    res.json({
      success: true,
      message: "Student withdrawn and all financial records cleaned up",
      data: {
        studentId: student._id,
        studentName: student.studentName,
        refundedFees: paidFees.length,
        totalRefundAmount,
        reversedDailyRevenue: dailyRevenueEntries.length,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting student:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// COLLECT FEE — Revenue Engine v2 (Auto-detect Tuition vs Academy mode)
exports.collectFee = async (req, res) => {
  let debugStage = "init";
  try {
    const { id } = req.params;
    const { amount, month, paymentMethod, notes, subjects: selectedSubjects } = req.body;

    console.log("[collectFee] start", {
      studentId: id,
      amount,
      month,
      collector: req.user?.username,
      collectorRole: req.user?.role,
    });

    // --- VALIDATION ---
    if (!amount || !month) {
      return res
        .status(400)
        .json({ success: false, message: "Amount and month required" });
    }

    const student = await Student.findById(id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const amountNum = toSafeInt(amount);
    if (amountNum <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be greater than 0" });
    }

    // CRITICAL: Prevent over-collection
    const remainingBalance = (student.totalFee || 0) - (student.paidAmount || 0);
    if (amountNum > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Amount (Rs. ${amountNum.toLocaleString()}) exceeds remaining balance (Rs. ${remainingBalance.toLocaleString()})`,
      });
    }

    debugStage = "load-config";
    const config = await Configuration.findOne();

    // ── Look up class for revenue mode detection ──
    let classDoc = null;
    if (student.classRef) {
      classDoc = await Class.findById(student.classRef).populate("subjectTeachers.teacherId").lean();
    }
    if (!classDoc && student.class) {
      classDoc = await Class.findOne({
        $or: [{ classTitle: student.class }, { className: student.class }],
      }).populate("subjectTeachers.teacherId").lean();
    }

    // ── Auto-detect revenue mode ──
    debugStage = "detect-revenue-mode";
    const { mode, ownerPartnerTeachers, regularTeachers } = await detectClassRevenueMode(classDoc);
    console.log("[collectFee] mode", {
      mode,
      ownerPartnerTeachers: ownerPartnerTeachers.length,
      regularTeachers: regularTeachers.length,
      classId: classDoc?._id,
      className: classDoc?.classTitle || student.class,
    });

    let totalTeacherShare = 0;
    let totalAcademyShare = 0;
    let totalOwnerPartnerShare = 0;
    const creditTransactions = [];
    const dailyRevenueEntries = [];
    const feeTeachers = []; // For FeeRecord.teachers array
    const academyDistributions = [];
    const subjectBreakdown = [];

    // Pre-calculate student subjects
    const selectedSubjectSet = new Set(
      Array.isArray(selectedSubjects)
        ? selectedSubjects
            .map((s) => {
              if (typeof s === "string") return s;
              if (s && typeof s === "object") return s.name;
              return "";
            })
            .map((s) => String(s || "").toLowerCase().trim())
            .filter(Boolean)
        : []
    );
    const studentSubjectObjects = (student.subjects || [])
      .map((s) => {
        if (typeof s === "string") {
          return { name: s, fee: 0, teacherId: null, teacherName: null };
        }
        return {
          name: s?.name,
          fee: toSafeInt(s?.fee),
          teacherId: normalizeTeacherId(s?.teacherId),
          teacherName: s?.teacherName || null,
        };
      })
      .filter((s) => s.name);
    const payableSubjects =
      selectedSubjectSet.size > 0
        ? studentSubjectObjects.filter((s) =>
            selectedSubjectSet.has(String(s.name || "").toLowerCase().trim())
          )
        : studentSubjectObjects;

    const OLD_FEE_STATUS = student.feeStatus;

    // ═════════════════════════════════════════════════════════════════
    // CASE 1: PURE TUITION MODE (ALL TEACHERS ARE OWNER/PARTNER)
    // ═════════════════════════════════════════════════════════════════
    if (mode === "TUITION" && regularTeachers.length === 0) {
      const splits = await calculateTuitionSplit(amountNum, ownerPartnerTeachers);

      for (const split of splits) {
        // Update Teacher balance
        if (split.teacherId) {
          const teacher = await Teacher.findById(split.teacherId);
          if (teacher) {
            if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
            teacher.balance.floating = (teacher.balance.floating || 0) + split.amount;
            await teacher.save();
            feeTeachers.push({
              teacherId: teacher._id,
              teacherName: teacher.name,
              compensationType: "percentage",
              teacherShare: split.amount,
              role: split.role,
              isPartner: true,
            });
          }
        }

        // Update User wallet
        if (split.userId) {
          const user = await User.findById(split.userId);
          if (user) {
            if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
            user.walletBalance.floating = (user.walletBalance.floating || 0) + split.amount;
            await user.save();
          }
        }

        totalTeacherShare += split.amount;

        // ═══════════════════════════════════════════════════════════════
        // CALCULATION PROOF METADATA - Full audit trail for TUITION mode
        // ═══════════════════════════════════════════════════════════════
        const tuitionProofMetadata = {
          // Who paid?
          studentId: student._id,
          studentName: student.studentName,
          // What was the gross amount?
          totalFee: amountNum,
          // TUITION mode = 100% to Owner/Partners (no external teacher deductions)
          teacherDeductions: 0,
          // Net pool = full amount (split among owners/partners)
          netPoolBeforeSplit: amountNum,
          // Stakeholder calculation
          stakeholderPercentage: `${split.percentage}% of Tuition Pool`,
          finalAmount: split.amount,
          // Additional context
          role: split.role,
          revenueMode: "TUITION",
          // Audit trail
          calculationProof: `PKR ${amountNum} (total fee) × ${split.percentage}% (${split.role} share) = PKR ${split.amount}`,
          month: month,
          collectedAt: new Date(),
        };

        dailyRevenueEntries.push({
          userId: split.userId,
          amount: split.amount,
          revenueType: "TUITION_SHARE",
          classRef: classDoc?._id,
          className: classDoc?.classTitle || student.class,
          studentRef: student._id,
          studentName: student.studentName,
          splitDetails: tuitionProofMetadata,
        });

        creditTransactions.push({
          type: "INCOME",
          category: "Tuition",
          stream: split.role === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO",
          amount: split.amount,
          description: `Tuition 100%: ${student.studentName} (${month}) → ${split.teacherName}`,
          collectedBy: req.user?._id,
          status: "FLOATING",
          date: new Date(),
          splitDetails: tuitionProofMetadata,
        });
      }
    }

    // ═════════════════════════════════════════════════════════════════
    // CASE 2: ACADEMY or MIXED MODE (MULTIPLE TEACHERS WITH DIFFERENT COMPENSATION)
    // ═════════════════════════════════════════════════════════════════
    else {
      const hasSubjectTeachers =
        payableSubjects.length > 0 &&
        ((classDoc?.subjectTeachers?.length || 0) > 0 ||
          payableSubjects.some((s) => normalizeTeacherId(s.teacherId)));

      if (hasSubjectTeachers) {
        // Process by subject to handle multiple teachers per subject
        const totalSubjectFees = payableSubjects.reduce((sum, s) => {
          return sum + toSafeInt(s.fee);
        }, 0);

        let allocatedSoFar = 0;
        for (let idx = 0; idx < payableSubjects.length; idx++) {
          const subj = payableSubjects[idx];
          const subjName = subj.name;
          const subjFee = toSafeInt(subj.fee);
          const explicitTeacherId = normalizeTeacherId(subj.teacherId);

          let localTeacherShare = 0;
          let localAcademyShare = 0;
          let localOwnerPartnerShare = 0;
          const localDistributionEntries = [];
          let primarySubjectTeacherId = explicitTeacherId || null;
          let primarySubjectTeacherName = subj.teacherName || null;
          let subjectCompensationType = "percentage";

          let subjShare;
          if (idx === payableSubjects.length - 1) {
            subjShare = amountNum - allocatedSoFar; // Remainder to last subject
          } else {
            subjShare =
              totalSubjectFees > 0
                ? Math.floor((subjFee * amountNum) / totalSubjectFees)
                : Math.floor(amountNum / payableSubjects.length);
          }
          allocatedSoFar += subjShare;

          if (subjShare <= 0) {
            continue;
          }

          // Prefer admission-level explicit teacher mapping; fallback to class subject mapping.
          let subjectTeacherEntries = [];
          if (explicitTeacherId) {
            const explicitTeacher = await Teacher.findById(explicitTeacherId).lean();
            subjectTeacherEntries = [
              {
                subject: subjName,
                teacherId: explicitTeacher?._id || explicitTeacherId,
                teacherName: subj.teacherName || explicitTeacher?.name || "",
              },
            ];
            if (!primarySubjectTeacherName && explicitTeacher?.name) {
              primarySubjectTeacherName = explicitTeacher.name;
            }
          } else {
            subjectTeacherEntries = (classDoc?.subjectTeachers || []).filter(
              (st) => st.subject && st.subject.toLowerCase().trim() === subjName.toLowerCase().trim()
            );
          }

          if (subjectTeacherEntries.length === 0) {
            // NO TEACHER FOR THIS SUBJECT → all to academy
            const fallbackAcademyDistribution = await distributeAcademyShare(subjShare, config);
            for (const dist of fallbackAcademyDistribution) {
              academyDistributions.push({
                userId: dist.userId,
                fullName: dist.fullName,
                role: dist.role,
                percentage: dist.percentage,
                amount: dist.amount,
                subject: subjName,
              });

              if (dist.amount > 0 && dist.userId) {
                const user = await User.findById(dist.userId);
                if (user) {
                  if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
                  user.walletBalance.floating = (user.walletBalance.floating || 0) + dist.amount;
                  await user.save();
                }

                localDistributionEntries.push({
                  recipientType: dist.role === "OWNER" ? "OWNER" : "PARTNER",
                  recipientId: dist.userId,
                  amount: dist.amount,
                  note: `Academy share for ${subjName}`,
                });

                dailyRevenueEntries.push({
                  userId: dist.userId,
                  amount: dist.amount,
                  revenueType: "ACADEMY_SHARE",
                  classRef: classDoc?._id,
                  className: classDoc?.classTitle || student.class,
                  studentRef: student._id,
                  studentName: student.studentName,
                  subject: subjName,
                  splitDetails: {
                    totalFee: amountNum,
                    subjectFee: subjShare,
                    description: `Academy fallback (${subjName}): ${student.studentName} → ${dist.fullName}`,
                  },
                });
              }
            }

            localAcademyShare += subjShare;
            totalAcademyShare += subjShare;

            subjectBreakdown.push({
              subject: subjName,
              subjectPrice: subjShare,
              teacherShare: localTeacherShare,
              academyShare: localAcademyShare,
              ownerPartnerShare: localOwnerPartnerShare,
              compensationType: "percentage",
              teacherId: primarySubjectTeacherId,
              teacherName: primarySubjectTeacherName,
              distributionEntries: localDistributionEntries,
              distributed: true,
            });
            continue;
          }

          // Prepare teacher data for splitFeeAmongTeachers
          const teachersForSubject = [];
          for (const stEntry of subjectTeacherEntries) {
            const normalizedTeacherId = normalizeTeacherId(stEntry.teacherId);
            if (normalizedTeacherId) {
              const teacher =
                typeof stEntry.teacherId === "object" && stEntry.teacherId?._id
                  ? stEntry.teacherId
                  : await Teacher.findById(normalizedTeacherId);
              if (teacher) {
                teachersForSubject.push({
                  teacherId: normalizedTeacherId,
                  teacher,
                  isPartner: false,
                });
              }
            }
          }

          // Check if any teacher for this subject is Owner/Partner
          let hasPartnerTeacher = false;
          for (const tfs of teachersForSubject) {
            const normalizedTeacherId = normalizeTeacherId(tfs.teacherId);
            if (!normalizedTeacherId) continue;
            const tUser = await User.findOne({ teacherId: normalizedTeacherId });
            if (tUser && (tUser.role === "OWNER" || tUser.role === "PARTNER")) {
              hasPartnerTeacher = true;
              break;
            }
          }

          if (hasPartnerTeacher) {
            // ── TUITION for Owner/Partners ──
            const uniqueTeachers = [];
            const seenIds = new Set();
            for (const stEntry of subjectTeacherEntries) {
              const normalizedTeacherId = normalizeTeacherId(stEntry.teacherId);
              if (normalizedTeacherId && !seenIds.has(normalizedTeacherId)) {
                const tUser = await User.findOne({ teacherId: normalizedTeacherId });
                if (tUser && (tUser.role === "OWNER" || tUser.role === "PARTNER")) {
                  uniqueTeachers.push({
                    teacherId: normalizedTeacherId,
                    userId: tUser._id,
                    teacherName: stEntry.teacherName || tUser.fullName,
                    role: tUser.role,
                  });
                  seenIds.add(normalizedTeacherId);
                }
              }
            }

            if (uniqueTeachers.length > 0) {
              subjectCompensationType = "owner-partner";
              const perTeacher = Math.floor(subjShare / uniqueTeachers.length);
              let remainder = subjShare - (perTeacher * uniqueTeachers.length);

              for (let i = 0; i < uniqueTeachers.length; i++) {
                const ut = uniqueTeachers[i];
                const amount = perTeacher + (i === 0 ? remainder : 0);

                // Update Teacher balance
                const teacher = await Teacher.findById(ut.teacherId);
                if (teacher) {
                  if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
                  teacher.balance.floating = (teacher.balance.floating || 0) + amount;
                  await teacher.save();
                  
                  feeTeachers.push({
                    teacherId: teacher._id,
                    teacherName: teacher.name,
                    compensationType: "percentage",
                    teacherShare: amount,
                    role: ut.role,
                    isPartner: true,
                    subject: subjName,
                  });
                }

                // Update User wallet
                if (ut.userId) {
                  const user = await User.findById(ut.userId);
                  if (user) {
                    if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
                    user.walletBalance.floating = (user.walletBalance.floating || 0) + amount;
                    await user.save();
                  }
                }

                totalTeacherShare += amount;
                totalOwnerPartnerShare += amount;
                localOwnerPartnerShare += amount;
                if (!primarySubjectTeacherId) {
                  primarySubjectTeacherId = ut.teacherId;
                  primarySubjectTeacherName = ut.teacherName;
                }
                localDistributionEntries.push({
                  recipientType: ut.role === "OWNER" ? "OWNER" : "PARTNER",
                  recipientId: ut.userId,
                  amount,
                  note: `${subjName} partner-owned subject share`,
                });
                dailyRevenueEntries.push({
                  userId: ut.userId,
                  amount: amount,
                  revenueType: "TUITION_SHARE",
                  classRef: classDoc?._id,
                  className: classDoc?.classTitle || student.class,
                  studentRef: student._id,
                  studentName: student.studentName,
                  subject: subjName,
                  splitDetails: {
                    description: `TUITION (${subjName}): ${student.studentName} → ${ut.teacherName}`,
                  },
                });

                creditTransactions.push({
                  type: "INCOME",
                  category: "Tuition",
                  stream: ut.role === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO",
                  amount: amount,
                  description: `Tuition (${subjName}): ${student.studentName} (${month}) → ${ut.teacherName}`,
                  collectedBy: req.user?._id,
                  status: "FLOATING",
                  date: new Date(),
                  splitDetails: {
                    teacherId: ut.teacherId,
                    teacherName: ut.teacherName,
                    studentId: student._id,
                    studentName: student.studentName,
                    subject: subjName,
                    subjectFee: subjShare,
                    month: month,
                  },
                });
              }
            }
          } else {
            // ── ACADEMY MODE: respect each teacher's compensation type ──
            const split = await splitFeeAmongTeachers(subjShare, teachersForSubject, config);
            const subjectCompTypes = Array.from(
              new Set(
                (split.teacherPayouts || [])
                  .map((p) => p.compensationType)
                  .filter(Boolean),
              ),
            );
            if (subjectCompTypes.length === 1) {
              subjectCompensationType = subjectCompTypes[0];
            } else if (subjectCompTypes.length > 1) {
              subjectCompensationType = "hybrid";
            }

            // Record teacher payouts
            for (const payout of split.teacherPayouts) {
              if (payout.amount > 0) {
                const teacher = await Teacher.findById(payout.teacherId);
                if (teacher) {
                  if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
                  teacher.balance.floating = (teacher.balance.floating || 0) + payout.amount;
                  await teacher.save();

                  feeTeachers.push({
                    teacherId: teacher._id,
                    teacherName: teacher.name,
                    compensationType: payout.compensationType,
                    teacherShare: payout.amount,
                    reason: payout.reason,
                    subject: subjName,
                    role: "TEACHER",
                  });

                  creditTransactions.push({
                    type: "INCOME",
                    category: "Tuition",
                    stream: "STAFF_TUITION",
                    amount: payout.amount,
                    description: `${subjName} teacher share: ${student.studentName} (${month})`,
                    collectedBy: req.user?._id,
                    status: "FLOATING",
                    date: new Date(),
                    splitDetails: {
                      teacherId: payout.teacherId,
                      teacherName: payout.teacherName || teacher.name,
                      studentId: student._id,
                      studentName: student.studentName,
                      subject: subjName,
                      subjectFee: subjShare,
                      month: month,
                      compensationType: payout.compensationType,
                    },
                  });
                }
                totalTeacherShare += payout.amount;
                localTeacherShare += payout.amount;
                if (!primarySubjectTeacherId) {
                  primarySubjectTeacherId = payout.teacherId;
                  primarySubjectTeacherName = payout.teacherName || null;
                }
                localDistributionEntries.push({
                  recipientType: "TEACHER",
                  recipientId: payout.teacherId,
                  amount: payout.amount,
                  note: `${subjName} teacher payout (${payout.compensationType})`,
                });
              }
            }

            // Academy share distribution
            totalAcademyShare += split.academyAmount;
            localAcademyShare += split.academyAmount;

            // Calculate teacher deductions for this subject for audit/proof
            const subjectTeacherDeductions = split.teacherPayouts.reduce((sum, p) => sum + p.amount, 0);

            for (const dist of split.academyDistribution) {
              academyDistributions.push({
                userId: dist.userId,
                fullName: dist.fullName,
                role: dist.role,
                percentage: dist.percentage,
                amount: dist.amount,
                subject: subjName,
              });

              if (dist.amount > 0 && dist.userId) {
                const user = await User.findById(dist.userId);
                if (user) {
                  if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
                  user.walletBalance.floating = (user.walletBalance.floating || 0) + dist.amount;
                  await user.save();
                }

                // ═══════════════════════════════════════════════════════════════
                // CALCULATION PROOF METADATA - Full audit trail for stakeholders
                // ═══════════════════════════════════════════════════════════════
                const proofMetadata = {
                  // Who paid?
                  studentId: student._id,
                  studentName: student.studentName,
                  // What was the gross amount?
                  totalFee: amountNum,
                  subjectFee: subjShare,
                  subject: subjName,
                  // Teacher deductions (before academy split)
                  teacherDeductions: subjectTeacherDeductions,
                  teacherPayouts: split.teacherPayouts.map(p => ({
                    teacherName: p.teacherName,
                    amount: p.amount,
                    compensationType: p.compensationType,
                    reason: p.reason,
                  })),
                  // Net pool before stakeholder split
                  netPoolBeforeSplit: split.academyAmount,
                  // Stakeholder calculation
                  stakeholderPercentage: `${dist.percentage}% of Academy Pool`,
                  finalAmount: dist.amount,
                  // Audit trail
                  calculationProof: `PKR ${subjShare} (${subjName}) - PKR ${subjectTeacherDeductions} (teacher cuts) = PKR ${split.academyAmount} (pool) × ${dist.percentage}% = PKR ${dist.amount}`,
                  month: month,
                  collectedAt: new Date(),
                };

                dailyRevenueEntries.push({
                  userId: dist.userId,
                  amount: dist.amount,
                  revenueType: "ACADEMY_SHARE",
                  classRef: classDoc?._id,
                  className: classDoc?.classTitle || student.class,
                  studentRef: student._id,
                  studentName: student.studentName,
                  subject: subjName,
                  splitDetails: proofMetadata,
                });

                localDistributionEntries.push({
                  recipientType: dist.role === "OWNER" ? "OWNER" : "PARTNER",
                  recipientId: dist.userId,
                  amount: dist.amount,
                  note: `${subjName} academy pool distribution`,
                });

                creditTransactions.push({
                  type: "INCOME",
                  category: "Academy Share",
                  stream: "ACADEMY_POOL",
                  amount: dist.amount,
                  description: `Academy share (${subjName}, ${dist.percentage}%): ${student.studentName} → ${dist.fullName}`,
                  collectedBy: req.user?._id,
                  status: "FLOATING",
                  date: new Date(),
                  splitDetails: proofMetadata,
                });
              }
            }
          }

          subjectBreakdown.push({
            subject: subjName,
            subjectPrice: subjShare,
            teacherShare: localTeacherShare,
            academyShare: localAcademyShare,
            ownerPartnerShare: localOwnerPartnerShare,
            compensationType: localOwnerPartnerShare > 0 ? "owner-partner" : subjectCompensationType,
            teacherId: primarySubjectTeacherId,
            teacherName: primarySubjectTeacherName,
            distributionEntries: localDistributionEntries,
            distributed: true,
          });
        }
      } else {
        // Fallback: no subject mapping
        totalAcademyShare = amountNum;
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // UPDATE STUDENT RECORD
    // ───────────────────────────────────────────────────────────────────────
    student.paidAmount = (student.paidAmount || 0) + amountNum;

    // Calculate and update feeStatus
    if (student.paidAmount >= student.totalFee) {
      student.feeStatus = "paid";
    } else if (student.paidAmount > 0) {
      student.feeStatus = "partial";
    } else {
      student.feeStatus = "pending";
    }

    await student.save();

    // ───────────────────────────────────────────────────────────────────────
    // CREATE FEERECORD WITH COMPREHENSIVE TRACKING
    // ───────────────────────────────────────────────────────────────────────
    debugStage = "create-feerecord";
    const feeRecord = await FeeRecord.create({
      student: student._id,
      studentName: student.studentName,
      class: classDoc?._id,
      className: classDoc?.classTitle || student.class,
      amount: amountNum,
      month,
      status: "PAID",
      collectedBy: req.user?._id,
      collectedByName: req.user?.fullName || "Admin",
      teacher: feeTeachers.length > 0 ? feeTeachers[0].teacherId : null,
      teacherName: feeTeachers.length > 0 ? feeTeachers[0].teacherName : null,
      isPartnerTeacher: feeTeachers.some(t => t.isPartner),
      teachers: feeTeachers,
      splitBreakdown: {
        teacherShare: Math.max(0, totalTeacherShare - totalOwnerPartnerShare),
        academyShare: totalAcademyShare,
        ownerPartnerShare: totalOwnerPartnerShare,
        teacherPercentage: totalTeacherShare > 0 ? Math.round((totalTeacherShare / amountNum) * 100) : 0,
        academyPercentage: totalAcademyShare > 0 ? Math.round((totalAcademyShare / amountNum) * 100) : 0,
        totalTeachers: feeTeachers.length,
      },
      subjectBreakdown,
      academyDistribution: academyDistributions,
      paymentMethod,
      notes,
      revenueSource: "subject-based-pricing",
      distributionCompleted: true,
      distributionCompletedAt: new Date(),
    });

    // ───────────────────────────────────────────────────────────────────────
    // CREATE TRANSACTIONS
    // ───────────────────────────────────────────────────────────────────────
    debugStage = "create-transactions";
    if (creditTransactions.length > 0) {
      console.log("[collectFee] creating income transactions", {
        count: creditTransactions.length,
      });
      await Transaction.insertMany(creditTransactions);
    }

    // ───────────────────────────────────────────────────────────────────────
    // CREATE DAILY REVENUE ENTRIES
    // ───────────────────────────────────────────────────────────────────────
    debugStage = "create-daily-revenue";
    if (dailyRevenueEntries.length > 0) {
      const enriched = dailyRevenueEntries.map((e) => ({
        ...e,
        feeRecordRef: feeRecord._id,
      }));

      // IMPORTANT: use revenueEngine helper to map userId -> partner and populate required fields.
      await createDailyRevenueEntries(enriched);

      console.log("[collectFee] daily revenue entries created", {
        requested: dailyRevenueEntries.length,
        feeRecordId: feeRecord._id,
      });
    }

    // ───────────────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ───────────────────────────────────────────────────────────────────────
    try {
      const owner = await User.findOne({ role: "OWNER" });
      if (owner) {
        const newRemaining = (student.totalFee || 0) - student.paidAmount;
        await Notification.create({
          recipient: owner._id,
          recipientRole: "OWNER",
          message: `Fee collected from ${student.studentName}: Rs. ${amountNum.toLocaleString()} | Remaining: Rs. ${newRemaining.toLocaleString()}`,
          type: "FINANCE",
          relatedId: feeRecord._id.toString(),
        });

        if (student.feeStatus === "paid" && OLD_FEE_STATUS !== "paid") {
          await Notification.create({
            recipient: owner._id,
            recipientRole: "OWNER",
            message: `✅ ${student.studentName} has FULLY PAID their fee of Rs. ${student.totalFee.toLocaleString()}`,
            type: "FINANCE",
            relatedId: student._id.toString(),
          });
        }
      }
    } catch (e) {
      console.log("Notification error:", e.message);
    }

    // ───────────────────────────────────────────────────────────────────────
    // RESPONSE
    // ───────────────────────────────────────────────────────────────────────
    res.status(201).json({
      success: true,
      message: `Fee collected! Receipt: ${feeRecord.receiptNumber}`,
      data: {
        feeRecord: {
          _id: feeRecord._id,
          receiptNumber: feeRecord.receiptNumber,
          amount: feeRecord.amount,
          studentName: feeRecord.studentName,
          month: feeRecord.month,
          teachers: feeTeachers.length,
          academyDistributions: academyDistributions.length,
        },
        split: {
          teacherShare: Math.max(0, totalTeacherShare - totalOwnerPartnerShare),
          ownerPartnerShare: totalOwnerPartnerShare,
          academyShare: totalAcademyShare,
          teacherPercentage: totalTeacherShare > 0 ? Math.round((totalTeacherShare / amountNum) * 100) : 0,
        },
        studentRemaining: (student.totalFee || 0) - student.paidAmount,
        transactionsCreated: creditTransactions.length,
        dailyRevenueEntries: dailyRevenueEntries.length,
      },
    });
  } catch (error) {
    console.error("CollectFee Error:", {
      stage: debugStage,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

exports.getFeeHistory = async (req, res) => {
  try {
    const records = await FeeRecord.find({ student: req.params.id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.trackPrint = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const version = (student.printHistory?.length || 0) + 1;
    const receiptId = `TOKEN-${student.studentId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}-V${version}`;

    student.printHistory = student.printHistory || [];
    student.printHistory.push({ receiptId, printedAt: new Date(), version });
    await student.save();

    // Enrich subjects with teacher names from the Class model
    let enrichedStudent = student.toObject();
    try {
      let classDoc = null;
      if (student.classRef) {
        classDoc = await Class.findById(student.classRef);
      }
      if (!classDoc && student.class) {
        classDoc = await Class.findOne({ classTitle: student.class });
      }
      if (!classDoc && student.class) {
        // Fallback: try regex match on classTitle
        classDoc = await Class.findOne({ classTitle: { $regex: student.class, $options: "i" } });
      }

      if (classDoc && classDoc.subjectTeachers && classDoc.subjectTeachers.length > 0) {
        const teacherMap = {};
        classDoc.subjectTeachers.forEach((st) => {
          if (st.subject && st.teacherName) {
            teacherMap[st.subject.toLowerCase().trim()] = st.teacherName;
          }
        });

        enrichedStudent.subjects = (enrichedStudent.subjects || []).map((sub) => ({
          ...sub,
          teacherName: teacherMap[sub.name.toLowerCase().trim()] || null,
        }));
        console.log(`📄 Receipt enriched with teacher names for ${student.studentId}`);
      }

      // Enrich with timetable schedule (Subject / Teacher / Time)
      if (classDoc) {
        const classId = classDoc._id;
        const timetableEntries = await Timetable.find({ classId, status: "active" }).populate("teacherId", "name");

        // Deduplicate by subject — pick one representative entry per subject
        const subjectMap = {};
        for (const entry of timetableEntries) {
          const subjectKey = entry.subject.toLowerCase().trim();
          if (!subjectMap[subjectKey]) {
            subjectMap[subjectKey] = {
              subject: entry.subject,
              teacherName: entry.teacherId?.name || "—",
              time: `${entry.startTime} – ${entry.endTime}`,
              days: [entry.day],
            };
          } else {
            if (!subjectMap[subjectKey].days.includes(entry.day)) {
              subjectMap[subjectKey].days.push(entry.day);
            }
          }
        }
        enrichedStudent.schedule = Object.values(subjectMap);
        console.log(`📅 Receipt enriched with ${enrichedStudent.schedule.length} schedule entries for ${student.studentId}`);
      }
    } catch (enrichErr) {
      console.log("Subject teacher enrichment skipped:", enrichErr.message);
    }

    res.json({
      success: true,
      data: {
        receiptId,
        version,
        isOriginal: version === 1,
        printedAt: new Date(),
        student: enrichedStudent,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.findByToken = async (req, res) => {
  try {
    const student = await Student.findOne({
      "printHistory.receiptId": req.params.token,
    });
    if (!student)
      return res.status(404).json({ success: false, message: "Invalid token" });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
