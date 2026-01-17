/**
 * Website Configuration Controller
 * Manages public site content (CMS functionality)
 */

const WebsiteConfig = require("../models/WebsiteConfig");
const Teacher = require("../models/Teacher");

// ========================================
// @desc    Get public website configuration
// @route   GET /api/website/public
// @access  Public (no auth required)
// ========================================
exports.getPublicConfig = async (req, res) => {
  try {
    // Get or create default config
    const config = await WebsiteConfig.getConfig();

    // Get active teachers for faculty section
    const teachers = await Teacher.find({ status: "active" })
      .select("name subject phone isPartner")
      .sort({ isPartner: -1, name: 1 }); // Partners first

    res.status(200).json({
      success: true,
      data: {
        heroSection: config.heroSection,
        announcements: config.announcements.filter((a) => a.active),
        admissionStatus: config.admissionStatus,
        contactInfo: config.contactInfo,
        featuredSubjects: config.featuredSubjects,
        highlights: config.highlights,
        faculty: teachers.map((t) => ({
          name: t.name,
          subject: t.subject,
          isPartner: t.isPartner || false,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching public config:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch website configuration",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Get full website configuration (for CMS)
// @route   GET /api/website/config
// @access  OWNER only
// ========================================
exports.getConfig = async (req, res) => {
  try {
    // Only OWNER can access full config
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can manage website.",
      });
    }

    const config = await WebsiteConfig.getConfig();

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("❌ Error fetching config:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch configuration",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Update website configuration
// @route   PUT /api/website/config
// @access  OWNER only
// ========================================
exports.updateConfig = async (req, res) => {
  try {
    // Only OWNER can update
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only OWNER can manage website.",
      });
    }

    const {
      heroSection,
      admissionStatus,
      contactInfo,
      featuredSubjects,
      highlights,
    } = req.body;

    let config = await WebsiteConfig.getConfig();

    // Update fields if provided
    if (heroSection) {
      config.heroSection = { ...config.heroSection, ...heroSection };
    }
    if (admissionStatus) {
      config.admissionStatus = {
        ...config.admissionStatus,
        ...admissionStatus,
      };
    }
    if (contactInfo) {
      config.contactInfo = { ...config.contactInfo, ...contactInfo };
    }
    if (featuredSubjects) {
      config.featuredSubjects = featuredSubjects;
    }
    if (highlights) {
      config.highlights = highlights;
    }

    config.lastUpdatedBy = req.user._id;
    await config.save();

    console.log(`✅ Website config updated by ${req.user.fullName}`);

    res.status(200).json({
      success: true,
      message: "Website configuration updated successfully",
      data: config,
    });
  } catch (error) {
    console.error("❌ Error updating config:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update configuration",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Add announcement
// @route   POST /api/website/announcements
// @access  OWNER only
// ========================================
exports.addAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { text, priority } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Announcement text is required",
      });
    }

    const config = await WebsiteConfig.getConfig();

    config.announcements.push({
      text,
      active: true,
      priority: priority || 0,
    });

    await config.save();

    console.log(`✅ Announcement added: "${text.substring(0, 30)}..."`);

    res.status(201).json({
      success: true,
      message: "Announcement added successfully",
      data: config.announcements,
    });
  } catch (error) {
    console.error("❌ Error adding announcement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add announcement",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Update announcement
// @route   PUT /api/website/announcements/:id
// @access  OWNER only
// ========================================
exports.updateAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;
    const { text, active, priority } = req.body;

    const config = await WebsiteConfig.getConfig();

    const announcement = config.announcements.id(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    if (text !== undefined) announcement.text = text;
    if (active !== undefined) announcement.active = active;
    if (priority !== undefined) announcement.priority = priority;

    await config.save();

    res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      data: config.announcements,
    });
  } catch (error) {
    console.error("❌ Error updating announcement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update announcement",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Delete announcement
// @route   DELETE /api/website/announcements/:id
// @access  OWNER only
// ========================================
exports.deleteAnnouncement = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { id } = req.params;

    const config = await WebsiteConfig.getConfig();

    const announcement = config.announcements.id(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    announcement.deleteOne();
    await config.save();

    console.log(`✅ Announcement deleted`);

    res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
      data: config.announcements,
    });
  } catch (error) {
    console.error("❌ Error deleting announcement:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
      error: error.message,
    });
  }
};

// ========================================
// @desc    Toggle admission status
// @route   PATCH /api/website/admission-status
// @access  OWNER only
// ========================================
exports.toggleAdmissionStatus = async (req, res) => {
  try {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const config = await WebsiteConfig.getConfig();

    config.admissionStatus.isOpen = !config.admissionStatus.isOpen;
    await config.save();

    const status = config.admissionStatus.isOpen ? "OPEN" : "CLOSED";
    console.log(`✅ Admissions now ${status}`);

    res.status(200).json({
      success: true,
      message: `Admissions are now ${status}`,
      data: config.admissionStatus,
    });
  } catch (error) {
    console.error("❌ Error toggling admission status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle admission status",
      error: error.message,
    });
  }
};
