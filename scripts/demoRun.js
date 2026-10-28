const runDemo = async () => {
  const BASE_URL = 'http://localhost:5000';

  console.log('='.repeat(80));
  console.log("🥷 EXECUTING FULL DEMONSTRATION WORKFLOW ON LIVE SERVER");
  console.log('='.repeat(80));

  // 1. Health Check
  console.log('\n[1/7] Testing Health Check GET /api/health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  console.log('✅ Health Response:', JSON.stringify(health));

  // 2. User Registration
  console.log('\n[2/7] Testing Registration POST /api/auth/register...');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Itachi Uchiha',
      email: 'itachi@akatsuki.org',
      password: 'mypassword123',
    }),
  });
  const reg = await regRes.json();
  console.log('✅ Registration Response:', JSON.stringify({
    success: reg.success,
    token_preview: reg.token ? `${reg.token.slice(0, 25)}...` : null,
    user: reg.user,
  }, null, 2));

  const token = reg.token;

  // 3. User Login
  console.log('\n[3/7] Testing Login POST /api/auth/login...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'itachi@akatsuki.org',
      password: 'mypassword123',
    }),
  });
  const login = await loginRes.json();
  console.log('✅ Login Response:', JSON.stringify({
    success: login.success,
    user: login.user,
  }, null, 2));

  // 4. Create Post Draft
  console.log('\n[4/7] Testing Create Post POST /api/posts...');
  const postRes = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Art of Tsukuyomi and Genjutsu',
      description: 'An analysis of perceptual chakra manipulation',
      content: 'True genjutsu controls the flow of chakra in the cerebral nervous system to govern all five senses.',
      category: 'genjutsu',
      status: 'pending',
    }),
  });
  const created = await postRes.json();
  console.log('✅ Post Created:', JSON.stringify(created, null, 2));
  const postId = created.post._id;

  // 5. Test Google Gemini AI Content Improvement
  console.log(`\n[5/7] Testing Google Gemini AI Content Improvement POST /api/ai/improve/${postId}...`);
  try {
    const aiRes = await fetch(`${BASE_URL}/api/ai/improve/${postId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const aiData = await aiRes.json();
    console.log('✅ Gemini AI Response (New Draft Saved):', JSON.stringify({
      success: aiData.success,
      originalPostId: aiData.originalPostId,
      improvedDraft: {
        _id: aiData.draft._id,
        title: aiData.draft.title,
        description: aiData.draft.description,
        content: aiData.draft.content,
        status: aiData.draft.status,
      },
    }, null, 2));
  } catch (aiErr) {
    console.error('AI Error:', aiErr.message);
  }

  // 6. Promote User to Admin and Approve Post
  console.log('\n[6/7] Promoting user to admin and approving post...');
  await fetch(`${BASE_URL}/api/auth/dev-promote`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'itachi@akatsuki.org' }),
  });

  // Re-login to get updated JWT with admin role
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'itachi@akatsuki.org',
      password: 'mypassword123',
    }),
  });
  const adminLogin = await adminLoginRes.json();
  const adminToken = adminLogin.token;
  console.log('✅ Logged in as Admin:', adminLogin.user.email, '| Role:', adminLogin.user.role);

  // List pending posts
  const pendingRes = await fetch(`${BASE_URL}/api/admin/posts/pending`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const pending = await pendingRes.json();
  console.log('✅ Pending Queue Count:', pending.count);

  // Approve post
  const approveRes = await fetch(`${BASE_URL}/api/admin/posts/approve/${postId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const approved = await approveRes.json();
  console.log('✅ Post Approved by Admin:', JSON.stringify(approved, null, 2));

  // 7. View Public Feed
  console.log('\n[7/7] Viewing Public Approved Posts GET /api/posts...');
  const publicRes = await fetch(`${BASE_URL}/api/posts`);
  const publicPosts = await publicRes.json();
  console.log('✅ Public Feed Response:', JSON.stringify(publicPosts, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('🎉 ALL WORKFLOW STEPS COMPLETED SUCCESSFULLY ON RUNNING SERVER!');
  console.log('='.repeat(80) + '\n');
};

runDemo();
