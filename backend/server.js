const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected Successfully!');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        process.exit(1);
    }
};

connectDB();

// Import Routes
const studentRoutes = require('./routes/students');
const teacherRoutes = require('./routes/teachers');
const financeRoutes = require('./routes/finance');
const configRoutes = require('./routes/config');
const classRoutes = require('./routes/classes');
const sessionRoutes = require('./routes/sessions');
const timetableRoutes = require('./routes/timetable');
const expenseRoutes = require('./routes/expenses');

// API Routes
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/config', configRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/expenses', expenseRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Academy Management System API',
        version: '1.0.0',
        endpoints: {
            students: '/api/students',
            teachers: '/api/teachers',
            finance: '/api/finance',
            config: '/api/config',
            classes: '/api/classes',
            sessions: '/api/sessions',
            timetable: '/api/timetable',
        },
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}`);
});
