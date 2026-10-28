const express = require('express');
const router = express.Router();
const { improvePostDraft } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

// Protect AI route: User must be authenticated to request post improvement
router.post(
  '/improve/:postId',
  protect,
  validateObjectId('postId'),
  improvePostDraft
);

module.exports = router;
