const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const { protect } = require('../middleware/authMiddleware');

// ========== HELPER: Conflict Detection ==========
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    // Handle 12h format: "04:00 PM"
    const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
        let h = parseInt(match12[1]);
        const m = parseInt(match12[2]);
        const period = match12[3].toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
    }
    // Handle 24h format: "16:00"
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        return parseInt(match24[1]) * 60 + parseInt(match24[2]);
    }
    return 0;
};

const checkConflicts = async (entryData, excludeId = null) => {
    const conflicts = [];
    const newStart = parseTimeToMinutes(entryData.startTime);
    const newEnd = parseTimeToMinutes(entryData.endTime);

    if (newStart >= newEnd) return conflicts;

    // Find entries on the same day
    const query = { day: entryData.day, status: 'active' };
    if (excludeId) query._id = { $ne: excludeId };

    const existingEntries = await Timetable.find(query)
        .populate('classId', 'classTitle gradeLevel classId')
        .populate('teacherId', 'name teacherId');

    for (const existing of existingEntries) {
        const existStart = parseTimeToMinutes(existing.startTime);
        const existEnd = parseTimeToMinutes(existing.endTime);

        // Check time overlap
        const overlaps = newStart < existEnd && newEnd > existStart;
        if (!overlaps) continue;

        // Same teacher conflict
        const existTeacherId = existing.teacherId?._id?.toString() || existing.teacherId?.toString();
        if (existTeacherId === entryData.teacherId?.toString()) {
            const className = existing.classId?.classTitle || 'Unknown';
            conflicts.push(`Teacher already has "${existing.subject}" in ${className} at ${existing.startTime}-${existing.endTime}`);
        }

        // Same room conflict (if both have rooms specified)
        if (entryData.room && existing.room && entryData.room.toLowerCase() === existing.room.toLowerCase()) {
            conflicts.push(`Room "${entryData.room}" is already booked for "${existing.subject}" at ${existing.startTime}-${existing.endTime}`);
        }
    }

    return conflicts;
};

// ========== HELPER: Day Sorting ==========
const DAY_ORDER = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

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
            if (user.studentProfile?.classRef) {
                query.classId = user.studentProfile.classRef;
            } else {
                return res.json({ success: true, count: 0, data: [] });
            }
        } else if (user.role === 'TEACHER') {
            query.teacherId = user.teacherId || user.teacherProfile?._id || user._id;
        } else if (user.role === 'PARTNER') {
            if (!classId) {
                query.teacherId = user.teacherProfile?._id || user._id;
            }
        }
        // OWNER/STAFF sees everything by default

        // 2. Applied Filters (Query Params)
        if (classId) query.classId = classId;
        if (teacherId) query.teacherId = teacherId;
        if (day) query.day = day;
        if (status && status !== 'all') query.status = status;

        const entries = await Timetable.find(query)
            .populate('classId', 'classTitle gradeLevel classId subjects subjectTeachers')
            .populate('teacherId', 'name teacherId subject')
            .sort({ day: 1, startTime: 1 });

        // Sort by day order then time
        entries.sort((a, b) => {
            const dayDiff = (DAY_ORDER[a.day] || 8) - (DAY_ORDER[b.day] || 8);
            if (dayDiff !== 0) return dayDiff;
            return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
        });

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
// @access  Protected
router.get('/:id', protect, async (req, res) => {
    try {
        const entry = await Timetable.findById(req.params.id)
            .populate('classId', 'classTitle gradeLevel classId subjects subjectTeachers')
            .populate('teacherId', 'name teacherId subject');

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

// @route   POST /api/timetable/bulk-generate
// @desc    Generate timetable entries for all subjects of a class
// @access  Protected (OWNER, STAFF)
router.post('/bulk-generate', protect, async (req, res) => {
    try {
        const { classId, entries } = req.body;
        // entries = [{ subject, teacherId, day, startTime, endTime, room }]

        if (!classId || !entries || !entries.length) {
            return res.status(400).json({
                success: false,
                message: 'classId and entries array are required',
            });
        }

        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return res.status(404).json({ success: false, message: 'Class not found' });
        }

        // Check all conflicts first
        const allConflicts = [];
        for (const entry of entries) {
            const conflicts = await checkConflicts({ ...entry, day: entry.day }, null);
            if (conflicts.length > 0) {
                allConflicts.push({ entry, conflicts });
            }
        }

        if (allConflicts.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Schedule conflicts detected',
                conflicts: allConflicts,
            });
        }

        // Create all entries
        const created = [];
        for (const entry of entries) {
            const newEntry = await Timetable.create({
                classId,
                teacherId: entry.teacherId,
                subject: entry.subject,
                day: entry.day,
                startTime: entry.startTime,
                endTime: entry.endTime,
                room: entry.room || classDoc.roomNumber || 'TBD',
                status: 'active',
            });
            created.push(newEntry);
        }

        console.log(`📅 Bulk-generated ${created.length} timetable entries for ${classDoc.classTitle}`);

        res.status(201).json({
            success: true,
            message: `Generated ${created.length} timetable entries`,
            count: created.length,
            data: created,
        });
    } catch (error) {
        console.error('❌ Error bulk-generating timetable:', error.message);
        res.status(400).json({
            success: false,
            message: 'Error generating timetable entries',
            error: error.message,
        });
    }
});

// @route   DELETE /api/timetable/clear-class/:classId
// @desc    Clear all timetable entries for a class
// @access  Protected (OWNER, STAFF)
router.delete('/clear-class/:classId', protect, async (req, res) => {
    try {
        const result = await Timetable.deleteMany({ classId: req.params.classId });
        console.log(`🗑️ Cleared ${result.deletedCount} timetable entries for class ${req.params.classId}`);

        res.json({
            success: true,
            message: `Cleared ${result.deletedCount} timetable entries`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error clearing timetable',
            error: error.message,
        });
    }
});

// @route   POST /api/timetable
// @desc    Create a new timetable entry
// @access  Protected (OWNER, STAFF)
router.post('/', protect, async (req, res) => {
    try {
        console.log('📥 Creating timetable entry:', JSON.stringify(req.body, null, 2));

        const entryData = { ...req.body };
        delete entryData.entryId;

        // Check for conflicts
        const conflicts = await checkConflicts(entryData);
        if (conflicts.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Schedule conflict detected',
                conflicts,
            });
        }

        const newEntry = new Timetable(entryData);
        const savedEntry = await newEntry.save();

        // Populate the references for response
        const populatedEntry = await Timetable.findById(savedEntry._id)
            .populate('classId', 'classTitle gradeLevel classId subjects subjectTeachers')
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
// @access  Protected (OWNER, STAFF)
router.put('/:id', protect, async (req, res) => {
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

        // Check for conflicts (excluding this entry)
        const conflictData = { ...entry.toObject(), ...updateData };
        const conflicts = await checkConflicts(conflictData, entry._id);
        if (conflicts.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Schedule conflict detected',
                conflicts,
            });
        }

        console.log('📝 Updating timetable entry:', entry.entryId);

        Object.assign(entry, updateData);
        const updatedEntry = await entry.save();

        const populatedEntry = await Timetable.findById(updatedEntry._id)
            .populate('classId', 'classTitle gradeLevel classId subjects subjectTeachers')
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
// @access  Protected (OWNER, STAFF)
router.delete('/:id', protect, async (req, res) => {
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
