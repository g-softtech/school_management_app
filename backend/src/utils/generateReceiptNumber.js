const Payment = require('../models/Payment');

const generateReceiptNumber = async function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `RCP-${year}-${month}-`;

  const last = await Payment.findOne(
    { receiptNumber: { $regex: '^' + prefix } },
    { receiptNumber: 1 },
    { sort: { receiptNumber: -1 } }
  );

  let next = 1;
  if (last && last.receiptNumber) {
    const parts = last.receiptNumber.split('-');
    if (parts.length === 4) {
      next = parseInt(parts[3], 10) + 1;
    }
  }

  return prefix + String(next).padStart(6, '0');
};

module.exports = generateReceiptNumber;