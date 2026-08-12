const COMMENT_MAX_LEN = 80;
const COMMENT_NAME_MAX_LEN = 50;
const FAQ_QUESTION_MAX = 200;
const FAQ_ANSWER_MAX = 2000;
const FAQ_CATEGORY_MAX = 20;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}

function getEnv(env, key, fallback = '') {
  const value = env?.[key];
  return value == null || value === '' ? fallback : String(value);
}

function requireAdmin(request, env) {
  const token = getEnv(env, 'ADMIN_TOKEN', 'secret-admin-token-123');
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${token}`;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function baseSignatures(env) {
  return Number(getEnv(env, 'BASE_SIGNATURES', '50')) || 50;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const method = request.method.toUpperCase();
  const parts = []
    .concat(params.path || [])
    .filter(Boolean)
    .map(String);
  const route = parts.join('/');

  try {
    if (!env.DB) {
      return json({ error: 'D1 database binding missing' }, 500);
    }

    // GET /api/health
    if (route === 'health' && method === 'GET') {
      await env.DB.prepare('SELECT 1 AS ok').first();
      return json({ ok: true, db: 'd1', time: new Date().toISOString() });
    }

    // POST /api/admin/login
    if (route === 'admin/login' && method === 'POST') {
      const body = await readBody(request);
      const adminId = getEnv(env, 'ADMIN_ID', 'admin');
      const adminPw = getEnv(env, 'ADMIN_PW', 'smartsave!');
      const adminToken = getEnv(env, 'ADMIN_TOKEN', 'secret-admin-token-123');
      if (body.id === adminId && body.password === adminPw) {
        return json({ success: true, token: adminToken });
      }
      return json({ success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' }, 401);
    }

    // GET /api/signatures/count
    if (route === 'signatures/count' && method === 'GET') {
      const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM signatures').first();
      return json({ count: baseSignatures(env) + (Number(row?.count) || 0) });
    }

    // GET /api/signatures (admin)
    if (route === 'signatures' && method === 'GET') {
      if (!requireAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
      const { results } = await env.DB.prepare(
        'SELECT id, name, email, created_at FROM signatures ORDER BY datetime(created_at) DESC'
      ).all();
      return json(results || []);
    }

    // POST /api/signatures
    if (route === 'signatures' && method === 'POST') {
      const body = await readBody(request);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
      const agreed = body.agreed === true ? 1 : 0;
      if (!name) return json({ error: 'Name is required' }, 400);

      if (email) {
        const existing = await env.DB.prepare('SELECT id FROM signatures WHERE email = ?').bind(email).first();
        if (existing) return json({ error: '이미 서명에 참여한 이메일입니다.' }, 409);
      }

      await env.DB.prepare(
        'INSERT INTO signatures (name, email, agreed) VALUES (?, ?, ?)'
      ).bind(name, email, agreed).run();

      const row = await env.DB.prepare('SELECT COUNT(*) AS count FROM signatures').first();
      return json(
        { message: 'Signature recorded successfully', count: baseSignatures(env) + (Number(row?.count) || 0) },
        201
      );
    }

    // DELETE /api/signatures/:id
    if (parts[0] === 'signatures' && parts.length === 2 && method === 'DELETE') {
      if (!requireAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
      const id = Number(parts[1]);
      const result = await env.DB.prepare('DELETE FROM signatures WHERE id = ?').bind(id).run();
      if (!result.meta?.changes) return json({ error: 'Signature not found' }, 404);
      return json({ success: true });
    }

    // GET /api/faq  &  GET /api/admin/faq
    if ((route === 'faq' || route === 'admin/faq') && method === 'GET') {
      if (route === 'admin/faq' && !requireAdmin(request, env)) {
        return json({ error: 'Unauthorized' }, 401);
      }
      const { results } = await env.DB.prepare(
        'SELECT id, category, question, answer, sources FROM faq ORDER BY id ASC'
      ).all();
      const items = (results || []).map((row) => ({
        ...row,
        sources: (() => {
          try { return JSON.parse(row.sources || '[]'); } catch { return []; }
        })()
      }));
      return json(items);
    }

    // POST /api/admin/faq
    if (route === 'admin/faq' && method === 'POST') {
      if (!requireAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
      const body = await readBody(request);
      const category = typeof body.category === 'string' ? body.category.trim() : '';
      const question = typeof body.question === 'string' ? body.question.trim() : '';
      const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
      if (!category) return json({ error: '카테고리를 입력해주세요.' }, 400);
      if (!question) return json({ error: '질문을 입력해주세요.' }, 400);
      if (!answer) return json({ error: '답변을 입력해주세요.' }, 400);
      if (category.length > FAQ_CATEGORY_MAX) {
        return json({ error: `카테고리는 ${FAQ_CATEGORY_MAX}자 이내로 입력해주세요.` }, 400);
      }
      if (question.length > FAQ_QUESTION_MAX) {
        return json({ error: `질문은 ${FAQ_QUESTION_MAX}자 이내로 입력해주세요.` }, 400);
      }
      if (answer.length > FAQ_ANSWER_MAX) {
        return json({ error: `답변은 ${FAQ_ANSWER_MAX}자 이내로 입력해주세요.` }, 400);
      }

      const result = await env.DB.prepare(
        'INSERT INTO faq (category, question, answer, sources) VALUES (?, ?, ?, ?)'
      ).bind(category, question, answer, '[]').run();

      return json({
        id: result.meta.last_row_id,
        category,
        question,
        answer,
        sources: []
      }, 201);
    }

    // DELETE /api/admin/faq/:id
    if (parts[0] === 'admin' && parts[1] === 'faq' && parts.length === 3 && method === 'DELETE') {
      if (!requireAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
      const id = Number(parts[2]);
      const result = await env.DB.prepare('DELETE FROM faq WHERE id = ?').bind(id).run();
      if (!result.meta?.changes) return json({ error: 'FAQ not found' }, 404);
      return json({ success: true });
    }

    // GET /api/comments
    if (route === 'comments' && method === 'GET') {
      const url = new URL(request.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100);
      const { results } = await env.DB.prepare(
        'SELECT id, name, message, likes, created_at FROM support_comments ORDER BY datetime(created_at) DESC LIMIT ?'
      ).bind(limit).all();
      return json(results || []);
    }

    // POST /api/comments
    if (route === 'comments' && method === 'POST') {
      const body = await readBody(request);
      let name = typeof body.name === 'string' ? body.name.trim() : '';
      let message = typeof body.message === 'string' ? body.message.trim().replace(/\s+/g, ' ') : '';
      if (!name) return json({ error: '닉네임을 입력해주세요.' }, 400);
      if (!message) return json({ error: '지지 한마디를 입력해주세요.' }, 400);
      if (name.length > COMMENT_NAME_MAX_LEN) {
        return json({ error: `닉네임은 ${COMMENT_NAME_MAX_LEN}자 이내로 입력해주세요.` }, 400);
      }
      if (message.length > COMMENT_MAX_LEN) {
        return json({ error: `지지 한마디는 ${COMMENT_MAX_LEN}자 이내로 입력해주세요.` }, 400);
      }
      if (message.includes('\n') || message.includes('\r')) {
        return json({ error: '한 줄로만 작성해주세요.' }, 400);
      }

      const result = await env.DB.prepare(
        'INSERT INTO support_comments (name, message, likes) VALUES (?, ?, 0)'
      ).bind(name, message).run();

      return json({
        id: result.meta.last_row_id,
        name,
        message,
        likes: 0,
        created_at: new Date().toISOString()
      }, 201);
    }

    // POST /api/comments/:id/like
    if (parts[0] === 'comments' && parts.length === 3 && parts[2] === 'like' && method === 'POST') {
      const id = Number(parts[1]);
      const result = await env.DB.prepare(
        'UPDATE support_comments SET likes = likes + 1 WHERE id = ?'
      ).bind(id).run();
      if (!result.meta?.changes) return json({ error: 'Comment not found' }, 404);
      const row = await env.DB.prepare('SELECT id, likes FROM support_comments WHERE id = ?').bind(id).first();
      return json(row);
    }

    // DELETE /api/comments/:id
    if (parts[0] === 'comments' && parts.length === 2 && method === 'DELETE') {
      if (!requireAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
      const id = Number(parts[1]);
      const result = await env.DB.prepare('DELETE FROM support_comments WHERE id = ?').bind(id).run();
      if (!result.meta?.changes) return json({ error: 'Comment not found' }, 404);
      return json({ success: true });
    }

    return json({ error: 'Not found', route }, 404);
  } catch (error) {
    console.error('API error:', error);
    return json({ error: 'Internal server error', detail: String(error?.message || error) }, 500);
  }
}
