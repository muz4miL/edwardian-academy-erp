const Student = require("../models/Student");
const Class = require("../models/Class");
const Session = require("../models/Session");

/**
 * Public Registration Controller
 * 
 * Handles public student registration (no login required)
 * and pending approval management.
 */

// @desc    Public student registration
// @route   POST /api/public/register
// @access  Public (No Login Required)
exports.publicRegister = async (req, res) => {
    try {
        const {
            studentName,
            fatherName,
            cnic,
            parentCell,
            studentCell,
            email,
            address,
            class: className,
            group,
            subjects,
        } = req.body;

        // Validation
        if (!studentName || !fatherName || !parentCell || !className || !group) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: studentName, fatherName, parentCell, class, group",
            });
        }

        // Check for duplicate registration by phone
        const existingStudent = await Student.findOne({
            parentCell,
            studentStatus: { $in: ["Active", "Pending"] },
        });

        if (existingStudent) {
            return res.status(409).json({
                success: false,
                message: "A registration with this phone number already exists",
                existingStudentId: existingStudent.studentId,
            });
        }

        // Find the class for fee calculation
        const classDoc = await Class.findOne({ name: className }).lean();
        let totalFee = 0;
        let classRef = null;
        let subjectsWithFees = [];

        if (classDoc) {
            classRef = classDoc._id;
            // Calculate total fee from selected subjects
            if (subjects && subjects.length > 0) {
                subjectsWithFees = subjects.map((subName) => {
                    const classSubject = classDoc.subjects?.find(
                        (s) => (typeof s === "string" ? s : s.name) === subName
                    );
                    const fee = classSubject?.fee || classDoc.baseFee || 0;
                    return { name: subName, fee };
                });
                totalFee = subjectsWithFees.reduce((sum, s) => sum + s.fee, 0);
            } else {
                // Use base fee if no subjects selected
                totalFee = classDoc.baseFee || 0;
            }
        }

        // Get active session
        const activeSession = await Session.findOne({ isActive: true }).lean();

        // Create student with Pending status
        const student = await Student.create({
            studentName,
            fatherName,
            cnic,
            parentCell,
            studentCell,
            email,
            address,
            class: className,
            group,
            subjects: subjectsWithFees,
            totalFee,
            paidAmount: 0,
            feeStatus: "pending",
            studentStatus: "Pending", // Key: Pending approval
            status: "inactive", // Not active until approved
            classRef,
            sessionRef: activeSession?._id,
        });

        console.log(`📝 New public registration: ${studentName} (Pending approval)`);

        return res.status(201).json({
            success: true,
            message: "Registration submitted successfully! Pending admin approval.",
            data: {
                studentId: student.studentId,
                studentName: student.studentName,
                class: student.class,
                group: student.group,
                status: student.studentStatus,
                submittedAt: student.createdAt,
            },
        });
    } catch (error) {
        console.error("❌ Error in publicRegister:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during registration",
            error: error.message,
        });
    }
};

// @desc    Get all pending registrations
// @route   GET /api/public/pending
// @access  Protected (OWNER, OPERATOR)
exports.getPendingRegistrations = async (req, res) => {
    try {
        const pendingStudents = await Student.find({ studentStatus: "Pending" })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: pendingStudents.length,
            data: pendingStudents,
        });
    } catch (error) {
        console.error("❌ Error in getPendingRegistrations:", error);
        return res.status(500).json({
            success: false,
            message: "Server error fetching pending registrations",
            error: error.message,
        });
    }
};

// @desc    Approve a pending registration
// @route   POST /api/public/approve/:id
// @access  Protected (OWNER, OPERATOR)
exports.approveRegistration = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        if (student.studentStatus !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Student is already ${student.studentStatus}`,
            });
        }

        // Generate barcode ID
        await student.generateBarcodeId();

        // Generate a default password (last 4 digits of phone + first 4 of name)
        const phoneDigits = student.parentCell.replace(/\D/g, "").slice(-4);
        const namePart = student.studentName.replace(/\s/g, "").toLowerCase().slice(0, 4);
        const defaultPassword = `${namePart}${phoneDigits}`;

        // Update student
        student.studentStatus = "Active";
        student.status = "active";
        student.password = defaultPassword;

        await student.save();

        console.log(`✅ Approved: ${student.studentName} (Barcode: ${student.barcodeId})`);

        // Mock SMS (log the credentials)
        console.log(`📱 [MOCK SMS] To: ${student.parentCell}`);
        console.log(`   Message: Your student ${student.studentName} has been approved!`);
        console.log(`   Login: ${student.barcodeId} / Password: ${defaultPassword}`);

        return res.status(200).json({
            success: true,
            message: `✅ ${student.studentName} approved successfully!`,
            data: {
                studentId: student.studentId,
                barcodeId: student.barcodeId,
                studentName: student.studentName,
                status: student.studentStatus,
                loginCredentials: {
                    username: student.barcodeId,
                    password: defaultPassword,
                    note: "SMS would be sent to parent",
                },
            },
        });
    } catch (error) {
        console.error("❌ Error in approveRegistration:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during approval",
            error: error.message,
        });
    }
};

// @desc    Reject a pending registration
// @route   DELETE /api/public/reject/:id
// @access  Protected (OWNER, OPERATOR)
exports.rejectRegistration = async (req, res) => {
    try {
        const { reason } = req.body;
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        if (student.studentStatus !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Cannot reject - student is ${student.studentStatus}`,
            });
        }

        const studentName = student.studentName;
        await Student.deleteOne({ _id: req.params.id });

        console.log(`❌ Rejected: ${studentName} (Reason: ${reason || "Not specified"})`);

        return res.status(200).json({
            success: true,
            message: `Registration for ${studentName} has been rejected`,
            reason: reason || "Not specified",
        });
    } catch (error) {
        console.error("❌ Error in rejectRegistration:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during rejection",
            error: error.message,
        });
    }
};

// @desc    Get pending count (for sidebar badge)
// @route   GET /api/public/pending-count
// @access  Protected
exports.getPendingCount = async (req, res) => {
    try {
        const count = await Student.countDocuments({ studentStatus: "Pending" });
        return res.status(200).json({
            success: true,
            count,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            count: 0,
        });
    }
};
