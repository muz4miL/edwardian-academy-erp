/**
 * Diagnostic script: Check if user "saud" can login
 * Run: node check-login.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edwardian-academy');
    console.log('✅ Connected to MongoDB\n');

    const User = require('./models/User');

    // Find user saud
    const user = await User.findOne({ username: 'saud' });
    if (!user) {
      console.log('❌ User "saud" NOT FOUND in database!');
      console.log('\nAll users in database:');
      const allUsers = await User.find().select('username fullName role isActive');
      allUsers.forEach(u => console.log(`  - ${u.username} (${u.fullName}) - ${u.role} - Active: ${u.isActive}`));
      process.exit(1);
    }

    console.log('👤 User found:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Full Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Password hash: ${user.password}`);
    console.log(`   Hash length: ${user.password.length}`);
    console.log(`   Looks like bcrypt: ${user.password.startsWith('$2')}`);

    // Test common passwords
    const testPasswords = ['ADMIN123', 'admin123', 'Admin123', 'password', '12345678'];
    console.log('\n🔑 Testing passwords:');
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, user.password);
      console.log(`   "${pwd}" => ${match ? '✅ MATCH' : '❌ no match'}`);
    }

    // Also hash ADMIN123 and show what it would look like
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash('ADMIN123', salt);
    console.log(`\n📝 Fresh hash of "ADMIN123": ${newHash}`);
    const verifyNewHash = await bcrypt.compare('ADMIN123', newHash);
    console.log(`   Verify fresh hash: ${verifyNewHash ? '✅ OK' : '❌ FAILED'}`);

    // Fix: Reset password to ADMIN123 if nothing matches
    const anyMatch = await Promise.all(testPasswords.map(p => bcrypt.compare(p, user.password)));
    if (!anyMatch.some(Boolean)) {
      console.log('\n⚠️  No common password matched. Resetting password to "ADMIN123"...');
      user.password = 'ADMIN123';
      await user.save();
      
      // Verify
      const updated = await User.findOne({ username: 'saud' });
      const verify = await bcrypt.compare('ADMIN123', updated.password);
      console.log(`   Password reset & verify: ${verify ? '✅ SUCCESS' : '❌ FAILED'}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

diagnose();
