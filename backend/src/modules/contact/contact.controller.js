const catchAsync = require('../../utils/catchAsync');
const ApiError   = require('../../utils/ApiError');

// Lazy-load models to avoid startup errors if collections don't exist
const getAdmissionApp  = () => require('../../models/AdmissionApplication');
const getContactMsg    = () => require('../../models/ContactMessage');

const tryEmail = async (payload) => {
  try { const { sendEmail } = require('../../../services/emailService'); await sendEmail(payload); } catch {}
};

exports.submitContact = catchAsync(async (req, res, next) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) return next(new ApiError(400, 'Name, email and message are required'));
  const ContactMessage = getContactMsg();
  await ContactMessage.create({ name, email, phone, subject, message });
  await tryEmail({ to: process.env.ADMIN_EMAIL || process.env.SMTP_USER, subject: `New Contact: ${subject||'Enquiry'}`, html: `<p>From: ${name} &lt;${email}&gt;</p><p>${message}</p>` });
  res.status(201).json({ success: true, message: 'Message received. We will get back to you within 24 hours.' });
});

exports.submitAdmission = catchAsync(async (req, res, next) => {
  const { fullName, email, phone, applyingFor, parentName } = req.body;
  if (!fullName || !email || !phone || !applyingFor || !parentName) return next(new ApiError(400, 'All required fields must be filled'));
  const AdmissionApplication = getAdmissionApp();
  const app = await AdmissionApplication.create(req.body);
  await tryEmail({ to: process.env.ADMIN_EMAIL || process.env.SMTP_USER, subject: `New Admission: ${fullName}`, html: `<p>${fullName} applied for ${applyingFor}. Contact: ${email} / ${phone}</p>` });
  res.status(201).json({ success: true, message: 'Application submitted! You will be contacted within 3 working days.', data: { applicationId: app._id } });
});

exports.getAdmissions = catchAsync(async (req, res) => {
  const AdmissionApplication = getAdmissionApp();
  const { status, page=1, limit=20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const total = await AdmissionApplication.countDocuments(filter);
  const apps  = await AdmissionApplication.find(filter).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
  res.json({ success: true, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) }, data: apps });
});

exports.updateAdmission = catchAsync(async (req, res, next) => {
  const AdmissionApplication = getAdmissionApp();
  const app = await AdmissionApplication.findByIdAndUpdate(req.params.id, { ...req.body, reviewedBy: req.user._id, reviewedAt: new Date() }, { new: true });
  if (!app) return next(new ApiError(404, 'Application not found'));
  res.json({ success: true, message: `Application ${req.body.status}`, data: app });
});

exports.getMessages = catchAsync(async (req, res) => {
  const ContactMessage = getContactMsg();
  const { page=1, limit=20 } = req.query;
  const total    = await ContactMessage.countDocuments();
  const messages = await ContactMessage.find().sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
  res.json({ success: true, pagination: { total, page: Number(page), pages: Math.ceil(total/limit) }, data: messages });
});

exports.markMessageRead = catchAsync(async (req, res, next) => {
  const ContactMessage = getContactMsg();
  const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!msg) return next(new ApiError(404, 'Message not found'));
  res.json({ success: true, data: msg });
});

exports.getPublicStats = catchAsync(async (req, res) => {
  try {
    const Student = require('../../models/Student');
    const User    = require('../../models/User');
    const Result  = require('../../models/Result');
    const [students, teachers, results] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true }),
      Result.find({}, 'grade'),
    ]);
    const passGrades = ['A1','B2','B3','C4','C5','C6'];
    const passed     = results.filter(r => passGrades.includes(r.grade)).length;
    const passRate   = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;
    res.json({ success: true, data: { students, teachers, passRate, yearsOfExcellence: new Date().getFullYear() - 2009 } });
  } catch {
    res.json({ success: true, data: { students: 0, teachers: 0, passRate: 0, yearsOfExcellence: new Date().getFullYear() - 2009 } });
  }
});
