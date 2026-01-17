const Student = require('../models/Student');

// @desc    Get all students
// @route   GET /api/students
exports.getStudents = async (req, res) => {
    try {
        const students = await Student.find()
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error('❌ Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message,
        });
    }
};

// @desc    Get single student by ID
// @route   GET /api/students/:id
exports.getStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).lean();

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        res.status(200).json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error('❌ Error fetching student:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student',
            error: error.message,
        });
    }
};

// @desc    Create new student (admission)
// @route   POST /api/students
exports.createStudent = async (req, res) => {
    try {
        console.log('\n=== CREATE STUDENT REQUEST ===');
        console.log('Incoming Data:', JSON.stringify(req.body, null, 2));

        const {
            studentName,
            fatherName,
            class: className,
            group,
            address,
            parentCell,
            studentCell,
            email,
            admissionDate,
            totalFee,
            paidAmount,
            classRef,
            sessionRef,
        } = req.body;

        // Validation
        if (!studentName || !fatherName || !className || !group || !parentCell) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: studentName, fatherName, class, group, parentCell',
            });
        }

        if (totalFee === undefined || totalFee === null) {
            return res.status(400).json({
                success: false,
                message: 'Total fee is required',
            });
        }

        // Create student object
        const studentData = {
            studentName: studentName.trim(),
            fatherName: fatherName.trim(),
            class: className.trim(),
            group: group.trim(),
            parentCell: parentCell.trim(),
            totalFee: Number(totalFee),
            paidAmount: Number(paidAmount) || 0,
        };

        // Optional fields
        if (studentCell) studentData.studentCell = studentCell.trim();
        if (email) studentData.email = email.trim().toLowerCase();
        if (address) studentData.address = address.trim();
        if (admissionDate) studentData.admissionDate = new Date(admissionDate);
        if (classRef) studentData.classRef = classRef;
        if (sessionRef) studentData.sessionRef = sessionRef;

        console.log('Processed Student Data:', JSON.stringify(studentData, null, 2));

        // Create student (studentId will be auto-generated in pre-save hook)
        const student = await Student.create(studentData);

        console.log('✅ Student created successfully:', student.studentId);

        res.status(201).json({
            success: true,
            message: 'Student admitted successfully',
            data: student,
        });
    } catch (error) {
        console.error('❌ Error creating student:', error);

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Student with this information already exists',
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create student',
            error: error.message,
        });
    }
};

// @desc    Update student
// @route   PUT /api/students/:id
exports.updateStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        // Update fields
        const allowedUpdates = [
            'studentName',
            'fatherName',
            'class',
            'group',
            'address',
            'parentCell',
            'studentCell',
            'email',
            'status',
            'totalFee',
            'paidAmount',
        ];

        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) {
                student[field] = req.body[field];
            }
        });

        await student.save();

        res.status(200).json({
            success: true,
            message: 'Student updated successfully',
            data: student,
        });
    } catch (error) {
        console.error('❌ Error updating student:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update student',
            error: error.message,
        });
    }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        await student.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Student deleted successfully',
            data: {},
        });
    } catch (error) {
        console.error('❌ Error deleting student:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete student',
            error: error.message,
        });
    }
};
