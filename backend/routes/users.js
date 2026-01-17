/**
 * User Management Routes
 * All routes are protected and require OWNER role
 */

const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getPermissionsList,
  toggleUserStatus,
} = require("../controllers/userController");

// All routes require authentication
router.use(protect);

// Get available permissions list
router.get("/permissions", getPermissionsList);

// CRUD operations
router.route("/").get(getAllUsers).post(createUser);

router.route("/:id").put(updateUser).delete(deleteUser);

// Toggle user active status
router.patch("/:id/toggle-status", toggleUserStatus);

module.exports = router;
