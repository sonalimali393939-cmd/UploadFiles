const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');
const User = require('../models/User');
const Post = require('../models/Post');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('3. Admin APIs', () => {
  let regularUserToken, regularUserId;
  let adminToken, adminId;
  let pendingPostId;

  beforeEach(async () => {
    // Create regular user (Hidan)
    const regularUser = await User.create({
      name: 'Hidan',
      email: 'hidan@akatsuki.org',
      password: 'jashinimmortal1',
      role: 'user',
    });
    regularUserId = regularUser._id;
    regularUserToken = jwt.sign(
      { id: regularUserId, role: 'user' },
      process.env.JWT_SECRET || 'akatsukis_draft_fallback_secret_key_2026',
      { expiresIn: '7d' }
    );

    // Create admin user (Nagato / Leader) directly in DB
    const adminUser = await User.create({
      name: 'Leader Nagato',
      email: 'leader@akatsuki.org',
      password: 'peaceandrinnegan1',
      role: 'admin',
    });
    adminId = adminUser._id;
    adminToken = jwt.sign(
      { id: adminId, role: 'admin' },
      process.env.JWT_SECRET || 'akatsukis_draft_fallback_secret_key_2026',
      { expiresIn: '7d' }
    );

    // Create a pending post
    const post = await Post.create({
      title: 'Hidan Ritual Proposal',
      description: 'A ritual ceremony proposal for gathering energy',
      content: 'Detailed description of the Jashin ritual requirements...',
      category: 'missions',
      createdBy: regularUserId,
      status: 'pending',
    });
    pendingPostId = post._id.toString();
  });

  describe('GET /api/admin/posts/pending', () => {
    it('should reject access if token is missing', async () => {
      const res = await request(app).get('/api/admin/posts/pending');
      expect(res.status).toBe(401);
    });

    it('should FORBID a regular user from viewing pending admin posts', async () => {
      const res = await request(app)
        .get('/api/admin/posts/pending')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('should allow admin to list pending posts', async () => {
      const res = await request(app)
        .get('/api/admin/posts/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.posts).toHaveLength(1);
      expect(res.body.posts[0].title).toBe('Hidan Ritual Proposal');
      expect(res.body.posts[0].createdBy.name).toBe('Hidan');
    });
  });

  describe('PATCH /api/admin/posts/approve/:id', () => {
    it('should FORBID a regular user from approving a post', async () => {
      const res = await request(app)
        .patch(`/api/admin/posts/approve/${pendingPostId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      const post = await Post.findById(pendingPostId);
      expect(post.status).toBe('pending');
    });

    it('should allow an admin to approve a post and publish it to public feed', async () => {
      const res = await request(app)
        .patch(`/api/admin/posts/approve/${pendingPostId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.status).toBe('approved');

      // Verify in DB
      const postInDb = await Post.findById(pendingPostId);
      expect(postInDb.status).toBe('approved');

      // Verify the newly approved post is now returned in public GET /api/posts
      const publicFeed = await request(app).get('/api/posts');
      expect(publicFeed.status).toBe(200);
      expect(publicFeed.body.posts.some((p) => p._id.toString() === pendingPostId)).toBe(true);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .patch('/api/admin/posts/approve/not-a-valid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/posts/reject/:id', () => {
    it('should FORBID a regular user from rejecting a post', async () => {
      const res = await request(app)
        .patch(`/api/admin/posts/reject/${pendingPostId}`)
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow admin to reject a post', async () => {
      const res = await request(app)
        .patch(`/api/admin/posts/reject/${pendingPostId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.status).toBe('rejected');

      // Verify in DB
      const postInDb = await Post.findById(pendingPostId);
      expect(postInDb.status).toBe('rejected');

      // Verify rejected post is NOT in public feed
      const publicFeed = await request(app).get('/api/posts');
      expect(publicFeed.body.posts.some((p) => p._id.toString() === pendingPostId)).toBe(false);
    });
  });
});
