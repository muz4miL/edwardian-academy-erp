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

                // Update Owner/Partner wallets for academy share
                for (const dist of split.academyDistribution) {
                  if (dist.amount > 0 && dist.userId) {
                    dailyRevenueEntries.push({
                      userId: dist.userId,
                      amount: dist.amount,
                      revenueType: "ACADEMY_SHARE",
                      classRef: classDoc?._id,
                      className: classDoc?.classTitle || student.class,
                      studentRef: student._id,
                      studentName: student.studentName,
                      splitDetails: {
                        description: `Academy share (${dist.percentage}%): Admission - ${student.studentName}`,
                      },
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
          const splits = calculateTuitionSplit(initialPayment, ownerPartnerTeachers);
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

            creditTransactions.push({
              type: "INCOME",
              category: "Tuition",
              stream: split.role === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO",
              amount: split.amount,
              description: `Admission fee: ${student.studentName} — ${split.teacherName} [${split.role}]`,
              collectedBy: req.user?._id,
              status: "FLOATING",
              date: new Date(),
            });

            dailyRevenueEntries.push({
              userId: split.userId,
              amount: split.amount,
              revenueType: "TUITION_SHARE",
              classRef: classDoc?._id,
              className: classDoc?.classTitle || student.class,
              studentRef: student._id,
              studentName: student.studentName,
              splitDetails: {
                description: `Admission tuition: ${student.studentName} — ${split.teacherName}`,
              },
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

// DELETE student
exports.deleteStudent = async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Student deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// COLLECT FEE — Revenue Engine v2 (Auto-detect Tuition vs Academy mode)
exports.collectFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, month, paymentMethod, notes } = req.body;

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

    const amountNum = Number(amount);
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
    const { mode, ownerPartnerTeachers, regularTeachers } = await detectClassRevenueMode(classDoc);

    let totalTeacherShare = 0;
    let totalAcademyShare = 0;
    const creditTransactions = [];
    const dailyRevenueEntries = [];
    const feeTeachers = []; // For FeeRecord.teachers array
    const academyDistributions = [];

    // Pre-calculate student subjects
    const studentSubjects = (student.subjects || []).filter(
      (s) => (typeof s === "string" ? s : s.name)
    );

    const OLD_FEE_STATUS = student.feeStatus;

    // ═════════════════════════════════════════════════════════════════
    // CASE 1: PURE TUITION MODE (ALL TEACHERS ARE OWNER/PARTNER)
    // ═════════════════════════════════════════════════════════════════
    if (mode === "TUITION" && regularTeachers.length === 0) {
      const splits = calculateTuitionSplit(amountNum, ownerPartnerTeachers);

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
        dailyRevenueEntries.push({
          userId: split.userId,
          amount: split.amount,
          revenueType: "TUITION_SHARE",
          classRef: classDoc?._id,
          className: classDoc?.classTitle || student.class,
          studentRef: student._id,
          studentName: student.studentName,
          splitDetails: {
            description: `100% TUITION: ${student.studentName} (${month}) → ${split.teacherName}`,
          },
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
          splitDetails: {
            teacherId: split.teacherId,
            teacherName: split.teacherName,
            studentId: student._id,
            studentName: student.studentName,
            month: month,
            percentage: split.percentage,
          },
        });
      }
    }

    // ═════════════════════════════════════════════════════════════════
    // CASE 2: ACADEMY or MIXED MODE (MULTIPLE TEACHERS WITH DIFFERENT COMPENSATION)
    // ═════════════════════════════════════════════════════════════════
    else {
      const hasSubjectTeachers = classDoc?.subjectTeachers?.length > 0 && studentSubjects.length > 0;

      if (hasSubjectTeachers) {
        // Process by subject to handle multiple teachers per subject
        const totalSubjectFees = studentSubjects.reduce((sum, s) => {
          return sum + (typeof s === "object" ? s.fee || 0 : 0);
        }, 0);

        let allocatedSoFar = 0;
        for (let idx = 0; idx < studentSubjects.length; idx++) {
          const subj = studentSubjects[idx];
          const subjName = typeof subj === "string" ? subj : subj.name;
          const subjFee = typeof subj === "object" ? subj.fee || 0 : 0;

          let subjShare;
          if (idx === studentSubjects.length - 1) {
            subjShare = amountNum - allocatedSoFar; // Remainder to last subject
          } else {
            subjShare =
              totalSubjectFees > 0
                ? Math.round((subjFee / totalSubjectFees) * amountNum)
                : Math.round(amountNum / studentSubjects.length);
          }
          allocatedSoFar += subjShare;

          if (subjShare <= 0) continue;

          // Find all teachers for this subject
          const subjectTeacherEntries = classDoc.subjectTeachers.filter(
            (st) => st.subject && st.subject.toLowerCase().trim() === subjName.toLowerCase().trim()
          );

          if (subjectTeacherEntries.length === 0) {
            // NO TEACHER FOR THIS SUBJECT → all to academy
            totalAcademyShare += subjShare;
            continue;
          }

          // Prepare teacher data for splitFeeAmongTeachers
          const teachersForSubject = [];
          for (const stEntry of subjectTeacherEntries) {
            if (stEntry.teacherId) {
              const teacher = typeof stEntry.teacherId === 'object' 
                ? stEntry.teacherId 
                : await Teacher.findById(stEntry.teacherId);
              if (teacher) {
                teachersForSubject.push({
                  teacherId: teacher._id,
                  teacher,
                  isPartner: false,
                });
              }
            }
          }

          // Check if any teacher for this subject is Owner/Partner
          let hasPartnerTeacher = false;
          for (const tfs of teachersForSubject) {
            const tUser = await User.findOne({ teacherId: tfs.teacherId });
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
              if (stEntry.teacherId && !seenIds.has(stEntry.teacherId.toString())) {
                const tUser = await User.findOne({ teacherId: stEntry.teacherId });
                if (tUser && (tUser.role === "OWNER" || tUser.role === "PARTNER")) {
                  uniqueTeachers.push({
                    teacherId: stEntry.teacherId,
                    userId: tUser._id,
                    teacherName: stEntry.teacherName || tUser.fullName,
                    role: tUser.role,
                  });
                  seenIds.add(stEntry.teacherId.toString());
                }
              }
            }

            if (uniqueTeachers.length > 0) {
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
                dailyRevenueEntries.push({
                  userId: ut.userId,
                  amount: amount,
                  revenueType: "TUITION_SHARE",
                  classRef: classDoc?._id,
                  className: classDoc?.classTitle || student.class,
                  studentRef: student._id,
                  studentName: student.studentName,
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
              }
            }

            // Academy share distribution
            totalAcademyShare += split.academyAmount;
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

                dailyRevenueEntries.push({
                  userId: dist.userId,
                  amount: dist.amount,
                  revenueType: "ACADEMY_SHARE",
                  classRef: classDoc?._id,
                  className: classDoc?.classTitle || student.class,
                  studentRef: student._id,
                  studentName: student.studentName,
                  splitDetails: {
                    description: `Academy share (${dist.percentage}%, ${subjName}): ${student.studentName} → ${dist.fullName}`,
                  },
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
                });
              }
            }
          }
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
        teacherShare: totalTeacherShare,
        academyShare: totalAcademyShare,
        teacherPercentage: totalTeacherShare > 0 ? Math.round((totalTeacherShare / amountNum) * 100) : 0,
        academyPercentage: totalAcademyShare > 0 ? Math.round((totalAcademyShare / amountNum) * 100) : 0,
        totalTeachers: feeTeachers.length,
      },
      academyDistribution: academyDistributions,
      paymentMethod,
      notes,
      revenueSource: mode === "TUITION" ? "tuition-auto" : "academy-teacher-split",
    });

    // ───────────────────────────────────────────────────────────────────────
    // CREATE TRANSACTIONS
    // ───────────────────────────────────────────────────────────────────────
    if (creditTransactions.length > 0) {
      await Transaction.insertMany(creditTransactions);
    }

    // ───────────────────────────────────────────────────────────────────────
    // CREATE DAILY REVENUE ENTRIES
    // ───────────────────────────────────────────────────────────────────────
    if (dailyRevenueEntries.length > 0) {
      const enriched = dailyRevenueEntries.map(e => ({
        ...e,
        feeRecordRef: feeRecord._id,
      }));
      await DailyRevenue.insertMany(enriched);
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
          teacherShare: totalTeacherShare,
          academyShare: totalAcademyShare,
          teacherPercentage: totalTeacherShare > 0 ? Math.round((totalTeacherShare / amountNum) * 100) : 0,
        },
        studentRemaining: (student.totalFee || 0) - student.paidAmount,
        transactionsCreated: creditTransactions.length,
        dailyRevenueEntries: dailyRevenueEntries.length,
      },
    });
  } catch (error) {
    console.error("CollectFee Error:", error);
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
