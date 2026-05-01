/**
 * routes/auth.js
 * Handles: /api/register, /api/login, /api/admin/login, /api/logout, /api/me
 */
const crypto = require('crypto');
const db     = require('../db');

const sha256 = t => crypto.createHash('sha256').update(t).digest('hex');

/* ── Generate a secure random session ID ─────────────────── */
function genSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/* ── Create session row in DB, return cookie string ─────── */
async function createSession(userId, adminId, role) {
  const id      = genSessionId();
  const expires = new Date(Date.now() + 8 * 3600 * 1000); // 8 hours
  await db.execute(
    'INSERT INTO sessions (id, user_id, admin_id, role, expires_at) VALUES (?,?,?,?,?)',
    [id, userId || null, adminId || null, role, expires]
  );
  return id;
}

/* ── Parse Cookie header into an object ─────────────────── */
function parseCookies(req) {
  const list = {};
  const header = req.headers.cookie || '';
  header.split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    if (k) list[k.trim()] = decodeURIComponent(v.join('='));
  });
  return list;
}

/* ── Validate session, return { role, userId, adminId } ─── */
async function getSession(req) {
  const cookies = parseCookies(req);
  const sid = cookies['exam_session'];
  if (!sid) return null;
  const [rows] = await db.execute(
    'SELECT * FROM sessions WHERE id=? AND expires_at > NOW()',
    [sid]
  );
  return rows[0] || null;
}

/* ── Route handler ──────────────────────────────────────── */
async function handle(req, res, pathname, body) {
  // POST /api/register
  if (pathname === '/api/register' && req.method === 'POST') {
    const { full_name, email, username, password } = body;
    if (!full_name || !email || !username || !password) {
      return send(res, 400, { error: 'All fields are required' });
    }
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email=? OR username=?', [email, username]
    );
    if (existing.length) return send(res, 409, { error: 'Email or username already taken' });
    await db.execute(
      'INSERT INTO users (full_name, email, username, password) VALUES (?,?,?,?)',
      [full_name.trim(), email.trim().toLowerCase(), username.trim(), sha256(password)]
    );
    return send(res, 201, { message: 'Registration successful' });
  }

  // POST /api/login  (student)
  if (pathname === '/api/login' && req.method === 'POST') {
    const { username, password } = body;
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username=? AND password=?',
      [username, sha256(password)]
    );
    if (!rows.length) return send(res, 401, { error: 'Invalid credentials' });
    const user = rows[0];
    const sid  = await createSession(user.id, null, 'student');
    res.setHeader('Set-Cookie', `exam_session=${sid}; HttpOnly; Path=/; Max-Age=28800`);
    return send(res, 200, { message: 'Login successful', user: { id: user.id, full_name: user.full_name, username: user.username } });
  }

  // POST /api/admin/login
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const { username, password } = body;
    const [rows] = await db.execute(
      'SELECT * FROM admins WHERE username=? AND password=?',
      [username, sha256(password)]
    );
    if (!rows.length) return send(res, 401, { error: 'Invalid admin credentials' });
    const admin = rows[0];
    const sid   = await createSession(null, admin.id, 'admin');
    res.setHeader('Set-Cookie', `exam_session=${sid}; HttpOnly; Path=/; Max-Age=28800`);
    return send(res, 200, { message: 'Admin login successful', admin: { id: admin.id, username: admin.username } });
  }

  // POST /api/logout
  if (pathname === '/api/logout' && req.method === 'POST') {
    const cookies = parseCookies(req);
    if (cookies['exam_session']) {
      await db.execute('DELETE FROM sessions WHERE id=?', [cookies['exam_session']]);
    }
    res.setHeader('Set-Cookie', 'exam_session=; HttpOnly; Path=/; Max-Age=0');
    return send(res, 200, { message: 'Logged out' });
  }

  // GET /api/me
  if (pathname === '/api/me' && req.method === 'GET') {
    const session = await getSession(req);
    if (!session) return send(res, 401, { error: 'Not authenticated' });
    if (session.role === 'student') {
      const [rows] = await db.execute('SELECT id,full_name,username,email,created_at FROM users WHERE id=?', [session.user_id]);
      return send(res, 200, { role: 'student', user: rows[0] });
    } else {
      const [rows] = await db.execute('SELECT id,username,created_at FROM admins WHERE id=?', [session.admin_id]);
      return send(res, 200, { role: 'admin', admin: rows[0] });
    }
  }

  return null; // not handled
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}

module.exports = { handle, getSession, parseCookies };
