const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  validateRegister,
  validateLogin,
} = require('../middleware/validationMiddleware');

// Public authentication routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Private profile route
router.get('/me', protect, getMe);

// Development-only promotion helper for local demonstration testing
if (process.env.NODE_ENV === 'development') {
  const User = require('../models/User');
  router.patch('/dev-promote', async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email: (email || '').toLowerCase().trim() });
      if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
      user.role = 'admin';
      await user.save();
      res.json({ success: true, message: `User ${user.email} promoted to admin.`, user });
    } catch (e) {
      next(e);
    }
  });
}

module.exports = router;
