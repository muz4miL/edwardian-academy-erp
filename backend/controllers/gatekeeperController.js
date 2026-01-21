const Student = require("../models/Student");

/**
 * Gatekeeper Controller - Smart Gate Scanner Module
 * 
 * Handles barcode scanning for physical security at entry points.
 */

// @desc    Verify student by barcode scan
// @route   POST /api/gatekeeper/scan
// @access  Protected (OWNER, OPERATOR)
exports.scanBarcode = async (req, res) => {
    try {
        const { barcodeId } = req.body;

        if (!barcodeId || barcodeId.length < 5) {
            return res.status(400).json({
                success: false,
                status: "error",
                message: "Invalid barcode format",
            });
        }

        console.log(`🔍 Scanning barcode: ${barcodeId}`);

        // Find student by barcodeId OR studentId (for flexibility)
        const student = await Student.findOne({
            $or: [
                { barcodeId: barcodeId },
                { studentId: barcodeId },
                { barcodeId: { $regex: new RegExp(barcodeId, "i") } },
            ],
        })
            .populate("classRef", "name")
            .populate("sessionRef", "name startDate endDate")
            .lean();

        if (!student) {
            console.log(`❌ Unknown barcode: ${barcodeId}`);
            return res.status(404).json({
                success: false,
                status: "unknown",
                message: "Unknown Student - Barcode not registered",
                barcodeId,
            });
        }

        // Check student status
        if (student.studentStatus === "Expelled" || student.studentStatus === "Suspended") {
            console.log(`🚫 Blocked student: ${student.studentName} (${student.studentStatus})`);
            return res.status(403).json({
                success: false,
                status: "blocked",
                message: `Entry Denied - Student is ${student.studentStatus}`,
                student: {
                    name: student.studentName,
                    studentId: student.studentId,
                    status: student.studentStatus,
                    photo: student.photo,
                },
            });
        }

        // Check fee status
        const hasDefaulted = student.feeStatus === "pending" && student.paidAmount === 0;
        const isPartial = student.feeStatus === "partial";
        const isPaid = student.feeStatus === "paid";

        // Calculate balance
        const balance = Math.max(0, (student.totalFee || 0) - (student.paidAmount || 0));

        // Determine verification status
        let verificationStatus = "success";
        let statusMessage = "✅ Entry Permitted - Fees Paid";

        if (hasDefaulted) {
            verificationStatus = "defaulter";
            statusMessage = "⚠️ Fee Defaulter - Collect Payment";
        } else if (isPartial) {
            verificationStatus = "partial";
            statusMessage = `⚠️ Partial Payment - Balance: PKR ${balance.toLocaleString()}`;
        }

        console.log(`✅ Verified: ${student.studentName} (${verificationStatus})`);

        // Log the scan (for attendance/security audit)
        // TODO: Create a ScanLog model later for full audit trail

        return res.status(200).json({
            success: true,
            status: verificationStatus,
            message: statusMessage,
            student: {
                _id: student._id,
                studentId: student.studentId,
                barcodeId: student.barcodeId,
                name: student.studentName,
                fatherName: student.fatherName,
                class: student.class,
                group: student.group,
                photo: student.photo,
                feeStatus: student.feeStatus,
                totalFee: student.totalFee,
                paidAmount: student.paidAmount,
                balance,
                studentStatus: student.studentStatus || "Active",
                session: student.sessionRef?.name || "N/A",
            },
            scannedAt: new Date(),
        });
    } catch (error) {
        console.error("❌ Error in scanBarcode:", error);
        return res.status(500).json({
            success: false,
            status: "error",
            message: "Server error during scan",
            error: error.message,
        });
    }
};

// @desc    Search student by name/phone for manual lookup
// @route   GET /api/gatekeeper/search
// @access  Protected (OWNER, OPERATOR)
exports.searchStudent = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Search query must be at least 2 characters",
            });
        }

        const students = await Student.find({
            $or: [
                { studentName: { $regex: query, $options: "i" } },
                { studentId: { $regex: query, $options: "i" } },
                { parentCell: { $regex: query, $options: "i" } },
                { barcodeId: { $regex: query, $options: "i" } },
            ],
        })
            .select("studentId barcodeId studentName fatherName class group photo feeStatus studentStatus")
            .limit(10)
            .lean();

        return res.status(200).json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error("❌ Error in searchStudent:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during search",
            error: error.message,
        });
    }
};

// @desc    Generate or regenerate barcode for a student
// @route   POST /api/gatekeeper/generate-barcode/:id
// @access  Protected (OWNER, OPERATOR)
exports.generateBarcode = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        // Generate barcode ID
        await student.generateBarcodeId();
        await student.save();

        return res.status(200).json({
            success: true,
            message: `✅ Barcode generated: ${student.barcodeId}`,
            barcodeId: student.barcodeId,
            student: {
                _id: student._id,
                studentId: student.studentId,
                name: student.studentName,
                barcodeId: student.barcodeId,
            },
        });
    } catch (error) {
        console.error("❌ Error in generateBarcode:", error);
        return res.status(500).json({
            success: false,
            message: "Server error generating barcode",
            error: error.message,
        });
    }
};

// @desc    Increment reprint count and return updated student
// @route   POST /api/gatekeeper/reprint/:id
// @access  Protected (OWNER, OPERATOR)
exports.recordReprint = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        // Increment reprint count
        student.reprintCount = (student.reprintCount || 0) + 1;
        await student.save();

        console.log(`📄 Reprint recorded for ${student.studentName}: Copy #${student.reprintCount}`);

        return res.status(200).json({
            success: true,
            message: `Reprint recorded. This is copy #${student.reprintCount}`,
            reprintCount: student.reprintCount,
            student: {
                _id: student._id,
                studentId: student.studentId,
                name: student.studentName,
                barcodeId: student.barcodeId,
                reprintCount: student.reprintCount,
            },
        });
    } catch (error) {
        console.error("❌ Error in recordReprint:", error);
        return res.status(500).json({
            success: false,
            message: "Server error recording reprint",
            error: error.message,
        });
    }
};
