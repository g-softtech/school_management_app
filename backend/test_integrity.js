require('dotenv').config();
const mongoose = require('mongoose');
const StudentBill = require('./src/models/StudentBill');
const Payment = require('./src/models/Payment');

async function verifyIntegrity() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');
  
  console.log('\n--- Test 8: Financial Integrity Audit ---');
  
  const bills = await StudentBill.find({}).limit(100);
  console.log(`Auditing ${bills.length} bills...`);
  
  let passed = 0;
  let failed = 0;
  let paymentChecked = 0;

  for (const bill of bills) {
    let isValid = true;
    
    // Invariant 1: Bill balance equation
    const calculatedBalance = bill.totalAmount 
      - (bill.totalPaid || 0) 
      - (bill.totalDiscount || 0) 
      + (bill.totalPenalty || 0) 
      + (bill.carryOver || 0);
      
    if (Math.abs(calculatedBalance - bill.totalBalance) > 0.01) {
      console.error(`[FAIL] Invariant 1: Bill ${bill._id} balance mismatch. Stored: ${bill.totalBalance}, Calculated: ${calculatedBalance}`);
      isValid = false;
    }

    // Invariant 2: Items sum to totalBalance (if items track balance) or totalAmount (if items track amount)
    // Looking at the schema, items have netAmount, paidAmount, balance.
    if (bill.items && bill.items.length > 0) {
      const itemsBalance = bill.items.reduce((sum, item) => sum + (item.balance || 0), 0);
      // carryOver is typically not in items, so itemsBalance + carryOver = totalBalance
      const expectedTotalBalance = itemsBalance + (bill.carryOver || 0);
      if (Math.abs(expectedTotalBalance - bill.totalBalance) > 0.01) {
        console.error(`[FAIL] Invariant 2: Bill ${bill._id} items balance mismatch. Stored: ${bill.totalBalance}, Items+CarryOver: ${expectedTotalBalance}`);
        isValid = false;
      }
    }

    // Invariant 3: Payment allocations match payment amounts
    const payments = await Payment.find({ 'allocations.billId': bill._id });
    for (const payment of payments) {
      const allocationSum = payment.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
      if (Math.abs(allocationSum - payment.amount) > 0.01) {
        console.error(`[FAIL] Invariant 3: Payment ${payment._id} allocation mismatch. Amount: ${payment.amount}, Allocations: ${allocationSum}`);
        isValid = false;
      }
      paymentChecked++;
    }

    if (isValid) passed++;
    else failed++;
  }
  
  console.log(`\nAudit Results: ${passed} Passed, ${failed} Failed.`);
  console.log(`Checked ${paymentChecked} payments.`);
  
  if (failed === 0) {
    console.log('[PASS] Financial Integrity Audit successful.');
  }

  mongoose.disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

verifyIntegrity().catch(console.error);
