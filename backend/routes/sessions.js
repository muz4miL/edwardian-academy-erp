const express = require('express');
const router = express.Router();
const Session = require('../models/Session');

// @route   GET /api/sessions
// @desc    Get all sessions
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;

        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (search) {
            query.sessionName = { $regex: search, $options: 'i' };
        }

        const sessions = await Session.find(query).sort({ startDate: -1 });

        res.json({
            success: true,
            count: sessions.length,
            data: sessions,
        });
    } catch (error) {
        console.error('❌ Error fetching sessions:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error fetching sessions',
            error: error.message,
        });
    }
});

// @route   GET /api/sessions/:id
// @desc    Get single session by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        res.json({
            success: true,
            data: session,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching session',
            error: error.message,
        });
    }
});

// @route   POST /api/sessions
// @desc    Create a new session
// @access  Public
router.post('/', async (req, res) => {
    try {
        console.log('📥 Creating session:', JSON.stringify(req.body, null, 2));

        const sessionData = { ...req.body };

        // Remove sessionId if sent (will be auto-generated)
        delete sessionData.sessionId;

        const newSession = new Session(sessionData);
        const savedSession = await newSession.save();

        console.log('✅ Session created:', savedSession.sessionId);

        res.status(201).json({
            success: true,
            message: 'Session created successfully',
            data: savedSession,
        });
    } catch (error) {
        console.error('❌ Error creating session:', error.message);
        res.status(400).json({
            success: false,
            message: 'Error creating session',
            error: error.message,
        });
    }
});

// @route   PUT /api/sessions/:id
// @desc    Update a session
// @access  Public
router.put('/:id', async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        const updateData = { ...req.body };
        delete updateData.sessionId;
        delete updateData._id;

        console.log('📝 Updating session:', session.sessionId);

        Object.assign(session, updateData);
        const updatedSession = await session.save();

        console.log('✅ Session updated:', updatedSession.sessionId);

        res.json({
            success: true,
            message: 'Session updated successfully',
            data: updatedSession,
        });
    } catch (error) {
        console.error('❌ Error updating session:', error.message);
        res.status(400).json({
            success: false,
            message: 'Error updating session',
            error: error.message,
        });
    }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete a session
// @access  Public
router.delete('/:id', async (req, res) => {
    try {
        const deletedSession = await Session.findByIdAndDelete(req.params.id);

        if (!deletedSession) {
            return res.status(404).json({
                success: false,
                message: 'Session not found',
            });
        }

        console.log('🗑️ Session deleted:', deletedSession.sessionId);

        res.json({
            success: true,
            message: 'Session deleted successfully',
            data: deletedSession,
        });
    } catch (error) {
        console.error('❌ Error deleting session:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error deleting session',
            error: error.message,
        });
    }
});

module.exports = router;
