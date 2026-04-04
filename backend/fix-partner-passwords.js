require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/edwardianAcademyDB';

async function fixPartnerPasswords() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Reset Shah saud's password
    const shahSaud = await User.findOne({ username: 'shah_saud' });
    if (shahSaud) {
      const shahPassword = 'Srm9nN10';
      shahSaud.password = await bcrypt.hash(shahPassword, 10);
      await shahSaud.save();
      console.log('✅ Reset password for Shah saud');
      console.log('   Username: shah_saud');
      console.log('   Password: ' + shahPassword);
    }

    // Reset Mohammad Zahid's password
    const zahid = await User.findOne({ username: 'mohammad_zahid' });
    if (zahid) {
      const zahidPassword = 'MruTXpYF';
      zahid.password = await bcrypt.hash(zahidPassword, 10);
      await zahid.save();
      console.log('\n✅ Reset password for Mohammad Zahid');
      console.log('   Username: mohammad_zahid');
      console.log('   Password: ' + zahidPassword);
    }

    console.log('\n✨ Partner passwords reset successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPartnerPasswords();
