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
  if (paidAmount === 0) return "Pending";
  if (paidAmount > 0 && paidAmount < totalFee) return "Partial";
  if (paidAmount >= totalFee) return "Paid";
  return "Pending"; // default fallback
};

// CREATE student
exports.createStudent = async (req, res) => {
  try {
    const studentData = { ...req.body };
    
    // Calculate fee status on admission
    const paidAmount = studentData.paidAmount || 0;
    const totalFee = studentData.totalFee || 0;
    studentData.feeStatus = calculateFeeStatus(paidAmount, totalFee);
    
    const student = await Student.create(studentData);
    res.status(201).json({ success: true, data: student });
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
      classDoc = await Class.findById(student.classRef).lean();
    }
    if (!classDoc && student.class) {
      classDoc = await Class.findOne({
        $or: [{ classTitle: student.class }, { className: student.class }],
      }).lean();
    }

    // ── Auto-detect revenue mode ──
    const { mode, ownerPartnerTeachers, regularTeachers } = await detectClassRevenueMode(classDoc);

    let totalTeacherShare = 0;
    let totalAcademyShare = 0;
    let primaryTeacherId = null;
    let primaryTeacherName = null;
    let primaryIsPartner = false;
    let revenueSource = "standard-split";
    const creditTransactions = [];
    const dailyRevenueEntries = [];

    if (mode === "TUITION") {
      // ═══ TUITION MODE: 100% split equally among Owner/Partners ═══
      revenueSource = "tuition-auto";
      const splits = calculateTuitionSplit(amountNum, ownerPartnerTeachers);

      for (const split of splits) {
        // Credit the teacher's floating balance
        if (split.teacherId) {
          const teacher = await Teacher.findById(split.teacherId);
          if (teacher) {
            if (!teacher.balance) teacher.balance = { floating: 0, verified: 0, pending: 0 };
            teacher.balance.floating = (teacher.balance.floating || 0) + split.amount;
            await teacher.save();
          }
        }

        // Also update the User's wallet (Owner/Partner)
        if (split.userId) {
          const user = await User.findById(split.userId);
          if (user) {
            if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
            user.walletBalance.floating = (user.walletBalance.floating || 0) + split.amount;
            await user.save();
          }
        }

        totalTeacherShare += split.amount;

        if (!primaryTeacherId || split.role === "OWNER") {
          primaryTeacherId = split.teacherId;
          primaryTeacherName = split.teacherName;
          primaryIsPartner = true;
        }

        creditTransactions.push({
          type: "INCOME",
          category: "Tuition",
          stream: split.role === "OWNER" ? "OWNER_CHEMISTRY" : "PARTNER_BIO",
          amount: split.amount,
          description: `Tuition share: ${student.studentName} (${month}) — ${split.teacherName} [${split.role}]`,
          collectedBy: req.user?._id,
          status: "FLOATING",
          date: new Date(),
          splitDetails: {
            teacherId: split.teacherId,
            teacherName: split.teacherName,
            teacherRole: split.role,
            studentId: student._id,
            studentName: student.studentName,
            shareType: "TUITION_100_SPLIT",
            month,
          },
        });

        // DailyRevenue entry for dashboard closing
        dailyRevenueEntries.push({
          userId: split.userId,
          amount: split.amount,
          revenueType: "TUITION_SHARE",
          classRef: classDoc?._id,
          className: classDoc?.classTitle || student.class,
          studentRef: student._id,
          studentName: student.studentName,
          splitDetails: {
            totalFee: amountNum,
            splitCount: splits.length,
            perPersonShare: split.amount,
            description: split.description,
          },
        });
      }

      // Academy gets 0% in tuition mode
      totalAcademyShare = 0;

    } else {
      // ═══ ACADEMY MODE: Teacher share + Academy share ═══
      const studentSubjects = (student.subjects || []).filter(
        (s) => (typeof s === "string" ? s : s.name)
      );
      const hasSubjectTeachers =
        classDoc?.subjectTeachers?.length > 0 && studentSubjects.length > 0;

      if (hasSubjectTeachers) {
        const totalSubjectFees = studentSubjects.reduce((sum, s) => {
          return sum + (typeof s === "object" ? s.fee || 0 : 0);
        }, 0);

        const subjectTeacherMap = new Map();
        for (const st of classDoc.subjectTeachers) {
          if (st.subject && st.teacherId) {
            subjectTeacherMap.set(st.subject.toLowerCase().trim(), st);
          }
        }

        for (const subj of studentSubjects) {
          const subjName = typeof subj === "string" ? subj : subj.name;
          const subjFee = typeof subj === "object" ? subj.fee || 0 : 0;
          const subjShare =
            totalSubjectFees > 0
              ? Math.round((subjFee / totalSubjectFees) * amountNum)
              : Math.round(amountNum / studentSubjects.length);

          if (subjShare <= 0) continue;

          const stEntry = subjectTeacherMap.get(subjName.toLowerCase().trim());

          if (stEntry?.teacherId) {
            const subjectTeacher = await Teacher.findById(stEntry.teacherId);
            if (subjectTeacher) {
              const split = await calculateAcademySplit(subjShare, subjectTeacher, config);

              revenueSource = split.compensationType === "perStudent"
                ? "academy-per-student" : "academy-teacher-split";

              // Credit teacher floating balance (only for percentage/hybrid — NOT fixed/perStudent)
              if (split.teacherAmount > 0) {
                if (!subjectTeacher.balance) subjectTeacher.balance = { floating: 0, verified: 0, pending: 0 };
                subjectTeacher.balance.floating = (subjectTeacher.balance.floating || 0) + split.teacherAmount;
                await subjectTeacher.save();

                creditTransactions.push({
                  type: "INCOME",
                  category: "Tuition",
                  stream: "STAFF_TUITION",
                  amount: split.teacherAmount,
                  description: `${subjName} teacher share: ${student.studentName} (${month})`,
                  collectedBy: req.user?._id,
                  status: "FLOATING",
                  date: new Date(),
                  splitDetails: {
                    teacherId: subjectTeacher._id,
                    teacherName: subjectTeacher.name,
                    teacherRole: "TEACHER",
                    studentId: student._id,
                    studentName: student.studentName,
                    subject: subjName,
                    subjectFee: subjShare,
                    shareType: `TEACHER_${(subjectTeacher.compensation?.teacherShare || 70)}_${(subjectTeacher.compensation?.academyShare || 30)}`,
                    month,
                  },
                });
              }

              totalTeacherShare += split.teacherAmount;
              totalAcademyShare += split.academyAmount;

              if (!primaryTeacherId) {
                primaryTeacherId = subjectTeacher._id;
                primaryTeacherName = subjectTeacher.name;
              }

              // Create DailyRevenue entries for academy share → Owner/Partners
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
                      totalFee: subjShare,
                      splitCount: split.academyDistribution.length,
                      perPersonShare: dist.amount,
                      description: `Academy share (${dist.percentage}%): ${subjName} — ${student.studentName}`,
                    },
                  });

                  // Update Owner/Partner wallet floating balance
                  const user = await User.findById(dist.userId);
                  if (user) {
                    if (!user.walletBalance) user.walletBalance = { floating: 0, verified: 0 };
                    user.walletBalance.floating = (user.walletBalance.floating || 0) + dist.amount;
                    await user.save();
                  }
                }
              }

              if (split.academyAmount > 0) {
                creditTransactions.push({
                  type: "INCOME",
                  category: "Academy Share",
                  stream: "ACADEMY_POOL",
                  amount: split.academyAmount,
                  description: `Academy share: ${subjName} - ${student.studentName}`,
                  collectedBy: req.user?._id,
                  status: "FLOATING",
                  date: new Date(),
                  splitDetails: {
                    studentId: student._id,
                    studentName: student.studentName,
                    subject: subjName,
                    shareType: "ACADEMY_SHARE_SPLIT",
                    month,
                  },
                });
              }
            } else {
              totalAcademyShare += subjShare;
            }
          } else {
            totalAcademyShare += subjShare;
          }
        }

        // Rounding correction
        const allocatedTotal = totalTeacherShare + totalAcademyShare;
        if (allocatedTotal < amountNum) {
          totalAcademyShare += amountNum - allocatedTotal;
        }
      } else {
        // Fallback: single-teacher or no class assignment (legacy path)
        const legacyTeacher = req.body.teacherId
          ? await Teacher.findById(req.body.teacherId)
          : null;

        if (legacyTeacher) {
          const split = await calculateAcademySplit(amountNum, legacyTeacher, config);
          totalTeacherShare = split.teacherAmount;
          totalAcademyShare = split.academyAmount;
          primaryTeacherId = legacyTeacher._id;
          primaryTeacherName = legacyTeacher.name;
          revenueSource = "academy-teacher-split";

          if (split.teacherAmount > 0) {
            if (!legacyTeacher.balance) legacyTeacher.balance = { floating: 0, verified: 0, pending: 0 };
            legacyTeacher.balance.floating = (legacyTeacher.balance.floating || 0) + split.teacherAmount;
            await legacyTeacher.save();
          }

          // Academy share to Owner/Partners
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
                  totalFee: amountNum,
                  splitCount: split.academyDistribution.length,
                  perPersonShare: dist.amount,
                  description: `Academy share (${dist.percentage}%): ${student.studentName}`,
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
        } else {
          totalAcademyShare = amountNum;
          revenueSource = "standard-split";
        }

        creditTransactions.push({
          type: "INCOME",
          category: "Tuition",
          stream: "STAFF_TUITION",
          amount: amountNum,
          description: `Fee collected from ${student.studentName} (${month})`,
          collectedBy: req.user?._id,
          status: "FLOATING",
          date: new Date(),
          splitDetails: {
            teacherId: legacyTeacher?._id,
            teacherName: legacyTeacher?.name,
            teacherRole: "TEACHER",
            studentId: student._id,
            studentName: student.studentName,
            shareType: "LEGACY_SPLIT",
            month,
          },
        });
      }
    }

    // ── Single FeeRecord for the full payment (receipt source of truth) ──
    const feeRecord = await FeeRecord.create({
      student: student._id,
      studentName: student.studentName,
      className: student.class,
      class: classDoc?._id,
      subject: mode === "TUITION" ? "Tuition (Auto)" : "Multi-Subject",
      amount: amountNum,
      month,
      status: "PAID",
      collectedBy: req.user?._id,
      collectedByName: req.user?.fullName || "Staff",
      teacher: primaryTeacherId,
      teacherName: primaryTeacherName,
      isPartnerTeacher: primaryIsPartner,
      revenueSource,
      splitBreakdown: {
        teacherShare: totalTeacherShare,
        academyShare: totalAcademyShare,
        teacherPercentage: amountNum > 0 ? Math.round((totalTeacherShare / amountNum) * 100) : 0,
        academyPercentage: amountNum > 0 ? Math.round((totalAcademyShare / amountNum) * 100) : 0,
      },
      paymentMethod: paymentMethod || "CASH",
      notes,
    });

    // ── Update student paidAmount ──
    const oldFeeStatus = student.feeStatus;
    student.paidAmount = (student.paidAmount || 0) + amountNum;
    await student.save();

    // ── Persist all credit transactions ──
    if (creditTransactions.length > 0) {
      await Transaction.insertMany(creditTransactions);
    }

    // ── Create DailyRevenue entries for dashboard closing ──
    if (dailyRevenueEntries.length > 0) {
      for (const entry of dailyRevenueEntries) {
        entry.feeRecordRef = feeRecord._id;
      }
      await createDailyRevenueEntries(dailyRevenueEntries);
    }

    // ── Notifications ──
    if (primaryTeacherId) {
      try {
        await Notification.create({
          recipient: primaryTeacherId,
          message: `Fee received: ${student.studentName} - ${month}: PKR ${totalTeacherShare.toLocaleString()} [${mode} mode]`,
          type: "FINANCE",
          relatedId: feeRecord._id.toString(),
        });
      } catch (e) { /* non-critical */ }
    }

    // Track collector's totalCash
    if (req.user?._id) {
      try {
        const collector = await User.findById(req.user._id);
        if (collector) {
          collector.totalCash = (collector.totalCash || 0) + amountNum;
          await collector.save();
        }
      } catch (e) {
        console.log("TotalCash update skipped:", e.message);
      }
    }

    // Owner notification
    try {
      const owner = await User.findOne({ role: "OWNER" });
      if (owner) {
        const newRemaining = (student.totalFee || 0) - student.paidAmount;
        await Notification.create({
          recipient: owner._id,
          recipientRole: "OWNER",
          message: `Fee collected from ${student.studentName} (${student.studentId}): Rs. ${amountNum.toLocaleString()} [${mode}] | Remaining: Rs. ${newRemaining.toLocaleString()}`,
          type: "FINANCE",
          relatedId: feeRecord._id.toString(),
        });

        if (student.feeStatus === "paid" && oldFeeStatus !== "paid") {
          await Notification.create({
            recipient: owner._id,
            recipientRole: "OWNER",
            message: `${student.studentName} (${student.studentId}) has FULLY PAID their fee of Rs. ${student.totalFee.toLocaleString()}`,
            type: "FINANCE",
            relatedId: student._id.toString(),
          });
        }
      }
    } catch (e) {
      console.log("Owner notification skipped:", e.message);
    }

    res.status(201).json({
      success: true,
      message: `Fee collected! Receipt: ${feeRecord.receiptNumber} [${mode} mode]`,
      data: {
        feeRecord,
        revenueMode: mode,
        split: {
          teacherShare: totalTeacherShare,
          academyShare: totalAcademyShare,
          dailyRevenueEntries: dailyRevenueEntries.length,
        },
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
