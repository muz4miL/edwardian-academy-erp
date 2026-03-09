const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/edwardianAcademyDB').then(async () => {
  const Transaction = require('./models/Transaction');
  const Expense = require('./models/Expense');
  const Teacher = require('./models/Teacher');
  const Student = require('./models/Student');
  const FeeRecord = require('./models/FeeRecord');

  console.log('=== ALL TRANSACTIONS ===');
  const txns = await Transaction.find({}).sort({date:-1}).select('type category amount date status description').lean();
  txns.forEach(t => {
    console.log(`${t.type} | ${t.category} | ${t.amount} | ${t.date?.toISOString()?.slice(0,10)} | ${t.status} | ${(t.description||'').slice(0,60)}`);
  });

  const inc = txns.filter(t=>t.type==='INCOME').reduce((s,t)=>s+t.amount,0);
  const exp = txns.filter(t=>t.type==='EXPENSE').reduce((s,t)=>s+t.amount,0);
  const cred = txns.filter(t=>t.type==='CREDIT').reduce((s,t)=>s+t.amount,0);
  console.log('\nSUM INCOME:', inc, '| SUM EXPENSE:', exp, '| SUM CREDIT:', cred, '| NET:', inc-exp);

  console.log('\n=== ALL EXPENSES (Expense Model) ===');
  const expenses = await Expense.find({}).sort({expenseDate:-1}).select('title category amount expenseDate status vendorName').lean();
  expenses.forEach(e => {
    console.log(`${e.category} | ${e.amount} | ${e.expenseDate?.toISOString()?.slice(0,10)} | ${e.status} | ${e.title} | ${e.vendorName}`);
  });
  const expTotal = expenses.reduce((s,e)=>s+e.amount,0);
  console.log('SUM EXPENSES MODEL:', expTotal);

  console.log('\n=== TEACHER BALANCES ===');
  const teachers = await Teacher.find({}).select('name balance totalPaid').lean();
  teachers.forEach(t => {
    const b = t.balance || {};
    console.log(`${t.name} | floating:${b.floating||0} verified:${b.verified||0} pending:${b.pending||0} | paid:${t.totalPaid||0}`);
  });

  console.log('\n=== STUDENT FEES ===');
  const students = await Student.find({}).select('studentName totalFee paidAmount feeStatus').lean();
  students.forEach(s => {
    console.log(`${s.studentName} | fee:${s.totalFee||0} paid:${s.paidAmount||0} | ${s.feeStatus}`);
  });

  console.log('\n=== FEE RECORDS ===');
  const feeRecords = await FeeRecord.find({}).sort({createdAt:-1}).select('amount status month receiptNumber createdAt').lean();
  feeRecords.forEach(f => {
    console.log(`${f.amount} | ${f.status} | ${f.month} | ${f.receiptNumber} | ${f.createdAt?.toISOString()?.slice(0,10)}`);
  });

  console.log('\n=== MONTH FILTER CHECK ===');
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthIncome = txns.filter(t => t.type==='INCOME' && new Date(t.date) >= startOfMonth).reduce((s,t)=>s+t.amount,0);
  const monthExpense = txns.filter(t => t.type==='EXPENSE' && new Date(t.date) >= startOfMonth).reduce((s,t)=>s+t.amount,0);
  console.log('This month INCOME txns:', monthIncome);
  console.log('This month EXPENSE txns:', monthExpense);
  console.log('This month NET:', monthIncome - monthExpense);

  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
