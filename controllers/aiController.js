const Post = require('../models/Post');
const geminiService = require('../services/geminiService');

/**
 * @desc    Improve post content using Google Gemini AI and save as a NEW draft
 * @route   POST /api/ai/improve/:postId
 * @access  Private (JWT protected, owner or admin)
 * @note    Never modifies the original post. Creates a completely separate Post with status 'draft'.
 */
const improvePostDraft = async (req, res, next) => {
  try {
    const { postId } = req.params;

    // Retrieve original post
    const originalPost = await Post.findById(postId);

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Original post not found.',
      });
    }

    // Ownership check: only post owner (or admin) can request AI improvement
    if (
      originalPost.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only generate AI improvements for your own posts.',
      });
    }

    // Call Gemini AI service
    const improvedContentResult = await geminiService.improvePostContent(originalPost);

    // Save improved version as a NEW draft with new MongoDB ID and the same owner
    // Note: The original post is strictly untouched!
    const newDraft = await Post.create({
      title: improvedContentResult.title || `[Improved] ${originalPost.title}`,
      description: improvedContentResult.description || originalPost.description,
      content: improvedContentResult.content,
      category: originalPost.category,
      image: originalPost.image || '',
      createdBy: originalPost.createdBy, // Preserves the same owner
      status: 'draft', // Always created as a new draft
    });

    res.status(201).json({
      success: true,
      message: 'AI improved version saved as a new draft successfully.',
      originalPostId: originalPost._id,
      draft: newDraft,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  improvePostDraft,
};
