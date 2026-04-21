const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

var sendEmail = async function(options) {
  try {
    var info = await transporter.sendMail({
      from:    '"SmartSchool" <' + process.env.EMAIL_USER + '>',
      to:      options.to,
      subject: options.subject,
      html:    options.html || options.text,
      text:    options.text,
    });
    console.log('✅  Email sent to:', options.to, '| ID:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌  Email failed:', err.message);
    // Never throw — email failure should not crash the main request
  }
};

var sendResultNotification = function(studentEmail, studentName, term, session) {
  return sendEmail({
    to:      studentEmail,
    subject: 'Your ' + term + ' term results are ready — SmartSchool',
    html:    '<h2>Hello ' + studentName + ',</h2><p>Your results for the <strong>' + term + ' term ' + session + '</strong> session have been published. Login to your portal to view them.</p><br><p>SmartSchool Management System</p>',
  });
};

var sendPaymentConfirmation = function(email, name, amount, receiptNumber) {
  return sendEmail({
    to:      email,
    subject: 'Payment Confirmed — SmartSchool',
    html:    '<h2>Hello ' + name + ',</h2><p>Your payment of <strong>₦' + Number(amount).toLocaleString() + '</strong> has been confirmed.</p><p>Receipt Number: <strong>' + receiptNumber + '</strong></p><br><p>SmartSchool Management System</p>',
  });
};

var sendAssignmentGraded = function(email, name, assignmentTitle, score, maxScore, feedback) {
  return sendEmail({
    to:      email,
    subject: 'Assignment Graded — ' + assignmentTitle,
    html:    '<h2>Hello ' + name + ',</h2><p>Your assignment <strong>' + assignmentTitle + '</strong> has been graded.</p><p>Score: <strong>' + score + ' / ' + maxScore + '</strong></p>' + (feedback ? '<p>Feedback: ' + feedback + '</p>' : '') + '<br><p>SmartSchool Management System</p>',
  });
};

module.exports = { sendEmail, sendResultNotification, sendPaymentConfirmation, sendAssignmentGraded };