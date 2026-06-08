const express    = require('express');
const router     = express.Router();
const protect    = require('../../middleware/authMiddleware');
const restrictTo = require('../../middleware/roleMiddleware');
const User       = require('../../models/User');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

router.use(protect);

// Directory — for dropdowns (teachers list etc)
router.get('/directory', catchAsync(async (req, res) => {
  const { role, search, limit = 200 } = req.query;
  const filter = { isActive: { $ne: false } };
  const me = req.user;
  if (me.role === 'admin') {
    if (role) filter.role = role;
    else      filter.role = { $in: ['admin','teacher','student','parent'] };
  } else if (me.role === 'teacher') {
    filter.role = { $in: ['student','teacher'] };
  } else {
    filter._id = me._id;
  }
  if (search) filter.name = { $regex: search, $options: 'i' };
  const users = await User.find(filter, 'name email role').sort({ name: 1 }).limit(Number(limit));
  res.json({ success: true, data: users });
}));

// Admin: list users by role
router.get('/', restrictTo('admin'), catchAsync(async (req, res) => {
  const { role, page = 1, limit = 15, search } = req.query;
  const filter = {};
  if (role)   filter.role = role;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const total = await User.countDocuments(filter);
  const users = await User.find(filter, '-password').sort({ name: 1 }).skip((Number(page)-1)*Number(limit)).limit(Number(limit));
  res.json({ success: true, pagination: { total, page: Number(page), pages: Math.ceil(total/Number(limit)) }, data: users });
}));

// Admin: update user
router.patch('/:id', restrictTo('admin'), catchAsync(async (req, res, next) => {
  const allowed = ['name','phone','qualification','isActive','password'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  if (updates.password) { const bcrypt = require('bcryptjs'); updates.password = await bcrypt.hash(updates.password, 12); }
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, select: '-password' });
  if (!user) return next(new ApiError(404, 'User not found'));
  res.json({ success: true, data: user });
}));

// Admin: delete user
router.delete('/:id', restrictTo('admin'), catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new ApiError(404, 'User not found'));
  res.json({ success: true, message: 'User deleted' });
}));

module.exports = router;
