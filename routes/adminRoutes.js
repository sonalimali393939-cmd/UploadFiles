const express = require('express');
const router = express.Router();
const {
  getPendingPosts,
  approvePost,
  rejectPost,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

// Protect all admin post routes: requires valid JWT and 'admin' role
router.use(protect);
router.use(authorize('admin'));

// List all posts pending review
router.get('/pending', getPendingPosts);

// Approve a post
router.patch('/approve/:id', validateObjectId('id'), approvePost);

// Reject a post
router.patch('/reject/:id', validateObjectId('id'), rejectPost);

module.exports = router;
