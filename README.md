# 🥷 Akatsuki's Draft — Backend API

A production-grade, secure Node.js and Express.js REST API backend built for **Akatsuki's Draft**. Features MongoDB Atlas integration with Mongoose, robust JWT authentication, role-based authorization, post moderation lifecycle (draft, pending, approved, rejected), and automated content enhancement powered by Google's official `@google/genai` Gemini SDK.

---

## 🌟 Key Features

- **🔐 Robust Authentication & Security**:
  - Secure password hashing using `bcrypt`.
  - Stateless authentication via JSON Web Tokens (JWT).
  - Strict role segregation (`user` vs `admin`).
  - **Zero Admin Registration Exploit**: Public registration strictly assigns regular `user` role, regardless of user input.
  - Password hashes are never exposed in queries or JSON responses (`select: false` & JSON schema sanitization).
  - Full MongoDB ObjectId format validation to prevent runtime `CastError` crashes.
  - Strict post ownership verification: users cannot edit or delete posts belonging to others.

- **📝 Post Management Lifecycle**:
  - Full CRUD operations with 4 distinct statuses: `draft`, `pending`, `approved`, `rejected`.
  - `GET /api/posts`: Public feed exclusively serves **approved** posts with search, category filtering, and pagination.
  - `GET /api/posts/my-posts`: Private endpoint for users to view all their posts across all statuses.
  - Non-approved posts are protected from public viewing.

- **👑 Admin Moderation Workflow**:
  - `GET /api/admin/posts/pending`: Dedicated moderation queue for submitted drafts.
  - `PATCH /api/admin/posts/approve/:id`: One-click approval publishing to the public feed.
  - `PATCH /api/admin/posts/reject/:id`: Rejection with state updates.
  - Route-level guard ensures only authenticated users with role `admin` can access moderation tools.

- **🤖 Google Gemini AI Post Improver**:
  - Integrated using Google's official modern `@google/genai` SDK.
  - `POST /api/ai/improve/:postId`: Automatically refines grammar, engagement, vocabulary, structure, and title.
  - **Immutability Guarantee**: Strictly saves the enhanced version as a **brand new draft** with a new MongoDB ID and the same owner. The original post is **never modified**.

---

## 📁 Project Structure

```text
akatsukis-draft/
├── config/
│   └── db.js                       # MongoDB Atlas connection & event listeners
├── controllers/
│   ├── adminController.js          # Admin review, approve & reject logic
│   ├── aiController.js             # Gemini AI draft improvement handler
│   ├── authController.js           # Register, login & profile retrieval
│   └── postController.js           # Post CRUD, filters, and ownership controls
├── middleware/
│   ├── authMiddleware.js           # JWT verify ('protect') and role check ('authorize')
│   ├── errorMiddleware.js          # Centralized error handler & 404 handler
│   ├── validateObjectId.js         # MongoDB ObjectId validation
│   └── validationMiddleware.js     # Body inputs validation
├── models/
│   ├── Post.js                     # Post schema (title, description, content, image, category, status, createdBy)
│   └── User.js                     # User schema (name, email, password, role)
├── routes/
│   ├── adminRoutes.js              # /api/admin/posts endpoints
│   ├── aiRoutes.js                 # /api/ai endpoints
│   ├── authRoutes.js               # /api/auth endpoints
│   └── postRoutes.js               # /api/posts endpoints
├── services/
│   └── geminiService.js            # Official @google/genai client integration
├── tests/
│   ├── admin.test.js               # Admin approval/rejection test suite
│   ├── ai.test.js                  # Gemini AI draft improvement test suite
│   ├── auth.test.js                # Auth & registration security test suite
│   ├── posts.test.js               # Posts CRUD & access control test suite
│   └── setup.js                    # In-memory Mongo test environment
├── .env.example                    # Template environment variables
├── .gitignore                      # Git ignored files & folders
├── package.json                    # Project dependencies and npm scripts
├── server.js                       # Express app bootstrap & route registration
└── README.md                       # Comprehensive documentation
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB Atlas Database URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/akatsukis-draft?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=super_secure_jwt_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=7d

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
GEMINI_MODEL=gemini-2.5-flash
```

---

## 🗄️ MongoDB Atlas Setup Guide

1. Sign up or log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster (Shared / Free M0 tier is suitable).
3. **Database User Setup**:
   - Go to **Database Access** in the left sidebar.
   - Click **Add New Database User**.
   - Choose **Password** authentication.
   - Enter a username and secure password (e.g., `akatsuki_user`).
   - Assign user privileges: **Read and write to any database**.
4. **Network Access Setup**:
   - Go to **Network Access** in the left sidebar.
   - Click **Add IP Address**.
   - For development, select **Allow Access from Anywhere** (`0.0.0.0/0`) or add your current IP address.
5. **Get Connection String**:
   - Go to **Database** -> Click **Connect** on your cluster.
   - Select **Drivers** (Node.js).
   - Copy the connection string and replace `<username>` and `<password>` with your credentials.
   - Add the database name after `.net/`, e.g., `/akatsukis-draft`.
   - Paste the result into `MONGODB_URI` in `.env`.

---

## 🤖 Google Gemini AI API Setup Guide

1. Navigate to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **Create API Key** (or select an existing Google Cloud project).
4. Copy the generated API key.
5. Paste it as `GEMINI_API_KEY` in your `.env` file.
6. The default model is `gemini-2.5-flash` (or `gemini-2.0-flash`), which is ultra-fast, highly accurate, and cost-efficient.

---

## 🚀 Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode (with hot-reload via nodemon)
```bash
npm run dev
```

### 3. Run in Production Mode
```bash
npm start
```

### 4. Run Automated Integration Tests
The project includes a comprehensive suite of automated tests using Jest, Supertest, and an in-memory MongoDB server:
```bash
npm test
```

---

## 📡 API Reference & Postman Examples

Base URL: `http://localhost:5000`

### 1. Authentication Endpoints

#### `POST /api/auth/register`
Creates a new account. **Guaranteed to always assign role `user`, never `admin`.**

- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "name": "Itachi Uchiha",
  "email": "itachi@akatsuki.org",
  "password": "mypassword123"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "User registered successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "67be8d1234567890abcdef01",
    "name": "Itachi Uchiha",
    "email": "itachi@akatsuki.org",
    "role": "user",
    "createdAt": "2026-10-27T18:00:00.000Z",
    "updatedAt": "2026-10-27T18:00:00.000Z"
  }
}
```

#### `POST /api/auth/login`
Authenticates a user and returns a signed JWT token.

- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "email": "itachi@akatsuki.org",
  "password": "mypassword123"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "67be8d1234567890abcdef01",
    "name": "Itachi Uchiha",
    "email": "itachi@akatsuki.org",
    "role": "user"
  }
}
```

#### `GET /api/auth/me`
Retrieves current authenticated user's profile.

- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "_id": "67be8d1234567890abcdef01",
    "name": "Itachi Uchiha",
    "email": "itachi@akatsuki.org",
    "role": "user"
  }
}
```

---

### 2. Post Management Endpoints

#### `POST /api/posts`
Create a new post or draft. Initial status can be `draft` (default) or `pending`.

- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "title": "Chakra Nature Transformation",
  "description": "An introduction to fire, water, lightning, earth, and wind affinities.",
  "content": "Mastering elemental transformations requires precise chakra mold manipulation...",
  "category": "training",
  "status": "pending",
  "image": "https://example.com/chakra.jpg"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Post created successfully as pending.",
  "post": {
    "_id": "67be8d1234567890abcdef02",
    "title": "Chakra Nature Transformation",
    "description": "An introduction to fire, water, lightning, earth, and wind affinities.",
    "content": "Mastering elemental transformations requires precise chakra mold manipulation...",
    "category": "training",
    "status": "pending",
    "image": "https://example.com/chakra.jpg",
    "createdBy": "67be8d1234567890abcdef01",
    "createdAt": "2026-10-27T18:05:00.000Z",
    "updatedAt": "2026-10-27T18:05:00.000Z"
  }
}
```

#### `GET /api/posts`
Public endpoint. Lists **approved posts only**.

- **Query Parameters**:
  - `category` (optional): Filter by category (e.g. `?category=training`)
  - `search` (optional): Search keyword in title or description (e.g. `?search=chakra`)
  - `page` (optional, default: 1)
  - `limit` (optional, default: 10)
- **Response (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "page": 1,
  "totalPages": 1,
  "posts": [
    {
      "_id": "67be8d1234567890abcdef02",
      "title": "Chakra Nature Transformation",
      "description": "An introduction to fire, water, lightning, earth, and wind affinities.",
      "content": "Mastering elemental transformations requires precise chakra mold manipulation...",
      "category": "training",
      "status": "approved",
      "image": "https://example.com/chakra.jpg",
      "createdBy": {
        "_id": "67be8d1234567890abcdef01",
        "name": "Itachi Uchiha",
        "email": "itachi@akatsuki.org"
      },
      "createdAt": "2026-10-27T18:05:00.000Z"
    }
  ]
}
```

#### `GET /api/posts/:id`
Get an approved post by ID. (If post is in draft/pending status, only the author or an admin can access it; otherwise returns 404).

- **Headers**: Optional `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "post": {
    "_id": "67be8d1234567890abcdef02",
    "title": "Chakra Nature Transformation",
    "description": "An introduction to fire, water, lightning, earth, and wind affinities.",
    "content": "Mastering elemental transformations...",
    "category": "training",
    "status": "approved",
    "createdBy": {
      "_id": "67be8d1234567890abcdef01",
      "name": "Itachi Uchiha",
      "email": "itachi@akatsuki.org"
    }
  }
}
```

#### `GET /api/posts/my-posts`
Lists all posts owned by the authenticated user across all statuses (`draft`, `pending`, `approved`, `rejected`).

- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `status` (optional): `draft`, `pending`, `approved`, or `rejected`
  - `page` (optional), `limit` (optional)
- **Response (200 OK)**:
```json
{
  "success": true,
  "count": 2,
  "total": 2,
  "page": 1,
  "totalPages": 1,
  "posts": [...]
}
```

#### `PATCH /api/posts/:id`
Updates user's own post. Non-owners are rejected with `403 Forbidden`.

- **Headers**:
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body**:
```json
{
  "title": "Advanced Chakra Nature Transformation",
  "status": "pending"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Post updated successfully.",
  "post": {
    "_id": "67be8d1234567890abcdef02",
    "title": "Advanced Chakra Nature Transformation",
    "status": "pending"
  }
}
```

#### `DELETE /api/posts/:id`
Deletes user's own post. Non-owners are rejected with `403 Forbidden`.

- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Post deleted successfully.",
  "deletedPostId": "67be8d1234567890abcdef02"
}
```

---

### 3. Admin Moderation Endpoints

> **Note**: Requires an authenticated user with `role: "admin"`. Regular users receive `403 Forbidden`.

#### `GET /api/admin/posts/pending`
Lists all posts waiting in the review queue (`status: "pending"`).

- **Headers**: `Authorization: Bearer <admin_token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "page": 1,
  "totalPages": 1,
  "posts": [
    {
      "_id": "67be8d1234567890abcdef02",
      "title": "Chakra Nature Transformation",
      "status": "pending",
      "createdBy": {
        "_id": "67be8d1234567890abcdef01",
        "name": "Itachi Uchiha",
        "email": "itachi@akatsuki.org",
        "role": "user"
      }
    }
  ]
}
```

#### `PATCH /api/admin/posts/approve/:id`
Approves a post. The post immediately appears in the public `GET /api/posts` feed.

- **Headers**: `Authorization: Bearer <admin_token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Post approved successfully.",
  "post": {
    "_id": "67be8d1234567890abcdef02",
    "status": "approved"
  }
}
```

#### `PATCH /api/admin/posts/reject/:id`
Rejects a post. The post remains private to the creator.

- **Headers**: `Authorization: Bearer <admin_token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Post rejected successfully.",
  "post": {
    "_id": "67be8d1234567890abcdef02",
    "status": "rejected"
  }
}
```

---

### 4. Gemini AI Content Enhancement Endpoint

#### `POST /api/ai/improve/:postId`
Uses Google Gemini AI (`@google/genai`) to rewrite and polish the post's title, description, and content.

- **Security & Immutability Rules**:
  - The requester must own the original post (or be an admin).
  - **The original post is strictly untouched.**
  - A **new post document is created with a brand-new MongoDB ID**, `status: "draft"`, and the original owner.
- **Headers**: `Authorization: Bearer <token>`
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "AI improved version saved as a new draft successfully.",
  "originalPostId": "67be8d1234567890abcdef02",
  "draft": {
    "_id": "67be8d1234567890abcdef99",
    "title": "Mastering Chakra Nature Transformation: From Fundamentals to Apex Control",
    "description": "Unlock advanced elemental manipulation across the 5 primary nature transformations.",
    "content": "Chakra nature transformation represents the pinnacle of shinobi combat adaptation...",
    "category": "training",
    "status": "draft",
    "createdBy": "67be8d1234567890abcdef01",
    "createdAt": "2026-10-27T18:15:00.000Z",
    "updatedAt": "2026-10-27T18:15:00.000Z"
  }
}
```

---

## 🛡️ Creating the First Admin User

Because public registration strictly creates regular `user` accounts to prevent privilege escalation attacks, use one of the following methods to establish an admin:

### Method A: MongoDB Atlas Web UI
1. Open your MongoDB Atlas dashboard.
2. Navigate to **Database** -> **Browse Collections** -> `users`.
3. Locate the user document you wish to promote.
4. Edit the `role` field value from `"user"` to `"admin"` and click **Update**.

### Method B: Mongoose / Node Script
Run a one-time promotion command:
```bash
node -e "
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const email = 'leader@akatsuki.org';
  const updated = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
  console.log('Promoted user to admin:', updated.email, updated.role);
  process.exit(0);
});
"
```

---

## 🧪 Testing Summary

Run the automated test suite with Jest:
```bash
npm test
```

The comprehensive test suite covers **6 suites and 51 passing tests**:
1. `tests/app.test.js` (3 tests): Server bootstrap, project metadata routing, health check (`GET /api/health`), and custom 404 handler.
2. `tests/middleware.test.js` (10 tests): MongoDB ObjectId format validation, registration/login body validation, post creation/update validation, and role authorization guards.
3. `tests/auth.test.js` (10 tests): User registration, public registration admin-escalation exploit prevention, duplicate email rejection, bcrypt password hashing, password hash exclusion in responses, login authentication, invalid credentials handling, and protected `/api/auth/me` profile retrieval.
4. `tests/posts.test.js` (16 tests): Post draft creation, pending submission, public approved feed filter (`GET /api/posts`), category and keyword search, private draft access control, user post listing (`GET /api/posts/my-posts`), ownership enforcement preventing unauthorized updates/deletions, and ObjectId validation.
5. `tests/admin.test.js` (8 tests): Forbidden access for regular users, admin pending review queue (`GET /api/admin/posts/pending`), post approval publishing to public feed, and post rejection.
6. `tests/ai.test.js` (4 tests): Gemini AI improvement integration, brand-new draft creation with a unique MongoDB ID and identical owner, verification that the original post is strictly untouched, and ownership authorization guards.
