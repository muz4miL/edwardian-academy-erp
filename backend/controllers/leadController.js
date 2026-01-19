const Lead = require("../models/Lead");

/**
 * Lead Controller - CRM Module
 * Handles all lead/inquiry management operations
 */

// @desc    Create a new lead/inquiry
// @route   POST /api/leads
// @access  Protected (OWNER, PARTNER, OPERATOR)
exports.createLead = async (req, res) => {
    try {
        const { name, phone, email, source, interest, remarks, nextFollowUp } = req.body;

        // Validation
        if (!name || !phone || !interest) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, and interest are required fields",
            });
        }

        // Check for duplicate phone (optional - warn but allow)
        const existingLead = await Lead.findOne({ phone, status: { $ne: "Converted" } });

        // Create the lead
        const lead = await Lead.create({
            name,
            phone,
            email,
            source: source || "Walk-in",
            interest,
            remarks,
            nextFollowUp,
            status: "New",
            createdBy: req.user?._id,
            lastModifiedBy: req.user?._id,
        });

        return res.status(201).json({
            success: true,
            message: `✅ Lead "${name}" added successfully`,
            data: lead,
            warning: existingLead ? `⚠️ A lead with phone ${phone} already exists` : null,
        });
    } catch (error) {
        console.error("❌ Error in createLead:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while creating lead",
            error: error.message,
        });
    }
};

// @desc    Get all leads with optional filtering
// @route   GET /api/leads
// @access  Protected (OWNER, PARTNER, OPERATOR)
exports.getLeads = async (req, res) => {
    try {
        const { status, source, search, limit = 100 } = req.query;

        // Build query
        const query = {};

        if (status && status !== "all") {
            query.status = status;
        }

        if (source && source !== "all") {
            query.source = source;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { interest: { $regex: search, $options: "i" } },
            ];
        }

        // Fetch leads sorted by newest first
        const leads = await Lead.find(query)
            .populate("createdBy", "fullName username")
            .populate("lastModifiedBy", "fullName username")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Get counts by status for dashboard widgets
        const statusCounts = await Lead.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const counts = {
            total: leads.length,
            new: 0,
            followUp: 0,
            converted: 0,
            dead: 0,
        };

        statusCounts.forEach((item) => {
            if (item._id === "New") counts.new = item.count;
            if (item._id === "FollowUp") counts.followUp = item.count;
            if (item._id === "Converted") counts.converted = item.count;
            if (item._id === "Dead") counts.dead = item.count;
        });

        counts.total = counts.new + counts.followUp + counts.converted + counts.dead;

        return res.status(200).json({
            success: true,
            count: leads.length,
            counts,
            data: leads,
        });
    } catch (error) {
        console.error("❌ Error in getLeads:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching leads",
            error: error.message,
        });
    }
};

// @desc    Get single lead by ID
// @route   GET /api/leads/:id
// @access  Protected
exports.getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id)
            .populate("createdBy", "fullName username")
            .populate("lastModifiedBy", "fullName username")
            .populate("convertedToStudent", "name studentId");

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: lead,
        });
    } catch (error) {
        console.error("❌ Error in getLeadById:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching lead",
            error: error.message,
        });
    }
};

// @desc    Update lead status and/or remarks
// @route   PATCH /api/leads/:id
// @access  Protected (OWNER, PARTNER, OPERATOR)
exports.updateLead = async (req, res) => {
    try {
        const { status, remarks, nextFollowUp, name, phone, email, source, interest } = req.body;

        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        // Update fields if provided
        if (status) {
            lead.status = status;
            if (status === "FollowUp") {
                lead.lastContactDate = new Date();
            }
        }
        if (remarks !== undefined) lead.remarks = remarks;
        if (nextFollowUp !== undefined) lead.nextFollowUp = nextFollowUp;
        if (name) lead.name = name;
        if (phone) lead.phone = phone;
        if (email !== undefined) lead.email = email;
        if (source) lead.source = source;
        if (interest) lead.interest = interest;

        lead.lastModifiedBy = req.user?._id;

        await lead.save();

        return res.status(200).json({
            success: true,
            message: `✅ Lead updated successfully`,
            data: lead,
        });
    } catch (error) {
        console.error("❌ Error in updateLead:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while updating lead",
            error: error.message,
        });
    }
};

// @desc    Quick status update (for one-click actions)
// @route   PATCH /api/leads/:id/status
// @access  Protected
exports.updateLeadStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !["New", "FollowUp", "Converted", "Dead"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Valid status is required (New, FollowUp, Converted, Dead)",
            });
        }

        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        const oldStatus = lead.status;
        lead.status = status;
        lead.lastModifiedBy = req.user?._id;

        if (status === "FollowUp") {
            lead.lastContactDate = new Date();
        }

        await lead.save();

        return res.status(200).json({
            success: true,
            message: `✅ Status changed: ${oldStatus} → ${status}`,
            data: lead,
        });
    } catch (error) {
        console.error("❌ Error in updateLeadStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while updating status",
            error: error.message,
        });
    }
};

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
// @access  Protected (OWNER only recommended)
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        await Lead.deleteOne({ _id: req.params.id });

        return res.status(200).json({
            success: true,
            message: `✅ Lead "${lead.name}" deleted successfully`,
        });
    } catch (error) {
        console.error("❌ Error in deleteLead:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while deleting lead",
            error: error.message,
        });
    }
};

// @desc    Get lead analytics/stats
// @route   GET /api/leads/stats
// @access  Protected
exports.getLeadStats = async (req, res) => {
    try {
        // Status distribution
        const statusStats = await Lead.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        // Source distribution
        const sourceStats = await Lead.aggregate([
            { $group: { _id: "$source", count: { $sum: 1 } } },
        ]);

        // This week's leads
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const thisWeekLeads = await Lead.countDocuments({
            createdAt: { $gte: weekAgo },
        });

        // Today's leads
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayLeads = await Lead.countDocuments({
            createdAt: { $gte: todayStart },
        });

        // Conversion rate
        const totalLeads = await Lead.countDocuments();
        const convertedLeads = await Lead.countDocuments({ status: "Converted" });
        const conversionRate = totalLeads > 0
            ? Math.round((convertedLeads / totalLeads) * 100)
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                statusStats,
                sourceStats,
                thisWeekLeads,
                todayLeads,
                totalLeads,
                convertedLeads,
                conversionRate,
            },
        });
    } catch (error) {
        console.error("❌ Error in getLeadStats:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching stats",
            error: error.message,
        });
    }
};
