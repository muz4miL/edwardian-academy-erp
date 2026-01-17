const express = require('express');
const router = express.Router();
const {
    getStudents,
    getStudent,
    createStudent,
    updateStudent,
    deleteStudent,
} = require('../controllers/studentController');

// @route   GET /api/students
// @desc    Get all students
router.get('/', getStudents);

// @route   GET /api/students/:id
// @desc    Get single student by ID
router.get('/:id', getStudent);

// @route   POST /api/students
// @desc    Create new student (admission)
router.post('/', createStudent);

// @route   PUT /api/students/:id
// @desc    Update student
router.put('/:id', updateStudent);

// @route   DELETE /api/students/:id
// @desc    Delete student
router.delete('/:id', deleteStudent);

module.exports = router;


// Role: Lead Engineer Objective: Implement the Fullstack Admissions system and connect it to Student Management.

// Task 1: The Unified Student Model

// Use the backend/models/Student.js we discussed.

// Fields to Include: studentName, fatherName, class, group, address, parentCell, studentCell, admissionDate, totalFee, paidAmount.

// Auto-Generation: Ensure the backend automatically generates a unique studentId (e.g., STU-001) upon save.

// Task 2: Wiring the Admissions Page (Admissions.tsx)

// Replace the static form with a React Query Mutation (useMutation).

// Logic: When "Save Admission" is clicked, it must send the data to POST /api/students.

// Success Action: On success, show a premium toast and redirect the user to the /students page to see the newly added student.

// Task 3: The Students List Connection (Students.tsx)

// Finalize the useQuery hook to fetch all students from the database.

// Ensure the Fee Status badges (Paid, Partial, Pending) calculate dynamically based on totalFee vs paidAmount.

// Task 4: Navigation Sync

// Ensure both "Admissions" and "Students" sidebar links are correctly routed to these finalized pages.