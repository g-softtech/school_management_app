const https = require('https');
const crypto = require('crypto');
const env = require('../config/env');

const PAYSTACK_SECRET = env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE   = 'api.paystack.co';

// Generic Paystack API caller
function paystackRequest(method, path, body) {
  return new Promise(function(resolve, reject) {
    var data = body ? JSON.stringify(body) : '';

    var options = {
      hostname: PAYSTACK_BASE,
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + PAYSTACK_SECRET,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    var req = https.request(options, function(res) {
      var chunks = [];
      res.on('data', function(chunk) { chunks.push(chunk); });
      res.on('end', function() {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error('Failed to parse Paystack response'));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Initialize a payment — returns authorization_url
var initializePayment = function(email, amountInKobo, reference, metadata) {
  return paystackRequest('POST', '/transaction/initialize', {
    email:     email,
    amount:    amountInKobo,
    reference: reference,
    metadata:  metadata || {},
    callback_url: `${env.CLIENT_URL}/payment/verify`,
  });
};

// Verify a payment by reference
var verifyPayment = function(reference) {
  return paystackRequest('GET', '/transaction/verify/' + encodeURIComponent(reference), null);
};

// Verify Paystack webhook signature
var verifyWebhookSignature = function(rawBody, signature) {
  var hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
};

module.exports = { initializePayment, verifyPayment, verifyWebhookSignature };