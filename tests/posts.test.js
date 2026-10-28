const request = require('supertest');
const app = require('../server');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');
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

describe('2. Post Management Endpoints', () => {
  let user1Token, user1Id;
  let user2Token, user2Id;

  beforeEach(async () => {
    // Register User 1 (Deidara)
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'Deidara',
      email: 'deidara@akatsuki.org',
      password: 'artisanexplosion1',
    });
    user1Token = res1.body.token;
    user1Id = res1.body.user._id;

    // Register User 2 (Kakuzu)
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Kakuzu',
      email: 'kakuzu@akatsuki.org',
      password: 'bountyhunter123',
    });
    user2Token = res2.body.token;
    user2Id = res2.body.user._id;
  });

  describe('POST /api/posts', () => {
    it('should create a new draft post by default', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Art is an Explosion',
          description: 'A deep dive into clay sculptures and transient beauty',
          content: 'True art is an fleeting blast of brilliance that lasts a moment.',
          category: 'philosophy',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.post.status).toBe('draft');
      expect(res.body.post.createdBy).toBe(user1Id);
      expect(res.body.post.title).toBe('Art is an Explosion');
    });

    it('should create a post with pending status if specified', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Clay Sculpting Techniques',
          description: 'How to mold explosive chakra into birds and spiders',
          content: 'Step 1: infuse chakra into white clay. Step 2: mold carefully.',
          category: 'art',
          status: 'pending',
        });

      expect(res.status).toBe(201);
      expect(res.body.post.status).toBe('pending');
    });

    it('should reject unauthenticated post creation', async () => {
      const res = await request(app).post('/api/posts').send({
        title: 'Unauthorized Post',
        description: 'Test description',
        content: 'Test content',
        category: 'general',
      });

      expect(res.status).toBe(401);
    });

    it('should reject post creation with missing fields', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Incomplete Post',
          // missing description, content, category
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('GET /api/posts (List approved posts only)', () => {
    beforeEach(async () => {
      // Create a draft post
      await Post.create({
        title: 'Secret Draft',
        description: 'Not yet ready for public eyes',
        content: 'Secret plans...',
        category: 'plans',
        createdBy: user1Id,
        status: 'draft',
      });

      // Create a pending post
      await Post.create({
        title: 'Pending Review Post',
        description: 'Awaiting moderation',
        content: 'Content awaiting admin approval...',
        category: 'missions',
        createdBy: user1Id,
        status: 'pending',
      });

      // Create an approved post
      await Post.create({
        title: 'Public Akatsuki Manifesto',
        description: 'Open to the entire ninja world',
        content: 'We strive for lasting peace through deterrence.',
        category: 'announcements',
        createdBy: user1Id,
        status: 'approved',
      });

      // Create a rejected post
      await Post.create({
        title: 'Rejected Proposal',
        description: 'Not approved by leader',
        content: 'Too dangerous...',
        category: 'missions',
        createdBy: user1Id,
        status: 'rejected',
      });
    });

    it('should return ONLY approved posts in public feed', async () => {
      const res = await request(app).get('/api/posts');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.posts).toHaveLength(1);
      expect(res.body.posts[0].title).toBe('Public Akatsuki Manifesto');
      expect(res.body.posts[0].status).toBe('approved');
      expect(res.body.posts[0].createdBy.name).toBe('Deidara');
    });

    it('should filter approved posts by category', async () => {
      const res = await request(app).get('/api/posts?category=announcements');

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(1);

      const emptyRes = await request(app).get('/api/posts?category=nonexistent');
      expect(emptyRes.status).toBe(200);
      expect(emptyRes.body.posts).toHaveLength(0);
    });
  });

  describe('GET /api/posts/:id', () => {
    let approvedPostId, draftPostId;

    beforeEach(async () => {
      const approved = await Post.create({
        title: 'Approved Guide',
        description: 'Approved guide description',
        content: 'Guide content',
        category: 'guides',
        createdBy: user1Id,
        status: 'approved',
      });
      approvedPostId = approved._id.toString();

      const draft = await Post.create({
        title: 'Private Draft Guide',
        description: 'Private draft description',
        content: 'Draft content',
        category: 'guides',
        createdBy: user1Id,
        status: 'draft',
      });
      draftPostId = draft._id.toString();
    });

    it('should allow public access to approved post', async () => {
      const res = await request(app).get(`/api/posts/${approvedPostId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.title).toBe('Approved Guide');
    });

    it('should allow post owner to access their own draft post', async () => {
      const res = await request(app)
        .get(`/api/posts/${draftPostId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.post.title).toBe('Private Draft Guide');
    });

    it('should NOT allow other users or public to view unapproved post', async () => {
      const publicRes = await request(app).get(`/api/posts/${draftPostId}`);
      expect(publicRes.status).toBe(404);

      const otherUserRes = await request(app)
        .get(`/api/posts/${draftPostId}`)
        .set('Authorization', `Bearer ${user2Token}`);
      expect(otherUserRes.status).toBe(404);
    });

    it('should return 400 for invalid MongoDB ObjectId', async () => {
      const res = await request(app).get('/api/posts/invalid-id-format');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid format/i);
    });
  });

  describe('GET /api/posts/my-posts', () => {
    beforeEach(async () => {
      // User 1 posts
      await Post.create({
        title: 'Deidara Post 1',
        description: 'Desc 1',
        content: 'Content 1',
        category: 'art',
        createdBy: user1Id,
        status: 'draft',
      });
      await Post.create({
        title: 'Deidara Post 2',
        description: 'Desc 2',
        content: 'Content 2',
        category: 'art',
        createdBy: user1Id,
        status: 'pending',
      });

      // User 2 post
      await Post.create({
        title: 'Kakuzu Financial Log',
        description: 'Desc',
        content: 'Money matters',
        category: 'finance',
        createdBy: user2Id,
        status: 'draft',
      });
    });

    it('should list all posts belonging to the authenticated user', async () => {
      const res = await request(app)
        .get('/api/posts/my-posts')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.posts).toHaveLength(2);
      expect(res.body.posts.every((p) => p.createdBy === user1Id.toString())).toBe(true);
    });

    it('should filter my-posts by status', async () => {
      const res = await request(app)
        .get('/api/posts/my-posts?status=draft')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(1);
      expect(res.body.posts[0].title).toBe('Deidara Post 1');
    });
  });

  describe('PATCH /api/posts/:id (Update my own post)', () => {
    let user1PostId;

    beforeEach(async () => {
      const post = await Post.create({
        title: 'Original Title',
        description: 'Original Description',
        content: 'Original Content',
        category: 'missions',
        createdBy: user1Id,
        status: 'draft',
      });
      user1PostId = post._id.toString();
    });

    it('should allow owner to update their own post', async () => {
      const res = await request(app)
        .patch(`/api/posts/${user1PostId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Updated Title by Deidara',
          content: 'Updated content with new details',
          status: 'pending',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.title).toBe('Updated Title by Deidara');
      expect(res.body.post.content).toBe('Updated content with new details');
      expect(res.body.post.status).toBe('pending');
    });

    it('should FORBID another user from updating user 1 post', async () => {
      const res = await request(app)
        .patch(`/api/posts/${user1PostId}`)
        .set('Authorization', `Bearer ${user2Token}`) // Kakuzu trying to edit Deidara's post
        .send({
          title: 'Malicious Hijack',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);

      // Verify DB remained unchanged
      const dbPost = await Post.findById(user1PostId);
      expect(dbPost.title).toBe('Original Title');
    });
  });

  describe('DELETE /api/posts/:id (Delete my own post)', () => {
    let user1PostId;

    beforeEach(async () => {
      const post = await Post.create({
        title: 'Post to Delete',
        description: 'Desc',
        content: 'Content',
        category: 'missions',
        createdBy: user1Id,
        status: 'draft',
      });
      user1PostId = post._id.toString();
    });

    it('should FORBID another user from deleting user 1 post', async () => {
      const res = await request(app)
        .delete(`/api/posts/${user1PostId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      const dbPost = await Post.findById(user1PostId);
      expect(dbPost).not.toBeNull();
    });

    it('should allow owner to delete their own post', async () => {
      const res = await request(app)
        .delete(`/api/posts/${user1PostId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbPost = await Post.findById(user1PostId);
      expect(dbPost).toBeNull();
    });
  });
});
