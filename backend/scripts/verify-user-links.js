/**
 * Verify user-teacher links are correct
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);

  const User = require('../models/User');
  const Teacher = require('../models/Teacher');
  const Class = require('../models/Class');

  console.log('=== CLASS SUBJECT TEACHERS ===');
  const classDoc = await Class.findOne({ classTitle: 'Tuition' }).lean();
  classDoc.subjectTeachers.forEach(st => {
    console.log('Subject:', st.subject, '| teacherId:', st.teacherId?.toString());
  });

  console.log('\n=== ACTUAL TEACHERS ===');
  const teachers = await Teacher.find({}).select('_id name userId').lean();
  teachers.forEach(t => console.log(t._id.toString(), t.name, '| userId:', t.userId?.toString()));

  console.log('\n=== USER teacherId REFERENCES (Owner/Partner) ===');
  const users = await User.find({ role: { $in: ['OWNER', 'PARTNER'] } })
    .select('_id fullName role teacherId').lean();
  users.forEach(u => console.log(u._id.toString(), u.fullName, u.role, '-> teacherId:', u.teacherId?.toString()));

  process.exit(0);
}

verify().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
