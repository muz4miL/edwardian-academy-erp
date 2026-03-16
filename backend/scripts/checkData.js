const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Config = require("../models/Configuration");
  const Class = require("../models/Class");
  const Student = require("../models/Student");
  const Teacher = require("../models/Teacher");
  const User = require("../models/User");

  const config = await Config.findOne();
  console.log("=== CONFIG SUBJECT FEES ===");
  config?.defaultSubjectFees?.forEach(s => console.log("  " + s.name + ": " + s.fee));

  const classes = await Class.find();
  console.log("\n=== CLASS SUBJECT FEES ===");
  classes.forEach(c => {
    console.log(c.classTitle + ":");
    c.subjects?.forEach(s => console.log("  " + s.name + ": " + s.fee));
    console.log("  subjectTeachers:", c.subjectTeachers?.map(st => st.subject + " -> " + st.teacherName).join(", "));
  });

  const students = await Student.find();
  console.log("\n=== STUDENT LOCKED SUBJECT FEES ===");
  students.forEach(s => {
    console.log(s.studentName + " (class: " + s.class + ", totalFee: " + s.totalFee + ", paid: " + s.paidAmount + "):");
    s.subjects?.forEach(sub => console.log("  " + sub.name + ": " + sub.fee));
  });

  const teachers = await Teacher.find();
  console.log("\n=== TEACHER BALANCES ===");
  teachers.forEach(t => {
    console.log(t.name + ": floating=" + (t.balance?.floating || 0) + ", verified=" + (t.balance?.verified || 0) + ", type=" + t.compensation?.type + (t.compensation?.perStudentAmount ? ", perStudent=" + t.compensation.perStudentAmount : ""));
  });

  const users = await User.find({ role: { $in: ["OWNER", "PARTNER"] } });
  console.log("\n=== OWNER/PARTNER WALLETS ===");
  users.forEach(u => {
    console.log(u.fullName + " (" + u.role + "): floating=" + (u.walletBalance?.floating || 0) + ", verified=" + (u.walletBalance?.verified || 0));
  });

  process.exit(0);
}
run();
