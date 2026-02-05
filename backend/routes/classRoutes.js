const express = require("express");
const router = express.Router();
const classController = require("../controllers/classController");

// @route   GET /api/classes
// @desc    Get all classes (with optional session filter)
// @access  Public
router.get("/", classController.getClasses);

// @route   POST /api/classes
// @desc    Create a new class
// @access  Public
router.post("/", classController.createClass);

// @route   PUT /api/classes/:id
// @desc    Update a class
// @access  Public
router.put("/:id", classController.updateClass);

// @route   DELETE /api/classes/:id
// @desc    Delete a class
// @access  Public
router.delete("/:id", classController.deleteClass);

module.exports = router;
