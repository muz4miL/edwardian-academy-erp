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
  splitFeeAmongTeachers,
  distributeAcademyShare,
  distributeAcademyShareDeferred,
  createDailyRevenueEntries,
} = require("../helpers/revenueEngine");
const AcademySettlement = require("../models/AcademySettlement");

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

// Internal Helper: Process revenue distribution (Shared by createStudent and collectFee)
const processRevenueDistribution = async ({
  student,
  amountNum,
  month,
  paymentMethod,
  notes,
  selectedSubjects,
  req,
}) => {
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

  let totalTeacherShare = 0;
  let totalAcademyShare = 0;
  let totalOwnerPartnerShare = 0;
  const creditTransactions = [];
  const dailyRevenueEntries = [];
  const feeTeachers = []; 
  const academyDistributions = [];
  const subjectBreakdown = [];

  // Pre-calculate student subjects
  const selectedSubjectSet = new Set(
    Array.isArray(selectedSubjects)
      ? selectedSubjects
          .map((s) => (typeof s === "string" ? s : s?.name))
          .map((s) => String(s || "").toLowerCase().trim())
          .filter(Boolean)
      : []
  );
  
  const studentSubjectObjects = (student.subjects || [])
    .map((s) => {
      if (typeof s === "string") {
        return { name: s, fee: 0, effectiveFee: 0, discount: 0, discountEnabled: false, teacherId: null, teacherName: null };
      }
      const originalFee = toSafeInt(s?.fee);
      const discount = (s?.discountEnabled && s?.discount > 0) ? Math.min(toSafeInt(s.discount), originalFee) : 0;
      const effectiveFee = originalFee - discount;
      return {
        name: s?.name,
        fee: originalFee,
        effectiveFee,
        discount,
        discountEnabled: s?.discountEnabled || false,
        discountReason: s?.discountReason || "",
        teacherId: normalizeTeacherId(s?.teacherId),
        teacherName: s?.teacherName,
      };
    })
    .filter((s) => s.name);

  const payableSubjects = selectedSubjectSet.size > 0
    ? studentSubjectObjects.filter((s) => selectedSubjectSet.has(String(s.name || "").toLowerCase().trim()))
    : studentSubjectObjects;

  if (payableSubjects.length > 0) {
    // Use EFFECTIVE fees (after per-subject discounts) for proportional splitting
    const totalEffectiveFees = payableSubjects.reduce((sum, s) => sum + toSafeInt(s.effectiveFee), 0);
    let allocatedSoFar = 0;

    for (let idx = 0; idx < payableSubjects.length; idx++) {
      const subj = payableSubjects[idx];
      const subjName = subj.name;
      const subjEffectiveFee = toSafeInt(subj.effectiveFee);
      const explicitTeacherId = normalizeTeacherId(subj.teacherId);

      // Proportional split based on EFFECTIVE (discounted) fees
      let subjShare = (idx === payableSubjects.length - 1)
        ? amountNum - allocatedSoFar
        : (totalEffectiveFees > 0 ? Math.floor((subjEffectiveFee * amountNum) / totalEffectiveFees) : Math.floor(amountNum / payableSubjects.length));
      
      allocatedSoFar += subjShare;
      if (subjShare <= 0) continue;

      let subjectTeacherEntries = [];
      if (explicitTeacherId) {
        const explicitTeacher = await Teacher.findById(explicitTeacherId).lean();
        subjectTeacherEntries = [{
          subject: subjName,
          teacherId: explicitTeacher?._id || explicitTeacherId,
          teacherName: subj.teacherName || explicitTeacher?.name || "",
        }];
      } else {
        subjectTeacherEntries = (classDoc?.subjectTeachers || []).filter(
          (st) => st.subject && st.subject.toLowerCase().trim() === subjName.toLowerCase().trim()
        );
      }

      if (subjectTeacherEntries.length === 0) {
        // Fallback: No teacher assigned - distribute to academy pool
        // Apply same DEFERRED logic for PARTNERS
        const fallbackAcademyDistribution = await distributeAcademyShare(subjShare, config);
        for (const dist of fallbackAcademyDistribution) {
          if (dist.amount > 0 && dist.userId) {
            const user = await User.findById(dist.userId);
            if (user) {
              const proof = { description: `Academy fallback (${subjName}): ${student.studentName} → ${dist.fullName}` };
              
              // Check if user is PARTNER - defer their academy share
              if (user.role === "PARTNER") {
                // Create deferred settlement record
                await AcademySettlement.create({
                  partnerId: user._id,
                  partnerName: user.fullName,
                  partnerRole: user.role || "PARTNER",
                  percentage: dist.percentage || 0,
                  amount: dist.amount,
                  sourceDetails: {
                    feeRecordId: null,
                    studentId: student._id,
                    studentName: student.studentName,
                    className: classDoc?.classTitle || student.class,
                    subject: subjName,
                    originalFee: subjShare,
                    calculationProof: `Fallback academy share (${dist.percentage || 0}%) = PKR ${dist.amount}`,
                    academyPercentage: dist.percentage || 0,
                  },
                  status: "PENDING",
                });
                
                dailyRevenueEntries.push({
                  userId: dist.userId,
                  amount: dist.amount,
                  revenueType: "ACADEMY_SHARE",
                  className: classDoc?.classTitle || student.class,
                  studentRef: student._id,
                  studentName: student.studentName,
                  subject: subjName,
                  description: "Academy share (DEFERRED - pending release)",
                  splitDetails: proof,
                  isDeferred: true,
                });
              } else {
                // OWNER gets immediate credit
                if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
                user.walletBalance.floating += dist.amount;
                await user.save();
                
                dailyRevenueEntries.push({
                  userId: dist.userId,
                  amount: dist.amount,
                  revenueType: "ACADEMY_SHARE",
                  className: classDoc?.classTitle || student.class,
                  studentRef: student._id,
                  studentName: student.studentName,
                  subject: subjName,
                  description: "Academy share split",
                  splitDetails: proof,
                });
              }
            }
          }
        }
        totalAcademyShare += subjShare;
        subjectBreakdown.push({
          subject: subjName,
          subjectPrice: subjShare,
          teacherShare: 0,
          academyShare: subjShare,
          ownerPartnerShare: 0,
          distributed: true,
        });
        continue;
      }

      const teachersForSubject = [];
      for (const stEntry of subjectTeacherEntries) {
        const normalizedTeacherId = normalizeTeacherId(stEntry.teacherId);
        if (normalizedTeacherId) {
          const teacher = await Teacher.findById(normalizedTeacherId);
          if (teacher) teachersForSubject.push({ teacherId: normalizedTeacherId, teacher, subject: subjName });
        }
      }

      const split = await splitFeeAmongTeachers(subjShare, teachersForSubject, config);

      // 1. Direct Stakeholder Payouts (OWNER/PARTNER teaching)
      for (const dp of split.directStakeholderPayouts) {
        if (dp.amount > 0) {
          const teacher = await Teacher.findById(dp.teacherId);
          if (teacher) {
            if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
            teacher.balance.floating += dp.amount;
            await teacher.save();
            feeTeachers.push({
              teacherId: teacher._id,
              teacherName: teacher.name,
              compensationType: "percentage",
              teacherShare: dp.amount,
              role: dp.role,
              isPartner: true,
              subject: subjName,
            });
          }
          if (dp.userId) {
            const user = await User.findById(dp.userId);
            if (user) {
              if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
              user.walletBalance.floating += dp.amount;
              await user.save();
            }
          }
          totalTeacherShare += dp.amount;
          totalOwnerPartnerShare += dp.amount;
          const proof = {
            studentId: student._id,
            studentName: student.studentName,
            subject: subjName,
            calculationProof: `PKR ${subjShare} (${subjName}) - 100% Direct Share for ${dp.role} = PKR ${dp.amount}`,
          };
          dailyRevenueEntries.push({
            userId: dp.userId,
            amount: dp.amount,
            revenueType: "TUITION_SHARE",
            className: classDoc?.classTitle || student.class,
            studentRef: student._id,
            studentName: student.studentName,
            subject: subjName,
            description: "100% Tuition Share (Direct)",
            splitDetails: proof,
          });
          creditTransactions.push({
            type: "INCOME",
            category: "Tuition",
            stream: dp.role === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO",
            amount: dp.amount,
            description: `Direct Tuition (${subjName}): ${student.studentName} → ${dp.teacherName}`,
            collectedBy: req.user?._id,
            status: "FLOATING",
            date: new Date(),
            studentId: student._id,
            splitDetails: proof,
          });
        }
      }

      // 2. Regular Teacher Payouts
      for (const payout of split.teacherPayouts) {
        const teacher = await Teacher.findById(payout.teacherId);
        if (teacher && payout.amount > 0) {
          if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
          teacher.balance.floating += payout.amount;
          await teacher.save();
          feeTeachers.push({
            teacherId: teacher._id,
            teacherName: teacher.name,
            compensationType: payout.compensationType,
            teacherShare: payout.amount,
            subject: subjName,
            role: "TEACHER",
          });
          creditTransactions.push({
            type: "INCOME",
            category: "Tuition",
            stream: "STAFF_TUITION",
            amount: payout.amount,
            description: `${subjName} teacher share: ${student.studentName}`,
            collectedBy: req.user?._id,
            status: "FLOATING",
            date: new Date(),
            studentId: student._id,
          });
        }
        totalTeacherShare += payout.amount;
      }

      // 3. Academy Distribution - DEFERRED for PARTNERS, IMMEDIATE for OWNER
      totalAcademyShare += split.academyAmount;
      for (const dist of split.academyDistribution) {
        if (dist.amount > 0 && dist.userId) {
          const user = await User.findById(dist.userId);
          if (user) {
            const proof = {
              studentName: student.studentName,
              subject: subjName,
              calculationProof: `PKR ${subjShare} (${subjName}) pool share (${dist.percentage}%) = PKR ${dist.amount}`,
            };

            // Check if user is PARTNER - defer their academy share
            if (user.role === "PARTNER") {
              // Create deferred settlement record instead of immediate credit
              await AcademySettlement.create({
                partnerId: user._id,
                partnerName: user.fullName,
                partnerRole: user.role || "PARTNER",
                percentage: dist.percentage || 0,
                amount: dist.amount,
                sourceDetails: {
                  feeRecordId: null, // Will be set after fee record is created
                  studentId: student._id,
                  studentName: student.studentName,
                  className: classDoc?.classTitle || student.class,
                  subject: subjName,
                  originalFee: subjShare,
                  calculationProof: proof.calculationProof,
                  academyPercentage: dist.percentage,
                },
                status: "PENDING",
              });
              
              // Note: Partner's wallet NOT credited yet - deferred until release
              // But still record daily revenue for tracking (marked as DEFERRED)
              dailyRevenueEntries.push({
                userId: dist.userId,
                amount: dist.amount,
                revenueType: "ACADEMY_SHARE",
                className: classDoc?.classTitle || student.class,
                studentRef: student._id,
                studentName: student.studentName,
                subject: subjName,
                description: "Academy share (DEFERRED - pending release)",
                splitDetails: proof,
                isDeferred: true,
              });
            } else {
              // OWNER gets immediate credit
              if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
              user.walletBalance.floating += dist.amount;
              await user.save();
              
              dailyRevenueEntries.push({
                userId: dist.userId,
                amount: dist.amount,
                revenueType: "ACADEMY_SHARE",
                className: classDoc?.classTitle || student.class,
                studentRef: student._id,
                studentName: student.studentName,
                subject: subjName,
                description: "Academy share split",
                splitDetails: proof,
              });
            }
            
            creditTransactions.push({
              type: "INCOME",
              category: "Academy Share",
              stream: "ACADEMY_POOL",
              amount: dist.amount,
              description: `Academy share (${subjName}): ${student.studentName} → ${dist.fullName}`,
              collectedBy: req.user?._id,
              status: user.role === "PARTNER" ? "DEFERRED" : "FLOATING",
              date: new Date(),
              studentId: student._id,
            });
          }
        }
      }

      subjectBreakdown.push({
        subject: subjName,
        subjectPrice: subjShare,
        teacherShare: split.totalTeacherAmount,
        academyShare: split.academyAmount,
        ownerPartnerShare: split.totalDirectStakeholderAmount,
        distributed: true,
      });
    }
  }

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
    teachers: feeTeachers,
    splitBreakdown: {
      teacherShare: Math.max(0, totalTeacherShare - totalOwnerPartnerShare),
      academyShare: totalAcademyShare,
      ownerPartnerShare: totalOwnerPartnerShare,
    },
    subjectBreakdown,
    paymentMethod,
    notes,
    revenueSource: "subject-based-pricing",
    distributionCompleted: true,
    distributionCompletedAt: new Date(),
  });

  if (creditTransactions.length > 0) await Transaction.insertMany(creditTransactions);
  if (dailyRevenueEntries.length > 0) {
    const enriched = dailyRevenueEntries.map(e => ({ ...e, feeRecordRef: feeRecord._id }));
    await createDailyRevenueEntries(enriched);
  }

  return feeRecord;
};

// CREATE student
exports.createStudent = async (req, res) => {
  try {
    const studentData = { ...req.body };
    const initialPayment = toSafeInt(studentData.paidAmount);
    studentData.paidAmount = 0;
    studentData.feeStatus = "pending";
    
    const student = await Student.create(studentData);

    if (initialPayment > 0) {
      const month = new Date().toLocaleString("default", { month: "long", year: "numeric" });
      const feeRecord = await processRevenueDistribution({
        student,
        amountNum: initialPayment,
        month,
        paymentMethod: "CASH",
        notes: "Admission fee",
        req,
      });
      student.paidAmount = initialPayment;
      student.feeStatus = calculateFeeStatus(initialPayment, student.totalFee);
      await student.save();

      // Trigger notifications for initial payment
      await sendFinanceNotifications(student, initialPayment, feeRecord._id);
    }

    res.status(201).json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Helper: Send notifications to stakeholders
const sendFinanceNotifications = async (student, amount, relatedId) => {
  try {
    const stakeholders = await User.find({ role: { $in: ["OWNER", "PARTNER"] } });
    const notifications = stakeholders.map((sh) => ({
      recipient: sh._id,
      recipientRole: sh.role,
      message: `Fee collected from ${student.studentName}: Rs. ${amount.toLocaleString()} | Remaining: Rs. ${((student.totalFee || 0) - student.paidAmount).toLocaleString()}`,
      type: "FINANCE",
      relatedId: relatedId?.toString(),
    }));

    if (student.paidAmount >= student.totalFee) {
      stakeholders.forEach((sh) => {
        notifications.push({
          recipient: sh._id,
          recipientRole: sh.role,
          message: `✅ ${student.studentName} has FULLY PAID their fee of Rs. ${student.totalFee.toLocaleString()}`,
          type: "FINANCE",
          relatedId: student._id.toString(),
        });
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`📡 Sent ${notifications.length} notifications to stakeholders`);
    }
  } catch (err) {
    console.error("Error sending notifications:", err.message);
  }
};

// COLLECT FEE
exports.collectFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, month, paymentMethod, notes, subjects: selectedSubjects } = req.body;
    const amountNum = toSafeInt(amount);

    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const remaining = (student.totalFee || 0) - (student.paidAmount || 0);
    if (amountNum > remaining) return res.status(400).json({ success: false, message: "Amount exceeds balance" });

    const feeRecord = await processRevenueDistribution({
      student,
      amountNum,
      month,
      paymentMethod,
      notes,
      selectedSubjects,
      req,
    });

    student.paidAmount += amountNum;
    student.feeStatus = calculateFeeStatus(student.paidAmount, student.totalFee);
    await student.save();

    // Trigger notifications
    await sendFinanceNotifications(student, amountNum, feeRecord._id);

    res.status(201).json({ success: true, message: `Fee collected! Receipt: ${feeRecord.receiptNumber}`, data: feeRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE student
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    Object.assign(student, req.body);
    student.feeStatus = calculateFeeStatus(student.paidAmount, student.totalFee);
    await student.save();
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE student
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    
    // Simple logic for deletion context: Mark as withdrawn
    student.status = "Withdrawn";
    student.withdrawnAt = new Date();
    await student.save();
    
    res.json({ success: true, message: "Student marked as withdrawn" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeeHistory = async (req, res) => {
  try {
    const records = await FeeRecord.find({ student: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.trackPrint = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    const version = (student.printHistory?.length || 0) + 1;
    const receiptId = `TOKEN-${student.studentId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}-V${version}`;
    student.printHistory.push({ receiptId, printedAt: new Date(), version });
    await student.save();
    res.json({ success: true, data: { receiptId, version, student } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.findByToken = async (req, res) => {
  try {
    const student = await Student.findOne({ "printHistory.receiptId": req.params.token });
    if (!student) return res.status(404).json({ success: false, message: "Invalid token" });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
