const https = require('https');

var sendSMS = async function(to, message) {
  try {
    var body = JSON.stringify({
      api_key:  process.env.TERMII_API_KEY,
      to:       to,
      from:     process.env.TERMII_SENDER_ID || 'SmartSchool',
      sms:      message,
      type:     'plain',
      channel:  'generic',
    });

    var options = {
      hostname: 'api.ng.termii.com',
      port: 443,
      path: '/api/sms/send',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };

    return new Promise(function(resolve) {
      var req = https.request(options, function(res) {
        var chunks = [];
        res.on('data', function(c) { chunks.push(c); });
        res.on('end', function() {
          var result = JSON.parse(Buffer.concat(chunks).toString());
          console.log('✅  SMS sent to:', to);
          resolve(result);
        });
      });
      req.on('error', function(err) {
        console.error('❌  SMS failed:', err.message);
        resolve(null); // never throw
      });
      req.write(body);
      req.end();
    });
  } catch (err) {
    console.error('❌  SMS error:', err.message);
  }
};

var sendResultSMS = function(phone, studentName, term) {
  return sendSMS(phone, 'Hello ' + studentName + ', your ' + term + ' term results are now available. Login to SmartSchool to view them.');
};

var sendPaymentSMS = function(phone, name, amount, receipt) {
  return sendSMS(phone, 'Payment of N' + Number(amount).toLocaleString() + ' confirmed for ' + name + '. Receipt: ' + receipt + '. - SmartSchool');
};

module.exports = { sendSMS, sendResultSMS, sendPaymentSMS };