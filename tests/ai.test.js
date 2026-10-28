const request = require('supertest');
const app = require('../server');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');
const User = require('../models/User');
const Post = require('../models/Post');
const geminiService = require('../services/geminiService');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
});

afterAll(async () => {
  await closeTestDB();
});

describe('4. Gemini AI Improvement Endpoints', () => {
  let user1Token, user1Id;
  let user2Token, user2Id;
  let originalPost;

  beforeEach(async () => {
    // User 1 (Orochimaru)
    const user1Res = await request(app).post('/api/auth/register').send({
      name: 'Orochimaru',
      email: 'orochimaru@akatsuki.org',
      password: 'immortalityscience1',
    });
    user1Token = user1Res.body.token;
    user1Id = user1Res.body.user._id;

    // User 2 (Itachi)
    const user2Res = await request(app).post('/api/auth/register').send({
      name: 'Itachi',
      email: 'itachi2@akatsuki.org',
      password: 'sharinganmaster1',
    });
    user2Token = user2Res.body.token;
    user2Id = user2Res.body.user._id;

    // Original post by Orochimaru
    originalPost = await Post.create({
      title: 'Study on Forbidden Jutsu',
      description: 'Initial rough notes on chakra rejuvenation',
      content: 'Chakra can be extended through biological transfer experiments.',
      category: 'research',
      createdBy: user1Id,
      status: 'approved',
    });
  });

  describe('POST /api/ai/improve/:postId', () => {
    it('should improve post content, save as a NEW draft with new ID, same owner, and leave original untouched', async () => {
      // Mock geminiService.improvePostContent to simulate successful Gemini response
      const mockAiOutput = {
        title: 'Comprehensive Analysis of Rejuvenation and Chakra Transfers',
        description: 'An authoritative study on biological chakra extensions and immortality mechanics.',
        content: 'Chakra longevity can be significantly maximized through careful biological host transfers and advanced cellular reconfiguration.',
      };

      jest.spyOn(geminiService, 'improvePostContent').mockResolvedValue(mockAiOutput);

      const res = await request(app)
        .post(`/api/ai/improve/${originalPost._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/saved as a new draft/i);
      expect(res.body.originalPostId).toBe(originalPost._id.toString());

      const newDraft = res.body.draft;
      expect(newDraft).toBeDefined();

      // 1. Verify it has a NEW MongoDB ID
      expect(newDraft._id).toBeDefined();
      expect(newDraft._id.toString()).not.toBe(originalPost._id.toString());

      // 2. Verify status is strictly 'draft'
      expect(newDraft.status).toBe('draft');

      // 3. Verify it has the SAME owner
      expect(newDraft.createdBy.toString()).toBe(user1Id.toString());

      // 4. Verify improved content
      expect(newDraft.title).toBe(mockAiOutput.title);
      expect(newDraft.description).toBe(mockAiOutput.description);
      expect(newDraft.content).toBe(mockAiOutput.content);
      expect(newDraft.category).toBe(originalPost.category);

      // 5. CRUCIAL: Verify that the ORIGINAL post was NEVER modified!
      const postInDb = await Post.findById(originalPost._id);
      expect(postInDb.title).toBe('Study on Forbidden Jutsu');
      expect(postInDb.description).toBe('Initial rough notes on chakra rejuvenation');
      expect(postInDb.content).toBe('Chakra can be extended through biological transfer experiments.');
      expect(postInDb.status).toBe('approved'); // Status unchanged
      expect(postInDb.updatedAt.getTime()).toBe(originalPost.updatedAt.getTime()); // Not updated
    });

    it('should FORBID another user from requesting AI improvement on a post they do not own', async () => {
      const res = await request(app)
        .post(`/api/ai/improve/${originalPost._id}`)
        .set('Authorization', `Bearer ${user2Token}`); // Itachi trying to improve Orochimaru's post

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only generate AI improvements for your own posts/i);
    });

    it('should return 404 if original post does not exist', async () => {
      const nonExistentId = new (require('mongoose').Types.ObjectId)();
      const res = await request(app)
        .post(`/api/ai/improve/${nonExistentId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid postId format', async () => {
      const res = await request(app)
        .post('/api/ai/improve/invalid-post-id')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
