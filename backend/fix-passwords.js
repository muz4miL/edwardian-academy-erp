/**
 * Fix password sync issue for OWNER and PARTNER accounts
 * 
 * Problem: The plainPassword in Teacher model shows one password,
 *          but the User model's hashed password doesn't match it.
 * 
 * Solution: Re-set the User model password to match the Teacher plainPassword,
 *           which will trigger the pre-save hook to properly hash it.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const Teacher = require('./models/Teacher');

  console.log('\n=== PASSWORD SYNC FIX ===');
  
  // Find all users with mismatched passwords
  const users = await User.find({}).select('+password');
  
  for (const user of users) {
    if (!user.teacherId) continue;
    
    const teacher = await Teacher.findById(user.teacherId).select('plainPassword').lean();
    if (!teacher?.plainPassword) continue;
    
    // Check if current password matches the plainPassword
    const matches = await bcrypt.compare(teacher.plainPassword, user.password);
    
    if (!matches) {
      console.log(`\n❌ MISMATCH: ${user.fullName} (${user.role})`);
      console.log(`   username: ${user.username}`);
      console.log(`   Teacher plainPassword: ${teacher.plainPassword}`);
      console.log(`   Fixing... setting User password = ${teacher.plainPassword}`);
      
      // Set password and save (pre-save hook will hash it)
      user.password = teacher.plainPassword;
      await user.save();
      
      // Verify the fix
      const updatedUser = await User.findById(user._id).select('+password');
      const nowMatches = await bcrypt.compare(teacher.plainPassword, updatedUser.password);
      console.log(`   Result: ${nowMatches ? '✅ FIXED' : '❌ STILL BROKEN'}`);
    } else {
      console.log(`✅ OK: ${user.fullName} (${user.role}) - password synced`);
    }
  }

  console.log('\n=== DONE ===');
  process.exit(0);
}).catch(err => {
  console.error('DB Error:', err.message);
  process.exit(1);
});
