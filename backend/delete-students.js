/**
 * Delete Test Students Script
 */
require("dotenv").config();
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/edwardianAcademyDB");
  const db = mongoose.connection.db;
  
  // Delete ALL students (for complete reset)
  const result = await db.collection("students").deleteMany({});
  console.log("Deleted students:", result.deletedCount);
  
  // Check remaining
  const remaining = await db.collection("students").countDocuments();
  console.log("Remaining students:", remaining);
  
  process.exit(0);
}
run();
