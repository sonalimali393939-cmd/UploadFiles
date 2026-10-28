const express = require('express');
const router = express.Router();
const {
  createPost,
  getApprovedPosts,
  getPostById,
  getMyPosts,
  updateMyPost,
  deleteMyPost,
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const {
  validateCreatePost,
  validateUpdatePost,
} = require('../middleware/validationMiddleware');

// Public route: List approved posts
router.get('/', getApprovedPosts);

// Private route: List my posts (MUST be declared before /:id to prevent route shadowing)
router.get('/my-posts', protect, getMyPosts);

// Private route: Create a new post or draft
router.post('/', protect, validateCreatePost, createPost);

// Public route: Get an approved post by ID (or draft/pending if creator/admin)
router.get('/:id', validateObjectId('id'), getPostById);

// Private route: Update my own post
router.patch(
  '/:id',
  protect,
  validateObjectId('id'),
  validateUpdatePost,
  updateMyPost
);

// Private route: Delete my own post
router.delete('/:id', protect, validateObjectId('id'), deleteMyPost);

module.exports = router;
