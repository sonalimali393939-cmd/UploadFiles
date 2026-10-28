const mongoose = require('mongoose');
const validateObjectId = require('../middleware/validateObjectId');
const {
  validateRegister,
  validateLogin,
  validateCreatePost,
  validateUpdatePost,
} = require('../middleware/validationMiddleware');
const { authorize } = require('../middleware/authMiddleware');

describe('Security & Validation Middleware Unit Tests', () => {
  describe('validateObjectId', () => {
    it('should call next() for valid 24-character hexadecimal MongoDB ObjectId', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const req = { params: { id: validId } };
      const res = {};
      const next = jest.fn();

      validateObjectId('id')(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for invalid ObjectId format', () => {
      const req = { params: { id: 'invalid-id-xyz' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateObjectId('id')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Invalid format/i),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateRegister', () => {
    it('should pass valid registration payload', () => {
      const req = {
        body: {
          name: 'Itachi',
          email: 'itachi@akatsuki.org',
          password: 'password123',
        },
      };
      const res = {};
      const next = jest.fn();

      validateRegister(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reject missing fields and short passwords with 400', () => {
      const req = {
        body: {
          name: '',
          email: 'not-an-email',
          password: '123',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateRegister(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            'Name is required',
            'A valid email address is required',
            'Password is required and must be at least 6 characters long',
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateLogin', () => {
    it('should pass valid login payload', () => {
      const req = {
        body: {
          email: 'itachi@akatsuki.org',
          password: 'password123',
        },
      };
      const res = {};
      const next = jest.fn();

      validateLogin(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reject missing email or password', () => {
      const req = { body: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateLogin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateCreatePost', () => {
    it('should allow valid post payload with draft or pending status', () => {
      const req = {
        body: {
          title: 'My Title',
          description: 'My Description',
          content: 'My Content',
          category: 'art',
          status: 'draft',
        },
      };
      const res = {};
      const next = jest.fn();

      validateCreatePost(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should reject post creation if user attempts to set approved status directly', () => {
      const req = {
        body: {
          title: 'My Title',
          description: 'My Description',
          content: 'My Content',
          category: 'art',
          status: 'approved',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      validateCreatePost(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            "Initial post status can only be 'draft' or 'pending'",
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize role middleware', () => {
    it('should allow user with matching role', () => {
      const req = { user: { role: 'admin' } };
      const res = {};
      const next = jest.fn();

      authorize('admin')(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 403 Forbidden for user with non-matching role', () => {
      const req = { user: { role: 'user' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      authorize('admin')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringMatching(/Forbidden/i),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
