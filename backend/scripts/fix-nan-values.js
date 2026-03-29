/**
 * Fix NaN values in User and Teacher documents
 * Also handles the case where NaN values exist in the database
 */
const mongoose = require('mongoose');
require('dotenv').config();

// Helper to check if a value is NaN (NaN !== NaN is true in JS)
function isNaNValue(val) {
  return val !== val || val === null || val === undefined || (typeof val === 'number' && !isFinite(val));
}

async function fixNaN() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  let fixed = 0;

  console.log('\nChecking', users.length, 'users...');

  for (const user of users) {
    let needsUpdate = false;
    const update = {};

    const f = user.walletBalance?.floating;
    const v = user.walletBalance?.verified;

    console.log(`  ${user.username || user.fullName}: floating=${f} (${typeof f}), verified=${v} (${typeof v})`);

    // Check wallet balance - NaN !== NaN trick
    if (user.walletBalance) {
      if (isNaNValue(f) || f !== f) {
        update['walletBalance.floating'] = 0;
        needsUpdate = true;
      }
      if (isNaNValue(v) || v !== v) {
        update['walletBalance.verified'] = 0;
        needsUpdate = true;
      }
    } else {
      // No wallet balance at all - create it
      update['walletBalance'] = { floating: 0, verified: 0 };
      needsUpdate = true;
    }

    // Check other numeric fields
    if (isNaNValue(user.totalCash)) { update.totalCash = 0; needsUpdate = true; }
    if (isNaNValue(user.expenseDebt)) { update.expenseDebt = 0; needsUpdate = true; }
    if (isNaNValue(user.debtToOwner)) { update.debtToOwner = 0; needsUpdate = true; }
    if (isNaNValue(user.pendingDebt)) { update.pendingDebt = 0; needsUpdate = true; }
    if (isNaNValue(user.manualBalance)) { update.manualBalance = 0; needsUpdate = true; }

    if (needsUpdate) {
      await mongoose.connection.db.collection('users').updateOne(
        { _id: user._id },
        { $set: update }
      );
      console.log('    -> Fixed:', Object.keys(update).join(', '));
      fixed++;
    }
  }

  // Also fix teachers
  console.log('\nChecking teachers...');
  const teachers = await mongoose.connection.db.collection('teachers').find({}).toArray();
  for (const teacher of teachers) {
    let needsUpdate = false;
    const update = {};

    if (teacher.balance) {
      if (isNaNValue(teacher.balance.floating)) { update['balance.floating'] = 0; needsUpdate = true; }
      if (isNaNValue(teacher.balance.verified)) { update['balance.verified'] = 0; needsUpdate = true; }
      if (isNaNValue(teacher.balance.pending)) { update['balance.pending'] = 0; needsUpdate = true; }
    } else {
      update['balance'] = { floating: 0, verified: 0, pending: 0 };
      needsUpdate = true;
    }
    if (isNaNValue(teacher.totalEarnings)) { update.totalEarnings = 0; needsUpdate = true; }
    if (isNaNValue(teacher.totalWithdrawn)) { update.totalWithdrawn = 0; needsUpdate = true; }

    if (needsUpdate) {
      await mongoose.connection.db.collection('teachers').updateOne(
        { _id: teacher._id },
        { $set: update }
      );
      console.log('  Fixed teacher:', teacher.name);
      fixed++;
    }
  }

  console.log('\n=============================');
  console.log('Total documents fixed:', fixed);
  console.log('=============================');

  await mongoose.disconnect();
}

fixNaN().catch(console.error);
