# Database Schema (Mongoose Models)

> Comprehensive schema documentation generated automatically from Mongoose model definitions. This outlines collections, field types, required constraints, and inter-collection references (ObjectIds).

## Collection: `AcademySettlement`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `partnerId` | ObjectId | ✅ Yes | **Ref: User** |
| `partnerName` | String | ✅ Yes |  |
| `partnerRole` | String | ✅ Yes | Enum: [OWNER, PARTNER] |
| `percentage` | Number | ✅ Yes |  |
| `amount` | Number | ✅ Yes |  |
| `status` | String | ❌ No | Enum: [PENDING, RELEASED, CANCELLED]<br>Default: PENDING |
| `sourceDate` | Date | ✅ Yes | Default: (Function) |
| `sourceDetails.feeRecordId` | ObjectId | ❌ No | **Ref: FeeRecord** |
| `sourceDetails.studentId` | ObjectId | ❌ No | **Ref: Student** |
| `sourceDetails.studentName` | String | ❌ No |  |
| `sourceDetails.classId` | ObjectId | ❌ No | **Ref: Class** |
| `sourceDetails.className` | String | ❌ No |  |
| `sourceDetails.subject` | String | ❌ No |  |
| `sourceDetails.teacherId` | ObjectId | ❌ No | **Ref: Teacher** |
| `sourceDetails.teacherName` | String | ❌ No |  |
| `sourceDetails.totalAcademyShare` | Number | ❌ No |  |
| `sourceDetails.calculationProof` | String | ❌ No |  |
| `sessionRef` | ObjectId | ❌ No | **Ref: Session** |
| `sessionName` | String | ❌ No |  |
| `releasedAt` | Date | ❌ No |  |
| `releasedBy` | ObjectId | ❌ No | **Ref: User** |
| `releasedByName` | String | ❌ No |  |
| `releaseNotes` | String | ❌ No |  |
| `cancelledAt` | Date | ❌ No |  |
| `cancelledBy` | ObjectId | ❌ No | **Ref: User** |
| `cancellationReason` | String | ❌ No |  |
| `dailyRevenueId` | ObjectId | ❌ No | **Ref: DailyRevenue** |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Attendance`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `studentId` | ObjectId | ✅ Yes | **Ref: Student** |
| `studentNumericId` | String | ✅ Yes |  |
| `studentName` | String | ✅ Yes |  |
| `class` | String | ❌ No |  |
| `classRef` | ObjectId | ❌ No | **Ref: Class** |
| `group` | String | ❌ No |  |
| `type` | String | ❌ No | Enum: [check-in, check-out]<br>Default: check-in |
| `date` | String | ✅ Yes |  |
| `timestamp` | Date | ❌ No | Default: (Function) |
| `checkInTime` | Date | ❌ No |  |
| `status` | String | ❌ No | Enum: [present, late, early-leave, Present, Late, Absent, Excused]<br>Default: present |
| `currentSession.subject` | String | ❌ No |  |
| `currentSession.teacher` | String | ❌ No |  |
| `currentSession.startTime` | String | ❌ No |  |
| `currentSession.endTime` | String | ❌ No |  |
| `currentSession.room` | String | ❌ No |  |
| `scanMethod` | String | ❌ No | Enum: [barcode, manual, token]<br>Default: barcode |
| `markedBy` | String | ❌ No | Enum: [Gatekeeper, Admin, System, ]<br>Default: Gatekeeper |
| `scannedValue` | String | ❌ No |  |
| `scannedBy` | ObjectId | ❌ No | **Ref: User** |
| `feeStatus` | String | ❌ No |  |
| `notes` | String | ❌ No | Default:  |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Class`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `classId` | String | ❌ No |  |
| `classTitle` | String | ✅ Yes |  |
| `gradeLevel` | String | ✅ Yes | Enum: [9th Grade, 10th Grade, 11th Grade, 12th Grade, MDCAT Prep, ECAT Prep, Tuition Classes] |
| `sessionType` | String | ❌ No | Enum: [regular, etea, mdcat, ecat, test-prep]<br>Default: regular |
| `group` | String | ✅ Yes | Enum: [Pre-Medical, Pre-Engineering, Computer Science, Arts, General Science] |
| `shift` | String | ❌ No | Enum: [Morning, Evening, Weekend, Batch A, Batch B, Batch C] |
| `session` | ObjectId | ✅ Yes | **Ref: Session** |
| `days` | Array | ❌ No |  |
| `startTime` | String | ✅ Yes |  |
| `endTime` | String | ✅ Yes |  |
| `roomNumber` | String | ❌ No | Default: TBD |
| `maxCapacity` | Number | ❌ No | Default: 30 |
| `enrolledCount` | Number | ❌ No | Default: 0 |
| `assignedTeacher` | ObjectId | ❌ No | **Ref: Teacher** |
| `teacherName` | String | ❌ No |  |
| `revenueMode` | String | ❌ No | Enum: [standard, partner]<br>Default: standard |
| `subjects` | DocumentArray | ❌ No |  |
| `subjectTeachers` | DocumentArray | ❌ No |  |
| `baseFee` | Number | ❌ No | Default: 0 |
| `status` | String | ❌ No | Enum: [active, inactive]<br>Default: active |
| `createdAt` | Date | ❌ No | Default: (Function) |
| `updatedAt` | Date | ❌ No | Default: (Function) |
| `_id` | ObjectId | ❌ No |  |

---

## Collection: `Configuration`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `academyName` | String | ❌ No | Default: Edwardian Academy |
| `academyLogo` | String | ❌ No | Default:  |
| `academyAddress` | String | ❌ No | Default: Peshawar, Pakistan |
| `academyPhone` | String | ❌ No | Default:  |
| `academyOwner` | String | ❌ No | Default:  |
| `salaryConfig.teacherShare` | Number | ❌ No | Default: 70 |
| `salaryConfig.academyShare` | Number | ❌ No | Default: 30 |
| `partner100Rule` | Boolean | ❌ No | Default: true |
| `expenseSplit.waqar` | Number | ❌ No | Default: 40 |
| `expenseSplit.zahid` | Number | ❌ No | Default: 30 |
| `expenseSplit.saud` | Number | ❌ No | Default: 30 |
| `expenseShares` | DocumentArray | ❌ No |  |
| `academyShareSplit` | DocumentArray | ❌ No |  |
| `tuitionPoolSplit.waqar` | Number | ❌ No | Default: 50 |
| `tuitionPoolSplit.zahid` | Number | ❌ No | Default: 30 |
| `tuitionPoolSplit.saud` | Number | ❌ No | Default: 20 |
| `eteaPoolSplit.waqar` | Number | ❌ No | Default: 40 |
| `eteaPoolSplit.zahid` | Number | ❌ No | Default: 30 |
| `eteaPoolSplit.saud` | Number | ❌ No | Default: 30 |
| `poolDistribution.waqar` | Number | ❌ No | Default: 50 |
| `poolDistribution.zahid` | Number | ❌ No | Default: 30 |
| `poolDistribution.saud` | Number | ❌ No | Default: 20 |
| `eteaConfig.perStudentCommission` | Number | ❌ No | Default: 3000 |
| `eteaConfig.englishFixedSalary` | Number | ❌ No | Default: 80000 |
| `partnerIds.waqar` | ObjectId | ❌ No | **Ref: User** |
| `partnerIds.zahid` | ObjectId | ❌ No | **Ref: User** |
| `partnerIds.saud` | ObjectId | ❌ No | **Ref: User** |
| `defaultSubjectFees` | DocumentArray | ❌ No |  |
| `lastExpenseSplitMonth` | Number | ❌ No | Default: 0 |
| `lastExpenseSplitYear` | Number | ❌ No | Default: 0 |
| `sessionPrices` | DocumentArray | ❌ No |  |
| `precision` | Number | ❌ No | Default: 0 |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `DailyClosing`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `closedBy` | ObjectId | ✅ Yes | **Ref: User** |
| `closedByName` | String | ❌ No |  |
| `closedByRole` | String | ❌ No | Enum: [OWNER, PARTNER] |
| `date` | Date | ✅ Yes | Default: (Function) |
| `totalAmount` | Number | ✅ Yes | Default: 0 |
| `transactionCount` | Number | ❌ No | Default: 0 |
| `breakdown.tuitionRevenue` | Number | ❌ No | Default: 0 |
| `breakdown.academyShareRevenue` | Number | ❌ No | Default: 0 |
| `breakdown.withdrawalAdjustments` | Number | ❌ No | Default: 0 |
| `breakdown.lineItems` | DocumentArray | ❌ No |  |
| `status` | String | ❌ No | Enum: [PENDING, VERIFIED, CANCELLED]<br>Default: VERIFIED |
| `notes` | String | ❌ No |  |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `DailyRevenue`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `partner` | ObjectId | ✅ Yes | **Ref: User** |
| `date` | Date | ✅ Yes |  |
| `amount` | Number | ✅ Yes |  |
| `source` | String | ❌ No | Enum: [TUITION, ADMISSION]<br>Default: TUITION |
| `revenueType` | String | ❌ No | Enum: [TUITION_SHARE, ACADEMY_SHARE, WITHDRAWAL_ADJUSTMENT, SETTLEMENT_RELEASE]<br>Default: TUITION_SHARE |
| `status` | String | ❌ No | Enum: [UNCOLLECTED, COLLECTED, DEFERRED]<br>Default: UNCOLLECTED |
| `isDeferred` | Boolean | ❌ No | Default: false |
| `collectedAt` | Date | ❌ No |  |
| `classRef` | ObjectId | ❌ No | **Ref: Class** |
| `className` | String | ❌ No |  |
| `studentRef` | ObjectId | ❌ No | **Ref: Student** |
| `studentName` | String | ❌ No |  |
| `feeRecordRef` | ObjectId | ❌ No | **Ref: FeeRecord** |
| `subject` | String | ❌ No |  |
| `transactionReference` | String | ❌ No |  |
| `description` | String | ❌ No |  |
| `splitDetails.totalFee` | Number | ❌ No |  |
| `splitDetails.subjectFee` | Number | ❌ No |  |
| `splitDetails.splitCount` | Number | ❌ No |  |
| `splitDetails.perPersonShare` | Number | ❌ No |  |
| `splitDetails.description` | String | ❌ No |  |
| `splitDetails.calculationProof` | String | ❌ No |  |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Exam`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `examId` | String | ❌ No |  |
| `title` | String | ✅ Yes |  |
| `subject` | String | ✅ Yes |  |
| `classRef` | ObjectId | ✅ Yes | **Ref: Class** |
| `className` | String | ❌ No |  |
| `createdBy` | ObjectId | ✅ Yes | **Ref: User** |
| `durationMinutes` | Number | ✅ Yes | Default: 30 |
| `startTime` | Date | ✅ Yes |  |
| `endTime` | Date | ✅ Yes |  |
| `questions` | DocumentArray | ✅ Yes |  |
| `status` | String | ❌ No | Enum: [draft, published, completed]<br>Default: draft |
| `showResultToStudent` | Boolean | ❌ No | Default: false |
| `instructions` | String | ❌ No | Default: Read each question carefully. Select the best answer. |
| `passingPercentage` | Number | ❌ No | Default: 50 |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `ExamResult`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `studentRef` | ObjectId | ✅ Yes | **Ref: Student** |
| `examRef` | ObjectId | ✅ Yes | **Ref: Exam** |
| `answers` | Array | ✅ Yes |  |
| `score` | Number | ✅ Yes | Default: 0 |
| `totalMarks` | Number | ✅ Yes |  |
| `percentage` | Number | ❌ No | Default: 0 |
| `startedAt` | Date | ✅ Yes |  |
| `submittedAt` | Date | ❌ No | Default: (Function) |
| `timeTakenSeconds` | Number | ❌ No | Default: 0 |
| `tabSwitchCount` | Number | ❌ No | Default: 0 |
| `isFlagged` | Boolean | ❌ No | Default: false |
| `flagReason` | String | ❌ No |  |
| `isAutoSubmitted` | Boolean | ❌ No | Default: false |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Expense`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `title` | String | ✅ Yes |  |
| `category` | String | ✅ Yes | Enum: [Generator Fuel, Electricity Bill, Staff Tea & Refreshments, Marketing / Ads, Stationery, Rent, Salaries, Utilities, Equipment/Asset, Misc] |
| `amount` | Number | ✅ Yes |  |
| `status` | String | ❌ No | Enum: [pending, paid, overdue]<br>Default: pending |
| `expenseDate` | Date | ✅ Yes | Default: (Function) |
| `dueDate` | Date | ❌ No | Default: null |
| `paidDate` | Date | ❌ No | Default: null |
| `vendorName` | String | ✅ Yes |  |
| `description` | String | ❌ No |  |
| `billNumber` | String | ❌ No |  |
| `paidByType` | String | ❌ No | Enum: [ACADEMY_CASH, WAQAR, ZAHID, SAUD, JOINT_POOL]<br>Default: ACADEMY_CASH |
| `paidBy` | ObjectId | ❌ No | **Ref: User** |
| `splitRatio.waqar` | Number | ❌ No | Default: 40 |
| `splitRatio.zahid` | Number | ❌ No | Default: 30 |
| `splitRatio.saud` | Number | ❌ No | Default: 30 |
| `shares` | DocumentArray | ❌ No |  |
| `hasPartnerDebt` | Boolean | ❌ No | Default: false |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `FeeRecord`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `student` | ObjectId | ✅ Yes | **Ref: Student** |
| `studentName` | String | ✅ Yes |  |
| `class` | ObjectId | ❌ No | **Ref: Class** |
| `className` | String | ✅ Yes |  |
| `subject` | String | ❌ No |  |
| `amount` | Number | ✅ Yes |  |
| `discountAmount` | Number | ❌ No | Default: 0 |
| `month` | String | ✅ Yes |  |
| `status` | String | ❌ No | Enum: [PAID, PENDING, REFUNDED]<br>Default: PAID |
| `collectedBy` | ObjectId | ❌ No | **Ref: User** |
| `collectedByName` | String | ❌ No |  |
| `teacher` | ObjectId | ❌ No | **Ref: Teacher** |
| `teacherName` | String | ❌ No |  |
| `isPartnerTeacher` | Boolean | ❌ No | Default: false |
| `teachers` | DocumentArray | ❌ No | Default:  |
| `splitBreakdown.teacherShare` | Number | ❌ No | Default: 0 |
| `splitBreakdown.academyShare` | Number | ❌ No | Default: 0 |
| `splitBreakdown.ownerPartnerShare` | Number | ❌ No | Default: 0 |
| `splitBreakdown.teacherPercentage` | Number | ❌ No | Default: 70 |
| `splitBreakdown.academyPercentage` | Number | ❌ No | Default: 30 |
| `splitBreakdown.totalTeachers` | Number | ❌ No | Default: 1 |
| `subjectBreakdown` | DocumentArray | ❌ No | Default:  |
| `totalDiscountBreakdown.totalOriginalFee` | Number | ❌ No | Default: 0 |
| `totalDiscountBreakdown.totalDiscount` | Number | ❌ No | Default: 0 |
| `totalDiscountBreakdown.totalEffectiveFee` | Number | ❌ No | Default: 0 |
| `totalDiscountBreakdown.subjectDiscounts` | DocumentArray | ❌ No | Default:  |
| `academyDistribution` | DocumentArray | ❌ No | Default:  |
| `paymentMethod` | String | ❌ No | Enum: [CASH, BANK, ONLINE]<br>Default: CASH |
| `receiptNumber` | String | ❌ No |  |
| `notes` | String | ❌ No |  |
| `refundAmount` | Number | ❌ No | Default: 0 |
| `refundDate` | Date | ❌ No |  |
| `refundReason` | String | ❌ No |  |
| `revenueSource` | String | ❌ No | Enum: [class-partner-mode, partner-100-rule, partner-standard-split, standard-split, configuration, tuition-auto, academy-teacher-split, academy-per-student, subject-based-pricing] |
| `distributionCompleted` | Boolean | ❌ No | Default: false |
| `distributionCompletedAt` | Date | ❌ No |  |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `FinanceRecord`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `receiptId` | String | ✅ Yes |  |
| `studentId` | ObjectId | ✅ Yes | **Ref: Student** |
| `studentName` | String | ✅ Yes |  |
| `studentClass` | String | ✅ Yes |  |
| `totalFee` | Number | ✅ Yes |  |
| `paidAmount` | Number | ✅ Yes |  |
| `balance` | Number | ✅ Yes |  |
| `status` | String | ❌ No | Enum: [paid, partial, pending]<br>Default: pending |
| `paymentMethod` | String | ❌ No | Enum: [cash, bank-transfer, cheque, online]<br>Default: cash |
| `paymentDate` | Date | ❌ No | Default: (Function) |
| `description` | String | ❌ No |  |
| `month` | String | ✅ Yes |  |
| `year` | Number | ✅ Yes |  |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Inventory
*(Schema could not be parsed)*

## Collection: `Lead`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `name` | String | ✅ Yes |  |
| `phone` | String | ✅ Yes |  |
| `email` | String | ❌ No |  |
| `source` | String | ❌ No | Enum: [Walk-in, Phone, Referral, Social Media, Website, Other]<br>Default: Walk-in |
| `interest` | String | ✅ Yes |  |
| `status` | String | ❌ No | Enum: [New, FollowUp, Converted, Dead]<br>Default: New |
| `remarks` | String | ❌ No | Default:  |
| `lastContactDate` | Date | ❌ No |  |
| `nextFollowUp` | Date | ❌ No |  |
| `convertedToStudent` | ObjectId | ❌ No | **Ref: Student** |
| `createdBy` | ObjectId | ❌ No | **Ref: User** |
| `lastModifiedBy` | ObjectId | ❌ No | **Ref: User** |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Lecture`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `title` | String | ✅ Yes |  |
| `youtubeUrl` | String | ✅ Yes |  |
| `youtubeId` | String | ✅ Yes |  |
| `description` | String | ❌ No |  |
| `classRef` | ObjectId | ✅ Yes | **Ref: Class** |
| `teacherRef` | ObjectId | ✅ Yes | **Ref: User** |
| `gradeLevel` | String | ✅ Yes | Enum: [9th Grade, 10th Grade, 11th Grade, 12th Grade, MDCAT Prep, ECAT Prep, Tuition Classes] |
| `subject` | String | ✅ Yes | Enum: [Physics, Chemistry, Mathematics, Biology, English, Urdu, Computer Science, Islamiat, Pakistan Studies, General Science, Other] |
| `duration` | String | ❌ No |  |
| `isLocked` | Boolean | ❌ No | Default: false |
| `viewCount` | Number | ❌ No | Default: 0 |
| `order` | Number | ❌ No | Default: 0 |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Notification`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `recipient` | ObjectId | ❌ No | **Ref: User** |
| `recipientRole` | String | ❌ No | Enum: [OWNER, PARTNER, STAFF] |
| `message` | String | ✅ Yes |  |
| `type` | String | ❌ No | Enum: [FINANCE, SYSTEM]<br>Default: SYSTEM |
| `isRead` | Boolean | ❌ No | Default: false |
| `relatedId` | String | ❌ No |  |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `PayoutRequest`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `requestId` | String | ✅ Yes |  |
| `teacherId` | ObjectId | ✅ Yes | **Ref: Teacher** |
| `teacherName` | String | ✅ Yes |  |
| `amount` | Number | ✅ Yes |  |
| `status` | String | ❌ No | Enum: [PENDING, APPROVED, REJECTED]<br>Default: PENDING |
| `requestDate` | Date | ❌ No | Default: (Function) |
| `approvedBy` | ObjectId | ❌ No | **Ref: User** |
| `approvedAt` | Date | ❌ No |  |
| `approvalNotes` | String | ❌ No |  |
| `rejectedBy` | ObjectId | ❌ No | **Ref: User** |
| `rejectedAt` | Date | ❌ No |  |
| `rejectionReason` | String | ❌ No |  |
| `transactionId` | ObjectId | ❌ No | **Ref: Transaction** |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Session`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `sessionId` | String | ❌ No |  |
| `sessionName` | String | ✅ Yes |  |
| `description` | String | ❌ No |  |
| `startDate` | Date | ✅ Yes |  |
| `endDate` | Date | ✅ Yes |  |
| `status` | String | ❌ No | Enum: [active, completed, upcoming]<br>Default: upcoming |
| `createdAt` | Date | ❌ No | Default: (Function) |
| `updatedAt` | Date | ❌ No | Default: (Function) |
| `_id` | ObjectId | ❌ No |  |

---

## Collection: `Settings`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `academyName` | String | ✅ Yes | Default: Academy Management System |
| `contactEmail` | String | ✅ Yes | Default: admin@academy.com |
| `contactPhone` | String | ✅ Yes | Default: +92 321 1234567 |
| `currency` | String | ✅ Yes | Enum: [PKR, USD]<br>Default: PKR |
| `defaultCompensationMode` | String | ✅ Yes | Enum: [percentage, fixed]<br>Default: percentage |
| `defaultTeacherShare` | Number | ❌ No | Default: 70 |
| `defaultAcademyShare` | Number | ❌ No | Default: 30 |
| `defaultBaseSalary` | Number | ❌ No | Default: 0 |
| `defaultLateFee` | Number | ✅ Yes | Default: 500 |
| `feeDueDay` | String | ✅ Yes | Enum: [1, 5, 10, 15]<br>Default: 10 |
| `expenseSplit.waqar` | Number | ❌ No | Default: 40 |
| `expenseSplit.zahid` | Number | ❌ No | Default: 30 |
| `expenseSplit.saud` | Number | ❌ No | Default: 30 |
| `defaultSubjectFees` | DocumentArray | ❌ No |  |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Settlement`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `partnerId` | ObjectId | ✅ Yes | **Ref: User** |
| `partnerName` | String | ✅ Yes |  |
| `amount` | Number | ✅ Yes |  |
| `date` | Date | ✅ Yes | Default: (Function) |
| `method` | String | ❌ No | Enum: [CASH, BANK_TRANSFER, ADJUSTMENT]<br>Default: CASH |
| `recordedBy` | ObjectId | ✅ Yes | **Ref: User** |
| `expenseId` | ObjectId | ❌ No | **Ref: Expense** |
| `shareIndex` | Number | ❌ No |  |
| `notes` | String | ❌ No |  |
| `status` | String | ❌ No | Enum: [COMPLETED, PENDING, CANCELLED]<br>Default: COMPLETED |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Student`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `studentId` | String | ❌ No |  |
| `barcodeId` | String | ❌ No |  |
| `password` | String | ❌ No |  |
| `plainPassword` | String | ❌ No |  |
| `studentStatus` | String | ❌ No | Enum: [Active, Pending, Alumni, Expelled, Suspended, Withdrawn]<br>Default: Active |
| `reprintCount` | Number | ❌ No | Default: 0 |
| `printHistory` | DocumentArray | ❌ No |  |
| `cnic` | String | ❌ No |  |
| `photo` | String | ❌ No |  |
| `imageUrl` | String | ❌ No | Default: null |
| `profilePictureChangeCount` | Number | ❌ No | Default: 0 |
| `profilePictureChangeLog` | DocumentArray | ❌ No |  |
| `lastScannedAt` | Date | ❌ No |  |
| `studentName` | String | ✅ Yes |  |
| `fatherName` | String | ✅ Yes |  |
| `class` | String | ✅ Yes |  |
| `group` | String | ✅ Yes |  |
| `subjects` | DocumentArray | ❌ No |  |
| `parentCell` | String | ✅ Yes |  |
| `studentCell` | String | ❌ No |  |
| `email` | String | ❌ No |  |
| `address` | String | ❌ No |  |
| `status` | String | ❌ No | Enum: [active, inactive, graduated]<br>Default: active |
| `feeStatus` | String | ❌ No | Enum: [paid, partial, pending]<br>Default: pending |
| `totalFee` | Number | ✅ Yes |  |
| `paidAmount` | Number | ❌ No | Default: 0 |
| `discountAmount` | Number | ❌ No | Default: 0 |
| `admissionDate` | Date | ❌ No | Default: (Function) |
| `classRef` | ObjectId | ❌ No | **Ref: Class** |
| `sessionRef` | ObjectId | ❌ No | **Ref: Session** |
| `assignedTeacher` | ObjectId | ❌ No | **Ref: Teacher** |
| `assignedTeacherName` | String | ❌ No |  |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Teacher`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `name` | String | ✅ Yes |  |
| `phone` | String | ✅ Yes |  |
| `subject` | String | ✅ Yes |  |
| `joiningDate` | Date | ✅ Yes | Default: (Function) |
| `status` | String | ❌ No | Enum: [active, inactive, suspended]<br>Default: active |
| `role` | String | ❌ No | Enum: [OWNER, PARTNER, TEACHER]<br>Default: TEACHER |
| `profileImage` | String | ❌ No |  |
| `userId` | ObjectId | ❌ No | **Ref: User** |
| `username` | String | ❌ No |  |
| `plainPassword` | String | ❌ No |  |
| `balance.floating` | Number | ❌ No | Default: 0 |
| `balance.verified` | Number | ❌ No | Default: 0 |
| `balance.pending` | Number | ❌ No | Default: 0 |
| `totalPaid` | Number | ❌ No | Default: 0 |
| `compensation.type` | String | ✅ Yes | Enum: [percentage, fixed, hybrid, perStudent]<br>Default: percentage |
| `compensation.teacherShare` | Number | ❌ No | Default: null |
| `compensation.academyShare` | Number | ❌ No | Default: null |
| `compensation.fixedSalary` | Number | ❌ No | Default: null |
| `compensation.baseSalary` | Number | ❌ No | Default: null |
| `compensation.profitShare` | Number | ❌ No | Default: null |
| `compensation.perStudentAmount` | Number | ❌ No | Default: null |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `TeacherDeposit`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `teacherId` | ObjectId | ✅ Yes | **Ref: Teacher** |
| `teacherName` | String | ✅ Yes |  |
| `amount` | Number | ✅ Yes |  |
| `depositType` | String | ❌ No | Enum: [ADVANCE, BONUS, REIMBURSEMENT, ADJUSTMENT, OTHER]<br>Default: OTHER |
| `reason` | String | ✅ Yes |  |
| `depositedBy` | ObjectId | ✅ Yes | **Ref: User** |
| `depositedByName` | String | ✅ Yes |  |
| `paymentMethod` | String | ❌ No | Enum: [CASH, BANK_TRANSFER, ADJUSTMENT]<br>Default: CASH |
| `status` | String | ❌ No | Enum: [COMPLETED, PENDING, REVERSED]<br>Default: COMPLETED |
| `reversedAt` | Date | ❌ No |  |
| `reversedBy` | ObjectId | ❌ No | **Ref: User** |
| `reversalReason` | String | ❌ No |  |
| `deductedFromPayout` | Boolean | ❌ No | Default: false |
| `deductedPayoutId` | ObjectId | ❌ No | **Ref: PayoutRequest** |
| `transactionId` | ObjectId | ❌ No | **Ref: Transaction** |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `TeacherPayment`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `voucherId` | String | ✅ Yes |  |
| `teacherId` | ObjectId | ✅ Yes | **Ref: Teacher** |
| `teacherName` | String | ✅ Yes |  |
| `subject` | String | ✅ Yes |  |
| `amountPaid` | Number | ✅ Yes |  |
| `compensationType` | String | ✅ Yes | Enum: [percentage, fixed, hybrid, perStudent] |
| `month` | String | ✅ Yes |  |
| `year` | Number | ✅ Yes |  |
| `sessionId` | ObjectId | ❌ No | **Ref: Session** |
| `sessionName` | String | ❌ No |  |
| `paymentDate` | Date | ❌ No | Default: (Function) |
| `paymentMethod` | String | ❌ No | Enum: [cash, bank-transfer, cheque]<br>Default: cash |
| `status` | String | ❌ No | Enum: [paid, pending, cancelled]<br>Default: paid |
| `notes` | String | ❌ No |  |
| `authorizedBy` | String | ❌ No | Default: Admin |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Timetable`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `entryId` | String | ❌ No |  |
| `classId` | ObjectId | ✅ Yes | **Ref: Class** |
| `teacherId` | ObjectId | ✅ Yes | **Ref: Teacher** |
| `subject` | String | ✅ Yes |  |
| `day` | String | ✅ Yes | Enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday] |
| `startTime` | String | ✅ Yes |  |
| `endTime` | String | ✅ Yes |  |
| `room` | String | ❌ No |  |
| `status` | String | ❌ No | Enum: [active, inactive]<br>Default: active |
| `createdAt` | Date | ❌ No | Default: (Function) |
| `updatedAt` | Date | ❌ No | Default: (Function) |
| `_id` | ObjectId | ❌ No |  |

---

## Collection: `Transaction`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `type` | String | ✅ Yes | Enum: [INCOME, EXPENSE, CREDIT, LIABILITY, PARTNER_WITHDRAWAL, REFUND, DEBT, TRANSFER, DIVIDEND, POOL_DISTRIBUTION, WITHDRAWAL_REVERSAL] |
| `category` | String | ✅ Yes | Enum: [Chemistry, Tuition, Pool, Rent, Utilities, Salaries, Teacher Payout, Teacher Salary, Teacher Credit, Teacher Advance, Teacher Share, Academy Share, Unallocated Pool, Electricity Bill, Generator Fuel, Staff Tea & Refreshments, Marketing / Ads, Stationery, Equipment/Asset, Misc, Miscellaneous, Refund, Dividend, ExpenseShare, Teacher_Payout, Pool_Dividend, Expense_Share, Daily_Close, Payroll_Credit, Trip_Fee, Test_Fee, Lab_Fee, Library_Fee, Sports_Fee, Event_Fee, Student_Misc, Withdrawal_Reversal] |
| `stream` | String | ❌ No | Enum: [ACADEMY_POOL, OWNER_CHEMISTRY, PARTNER_CHEMISTRY, PARTNER_PHYSICS, PARTNER_BIO, PARTNER_ETEA, STAFF_TUITION, TEACHER_LEDGER, UNALLOCATED_POOL, JOINT_POOL, DIVIDEND, TUITION_POOL, ETEA_POOL, ETEA_ENGLISH_POOL, OWNER_DIVIDEND, PARTNER_DIVIDEND, PARTNER_EXPENSE_DEBT]<br>Default: ACADEMY_POOL |
| `amount` | Number | ✅ Yes |  |
| `description` | String | ❌ No |  |
| `collectedBy` | ObjectId | ❌ No | **Ref: User** |
| `status` | String | ❌ No | Enum: [FLOATING, VERIFIED, CANCELLED, REFUNDED, DEFERRED]<br>Default: FLOATING |
| `splitDetails.teacherShare` | Number | ❌ No | Default: 0 |
| `splitDetails.academyShare` | Number | ❌ No | Default: 0 |
| `splitDetails.teacherPercentage` | Number | ❌ No | Default: 0 |
| `splitDetails.academyPercentage` | Number | ❌ No | Default: 0 |
| `splitDetails.teacherId` | ObjectId | ❌ No | **Ref: Teacher** |
| `splitDetails.teacherName` | String | ❌ No |  |
| `splitDetails.isPaid` | Boolean | ❌ No | Default: false |
| `splitDetails.teacherRole` | String | ❌ No |  |
| `splitDetails.studentId` | ObjectId | ❌ No | **Ref: Student** |
| `splitDetails.studentName` | String | ❌ No |  |
| `splitDetails.subject` | String | ❌ No |  |
| `splitDetails.subjectFee` | Number | ❌ No |  |
| `splitDetails.shareType` | String | ❌ No |  |
| `splitDetails.month` | String | ❌ No |  |
| `splitDetails.partnerName` | String | ❌ No |  |
| `splitDetails.percentage` | Number | ❌ No |  |
| `splitDetails.poolType` | String | ❌ No | Enum: [TUITION, ETEA] |
| `studentId` | ObjectId | ❌ No | **Ref: Student** |
| `originalTransactionId` | ObjectId | ❌ No | **Ref: Transaction** |
| `date` | Date | ❌ No | Default: (Function) |
| `closingId` | ObjectId | ❌ No | **Ref: DailyClosing** |
| `isDistributed` | Boolean | ❌ No | Default: false |
| `distributionId` | ObjectId | ❌ No | **Ref: Transaction** |
| `recipientPartner` | ObjectId | ❌ No | **Ref: User** |
| `recipientPartnerName` | String | ❌ No |  |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `User`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `userId` | String | ✅ Yes |  |
| `username` | String | ✅ Yes |  |
| `password` | String | ✅ Yes |  |
| `fullName` | String | ✅ Yes |  |
| `role` | String | ✅ Yes | Enum: [OWNER, PARTNER, STAFF, TEACHER] |
| `permissions` | Array | ❌ No | Default: dashboard |
| `walletBalance.floating` | Number | ❌ No | Default: 0 |
| `walletBalance.verified` | Number | ❌ No | Default: 0 |
| `totalCash` | Number | ❌ No | Default: 0 |
| `expenseDebt` | Number | ❌ No | Default: 0 |
| `debtToOwner` | Number | ❌ No | Default: 0 |
| `pendingDebt` | Number | ❌ No | Default: 0 |
| `phone` | String | ❌ No |  |
| `email` | String | ❌ No |  |
| `isActive` | Boolean | ❌ No | Default: true |
| `canBeDeleted` | Boolean | ❌ No | Default: true |
| `lastLogin` | Date | ❌ No |  |
| `profileImage` | String | ❌ No |  |
| `teacherId` | ObjectId | ❌ No | **Ref: Teacher** |
| `manualBalance` | Number | ❌ No | Default: 0 |
| `payoutHistory` | DocumentArray | ❌ No |  |
| `createdBy` | ObjectId | ❌ No | **Ref: User** |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `Video`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `title` | String | ✅ Yes |  |
| `description` | String | ❌ No |  |
| `url` | String | ✅ Yes |  |
| `thumbnail` | String | ❌ No |  |
| `provider` | String | ❌ No | Enum: [youtube, bunny, vimeo, direct]<br>Default: youtube |
| `duration` | Number | ❌ No |  |
| `classRef` | ObjectId | ❌ No | **Ref: Class** |
| `className` | String | ❌ No |  |
| `subjectRef` | ObjectId | ❌ No | **Ref: Subject** |
| `subjectName` | String | ❌ No |  |
| `teacherId` | ObjectId | ❌ No | **Ref: Teacher** |
| `teacherName` | String | ❌ No |  |
| `isPublished` | Boolean | ❌ No | Default: true |
| `sortOrder` | Number | ❌ No | Default: 0 |
| `viewCount` | Number | ❌ No | Default: 0 |
| `uploadedAt` | Date | ❌ No | Default: (Function) |
| `uploadedBy` | ObjectId | ❌ No | **Ref: User** |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

## Collection: `WebsiteConfig`

| Field Path | Data Type | Required | Details / References |
|------------|-----------|----------|----------------------|
| `heroSection.title` | String | ❌ No | Default: The Edwardian's Academy |
| `heroSection.subtitle` | String | ❌ No | Default: Your Pathway to Success |
| `heroSection.tagline` | String | ❌ No | Default: Excellence in Education Since 2017 |
| `announcements` | DocumentArray | ❌ No |  |
| `admissionStatus.isOpen` | Boolean | ❌ No | Default: true |
| `admissionStatus.notice` | String | ❌ No | Default: Admissions are now OPEN for the new session! |
| `admissionStatus.closedMessage` | String | ❌ No | Default: Admissions are currently closed. Please check back later. |
| `contactInfo.phone` | String | ❌ No | Default: 091-5601600 |
| `contactInfo.mobile` | String | ❌ No | Default: 0334-5852326 |
| `contactInfo.email` | String | ❌ No | Default: theedwardianacademy2017@gmail.com |
| `contactInfo.address` | String | ❌ No | Default: Opposite Islamia College Behind, Danishabad University Road Peshawar |
| `contactInfo.facebook` | String | ❌ No | Default: https://www.facebook.com/theedwardianacademy |
| `featuredSubjects` | Array | ❌ No | Default: Chemistry,Physics,Biology,Mathematics |
| `highlights` | DocumentArray | ❌ No |  |
| `lastUpdatedBy` | ObjectId | ❌ No | **Ref: User** |
| `_id` | ObjectId | ❌ No |  |
| `createdAt` | Date | ❌ No |  |
| `updatedAt` | Date | ❌ No |  |

---

