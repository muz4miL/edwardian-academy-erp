const Class = require("../models/Class");
const Session = require("../models/Session");

// Create a new class
exports.createClass = async (req, res) => {
  try {
    const { classTitle, gradeLevel, session } = req.body;

    // Validate session
    const sessionExists = await Session.findById(session);
    if (!sessionExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid session ID" });
    }

    const newClass = await Class.create({
      classTitle,
      gradeLevel,
      session,
    });

    res.status(201).json({ success: true, data: newClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all classes (with optional session filter)
exports.getClasses = async (req, res) => {
  try {
    const { session } = req.query;
    const filter = session ? { session } : {};

    const classes = await Class.find(filter).populate(
      "session",
      "sessionName status startDate endDate",
    );

    res.status(200).json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a class
exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { classTitle, gradeLevel, session } = req.body;

    // Validate session
    if (session) {
      const sessionExists = await Session.findById(session);
      if (!sessionExists) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid session ID" });
      }
    }

    const updatedClass = await Class.findByIdAndUpdate(
      id,
      { classTitle, gradeLevel, session },
      { new: true, runValidators: true },
    ).populate("session", "sessionName status startDate endDate");

    if (!updatedClass) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    res.status(200).json({ success: true, data: updatedClass });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a class
exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClass = await Class.findByIdAndDelete(id);

    if (!deletedClass) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Class deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
