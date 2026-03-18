/**
 * SYNC USER-TEACHER LINKS
 *
 * This script ensures all User ↔ Teacher bidirectional links are correct.
 * Run this whenever you suspect duplicate users or broken links.
 *
 * Usage: node scripts/sync-user-teacher-links.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function syncLinks() {
  await mongoose.connect(process.env.MONGODB_URI);

  const User = require('../models/User');
  const Teacher = require('../models/Teacher');

  console.log('🔗 SYNCING USER ↔ TEACHER LINKS\n');

  // Step 1: For each Teacher with a userId, update the User's teacherId
  console.log('Step 1: Syncing Teacher → User links...');
  const teachers = await Teacher.find({ userId: { $exists: true, $ne: null } });

  for (const teacher of teachers) {
    await User.findByIdAndUpdate(teacher.userId, { teacherId: teacher._id });
    console.log(`  ✓ ${teacher.name} → User.teacherId updated`);
  }

  // Step 2: For each Owner/Partner User without a Teacher link, try to find matching Teacher
  console.log('\nStep 2: Finding unlinked Owner/Partner users...');
  const unlinkedUsers = await User.find({
    role: { $in: ['OWNER', 'PARTNER'] },
    $or: [
      { teacherId: { $exists: false } },
      { teacherId: null }
    ]
  });

  for (const user of unlinkedUsers) {
    // Try to find a Teacher that should be linked to this user
    const nameParts = (user.fullName || '').toLowerCase().split(/\s+/);

    const matchingTeacher = await Teacher.findOne({
      $or: [
        { userId: user._id },
        { name: { $regex: nameParts.join('|'), $options: 'i' } }
      ],
      userId: { $in: [null, user._id] } // Not linked to another user
    });

    if (matchingTeacher) {
      // Link them bidirectionally
      matchingTeacher.userId = user._id;
      await matchingTeacher.save();

      user.teacherId = matchingTeacher._id;
      await user.save();

      console.log(`  ✓ Linked ${user.fullName} ↔ ${matchingTeacher.name}`);
    } else {
      console.log(`  ⚠ No matching teacher found for ${user.fullName}`);
    }
  }

  // Step 3: Verify final state
  console.log('\n📊 FINAL STATE:\n');

  console.log('Owner/Partner Users:');
  const finalUsers = await User.find({ role: { $in: ['OWNER', 'PARTNER'] } })
    .select('fullName role teacherId').lean();

  for (const u of finalUsers) {
    const linkedTeacher = u.teacherId
      ? await Teacher.findById(u.teacherId).select('name').lean()
      : null;
    console.log(`  ${u.fullName} (${u.role}) → Teacher: ${linkedTeacher?.name || 'NONE'}`);
  }

  console.log('\nTeachers with Owner/Partner links:');
  const linkedTeachers = await Teacher.find({
    userId: { $exists: true, $ne: null }
  }).select('name userId').lean();

  for (const t of linkedTeachers) {
    const linkedUser = await User.findById(t.userId).select('fullName role').lean();
    if (linkedUser && ['OWNER', 'PARTNER'].includes(linkedUser.role)) {
      console.log(`  ${t.name} → User: ${linkedUser.fullName} (${linkedUser.role})`);
    }
  }

  console.log('\n✅ SYNC COMPLETE!');
  process.exit(0);
}

syncLinks().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
