const Payment = require('../models/Payment');

const generateReceiptNumber = async function() {
  var year  = new Date().getFullYear();
  var prefix = 'RCP/' + year + '/';

  var last = await Payment.findOne(
    { receiptNumber: { $regex: '^' + prefix } },
    { receiptNumber: 1 },
    { sort: { receiptNumber: -1 } }
  );

  var next = 1;
  if (last && last.receiptNumber) {
    var parts = last.receiptNumber.split('/');
    next = parseInt(parts[2], 10) + 1;
  }

  return prefix + String(next).padStart(5, '0');
};

module.exports = generateReceiptNumber;