const Post = require('../models/Post');

/**
 * @desc    List all pending posts for review
 * @route   GET /api/admin/posts/pending
 * @access  Private (Admin only)
 */
const getPendingPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { status: 'pending' };

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: 1 }) // First in, first reviewed
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      posts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a pending or drafted post
 * @route   PATCH /api/admin/posts/approve/:id
 * @access  Private (Admin only)
 */
const approvePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('createdBy', 'name email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    if (post.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'This post is already approved.',
        post,
      });
    }

    post.status = 'approved';
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post approved successfully.',
      post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a pending or drafted post
 * @route   PATCH /api/admin/posts/reject/:id
 * @access  Private (Admin only)
 */
const rejectPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('createdBy', 'name email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    post.status = 'rejected';
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post rejected successfully.',
      post,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingPosts,
  approvePost,
  rejectPost,
};
