const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/timetable
// @desc    Get all timetable entries (Role-Based Filtering)
// @access  Protected
router.get('/', protect, async (req, res) => {
    try {
        const { classId, teacherId, day, status } = req.query;
        const user = req.user;

        let query = {};

        // 1. Role-Based Overrides
        if (user.role === 'STUDENT') {
            // Students only see their own class timetable
            if (user.studentProfile?.classRef) {
                query.classId = user.studentProfile.classRef;
            } else {
                // If no classRef found in user object, they get nothing (security)
                return res.json({ success: true, count: 0, data: [] });
            }
        } else if (user.role === 'TEACHER') {
            // Teachers only see their own sessions
            query.teacherId = user.teacherProfile?._id || user._id;
        } else if (user.role === 'PARTNER') {
            // Partners see their sessions + general view if needed, 
            // but usually specific teaching sessions.
            // For now, allow them to filter but default to their own if no classId provided
            if (!classId) {
                query.teacherId = user.teacherProfile?._id || user._id;
            }
        }
        // OWNER sees everything by default

        // 2. Applied Filters (Query Params)
        if (classId) query.classId = classId;
        if (teacherId) query.teacherId = teacherId;
        if (day) query.day = day;
        if (status && status !== 'all') query.status = status;

        const entries = await Timetable.find(query)
            .populate('classId', 'className section classId')
            .populate('teacherId', 'name teacherId subject')
            .sort({ day: 1, startTime: 1 });

        res.json({
            success: true,
            count: entries.length,
            data: entries,
        });
    } catch (error) {
        console.error('❌ Error fetching timetable:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching timetable',
            error: error.message,
        });
    }
});

// @route   GET /api/timetable/:id
// @desc    Get single timetable entry
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const entry = await Timetable.findById(req.params.id)
            .populate('classId', 'className section')
            .populate('teacherId', 'name subject');

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Timetable entry not found',
            });
        }

        res.json({
            success: true,
            data: entry,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching timetable entry',
            error: error.message,
        });
    }
});

// @route   POST /api/timetable
// @desc    Create a new timetable entry
// @access  Public
router.post('/', async (req, res) => {
    try {
        console.log('📥 Creating timetable entry:', JSON.stringify(req.body, null, 2));

        const entryData = { ...req.body };
        delete entryData.entryId;

        const newEntry = new Timetable(entryData);
        const savedEntry = await newEntry.save();

        // Populate the references for response
        const populatedEntry = await Timetable.findById(savedEntry._id)
            .populate('classId', 'className section classId')
            .populate('teacherId', 'name teacherId subject');

        console.log('✅ Timetable entry created:', savedEntry.entryId);

        res.status(201).json({
            success: true,
            message: 'Timetable entry created successfully',
            data: populatedEntry,
        });
    } catch (error) {
        console.error('❌ Error creating timetable entry:', error.message);
        res.status(400).json({
            success: false,
            message: 'Error creating timetable entry',
            error: error.message,
        });
    }
});

// @route   PUT /api/timetable/:id
// @desc    Update a timetable entry
// @access  Public
router.put('/:id', async (req, res) => {
    try {
        const entry = await Timetable.findById(req.params.id);

        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Timetable entry not found',
            });
        }

        const updateData = { ...req.body };
        delete updateData.entryId;
        delete updateData._id;

        console.log('📝 Updating timetable entry:', entry.entryId);

        Object.assign(entry, updateData);
        const updatedEntry = await entry.save();

        const populatedEntry = await Timetable.findById(updatedEntry._id)
            .populate('classId', 'className section classId')
            .populate('teacherId', 'name teacherId subject');

        console.log('✅ Timetable entry updated:', updatedEntry.entryId);

        res.json({
            success: true,
            message: 'Timetable entry updated successfully',
            data: populatedEntry,
        });
    } catch (error) {
        console.error('❌ Error updating timetable entry:', error.message);
        res.status(400).json({
            success: false,
            message: 'Error updating timetable entry',
            error: error.message,
        });
    }
});

// @route   DELETE /api/timetable/:id
// @desc    Delete a timetable entry
// @access  Public
router.delete('/:id', async (req, res) => {
    try {
        const deletedEntry = await Timetable.findByIdAndDelete(req.params.id);

        if (!deletedEntry) {
            return res.status(404).json({
                success: false,
                message: 'Timetable entry not found',
            });
        }

        console.log('🗑️ Timetable entry deleted:', deletedEntry.entryId);

        res.json({
            success: true,
            message: 'Timetable entry deleted successfully',
            data: deletedEntry,
        });
    } catch (error) {
        console.error('❌ Error deleting timetable entry:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error deleting timetable entry',
            error: error.message,
        });
    }
});

module.exports = router;
