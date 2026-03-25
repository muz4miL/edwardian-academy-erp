User: I want to now move the finance entirely as per the new requirements of the client he told me in the meeting ! "I want to move from the session based pricing , currentyl we create a session in sessions tab and then move to configuration to set its price and then we save then if we go to the admissions tab and just when we choose the sesstion its price dynamically loads then whatever fee is colleceted there on the based of that the destribution of money and finace works the parnter/owners get 100% of revenue and this is causing problems like we need to  change it to now subjects pricing not sesssion like this every subkect would have ther perfect fee coming in and ike this the revenue can be destributed much more betterly right , so owner/parnter can get 100% of their subject price then we would need to like edit the and add the price of each subject added in the configuration currently we can only add subjects with names now i want to add prizes to them and then all the selected subjects in a class auto laod when i choose the class in admission i want their pricings to also come and then we can perfectly make teachers money added as 70/30 from that subject price right ? owner/partner would be able to close their money from their dashbaord with compelte details just like we have already done lots of detailing , the would also recience money from the dynamic 30 if teacher is on compensation 70% this was just an example teachers can also be fixed and per student amount so we need to ensure eveyrthing works fine and no double money or money loss its works perfectly to each decimanl pkr ! i want you to now give me a prompt that can enable my opus agent to perfectly plan and execute everything ! we also want the details to track everything perfectly as well ! and i have also taken some of the best advices from different coding tools for you i want you to see their advice and do the implementation to the best with what we currently have in code for complete fullstack functionality please perfect everything ! the tools said : "We are migrating an educational institution ERP system from session-based pricing (where revenue is tied to class sessions with unequal partner splits) to subject-based pricing (where each subject has its own fee structure, enabling precise revenue distribution per teacher/subject). Current issues include: partners getting 100% revenue when teaching, unequal distribution by design, missing reconciliation, rounding errors, and asymmetric revenue/expense splits.

PRIMARY OBJECTIVES
Eliminate session-based pricing – no more setting prices in Configuration after creating sessions

Implement subject-based pricing – each subject has a configurable price, teacher compensation model, and revenue split rules

Enable automatic price loading – when a class/session is selected in admissions, all subjects in that class load with their individual prices

Fix revenue distribution – partners get 100% of THEIR subject's price when they teach; academy gets 30% of teacher-taught subjects (or configurable splits)

Ensure perfect precision – no rounding errors, no double counting, no money loss down to the last PKR

Maintain detailed tracking – complete audit trail for every PKR distributed

TECHNICAL REQUIREMENTS
PHASE 1: Database Schema Changes
1.1 Subject Model Enhancement

javascript
// New fields for Subject model
{
  name: String,
  classId: ObjectId, // reference to Class/Session
  basePrice: { type: Number, required: true, min: 0 }, // in PKR
  teacherCompensationModel: {
    type: String,
    enum: ["percentage", "fixed", "perStudent"],
    default: "percentage"
  },
  percentageValue: { type: Number, min: 0, max: 100, default: 70 }, // for percentage model
  fixedAmount: { type: Number, min: 0, default: 0 }, // for fixed model
  perStudentAmount: { type: Number, min: 0, default: 0 }, // for perStudent model
  ownerSharePercentage: { type: Number, default: 100 }, // what owner/partner gets if they teach
  academyShareFromTeacher: { type: Number, default: 30 }, // academy's cut when teacher teaches
  isActive: { type: Boolean, default: true }
}
1.2 Fee Collection Enhancement

javascript
// FeeRecord model additions
{
  // ... existing fields
  subjectBreakdown: [{
    subjectId: ObjectId,
    subjectName: String,
    price: Number,
    teacherId: ObjectId,
    teacherName: String,
    compensationModel: String,
    compensationAmount: Number, // calculated based on model
    ownerId: ObjectId, // which partner owns this subject's revenue
    revenueDistribution: {
      teacherEarned: Number,
      ownerEarned: Number,
      academyEarned: Number
    }
  }],
  totalFee: Number,
  distributionCompleted: { type: Boolean, default: false }
}
1.3 DailyRevenue Enhancement

javascript
// DailyRevenue model additions for granular tracking
{
  // ... existing fields
  sourceType: {
    type: String,
    enum: ["subject_teacher", "subject_owner", "academy_pool", "other"],
    required: true
  },
  subjectId: ObjectId,
  subjectName: String,
  feeRecordId: ObjectId,
  studentId: ObjectId,
  transactionReference: String
}
1.4 Configuration Simplification

javascript
// Remove session-based pricing fields, add:
{
  // ... existing fields (remove tuitionPoolSplit, eteaPoolSplit)
  defaultAcademySharePercentage: { type: Number, default: 30 },
  defaultTeacherPercentage: { type: Number, default: 70 },
  enableEqualPartnership: { type: Boolean, default: false }, // if true, partners split academy pool equally
  roundingMethod: { type: String, enum: ["floor", "ceil", "round"], default: "floor" },
  precision: { type: Number, default: 0 } // decimal places for PKR (0 for integer)
}
PHASE 2: Core Logic Implementation
2.1 Subject Price Management API

javascript
// Subject Controller
class SubjectController {
  // CRUD operations with price validation
  async createSubject(req, res) {
    const { name, classId, basePrice, teacherCompensationModel, percentageValue, fixedAmount, perStudentAmount } = req.body;
    
    // Validation
    if (basePrice < 0) throw new Error("Price cannot be negative");
    if (teacherCompensationModel === "percentage" && (percentageValue < 0 || percentageValue > 100)) {
      throw new Error("Percentage must be between 0 and 100");
    }
    
    // Ensure no duplicate active subjects for same class
    const existing = await Subject.findOne({ name, classId, isActive: true });
    if (existing) throw new Error("Active subject with same name exists for this class");
    
    const subject = await Subject.create({ name, classId, basePrice, teacherCompensationModel, percentageValue, fixedAmount, perStudentAmount });
    res.json({ success: true, data: subject });
  }
  
  async updateSubjectPrice(req, res) {
    // Price change tracking for audit
    const subject = await Subject.findById(req.params.id);
    const oldPrice = subject.basePrice;
    subject.basePrice = req.body.newPrice;
    await subject.save();
    
    // Log price change
    await PriceChangeLog.create({
      subjectId: subject._id,
      oldPrice,
      newPrice: req.body.newPrice,
      changedBy: req.user._id,
      reason: req.body.reason,
      timestamp: new Date()
    });
    
    res.json({ success: true, message: "Price updated" });
  }
  
  async getSubjectsByClass(req, res) {
    const subjects = await Subject.find({ classId: req.params.classId, isActive: true })
      .populate('teacherId', 'name')
      .lean();
    
    res.json({ success: true, data: subjects });
  }
}
2.2 Enhanced Fee Collection with Subject Breakdown

javascript
// Student Controller - collectFee with subject-based pricing
async function collectFeeWithSubjects(req, res) {
  const { studentId, classId, subjects: selectedSubjects, paymentMethod, paidAmount } = req.body;
  
  // 1. Get all subjects for this class with their current prices
  const classSubjects = await Subject.find({ classId, isActive: true });
  
  // 2. Build subject breakdown with real-time prices
  const subjectBreakdown = [];
  let totalCalculatedFee = 0;
  
  for (const selected of selectedSubjects) {
    const subject = classSubjects.find(s => s._id.toString() === selected.subjectId);
    if (!subject) throw new Error(`Subject ${selected.subjectId} not found`);
    
    // Determine teacher (assigned to subject or default)
    const teacher = await getTeacherForSubject(subject._id, classId);
    
    // Calculate compensation based on subject's model
    let compensationAmount = 0;
    if (subject.teacherCompensationModel === "percentage") {
      compensationAmount = (subject.basePrice * subject.percentageValue) / 100;
    } else if (subject.teacherCompensationModel === "fixed") {
      compensationAmount = subject.fixedAmount;
    } else if (subject.teacherCompensationModel === "perStudent") {
      compensationAmount = subject.perStudentAmount;
    }
    
    // Determine revenue distribution
    const revenueDistribution = calculateRevenueDistribution({
      subjectPrice: subject.basePrice,
      teacherCompensation: compensationAmount,
      ownerId: subject.ownerId,
      teacherId: teacher?._id,
      academySharePercentage: Configuration.defaultAcademySharePercentage
    });
    
    subjectBreakdown.push({
      subjectId: subject._id,
      subjectName: subject.name,
      price: subject.basePrice,
      teacherId: teacher?._id,
      teacherName: teacher?.name,
      compensationModel: subject.teacherCompensationModel,
      compensationAmount,
      ownerId: subject.ownerId,
      revenueDistribution
    });
    
    totalCalculatedFee += subject.basePrice;
  }
  
  // 3. Validate payment matches calculated total
  if (Math.abs(paidAmount - totalCalculatedFee) > 0.01) {
    throw new Error(`Payment mismatch: Expected ${totalCalculatedFee}, received ${paidAmount}`);
  }
  
  // 4. Create fee record with breakdown
  const feeRecord = await FeeRecord.create({
    studentId,
    classId,
    amount: totalCalculatedFee,
    paidAmount,
    paymentMethod,
    subjectBreakdown,
    distributionCompleted: false,
    createdAt: new Date()
  });
  
  // 5. Distribute revenue to all parties
  await distributeRevenueBySubject(feeRecord);
  
  // 6. Update distributionCompleted flag
  feeRecord.distributionCompleted = true;
  await feeRecord.save();
  
  // 7. Create audit trail
  await AuditLog.create({
    action: "FEE_COLLECTION",
    feeRecordId: feeRecord._id,
    details: subjectBreakdown,
    total: totalCalculatedFee,
    performedBy: req.user._id
  });
  
  res.json({ success: true, data: feeRecord });
}

// Revenue distribution function - precise to PKR
function calculateRevenueDistribution({ subjectPrice, teacherCompensation, teacherId, academySharePercentage }) {
  // Use integer arithmetic to avoid floating point errors
  // Multiply by 100 to work in paisa (smallest unit)
  const priceInPaisa = Math.round(subjectPrice * 100);
  const teacherCompInPaisa = Math.round(teacherCompensation * 100);
  
  let teacherEarned = 0;
  let academyEarned = 0;
  let ownerEarned = 0;
  
  if (teacherId) {
    // Teacher teaches this subject
    teacherEarned = teacherCompInPaisa;
    const remaining = priceInPaisa - teacherCompInPaisa;
    academyEarned = Math.floor((remaining * academySharePercentage) / 100);
    ownerEarned = remaining - academyEarned;
  } else {
    // Owner/partner teaches this subject (or no assigned teacher)
    ownerEarned = priceInPaisa;
    teacherEarned = 0;
    academyEarned = 0;
  }
  
  // Convert back to PKR with 2 decimal places
  return {
    teacherEarned: teacherEarned / 100,
    academyEarned: academyEarned / 100,
    ownerEarned: ownerEarned / 100,
    // Store paisa values for verification
    teacherEarnedPaisa: teacherEarned,
    academyEarnedPaisa: academyEarned,
    ownerEarnedPaisa: ownerEarned
  };
}
2.3 Reconciliation Engine with Perfect Precision

javascript
// reconciliationEngine.js - ensures every PKR is accounted for
class ReconciliationEngine {
  async verifyFeeDistribution(feeRecordId) {
    const feeRecord = await FeeRecord.findById(feeRecordId);
    let totalDistributedPaisa = 0;
    
    for (const subject of feeRecord.subjectBreakdown) {
      totalDistributedPaisa += subject.revenueDistribution.teacherEarnedPaisa;
      totalDistributedPaisa += subject.revenueDistribution.academyEarnedPaisa;
      totalDistributedPaisa += subject.revenueDistribution.ownerEarnedPaisa;
    }
    
    const totalFeePaisa = Math.round(feeRecord.amount * 100);
    const discrepancy = totalFeePaisa - totalDistributedPaisa;
    
    if (discrepancy !== 0) {
      // Create discrepancy record
      await DiscrepancyLog.create({
        feeRecordId,
        expectedPaisa: totalFeePaisa,
        distributedPaisa: totalDistributedPaisa,
        discrepancy,
        status: "UNRESOLVED",
        detectedAt: new Date()
      });
      
      // If discrepancy is within 1 paisa (rounding), adjust smallest transaction
      if (Math.abs(discrepancy) <= 1) {
        await this.adjustRoundingDiscrepancy(feeRecordId, discrepancy);
      } else {
        // Critical error - alert admins
        await this.alertSystemError(feeRecordId, discrepancy);
      }
    }
    
    return {
      verified: discrepancy === 0,
      totalFee: feeRecord.amount,
      totalDistributed: totalDistributedPaisa / 100,
      discrepancy: discrepancy / 100
    };
  }
  
  async reconcileDailyClosing(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all fees collected
    const fees = await FeeRecord.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      distributionCompleted: true
    });
    
    // Aggregate all distributions
    const teacherTotal = {};
    const ownerTotal = {};
    let academyTotal = 0;
    let totalFees = 0;
    
    for (const fee of fees) {
      totalFees += fee.amount;
      for (const subject of fee.subjectBreakdown) {
        if (subject.revenueDistribution.teacherEarned > 0 && subject.teacherId) {
          teacherTotal[subject.teacherId] = (teacherTotal[subject.teacherId] || 0) + subject.revenueDistribution.teacherEarned;
        }
        if (subject.revenueDistribution.ownerEarned > 0 && subject.ownerId) {
          ownerTotal[subject.ownerId] = (ownerTotal[subject.ownerId] || 0) + subject.revenueDistribution.ownerEarned;
        }
        academyTotal += subject.revenueDistribution.academyEarned;
      }
    }
    
    const distributedTotal = Object.values(teacherTotal).reduce((a, b) => a + b, 0) +
                            Object.values(ownerTotal).reduce((a, b) => a + b, 0) +
                            academyTotal;
    
    const discrepancy = totalFees - distributedTotal;
    
    // Create daily reconciliation report
    return await DailyReconciliationReport.create({
      date: startOfDay,
      totalFeesCollected: totalFees,
      totalDistributed: distributedTotal,
      discrepancy,
      teacherBreakdown: teacherTotal,
      ownerBreakdown: ownerTotal,
      academyTotal,
      feesProcessed: fees.length,
      verified: Math.abs(discrepancy) < 0.01 // within 1 paisa
    });
  }
}
2.4 Partner Dashboard - Closeable Amounts

javascript
// financeController.js - enhanced partner closing
async function getPartnerClosePreview(req, res) {
  const userId = req.user._id;
  
  // Get all subjects where this partner is the owner
  const ownedSubjects = await Subject.find({ ownerId: userId, isActive: true });
  const subjectIds = ownedSubjects.map(s => s._id);
  
  // Get all fee records with these subjects
  const feesWithOwnedSubjects = await FeeRecord.find({
    "subjectBreakdown.subjectId": { $in: subjectIds },
    distributionCompleted: true,
    createdAt: { $gte: new Date(req.query.fromDate), $lte: new Date(req.query.toDate) }
  });
  
  let totalOwnerEarningsPaisa = 0;
  const detailedBreakdown = [];
  
  for (const fee of feesWithOwnedSubjects) {
    for (const subject of fee.subjectBreakdown) {
      if (ownedSubjects.some(s => s._id.toString() === subject.subjectId.toString())) {
        totalOwnerEarningsPaisa += subject.revenueDistribution.ownerEarnedPaisa;
        detailedBreakdown.push({
          studentId: fee.studentId,
          subjectName: subject.subjectName,
          amount: subject.revenueDistribution.ownerEarned,
          date: fee.createdAt,
          feeRecordId: fee._id
        });
      }
    }
  }
  
  // Get teacher earnings if user is also a teacher
  let teacherEarningsPaisa = 0;
  const teacherSubjects = await Subject.find({ teacherId: userId });
  
  if (teacherSubjects.length > 0) {
    const teacherSubjectIds = teacherSubjects.map(s => s._id);
    const feesWithTeacherSubjects = await FeeRecord.find({
      "subjectBreakdown.subjectId": { $in: teacherSubjectIds },
      distributionCompleted: true
    });
    
    for (const fee of feesWithTeacherSubjects) {
      for (const subject of fee.subjectBreakdown) {
        if (teacherSubjects.some(s => s._id.toString() === subject.subjectId.toString())) {
          teacherEarningsPaisa += subject.revenueDistribution.teacherEarnedPaisa;
          detailedBreakdown.push({
            studentId: fee.studentId,
            subjectName: subject.subjectName,
            amount: subject.revenueDistribution.teacherEarned,
            date: fee.createdAt,
            feeRecordId: fee._id,
            type: "teacher"
          });
        }
      }
    }
  }
  
  const totalCloseable = (totalOwnerEarningsPaisa + teacherEarningsPaisa) / 100;
  
  res.json({
    success: true,
    data: {
      totalCloseable,
      ownerEarnings: totalOwnerEarningsPaisa / 100,
      teacherEarnings: teacherEarningsPaisa / 100,
      detailedBreakdown,
      currency: "PKR",
      precision: "2 decimals"
    }
  });
}

async function closePartnerEarnings(req, res) {
  const { amount, accountDetails } = req.body;
  const userId = req.user._id;
  
  // Use transaction to ensure atomic operation
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Get all pending earnings (unpaid) from DailyRevenue
    const pendingEarnings = await DailyRevenue.find({
      userId,
      status: "UNCOLLECTED",
      sourceType: { $in: ["subject_owner", "subject_teacher"] }
    }).session(session);
    
    // Verify amount matches sum of pending
    const totalPending = pendingEarnings.reduce((sum, e) => sum + e.amount, 0);
    if (Math.abs(totalPending - amount) > 0.01) {
      throw new Error(`Amount mismatch: Available ${totalPending}, requested ${amount}`);
    }
    
    // Mark all as COLLECTED
    for (const earning of pendingEarnings) {
      earning.status = "COLLECTED";
      earning.collectedAt = new Date();
      earning.collectionDetails = accountDetails;
      await earning.save({ session });
    }
    
    // Create withdrawal transaction record
    const withdrawal = await Withdrawal.create([{
      userId,
      amount,
      accountDetails,
      earningsIds: pendingEarnings.map(e => e._id),
      status: "PROCESSED",
      processedAt: new Date()
    }], { session });
    
    // Update user wallet balance
    await User.findByIdAndUpdate(userId, {
      $inc: { "walletBalance.verified": -amount }
    }, { session });
    
    await session.commitTransaction();
    
    res.json({
      success: true,
      message: `Successfully closed ${amount} PKR`,
      transactionId: withdrawal[0]._id
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
PHASE 3: Migration Script
javascript
// migrateSessionToSubjectPricing.js
async function migrateExistingData() {
  console.log("Starting migration from session-based to subject-based pricing...");
  
  // 1. Get all existing sessions/classes
  const sessions = await Class.find({});
  
  for (const session of sessions) {
    // 2. Get all students in this session with fees
    const students = await Student.find({ classId: session._id });
    
    // 3. Create subjects based on existing configuration
    const config = await Configuration.findOne({});
    const existingSubjects = await Subject.find({ classId: session._id });
    
    if (existingSubjects.length === 0) {
      // If no subjects exist, create from class subjects list
      for (const subjectName of session.subjects || []) {
        await Subject.create({
          name: subjectName,
          classId: session._id,
          basePrice: session.basePrice || config.defaultSubjectPrice || 5000,
          teacherCompensationModel: "percentage",
          percentageValue: config.defaultTeacherPercentage || 70,
          ownerId: session.ownerId, // assign class owner
          isActive: true
        });
      }
    }
    
    // 4. For each student, create new fee records with subject breakdown
    for (const student of students) {
      const existingFees = await FeeRecord.find({
        studentId: student._id,
        classId: session._id,
        distributionCompleted: false
      });
      
      const subjects = await Subject.find({ classId: session._id, isActive: true });
      
      // Recalculate fees based on subjects
      const subjectBreakdown = [];
      let totalCalculated = 0;
      
      for (const subject of subjects) {
        // Determine if student is enrolled in this subject
        const isEnrolled = student.enrolledSubjects?.includes(subject._id) || true;
        
        if (isEnrolled) {
          const teacher = await User.findById(subject.teacherId);
          
          const compensationAmount = subject.teacherCompensationModel === "percentage" 
            ? (subject.basePrice * subject.percentageValue) / 100
            : subject.teacherCompensationModel === "fixed"
              ? subject.fixedAmount
              : subject.perStudentAmount;
          
          const revenueDistribution = calculateRevenueDistribution({
            subjectPrice: subject.basePrice,
            teacherCompensation: compensationAmount,
            teacherId: subject.teacherId,
            academySharePercentage: config.defaultAcademySharePercentage
          });
          
          subjectBreakdown.push({
            subjectId: subject._id,
            subjectName: subject.name,
            price: subject.basePrice,
            teacherId: subject.teacherId,
            teacherName: teacher?.name,
            compensationModel: subject.teacherCompensationModel,
            compensationAmount,
            ownerId: subject.ownerId,
            revenueDistribution
          });
          
          totalCalculated += subject.basePrice;
        }
      }
      
      // Update or create fee records
      for (const fee of existingFees) {
        fee.subjectBreakdown = subjectBreakdown;
        fee.amount = totalCalculated;
        fee.distributionCompleted = true;
        await fee.save();
        
        // Create DailyRevenue entries
        await createDailyRevenueEntries(fee);
      }
    }
  }
  
  console.log("Migration completed successfully");
}
PHASE 4: Testing & Validation Requirements
4.1 Unit Tests

javascript
describe("Subject-Based Pricing Tests", () => {
  test("Should calculate exact distribution without rounding errors", () => {
    const distribution = calculateRevenueDistribution({
      subjectPrice: 1000,
      teacherCompensation: 700,
      teacherId: "teacher123",
      academySharePercentage: 30
    });
    
    expect(distribution.teacherEarned + distribution.academyEarned + distribution.ownerEarned).toBe(1000);
    expect(distribution.teacherEarned).toBe(700);
    expect(distribution.academyEarned).toBe(90); // 300 * 30% = 90
    expect(distribution.ownerEarned).toBe(210); // 300 - 90 = 210
  });
  
  test("Should handle fractional PKR correctly", () => {
    const distribution = calculateRevenueDistribution({
      subjectPrice: 999.99,
      teacherCompensation: 699.99,
      teacherId: "teacher123",
      academySharePercentage: 30
    });
    
    // Should sum exactly without floating point errors
    const total = distribution.teacherEarned + distribution.academyEarned + distribution.ownerEarned;
    expect(total).toBeCloseTo(999.99, 2);
  });
  
  test("Should reconcile fee with 1 paisa discrepancy", async () => {
    const reconciliation = new ReconciliationEngine();
    const result = await reconciliation.verifyFeeDistribution(feeRecordId);
    expect(result.discrepancy).toBeLessThan(0.01); // less than 1 paisa
  });
});
4.2 Validation Script

javascript
// validateAllDistributions.js
async function validateAllFees() {
  const fees = await FeeRecord.find({ distributionCompleted: true });
  let totalDiscrepancy = 0;
  let errors = [];
  
  for (const fee of fees) {
    const result = await verifyFeeDistribution(fee._id);
    if (result.discrepancy !== 0) {
      errors.push({
        feeId: fee._id,
        receiptNumber: fee.receiptNumber,
        discrepancy: result.discrepancy
      });
      totalDiscrepancy += result.discrepancy;
    }
  }
  
  console.log(`Validation complete. Total discrepancy: ${totalDiscrepancy} PKR`);
  console.log(`Errors: ${errors.length}`);
  
  if (Math.abs(totalDiscrepancy) > 0) {
    throw new Error(`Total system discrepancy: ${totalDiscrepancy} PKR - MONEY LOSS DETECTED!`);
  }
  
  return { success: true, totalDiscrepancy, errors };
}
DELIVERABLES CHECKLIST
Updated Subject model with price and compensation fields

Subject CRUD API with price change tracking

Enhanced FeeRecord with subjectBreakdown

Revenue distribution engine with integer arithmetic (paisa-based)

Reconciliation engine with 1-paisa precision

Migration script for existing data

Partner dashboard showing subject-level earnings

Teacher dashboard showing per-subject earnings

Daily reconciliation report endpoint

Audit log for all financial transactions

Unit tests covering all distribution scenarios

Validation script to verify no money loss

API documentation for new endpoints

Admin panel for subject price management

Frontend integration for admission with dynamic subject loading

SUCCESS CRITERIA
Zero Money Loss: Sum of all distributions for every fee = fee amount (within 1 paisa)

Perfect Precision: All calculations using integer arithmetic (paisa) before conversion

Complete Audit Trail: Every PKR movement tracked with source, reason, and timestamp

Partner Confidence: Partners can see exactly which subject generated which earnings

Flexible Compensation: Support percentage, fixed, and per-student teacher models

Real-time Pricing: Subject prices load instantly when class selected in admissions

No Double Counting: Revenue distributed exactly once per fee record

Backward Compatibility: Existing data migrated without corruption

RISK MITIGATION
Risk	Mitigation
Data loss during migration	Run migration in dry-run mode first, backup database, use transactions
Rounding errors	Use integer arithmetic (paisa), floor for remainder, track discrepancies
Performance issues	Index on feeRecordId, subjectId, batch processing for reports
Existing unequal splits	Create mapping of old splits to new subject-based model during migration
Partner confusion	Provide migration report showing how existing earnings map to new system
Execute this plan with the following priorities:

Week 1: Database schema changes + migration script

Week 2: Core revenue distribution engine + reconciliation

Week 3: Partner/teacher dashboards + API endpoints

Week 4: Testing, validation, and production deployment" now tool 2 : "Session Created → Configuration (set session price) → Admission (auto-load session price) → Fee Collection → Revenue Distribution


### Current Revenue Distribution Rules
| Scenario | Teacher Share | Academy/Pool Share | Partner Share |
|----------|--------------|-------------------|---------------|
| Owner/Partner teaches | 0% | 0% | 100% of session fee |
| Regular teacher (compensation) | 70% | 30% | 0% |
| Regular teacher (fixed salary) | Fixed amount | Remainder | 0% |
| Regular teacher (per-student) | Per-student rate | Remainder | 0% |

### Known Problems (From Previous Analysis)
1. **Unequal distribution by design** — Partners split 50/30/20, not equal
2. **No reconciliation engine** — Cannot detect money leakage
3. **Partner 100% Rule** — Academy gets ZERO when partners teach
4. **Rounding errors** in withdrawal reversals (`Math.round()`)
5. **Asymmetric revenue/expense splits** — Revenue: 50/30/20, Expenses: 40/30/30
6. **Duplicate wallet tracking** — User.walletBalance vs Teacher.balance

---

## 🎯 TARGET STATE (What We Need)

### New Pricing Flow
Subjects Created (with prices) → Class Created (subjects assigned) → Admission (choose class → auto-load ALL subject prices) → Fee Collection (per-subject breakdown) → Revenue Distribution (per-subject)


### New Data Models Required

#### 1. Subject Schema (Enhanced)
```javascript
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, unique: true },
  price: { type: Number, required: true, min: 0 }, // NEW: Subject-level pricing
  teacherCompensationType: {
    type: String,
    enum: ["percentage", "fixed", "perStudent"],
    default: "percentage"
  },
  teacherCompensationValue: { type: Number, default: 70 }, // 70% or fixed PKR or per-student PKR
  academySharePercentage: { type: Number, default: 30 }, // Academy gets 30% if percentage mode
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
2. Class Schema (Enhanced)
javascript
const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
  subjects: [{
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    overridePrice: { type: Number }, // Optional: override subject's default price for this class
    overrideTeacherCompensation: { type: Number } // Optional: override teacher's share
  }],
  totalFee: { type: Number }, // Computed: sum of all subject prices
  // ... existing fields
});
3. FeeRecord Schema (Enhanced)
javascript
const feeRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
  totalAmount: { type: Number, required: true },
  subjectBreakdown: [{
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    subjectName: String,
    subjectPrice: Number,
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    teacherShare: Number, // Calculated amount for teacher
    academyShare: Number, // Calculated amount for academy pool
    ownerShare: Number, // If teacher is owner/partner
    distributionStatus: { type: String, enum: ["PENDING", "DISTRIBUTED", "REVERSED"] }
  }],
  // ... existing fields
});
New Revenue Distribution Logic
Rule 1: Owner/Partner Subject Revenue
javascript
// If teacher is an Owner or Partner for a subject:
ownerShare = subjectPrice; // 100% goes to that owner/partner
teacherShare = 0;
academyShare = 0;
Rule 2: Regular Teacher Subject Revenue
javascript
// Based on teacherCompensationType:
if (compensationType === "percentage") {
  teacherShare = Math.floor(subjectPrice * (compensationValue / 100)); // e.g., 70%
  academyShare = subjectPrice - teacherShare; // Remainder, e.g., 30%
} else if (compensationType === "fixed") {
  teacherShare = compensationValue; // Fixed PKR amount
  academyShare = subjectPrice - teacherShare;
} else if (compensationType === "perStudent") {
  teacherShare = compensationValue; // Per-student PKR
  academyShare = subjectPrice - teacherShare;
}
Rule 3: Academy Pool Distribution
javascript
// Academy's 30% share from all subjects goes to Academy Pool
// Academy Pool is then split among partners based on Configuration:
const academyPoolSplit = {
  waqar: config.academyPoolSplit.waqar || 50, // 50%
  zahid: config.academyPoolSplit.zahid || 20, // 20%
  saud: config.academyPoolSplit.saud || 30   // 30%
};

// Each partner receives:
waqarFromPool = Math.floor(totalAcademyPool * (academyPoolSplit.waqar / 100));
zahidFromPool = Math.floor(totalAcademyPool * (academyPoolSplit.zahid / 100));
saudFromPool = totalAcademyPool - waqarFromPool - zahidFromPool; // Remainder to avoid rounding loss
📋 IMPLEMENTATION CHECKLIST
Phase 1: Schema & Model Updates
 Update Subject model with price, teacherCompensationType, teacherCompensationValue, academySharePercentage
 Update Class model with subjects[] array containing price overrides
 Update FeeRecord model with subjectBreakdown[] array
 Add migration script for existing data
Phase 2: Configuration UI Updates
 Add price field to Subject creation/edit form
 Add teacher compensation type selector (percentage/fixed/perStudent)
 Add compensation value input
 Show total class fee (sum of subjects) in Class configuration
Phase 3: Admission Flow Updates
 When class is selected, auto-populate subject list with prices
 Show itemized fee breakdown: Subject 1: PKR X, Subject 2: PKR Y, Total: PKR Z
 Allow fee adjustments/discounts per subject (optional)
 Generate FeeRecord with full subjectBreakdown
Phase 4: Revenue Engine Refactor
 Create calculateSubjectRevenue(subjectId, teacherId, subjectPrice, config) function
 Loop through feeRecord.subjectBreakdown instead of using session-level calculation
 Ensure no double-counting: each subject's revenue is distributed exactly once
 Create DailyRevenue entries per subject (not per fee)
Phase 5: Dashboard & Reporting Updates
 Update Owner Dashboard to show per-subject revenue breakdown
 Update Daily Close modal to show subject-level details
 Update Teacher Payroll to calculate based on subject assignments
 Add reconciliation report: Total Fees ≡ Σ(Teacher Shares) + Σ(Academy Shares) + Σ(Owner Shares)
Phase 6: Withdrawal/Refund Logic
 Reverse revenue at subject level, not session level
 Use integer arithmetic with remainder allocation to avoid rounding errors
 Update DailyRevenue entries per subject when reversing
Phase 7: Testing & Validation
 Create test cases for each compensation type (percentage, fixed, perStudent)
 Verify: For every fee collected, sum of all distributions = fee amount (to the PKR)
 Test withdrawal scenarios: full refund, partial refund, multi-subject refund
 Run reconciliation report and verify zero discrepancy
⚠️ CRITICAL CONSTRAINTS
1.
NO MONEY LOSS: totalFee === teacherShare + academyShare + ownerShare for EVERY subject, EVERY fee
2.
NO DOUBLE-COUNTING: Each PKR is distributed to exactly one recipient
3.
INTEGER ARITHMETIC: Use Math.floor() for distributions, allocate remainder to last recipient
4.
AUDIT TRAIL: Every distribution must have a traceable path: FeeRecord → SubjectBreakdown → DailyRevenue → WalletBalance
5.
BACKWARD COMPATIBILITY: Existing session-based fees must continue working during transition
6.
ATOMIC TRANSACTIONS: Use MongoDB transactions for fee collection + distribution to prevent partial states
🧪 VALIDATION QUERIES (Run After Implementation)
javascript
// 1. Verify no money leakage
const totalFeesCollected = await FeeRecord.aggregate([
  { $match: { status: "PAID" } },
  { $group: { _id: null, total: { $sum: "$totalAmount" } } }
]);

const totalDistributed = await DailyRevenue.aggregate([
  { $group: { _id: null, total: { $sum: "$amount" } } }
]);

console.assert(totalFeesCollected.total === totalDistributed.total, "MONEY LEAKAGE DETECTED!");

// 2. Verify per-subject distribution
const feeRecords = await FeeRecord.find({ status: "PAID" }).populate("subjectBreakdown");
for (const fee of feeRecords) {
  const subjectTotal = fee.subjectBreakdown.reduce((sum, s) => 
    sum + s.teacherShare + s.academyShare + s.ownerShare, 0);
  console.assert(fee.totalAmount === subjectTotal, `Mismatch in FeeRecord ${fee._id}`);
}
📂 FILES TO MODIFY
File	Changes Required
models/Subject.js	Add price, compensation fields
models/Class.js	Add subjects array with overrides
models/FeeRecord.js	Add subjectBreakdown array
helpers/revenueEngine.js	Refactor to per-subject calculation
helpers/revenueHelper.js	Update distribution logic
controllers/studentController.js	Update fee collection to use subject prices
controllers/financeController.js	Update daily close for subject-level
routes/students.js	Update withdrawal logic
routes/configuration.js	Add subject price endpoints
frontend/admissions/*	Show subject breakdown in admission form
frontend/dashboard/*	Show per-subject revenue in dashboards
🎯 SUCCESS CRITERIA
1.
✅ Every subject has its own price in Configuration
2.
✅ Class total fee = sum of assigned subject prices
3.
✅ Admission form shows itemized subject fees
4.
✅ Fee collection creates per-subject distribution records
5.
✅ Owner/Partner gets 100% of subjects they teach
6.
✅ Regular teachers get configured share (70%/fixed/perStudent) of subjects they teach
7.
✅ Academy pool receives 30% (or configured %) from regular teacher subjects
8.
✅ Academy pool is distributed to partners per configuration
9.
✅ Daily close shows subject-level breakdown
10.
✅ Withdrawals reverse revenue at subject level
11.
✅ Reconciliation report shows zero discrepancy
12.
✅ All calculations accurate to PKR 1 (no rounding losses)
🚀 BEGIN EXECUTION
Start with Phase 1 (Schema Updates). After each phase, run the validation queries to ensure integrity. Proceed to the next phase only after validation passes.

Report your progress after each phase with:

Files modified
Tests passed
Any issues encountered
Next steps

---

## Why This Prompt Works

| Element | Purpose |
|---------|---------|
| **Current State Section** | Ensures the agent understands exactly what exists |
| **Target State Section** | Crystal-clear vision of the end result |
| **New Data Models** | Concrete schema definitions—no ambiguity |
| **Revenue Rules** | Explicit formulas with code examples |
| **Implementation Checklist** | Phased approach prevents overwhelm |
| **Critical Constraints** | Hard boundaries that cannot be violated |
| **Validation Queries** | Built-in verification after implementation |
| **Files to Modify** | Prevents the agent from missing anything |
| **Success Criteria** | Clear definition of "done" |

This prompt gives your Opus agent everything it needs to **plan perfectly and execute flawlessly**. Copy it directly and let it work! 🚀" and tool 3 : "# MISSION: Refactor Educational ERP Finance System from Session-Based to Subject-Based Pricing

## 📋 Executive Summary
You are refactoring a Node.js/React educational institution ERP system to replace session-level pricing with granular subject-level pricing. This enables precise revenue distribution where owners/partners receive 100% of revenue from subjects they teach, while teachers receive configurable compensation (70/30 split, fixed amount, or per-student rate) from subject fees. Every PKR must be accounted for with decimal precision, full audit trails, and zero money loss.

---

## 🔧 Current Architecture (To Be Replaced) Session Flow:
Create Session → 2. Set Session Price in Configuration → 3. Admit Student → 4. Session Price Loads → 5. Revenue Distributed Based on Session Fee
Problems:
Partners get 100% of entire session revenue even if teaching only 1 subject
No granularity for multi-teacher classes
Rounding errors in withdrawals/refunds
Asymmetric revenue/expense splits
No reconciliation between collected fees and distributed amounts 
---

## 🎯 Target Architecture (Subject-Based Pricing)

### Core Data Model Changes
```javascript
// Subject Model Enhancement (models/Subject.js)
{
  name: { type: String, required: true },
  code: { type: String, unique: true },
  basePrice: { type: Number, required: true, min: 0 }, // NEW: Price in PKR
  priceType: { type: String, enum: ['fixed', 'per-student'], default: 'fixed' },
  academySharePercent: { type: Number, default: 30, min: 0, max: 100 }, // For 70/30 splits
  isPartnerExclusive: { type: Boolean, default: false }, // If true, partner gets 100%
  createdAt, updatedAt
}

// Class-Subject Mapping (models/ClassSubject.js) - NEW COLLECTION
{
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  overriddenPrice: { type: Number }, // Optional: class-specific price override
  assignedTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  compensationModel: { 
    type: String, 
    enum: ['percentage-split', 'fixed-amount', 'per-student'],
    default: 'percentage-split'
  },
  compensationValue: { type: Number }, // 70 for 70%, or 5000 PKR fixed, or 200 PKR/student
  isActive: { type: Boolean, default: true }
}

// FeeRecord Enhancement (models/FeeRecord.js)
{
  // ... existing fields
  subjectBreakdown: [{
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subjectName: String,
    chargedAmount: Number,
    teacherCompensation: Number,
    academyShare: Number,
    partnerShare: Number,
    distributionStatus: { type: String, enum: ['pending', 'distributed', 'closed'] }
  }],
  totalAmount: Number,
  // ... existing fields
} // NEW: services/revenueEngine/subjectRevenueCalculator.js
/**
 * Calculate precise revenue distribution for a single subject fee
 * @param {Object} params
 * @param {Number} params.subjectPrice - The price charged for this subject
 * @param {Object} params.compensationConfig - { model: 'percentage-split'|'fixed'|'per-student', value: Number }
 * @param {Boolean} params.isPartnerTeacher - Is the teacher also an owner/partner?
 * @param {Number} params.studentCount - For per-student compensation models
 * @returns {Object} { teacherAmount, academyAmount, partnerAmount, breakdown: {...} }
 */
async function calculateSubjectRevenueDistribution(params) {
  const { subjectPrice, compensationConfig, isPartnerTeacher, studentCount = 1 } = params;
  
  // Validate: total distributed must equal subjectPrice exactly (integer PKR math)
  let teacherAmount = 0;
  let academyAmount = 0;
  let partnerAmount = 0;
  
  if (isPartnerTeacher) {
    // Partner gets 100% of their subject revenue
    partnerAmount = subjectPrice;
    academyAmount = 0;
    teacherAmount = 0; // No double-pay: partner IS the teacher
  } else {
    switch (compensationConfig.model) {
      case 'percentage-split':
        // e.g., 70% to teacher, 30% to academy pool
        const teacherPercent = compensationConfig.value; // 70
        const academyPercent = 100 - teacherPercent; // 30
        
        // Use integer arithmetic to avoid floating point errors
        teacherAmount = Math.floor((subjectPrice * teacherPercent) / 100);
        academyAmount = subjectPrice - teacherAmount; // Remainder ensures exact total
        break;
        
      case 'fixed-amount':
        teacherAmount = Math.min(compensationConfig.value, subjectPrice);
        academyAmount = subjectPrice - teacherAmount;
        break;
        
      case 'per-student':
        teacherAmount = Math.min(compensationConfig.value * studentCount, subjectPrice);
        academyAmount = subjectPrice - teacherAmount;
        break;
    }
  }
  
  // CRITICAL: Verify conservation of money
  const totalDistributed = teacherAmount + academyAmount + partnerAmount;
  if (totalDistributed !== subjectPrice) {
    throw new Error(`REVENUE CONSERVATION VIOLATION: ${subjectPrice} PKR charged but ${totalDistributed} PKR distributed`);
  }
  
  return {
    teacherAmount,
    academyAmount, 
    partnerAmount,
    breakdown: {
      subjectPrice,
      compensationModel: compensationConfig.model,
      compensationValue: compensationConfig.value,
      isPartnerTeacher,
      calculatedAt: new Date()
    }
  };
} 🔄 Required Workflow Changes
1. Configuration Module Updates (Configuration.js)
Add UI/form to set basePrice when creating/editing subjects
Add class-subject management interface:
Select class → Load all subjects → Assign teacher + compensation model per subject
Support bulk operations for multiple classes
Validate that subject prices > 0 and compensation values are logical
2. Admissions Flow Refactor (AdmissionsComponent.jsx + backend // When class is selected in admissions form:
async function loadClassSubjectPricing(classId) {
  const response = await fetch(`/api/classes/${classId}/subjects-with-pricing`);
  const subjects = await response.json();
  
  // Auto-populate fee calculation:
  const totalFee = subjects
    .filter(s => s.isSelected)
    .reduce((sum, s) => sum + s.effectivePrice, 0);
    
  return {
    subjects, // With prices, teacher assignments, compensation models
    totalFee,
    breakdown: subjects.map(s => ({
      subject: s.name,
      price: s.effectivePrice,
      teacher: s.assignedTeacher?.name,
      compensation: `${s.compensationModel}: ${s.compensationValue}`
    }))
  };
} Display itemized subject pricing in admission form (collapsible details)
Preserve draft functionality with subject-level selections
Real-time fee calculation as subjects are toggled
3. Fee Collection & Distribution (students.js POST /collect-fee)Display itemized subject pricing in admission form (collapsible details)
Preserve draft functionality with subject-level selections
Real-time fee calculation as subjects are toggled
3. Fee Collection & Distribution (students.js POST /collect-fee) // When fee is collected for a student:
for (const subject of enrolledSubjects) {
  const distribution = await calculateSubjectRevenueDistribution({
    subjectPrice: subject.effectivePrice,
    compensationConfig: subject.compensationConfig,
    isPartnerTeacher: subject.assignedTeacherId?.isPartner,
    studentCount: classEnrollmentCount // For per-student models
  });
  
  // Create atomic DailyRevenue entries for EACH subject:
  await DailyRevenue.create([
    {
      studentId,
      classId,
      subjectId: subject._id,
      feeRecordId: newFeeRecord._id,
      recipientId: subject.assignedTeacherId,
      recipientType: 'teacher',
      amount: distribution.teacherAmount,
      status: 'UNCOLLECTED', // Changes to COLLECTED on wallet close
      compensationModel: subject.compensationConfig.model,
      meta distribution.breakdown
    },
    {
      studentId,
      classId, 
      subjectId: subject._id,
      feeRecordId: newFeeRecord._id,
      recipientId: academyOwnerId,
      recipientType: 'academy-pool',
      amount: distribution.academyAmount,
      status: 'UNCOLLECTED',
      meta { type: 'academy-operating-fund' }
    },
    ...(distribution.partnerAmount > 0 ? [{
      studentId,
      classId,
      subjectId: subject._id, 
      feeRecordId: newFeeRecord._id,
      recipientId: subject.assignedTeacherId, // Partner IS teacher
      recipientType: 'partner-revenue',
      amount: distribution.partnerAmount,
      status: 'UNCOLLECTED',
      meta { type: 'partner-exclusive-subject' }
    }] : [])
  ]);
} // NEW: GET /api/finance/partner/earnings-breakdown
exports.getPartnerEarningsBreakdown = async (req, res) => {
  const partnerId = req.user._id;
  const { startDate, endDate } = req.query;
  
  const breakdown = await DailyRevenue.aggregate([
    { $match: { 
        recipientId: partnerId,
        recipientType: { $in: ['partner-revenue', 'teacher'] },
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    }},
    { $lookup: { from: 'subjects', localField: 'subjectId', foreignField: '_id', as: 'subject' }},
    { $lookup: { from: 'classes', localField: 'classId', foreignField: '_id', as: 'class' }},
    { $group: {
        _id: '$subjectId',
        subjectName: { $first: '$subject.name' },
        className: { $first: '$class.name' },
        totalEarned: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        compensationModels: { $addToSet: '$compensationModel' },
        closeableAmount: { 
          $sum: { $cond: [{ $eq: ['$status', 'UNCOLLECTED'] }, '$amount', 0] } 
        }
    }}
  ]);
  
  // Add wallet balance reconciliation
  const wallet = await User.findById(partnerId).select('walletBalance');
  
  res.json({
    success: true,
     {
      period: { startDate, endDate },
      earnings: breakdown,
      walletSummary: {
        verified: wallet.walletBalance?.verified || 0,
        floating: wallet.walletBalance?.floating || 0,
        totalCloseable: breakdown.reduce((s, b) => s + b.closeableAmount, 0)
      },
      reconciliation: {
        walletMatchesCloseable: Math.abs(
          (wallet.walletBalance?.floating || 0) - 
          breakdown.reduce((s, b) => s + b.closeableAmount, 0)
        ) < 1 // Allow 1 PKR tolerance for rounding
      }
    }
  });
}; // NEW: services/reconciliationEngine.js
class RevenueReconciliationEngine {
  // Verify every fee collection distributes exactly 100% of charged amount
  static async auditFeeRecord(feeRecordId) {
    const fee = await FeeRecord.findById(feeRecordId).populate('subjectBreakdown');
    const distributions = await DailyRevenue.find({ feeRecordId: fee._id });
    
    const charged = fee.totalAmount;
    const distributed = distributions.reduce((sum, d) => sum + d.amount, 0);
    const discrepancy = charged - distributed;
    
    if (Math.abs(discrepancy) > 0) {
      await Alert.create({
        severity: 'CRITICAL',
        type: 'REVENUE_MISMATCH',
        feeRecordId: fee._id,
        message: `Fee ${fee.receiptNumber}: Charged ${charged} PKR but distributed ${distributed} PKR (Δ ${discrepancy} PKR)`,
        autoResolved: false
      });
      return { valid: false, discrepancy };
    }
    return { valid: true, discrepancy: 0 };
  }
  
  // Daily partner wallet reconciliation
  static async reconcilePartnerWallet(partnerId, date) {
    // Compare: 
    // 1. Sum of UNCOLLECTED DailyRevenue entries for partner
    // 2. Partner's walletBalance.floating
    // 3. Sum of Transactions marked as "pending close"
    // Alert if any differ by >1 PKR
  }
} // tests/revenue/subjectPricing.test.js
describe('Subject-Based Revenue Distribution', () => {
  test('70/30 split preserves exact PKR total', async () => {
    const result = await calculateSubjectRevenueDistribution({
      subjectPrice: 1000,
      compensationConfig: { model: 'percentage-split', value: 70 },
      isPartnerTeacher: false
    });
    expect(result.teacherAmount + result.academyAmount).toBe(1000);
    expect(result.teacherAmount).toBe(700); // Math.floor(1000*0.7)
    expect(result.academyAmount).toBe(300); // Remainder
  });
  
  test('partner teaching subject gets 100%, no academy share', async () => {
    const result = await calculateSubjectRevenueDistribution({
      subjectPrice: 1500,
      compensationConfig: { model: 'percentage-split', value: 70 },
      isPartnerTeacher: true
    });
    expect(result.partnerAmount).toBe(1500);
    expect(result.academyAmount).toBe(0);
    expect(result.teacherAmount).toBe(0); // No double-pay
  });
  
  test('per-student compensation caps at subject price', async () => {
    const result = await calculateSubjectRevenueDistribution({
      subjectPrice: 500,
      compensationConfig: { model: 'per-student', value: 200 },
      studentCount: 10, // 200*10=2000 but subject only costs 500
      isPartnerTeacher: false
    });
    expect(result.teacherAmount).toBe(500); // Capped at subject price
    expect(result.academyAmount).toBe(0);
  });
  
  test('fee collection creates atomic subject distributions', async () => {
    // Mock fee collection for 3-subject class
    // Verify: 3 DailyRevenue entries created, total = fee amount, all statuses UNCOLLECTED
    // Verify: FeeRecord.subjectBreakdown matches distributions
  });
  
  test('withdrawal reversal distributes refunds proportionally across subjects', async () => {
    // If student paid 3000 PKR for 3 subjects (1000 each) and gets 1500 PKR refund
    // Verify: Each subject's revenue entries reduced by exactly 500 PKR
    // Verify: No rounding errors accumulate
  });
}); 📦 Deliverables Checklist
Database Migrations:
Add basePrice to Subject collection
Create ClassSubject mapping collection with compensation fields
Add subjectBreakdown array to FeeRecord schema
Backend Services:
subjectRevenueCalculator.js with integer-arithmetic distribution
reconciliationEngine.js with automated audit functions
Updated collect-fee endpoint with atomic subject-level distribution
New GET /api/classes/:id/subjects-with-pricing endpoint
Enhanced partner earnings breakdown endpoint
Frontend Updates (React):
Configuration: Subject price input + class-subject assignment UI
Admissions: Dynamic subject pricing display when class selected
Partner Dashboard: Subject-level earnings breakdown + closeable amounts
Real-time fee calculator with subject itemization
Precision Safeguards:
All monetary calculations use integer PKR (no floats)
Conservation-of-money assertions in distribution functions
Automated reconciliation hooks on critical operations
Audit & Reporting:
Every distribution logs: subject, price, compensation model, recipient, timestamp
Daily reconciliation report endpoint
CSV export for partner earnings with subject granularity
Tests:
Unit tests for revenue calculator (all compensation models)
Integration tests for fee collection → distribution → wallet update
Reconciliation tests for withdrawal/refund scenarios
Documentation:
Migration guide for existing session-based data
Admin guide: Setting subject prices and compensation models
Partner guide: Understanding subject-level earnings breakdown
⚠️ Critical Constraints
NO MONEY LOSS: Every PKR collected must be accounted for in exactly one distribution entry. Sum of distributions MUST equal charged amount.
DECIMAL PRECISION: Use integer arithmetic (PKR as whole numbers). Never use floating point for money.
BACKWARD COMPATIBILITY: Existing session-based fee records must remain queryable. New subject-based logic applies only to new admissions.
ATOMIC OPERATIONS: Fee collection must create all subject distributions in a single MongoDB transaction.
AUDIT TRAIL: Every distribution change must log: who, what, when, why, and before/after amounts.
PARTNER TRUST: Dashboard must show exactly how each PKR was calculated. No black boxes.
🚀 Execution Strategy
Phase 1: Data Model & Migrations (2 days)
Implement schema changes with Mongoose migrations
Backfill existing subjects with default prices (admin-configurable)
Phase 2: Revenue Engine Core (3 days)
Build subjectRevenueCalculator.js with exhaustive tests
Implement reconciliation engine safeguards
Phase 3: Backend API Updates (3 days)
Refactor fee collection to use subject-level distribution
Add new endpoints for class-subject pricing and partner breakdowns
Phase 4: Frontend Integration (4 days)
Update Configuration UI for subject pricing
Refactor Admissions form for dynamic subject pricing
Enhance Partner Dashboard with subject-level details
Phase 5: Testing & Validation (2 days)
Run full test suite + manual reconciliation audits
Parallel-run old/new systems for 1 week to verify no discrepancies
Phase 6: Deployment & Monitoring (1 day)
Feature flag rollout: enable subject-pricing for new admissions only
Monitor reconciliation alerts for first 72 hours
💬 Prompt for Opus Agent Start
12345678910111213141516171819202122
🔄 Fallback & Rollback Plan
If critical issues arise post-deployment:
Feature flag SUBJECT_PRICING_ENABLED defaults to false
All new admissions use session-based logic if flag is off
Daily reconciliation report includes "system mode" indicator
Rollback procedure:
Disable feature flag
Run migration to convert subject-based FeeRecords back to session-level totals
Notify partners of temporary reporting format change
SUCCESS METRICS:
✅ Zero reconciliation discrepancies in 30-day post-launch audit
✅ Partner dashboard shows subject-level earnings within 24 hours of fee collection
✅ Withdrawal processing time unchanged (<2 seconds)
✅ 100% test coverage on revenue calculation functions
✅ Admin can change subject price and see immediate effect in new admissions", i hope u do everythign smartly as epr what i haeve and what i need to the best !
