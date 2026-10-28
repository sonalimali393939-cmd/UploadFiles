const request = require('supertest');
const app = require('../server');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');
const User = require('../models/User');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe('1. Authentication Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should successfully register a regular user and return a JWT token', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Itachi Uchiha',
        email: 'itachi@akatsuki.org',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Itachi Uchiha');
      expect(res.body.user.email).toBe('itachi@akatsuki.org');
      expect(res.body.user.role).toBe('user');
      // Must NEVER return password hash
      expect(res.body.user.password).toBeUndefined();

      // Verify user is in DB
      const dbUser = await User.findOne({ email: 'itachi@akatsuki.org' });
      expect(dbUser).not.toBeNull();
      expect(dbUser.role).toBe('user');
    });

    it('should NEVER allow public registration to create an admin user even if role is specified', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Pain Deva',
        email: 'pain@akatsuki.org',
        password: 'password123',
        role: 'admin', // Malicious attempt to register as admin
      });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('user');

      const dbUser = await User.findOne({ email: 'pain@akatsuki.org' });
      expect(dbUser.role).toBe('user');
    });

    it('should reject registration if email is already registered', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Kisame Hoshigaki',
        email: 'kisame@akatsuki.org',
        password: 'password123',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Kisame Clone',
        email: 'kisame@akatsuki.org',
        password: 'anotherpassword',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should validate missing required fields and password length', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: '',
        email: 'invalid-email',
        password: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Sasori',
        email: 'sasori@akatsuki.org',
        password: 'puppetmaster123',
      });
    });

    it('should login successfully with valid credentials and return a JWT', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'sasori@akatsuki.org',
        password: 'puppetmaster123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('sasori@akatsuki.org');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'sasori@akatsuki.org',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@akatsuki.org',
        password: 'password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Konan',
        email: 'konan@akatsuki.org',
        password: 'paperorigami123',
      });
      token = registerRes.body.token;
    });

    it('should return current user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('konan@akatsuki.org');
      expect(res.body.user.name).toBe('Konan');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject request when token is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request when token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken12345');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
