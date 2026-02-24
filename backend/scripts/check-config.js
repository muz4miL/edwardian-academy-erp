require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edwardian-erp').then(async () => {
  const Config = require('../models/Configuration');
  const User = require('../models/User');
  const Teacher = require('../models/Teacher');

  const c = await Config.findOne();
  console.log('partnerIds:', JSON.stringify(c?.partnerIds));
  console.log('expenseSplit:', JSON.stringify(c?.expenseSplit));

  const partners = await User.find({ role: { $in: ['PARTNER', 'OWNER'] } }).select('fullName role teacherId expenseDebt debtToOwner');
  console.log('Partner/Owner users:', JSON.stringify(partners, null, 2));

  const teachers = await Teacher.find({ role: 'partner' }).select('name subject userId role');
  console.log('Partner teachers:', JSON.stringify(teachers, null, 2));

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
