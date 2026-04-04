/**
 * Reset Partner Passwords for Testing
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPasswords() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = require('./models/User');
  
  const hashedPassword = await bcrypt.hash('partner123', 10);
  
  await User.updateMany(
    {role: 'PARTNER'},
    {$set: {password: hashedPassword}}
  );
  
  console.log('✅ Partner passwords reset to: partner123');
  
  await mongoose.connection.close();
}

resetPasswords().catch(console.error);
