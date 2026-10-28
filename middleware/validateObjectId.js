const mongoose = require('mongoose');

/**
 * Middleware factory to validate MongoDB ObjectId in route params
 * @param {string} paramName - Name of the route parameter to validate (default: 'id')
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format for parameter '${paramName}'. Must be a valid 24-character hexadecimal MongoDB ObjectId.`,
      });
    }
    next();
  };
};

module.exports = validateObjectId;
