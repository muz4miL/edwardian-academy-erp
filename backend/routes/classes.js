const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Student = require('../models/Student');

// Helper: Remove duplicate subjects (case-insensitive), keeping the one with highest fee
const deduplicateSubjects = (subjects) => {
    if (!Array.isArray(subjects)) return [];

    const subjectMap = new Map();

    for (const subject of subjects) {
        const subjectName = typeof subject === 'string' ? subject : subject.name;
        const normalizedName = subjectName.toLowerCase();
        const currentFee = typeof subject === 'object' ? (subject.fee || 0) : 0;

        if (subjectMap.has(normalizedName)) {
            const existing = subjectMap.get(normalizedName);
            const existingFee = typeof existing === 'object' ? (existing.fee || 0) : 0;

            // Keep the one with higher fee
            if (currentFee > existingFee) {
                subjectMap.set(normalizedName, subject);
            }
        } else {
            subjectMap.set(normalizedName, subject);
        }
    }

    return Array.from(subjectMap.values());
};

// @route   GET /api/classes
// @desc    Get all classes with student count and revenue
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;

        // Build query object
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { className: { $regex: search, $options: 'i' } },
                { section: { $regex: search, $options: 'i' } },
            ];
        }

        const classes = await Class.find(query).sort({ createdAt: -1 }).lean();

        // TASK 2: Virtual Count & Revenue Handshake
        // For each class, aggregate student count and revenue
        const classesWithStats = await Promise.all(
            classes.map(async (cls) => {
                // Count students with this classRef
                const studentCount = await Student.countDocuments({ classRef: cls._id });

                // Calculate total revenue (sum of paidAmount from all linked students)
                const revenueResult = await Student.aggregate([
                    { $match: { classRef: cls._id } },
                    { $group: { _id: null, totalRevenue: { $sum: '$paidAmount' } } }
                ]);

                const currentRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

                // TASK 2: Calculate totalExpected (sum of totalFee) and totalPending
                const expectedResult = await Student.aggregate([
                    { $match: { classRef: cls._id } },
                    { $group: { _id: null, totalExpected: { $sum: '$totalFee' } } }
                ]);

                const totalExpected = expectedResult.length > 0 ? expectedResult[0].totalExpected : 0;
                const totalPending = totalExpected - currentRevenue;

                return {
                    ...cls,
                    studentCount,
                    currentRevenue,
                    totalExpected,
                    totalPending,
                };
            })
        );

        console.log(`📊 Fetched ${classesWithStats.length} classes with student counts and revenue`);

        res.json({
            success: true,
            count: classesWithStats.length,
            data: classesWithStats,
        });
    } catch (error) {
        console.error('❌ Error fetching classes:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching classes',
            error: error.message,
        });
    }
});

// @route   GET /api/classes/:id
// @desc    Get single class by ID with stats
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const classDoc = await Class.findById(req.params.id).lean();

        if (!classDoc) {
            return res.status(404).json({
                success: false,
                message: 'Class not found',
            });
        }

        // TASK 2: Add student count and revenue for single class
        const studentCount = await Student.countDocuments({ classRef: classDoc._id });
        const revenueResult = await Student.aggregate([
            { $match: { classRef: classDoc._id } },
            { $group: { _id: null, totalRevenue: { $sum: '$paidAmount' } } }
        ]);
        const currentRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // Calculate totalExpected and totalPending
        const expectedResult = await Student.aggregate([
            { $match: { classRef: classDoc._id } },
            { $group: { _id: null, totalExpected: { $sum: '$totalFee' } } }
        ]);
        const totalExpected = expectedResult.length > 0 ? expectedResult[0].totalExpected : 0;
        const totalPending = totalExpected - currentRevenue;

        res.json({
            success: true,
            data: {
                ...classDoc,
                studentCount,
                currentRevenue,
                totalExpected,
                totalPending,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching class',
            error: error.message,
        });
    }
});

// @route   POST /api/classes
// @desc    Create a new class
// @access  Public
router.post('/', async (req, res) => {
    try {
        console.log('📥 Creating class:', JSON.stringify(req.body, null, 2));

        // Sanitize data
        const classData = { ...req.body };

        // Handle subjects - can be array of strings or array of {name, fee}
        if (typeof classData.subjects === 'string') {
            classData.subjects = classData.subjects
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => ({ name: s, fee: classData.baseFee || 0 }));
        }

        // Ensure subjects is an array
        if (!Array.isArray(classData.subjects)) {
            classData.subjects = [];
        }

        // Remove duplicate subjects (case-insensitive)
        classData.subjects = deduplicateSubjects(classData.subjects);

        // Ensure baseFee is a number
        if (classData.baseFee !== undefined) {
            classData.baseFee = Number(classData.baseFee) || 0;
        }

        // Remove classId if sent (will be auto-generated)
        delete classData.classId;

        const newClass = new Class(classData);
        const savedClass = await newClass.save();

        console.log('✅ Class created:', savedClass.classId);

        res.status(201).json({
            success: true,
            message: 'Class created successfully',
            data: {
                ...savedClass.toObject(),
                studentCount: 0,
                currentRevenue: 0,
            },
        });
    } catch (error) {
        console.error('❌ Error creating class:', error.message);
        res.status(400).json({
            success: false,
            message: 'Error creating class',
            error: error.message,
        });
    }
});

// @route   PUT /api/classes/:id
// @desc    Update a class
// @access  Public
router.put('/:id', async (req, res) => {
    try {
        // Step 1: Find the class
        const classDoc = await Class.findById(req.params.id);

        if (!classDoc) {
            return res.status(404).json({
                success: false,
                message: 'Class not found',
            });
        }

        // Step 2: Sanitize incoming data
        const updateData = { ...req.body };

        // Handle subjects - can be array of strings or array of {name, fee}
        if (typeof updateData.subjects === 'string') {
            updateData.subjects = updateData.subjects
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0)
                .map(s => ({ name: s, fee: updateData.baseFee || classDoc.baseFee || 0 }));
        }

        // Ensure baseFee is a number
        if (updateData.baseFee !== undefined) {
            updateData.baseFee = Number(updateData.baseFee) || 0;
        }

        // Remove duplicate subjects (case-insensitive)
        if (updateData.subjects && Array.isArray(updateData.subjects)) {
            updateData.subjects = deduplicateSubjects(updateData.subjects);
        }

        // Never allow frontend to override classId
        delete updateData.classId;
        delete updateData._id;

        console.log('📝 Updating class:', classDoc.classId);

        // Step 3: Apply updates
        Object.assign(classDoc, updateData);

        // Step 4: Save
        const updatedClass = await classDoc.save();

        // Get updated stats
        const studentCount = await Student.countDocuments({ classRef: updatedClass._id });
        const revenueResult = await Student.aggregate([
            { $match: { classRef: updatedClass._id } },
            { $group: { _id: null, totalRevenue: { $sum: '$paidAmount' } } }
        ]);
        const currentRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        console.log('✅ Class updated:', updatedClass.classId);

        res.json({
            success: true,
            message: 'Class updated successfully',
            data: {
                ...updatedClass.toObject(),
                studentCount,
                currentRevenue,
            },
        });
    } catch (error) {
        console.error('❌ Error updating class:', error.message);
        res.status(400).json({
            success: false,
            message: 'Error updating class',
            error: error.message,
        });
    }
});

// @route   DELETE /api/classes/:id
// @desc    Delete a class
// @access  Public
router.delete('/:id', async (req, res) => {
    try {
        const deletedClass = await Class.findByIdAndDelete(req.params.id);

        if (!deletedClass) {
            return res.status(404).json({
                success: false,
                message: 'Class not found',
            });
        }

        console.log('🗑️ Class deleted:', deletedClass.classId);

        res.json({
            success: true,
            message: 'Class deleted successfully',
            data: deletedClass,
        });
    } catch (error) {
        console.error('❌ Error deleting class:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error deleting class',
            error: error.message,
        });
    }
});

// @route   GET /api/classes/stats/overview
// @desc    Get class statistics
// @access  Public
router.get('/stats/overview', async (req, res) => {
    try {
        const totalClasses = await Class.countDocuments();
        const activeClasses = await Class.countDocuments({ status: 'active' });

        // TASK 2: Add total students and revenue
        const totalStudents = await Student.countDocuments();
        const revenueResult = await Student.aggregate([
            { $group: { _id: null, totalRevenue: { $sum: '$paidAmount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        res.json({
            success: true,
            data: {
                total: totalClasses,
                active: activeClasses,
                totalStudents,
                totalRevenue,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message,
        });
    }
});

module.exports = router;
