const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/authMiddleware");

/**
 * GET /api/notifications
 * Fetch notifications for the current user (by recipient OR recipientRole)
 * Returns the 10 most recent notifications
 */
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    console.log(
      `🔔 Fetching notifications for ${req.user.fullName} (${userRole})`,
    );

    // Find notifications targeted at this user OR their role
    const notifications = await Notification.find({
      $or: [{ recipient: userId }, { recipientRole: userRole }],
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Count unread
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    console.log(
      `📬 Found ${notifications.length} notifications (${unreadCount} unread)`,
    );

    return res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/mark-read
 * Mark one or all notifications as read
 */
router.post("/mark-read", protect, async (req, res) => {
  try {
    const { notificationId, markAll } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    if (markAll) {
      // Mark all notifications for this user as read
      await Notification.updateMany(
        {
          $or: [{ recipient: userId }, { recipientRole: userRole }],
          isRead: false,
        },
        { isRead: true },
      );
      console.log(
        `✅ Marked all notifications as read for ${req.user.fullName}`,
      );
    } else if (notificationId) {
      // Mark single notification as read
      await Notification.findByIdAndUpdate(notificationId, { isRead: true });
      console.log(`✅ Marked notification ${notificationId} as read`);
    }

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("❌ Error marking notifications as read:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
});

module.exports = router;
