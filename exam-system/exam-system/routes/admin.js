/**
 * routes/admin.js
 * All admin-only API endpoints.
 */
const db = require('../db');
const { getSession } = require('./auth');

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}

async function requireAdmin(req, res) {
  const session = await getSession(req);
  if (!session || session.role !== 'admin') {
    send(res, 403, { error: 'Admin access required' });
    return null;
  }
  return session;
}

async function handle(req, res, pathname, body) {
  const method = req.method;

  // ── Subjects ───────────────────────────────────────────────
  if (pathname === '/api/admin/subjects' && method === 'GET') {
    if (!await requireAdmin(req, res)) return true;
    const [rows] = await db.execute('SELECT * FROM subjects ORDER BY name');
    return send(res, 200, rows);
  }
  if (pathname === '/api/admin/subjects' && method === 'POST') {
    if (!await requireAdmin(req, res)) return true;
    const { name, description } = body;
    if (!name) return send(res, 400, { error: 'Subject name required' });
    await db.execute('INSERT INTO subjects (name, description) VALUES (?,?)', [name.trim(), description || '']);
    return send(res, 201, { message: 'Subject created' });
  }
  if (pathname.match(/^\/api\/admin\/subjects\/\d+$/) && method === 'DELETE') {
    if (!await requireAdmin(req, res)) return true;
    const id = pathname.split('/').pop();
    await db.execute('DELETE FROM subjects WHERE id=?', [id]);
    return send(res, 200, { message: 'Subject deleted' });
  }

  // ── Exams ──────────────────────────────────────────────────
  if (pathname === '/api/admin/exams' && method === 'GET') {
    if (!await requireAdmin(req, res)) return true;
    const [rows] = await db.execute(
      `SELECT e.*, s.name AS subject_name,
        (SELECT COUNT(*) FROM questions q WHERE q.exam_id=e.id) AS question_count
       FROM exams e JOIN subjects s ON s.id=e.subject_id ORDER BY e.created_at DESC`
    );
    return send(res, 200, rows);
  }
  if (pathname === '/api/admin/exams' && method === 'POST') {
    if (!await requireAdmin(req, res)) return true;
    const { subject_id, title, description, duration_mins, pass_marks, is_active, random_questions } = body;
    if (!subject_id || !title) return send(res, 400, { error: 'subject_id and title required' });
    await db.execute(
      'INSERT INTO exams (subject_id,title,description,duration_mins,pass_marks,is_active,random_questions) VALUES (?,?,?,?,?,?,?)',
      [subject_id, title.trim(), description||'', duration_mins||30, pass_marks||6, is_active?1:0, random_questions?1:0]
    );
    return send(res, 201, { message: 'Exam created' });
  }
  if (pathname.match(/^\/api\/admin\/exams\/\d+$/) && method === 'PUT') {
    if (!await requireAdmin(req, res)) return true;
    const id = pathname.split('/').pop();
    const { title, description, duration_mins, pass_marks, is_active, random_questions } = body;
    await db.execute(
      'UPDATE exams SET title=?,description=?,duration_mins=?,pass_marks=?,is_active=?,random_questions=? WHERE id=?',
      [title, description||'', duration_mins, pass_marks, is_active?1:0, random_questions?1:0, id]
    );
    return send(res, 200, { message: 'Exam updated' });
  }
  if (pathname.match(/^\/api\/admin\/exams\/\d+$/) && method === 'DELETE') {
    if (!await requireAdmin(req, res)) return true;
    const id = pathname.split('/').pop();
    await db.execute('DELETE FROM exams WHERE id=?', [id]);
    return send(res, 200, { message: 'Exam deleted' });
  }

  // ── Questions ──────────────────────────────────────────────
  if (pathname.match(/^\/api\/admin\/exams\/\d+\/questions$/) && method === 'GET') {
    if (!await requireAdmin(req, res)) return true;
    const examId = pathname.split('/')[4];
    const [rows] = await db.execute('SELECT * FROM questions WHERE exam_id=? ORDER BY id', [examId]);
    return send(res, 200, rows);
  }
  if (pathname.match(/^\/api\/admin\/exams\/\d+\/questions$/) && method === 'POST') {
    if (!await requireAdmin(req, res)) return true;
    const examId = pathname.split('/')[4];
    const { question, option_a, option_b, option_c, option_d, correct_opt, marks } = body;
    if (!question || !option_a || !option_b || !option_c || !option_d || !correct_opt)
      return send(res, 400, { error: 'All question fields required' });
    const [result] = await db.execute(
      'INSERT INTO questions (exam_id,question,option_a,option_b,option_c,option_d,correct_opt,marks) VALUES (?,?,?,?,?,?,?,?)',
      [examId, question, option_a, option_b, option_c, option_d, correct_opt.toLowerCase(), marks||1]
    );
    // Recalc total_marks
    const [qrows] = await db.execute('SELECT SUM(marks) AS total FROM questions WHERE exam_id=?', [examId]);
    await db.execute('UPDATE exams SET total_marks=? WHERE id=?', [qrows[0].total||0, examId]);
    return send(res, 201, { message: 'Question added', id: result.insertId });
  }
  if (pathname.match(/^\/api\/admin\/questions\/\d+$/) && method === 'PUT') {
    if (!await requireAdmin(req, res)) return true;
    const qid = pathname.split('/').pop();
    const { question, option_a, option_b, option_c, option_d, correct_opt, marks } = body;
    await db.execute(
      'UPDATE questions SET question=?,option_a=?,option_b=?,option_c=?,option_d=?,correct_opt=?,marks=? WHERE id=?',
      [question, option_a, option_b, option_c, option_d, correct_opt.toLowerCase(), marks||1, qid]
    );
    return send(res, 200, { message: 'Question updated' });
  }
  if (pathname.match(/^\/api\/admin\/questions\/\d+$/) && method === 'DELETE') {
    if (!await requireAdmin(req, res)) return true;
    const qid = pathname.split('/').pop();
    const [qrow] = await db.execute('SELECT exam_id FROM questions WHERE id=?', [qid]);
    await db.execute('DELETE FROM questions WHERE id=?', [qid]);
    if (qrow.length) {
      const eid = qrow[0].exam_id;
      const [s] = await db.execute('SELECT SUM(marks) AS total FROM questions WHERE exam_id=?', [eid]);
      await db.execute('UPDATE exams SET total_marks=? WHERE id=?', [s[0].total||0, eid]);
    }
    return send(res, 200, { message: 'Question deleted' });
  }

  // ── Students list ──────────────────────────────────────────
  if (pathname === '/api/admin/students' && method === 'GET') {
    if (!await requireAdmin(req, res)) return true;
    const [rows] = await db.execute(
      `SELECT u.id, u.full_name, u.username, u.email, u.created_at,
         COUNT(r.id) AS exams_taken
       FROM users u LEFT JOIN results r ON r.user_id=u.id
       GROUP BY u.id ORDER BY u.created_at DESC`
    );
    return send(res, 200, rows);
  }

  // ── Results ────────────────────────────────────────────────
  if (pathname === '/api/admin/results' && method === 'GET') {
    if (!await requireAdmin(req, res)) return true;
    const [rows] = await db.execute(
      `SELECT r.*, u.full_name, u.username, e.title AS exam_title, s.name AS subject_name
       FROM results r
       JOIN users u ON u.id=r.user_id
       JOIN exams  e ON e.id=r.exam_id
       JOIN subjects s ON s.id=e.subject_id
       ORDER BY r.submitted_at DESC`
    );
    return send(res, 200, rows);
  }

  // ── Analytics ──────────────────────────────────────────────
  if (pathname === '/api/admin/analytics' && method === 'GET') {
    if (!await requireAdmin(req, res)) return true;
    const [[{ students }]]  = await db.execute('SELECT COUNT(*) AS students FROM users');
    const [[{ exams }]]     = await db.execute('SELECT COUNT(*) AS exams FROM exams');
    const [[{ questions }]] = await db.execute('SELECT COUNT(*) AS questions FROM questions');
    const [[{ attempts }]]  = await db.execute('SELECT COUNT(*) AS attempts FROM results');
    const [[{ avg_pct }]]   = await db.execute('SELECT AVG(percentage) AS avg_pct FROM results');
    const [topStudents]     = await db.execute(
      `SELECT u.full_name, u.username, AVG(r.percentage) AS avg_score, COUNT(r.id) AS exams_taken
       FROM results r JOIN users u ON u.id=r.user_id
       GROUP BY r.user_id ORDER BY avg_score DESC LIMIT 5`
    );
    const [examStats] = await db.execute(
      `SELECT e.title, COUNT(r.id) AS attempts, AVG(r.percentage) AS avg_pct,
              SUM(r.passed) AS passed_count
       FROM exams e LEFT JOIN results r ON r.exam_id=e.id
       GROUP BY e.id ORDER BY attempts DESC`
    );
    return send(res, 200, { students, exams, questions, attempts, avg_pct: avg_pct||0, topStudents, examStats });
  }

  return null; // not handled here
}

module.exports = { handle };
