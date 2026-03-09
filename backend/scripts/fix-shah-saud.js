/**
 * One-time fix script: repairs Shah saud's user record
 * - Clears the corrupted email field (was "waqar")
 * - Resets password to "admin123" (owner can change after logging in)
 * - Syncs plainPassword on Teacher model
 *
 * Run: node scripts/fix-shah-saud.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  const User = require("../models/User");
  const Teacher = require("../models/Teacher");

  const user = await User.findOne({ username: "shah_saud" }).select("+password");
  if (!user) {
    console.error("❌ User 'shah_saud' not found");
    process.exit(1);
  }

  console.log("🔍 Found user:", user.fullName, "| email:", user.email, "| role:", user.role);

  // Fix corrupted email
  const badEmail = user.email;

  // Set plain text password — pre-save hook will hash it exactly once
  const newPassword = "admin123";
  user.email = "";
  user.password = newPassword; // pre-save hook hashes this

  await user.save();
  console.log(`✅ Password reset to "admin123", email cleared (was: "${badEmail}")`);

  // Sync plainPassword on linked Teacher record
  if (user.teacherId) {
    await Teacher.findByIdAndUpdate(user.teacherId, { plainPassword: newPassword });
    console.log("✅ Synced plainPassword on Teacher record");
  }

  console.log("\n========================================");
  console.log("Shah saud login credentials:");
  console.log("  Username : shah_saud");
  console.log("  Password : admin123");
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
