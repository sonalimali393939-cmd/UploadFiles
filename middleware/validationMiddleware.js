/**
 * Input validation middleware for Auth and Post routes
 */

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required');
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateCreatePost = (req, res, next) => {
  const { title, description, content, category, status } = req.body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push('Title is required');
  } else if (title.trim().length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Description is required');
  } else if (description.trim().length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    errors.push('Content is required');
  }

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('Category is required');
  }

  // Users can only initialize posts as 'draft' or 'pending'
  if (status && !['draft', 'pending'].includes(status)) {
    errors.push("Initial post status can only be 'draft' or 'pending'");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateUpdatePost = (req, res, next) => {
  const { title, description, content, category, image, status } = req.body;
  const errors = [];

  // At least one valid field must be present
  const allowedFields = [title, description, content, category, image, status];
  const hasUpdate = allowedFields.some((field) => field !== undefined);

  if (!hasUpdate) {
    return res.status(400).json({
      success: false,
      message: 'Please provide at least one field to update',
    });
  }

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    errors.push('Title cannot be empty');
  } else if (title && title.trim().length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
    errors.push('Description cannot be empty');
  } else if (description && description.trim().length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }

  if (content !== undefined && (typeof content !== 'string' || content.trim().length === 0)) {
    errors.push('Content cannot be empty');
  }

  if (category !== undefined && (typeof category !== 'string' || category.trim().length === 0)) {
    errors.push('Category cannot be empty');
  }

  // Regular users can only toggle between 'draft' and 'pending'
  if (status !== undefined && !['draft', 'pending'].includes(status)) {
    errors.push("You can only change post status to 'draft' or 'pending'. Only admins can approve or reject.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateCreatePost,
  validateUpdatePost,
};
