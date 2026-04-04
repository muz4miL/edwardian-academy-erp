require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const Teacher = require('./models/Teacher');

  console.log('\n=== ALL USERS WITH LOGIN DETAILS ===');
  const users = await User.find({}).select('+password').lean();
  
  for (const u of users) {
    // Check if password is hashed (bcrypt hashes start with $2a$ or $2b$)
    const isHashed = u.password && u.password.startsWith('$2');
    
    // Get linked teacher for plainPassword
    let teacherPassword = null;
    if (u.teacherId) {
      const teacher = await Teacher.findById(u.teacherId).select('plainPassword username').lean();
      teacherPassword = teacher?.plainPassword;
    }

    console.log(`\nUser: ${u.fullName} (${u.role})`);
    console.log(`  username: ${u.username}`);
    console.log(`  isActive: ${u.isActive}`);
    console.log(`  password hashed: ${isHashed}`);
    console.log(`  password length: ${u.password?.length || 0}`);
    console.log(`  teacherId: ${u.teacherId || 'none'}`);
    console.log(`  teacher plainPassword: ${teacherPassword || 'N/A'}`);
    
    // Test login with teacher plainPassword
    if (teacherPassword && isHashed) {
      const match = await bcrypt.compare(teacherPassword, u.password);
      console.log(`  ✅ Password "${teacherPassword}" matches: ${match}`);
    }
    
    // Test common passwords
    if (isHashed) {
      const testPasswords = ['admin123', 'password', '12345678', 'MruTXpYF'];
      for (const testPw of testPasswords) {
        const match = await bcrypt.compare(testPw, u.password);
        if (match) {
          console.log(`  ✅ Password matches: "${testPw}"`);
        }
      }
    }
  }

  process.exit(0);
}).catch(err => {
  console.error('DB Error:', err.message);
  process.exit(1);
});
