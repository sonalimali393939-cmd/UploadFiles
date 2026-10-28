const Post = require('../models/Post');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc    Create a new post or draft
 * @route   POST /api/posts
 * @access  Private (JWT protected)
 */
const createPost = async (req, res, next) => {
  try {
    const { title, description, content, image, category, status } = req.body;

    // Normal users can only create 'draft' or 'pending' posts
    const initialStatus = status === 'pending' ? 'pending' : 'draft';

    const post = await Post.create({
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      image: image ? image.trim() : '',
      category: category.trim().toLowerCase(),
      status: initialStatus,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: `Post created successfully as ${initialStatus}.`,
      post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List approved posts only (public, with pagination & filter)
 * @route   GET /api/posts
 * @access  Public
 */
const getApprovedPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { status: 'approved' };

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category.trim().toLowerCase();
    }

    // Keyword search in title or description
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
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
 * @desc    Get an approved post by ID (public for approved; creator/admin can also view pending/draft)
 * @route   GET /api/posts/:id
 * @access  Public (for approved posts)
 */
const getPostById = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('createdBy', 'name email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // If post is approved, anyone can view it
    if (post.status === 'approved') {
      return res.status(200).json({
        success: true,
        post,
      });
    }

    // If post is not approved, check if current requester is the owner or an admin
    let requester = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'akatsukis_draft_fallback_secret_key_2026'
        );
        requester = await User.findById(decoded.id);
      } catch (err) {
        // Token invalid or expired - ignore and treat as unauthenticated
      }
    }

    const isOwner = requester && post.createdBy && post.createdBy._id.toString() === requester._id.toString();
    const isAdmin = requester && requester.role === 'admin';

    if (isOwner || isAdmin) {
      return res.status(200).json({
        success: true,
        post,
      });
    }

    // For any other public viewer, non-approved posts are not accessible
    return res.status(404).json({
      success: false,
      message: 'Approved post not found with the specified ID.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List my own posts (all statuses: draft, pending, approved, rejected)
 * @route   GET /api/posts/my-posts
 * @access  Private (JWT protected)
 */
const getMyPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = { createdBy: req.user._id };

    if (req.query.status && ['draft', 'pending', 'approved', 'rejected'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    if (req.query.category) {
      query.category = req.query.category.trim().toLowerCase();
    }

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
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
 * @desc    Update my own post
 * @route   PATCH /api/posts/:id
 * @access  Private (JWT protected, owner only)
 */
const updateMyPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Ownership check: Users can only update their own posts
    if (post.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this post.',
      });
    }

    const { title, description, content, image, category, status } = req.body;

    if (title !== undefined) post.title = title.trim();
    if (description !== undefined) post.description = description.trim();
    if (content !== undefined) post.content = content.trim();
    if (image !== undefined) post.image = image.trim();
    if (category !== undefined) post.category = category.trim().toLowerCase();

    // Regular users can only transition status between draft and pending
    if (status !== undefined) {
      if (['draft', 'pending'].includes(status)) {
        post.status = status;
      }
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post updated successfully.',
      post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete my own post
 * @route   DELETE /api/posts/:id
 * @access  Private (JWT protected, owner only)
 */
const deleteMyPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Ownership check: Users can only delete their own posts (admins also allowed)
    if (post.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this post.',
      });
    }

    await Post.deleteOne({ _id: post._id });

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully.',
      deletedPostId: post._id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPost,
  getApprovedPosts,
  getPostById,
  getMyPosts,
  updateMyPost,
  deleteMyPost,
};
