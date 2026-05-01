/**
 * routes/exam.js
 * Student-facing exam endpoints.
 */
const db = require('../db');
const { getSession } = require('./auth');

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}

async function requireStudent(req, res) {
  const session = await getSession(req);
  if (!session || session.role !== 'student') {
    send(res, 403, { error: 'Student login required' });
    return null;
  }
  return session;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function handle(req, res, pathname, body) {
  const method = req.method;

  // GET /api/exams  – list active exams for student dashboard
  if (pathname === '/api/exams' && method === 'GET') {
    const session = await requireStudent(req, res);
    if (!session) return true;
    const [rows] = await db.execute(
      `SELECT e.id, e.title, e.description, e.duration_mins, e.total_marks, e.pass_marks,
              s.name AS subject_name,
              (SELECT COUNT(*) FROM questions q WHERE q.exam_id=e.id) AS question_count,
              (SELECT r.id FROM results r WHERE r.user_id=? AND r.exam_id=e.id LIMIT 1) AS already_taken
       FROM exams e JOIN subjects s ON s.id=e.subject_id
       WHERE e.is_active=1 ORDER BY e.created_at DESC`,
      [session.user_id]
    );
    return send(res, 200, rows);
  }

  // GET /api/exams/:id/start  – return questions (strips correct_opt)
  if (pathname.match(/^\/api\/exams\/\d+\/start$/) && method === 'GET') {
    const session = await requireStudent(req, res);
    if (!session) return true;
    const examId = pathname.split('/')[3];

    // Check exam exists & active
    const [examRows] = await db.execute('SELECT * FROM exams WHERE id=? AND is_active=1', [examId]);
    if (!examRows.length) return send(res, 404, { error: 'Exam not found' });
    const exam = examRows[0];

    // Block re-attempts
    const [done] = await db.execute('SELECT id FROM results WHERE user_id=? AND exam_id=?', [session.user_id, examId]);
    if (done.length) return send(res, 409, { error: 'You have already taken this exam' });

    let [questions] = await db.execute(
      'SELECT id,question,option_a,option_b,option_c,option_d,marks FROM questions WHERE exam_id=? ORDER BY id',
      [examId]
    );
    if (exam.random_questions) questions = shuffle(questions);

    return send(res, 200, { exam: { id: exam.id, title: exam.title, duration_mins: exam.duration_mins, total_marks: exam.total_marks, pass_marks: exam.pass_marks }, questions });
  }

  // POST /api/exams/:id/submit
  if (pathname.match(/^\/api\/exams\/\d+\/submit$/) && method === 'POST') {
    const session = await requireStudent(req, res);
    if (!session) return true;
    const examId = pathname.split('/')[3];

    // Prevent double-submit
    const [done] = await db.execute('SELECT id FROM results WHERE user_id=? AND exam_id=?', [session.user_id, examId]);
    if (done.length) return send(res, 409, { error: 'Already submitted' });

    const [examRows] = await db.execute('SELECT * FROM exams WHERE id=?', [examId]);
    if (!examRows.length) return send(res, 404, { error: 'Exam not found' });
    const exam = examRows[0];

    // answers: { questionId: chosenOpt, ... }
    const { answers, time_taken_secs } = body;

    // Fetch correct answers
    const [questions] = await db.execute('SELECT id,correct_opt,marks FROM questions WHERE exam_id=?', [examId]);

    let correct = 0, wrong = 0, score = 0;
    const answerRows = [];
    for (const q of questions) {
      const chosen    = (answers && answers[q.id]) ? answers[q.id].toLowerCase() : null;
      const isCorrect = chosen === q.correct_opt ? 1 : 0;
      if (chosen && isCorrect)        { correct++; score += q.marks; }
      else if (chosen && !isCorrect)  { wrong++; }
      answerRows.push([q.id, chosen, isCorrect]);
    }

    const total      = questions.length;
    const percentage = total > 0 ? ((score / exam.total_marks) * 100).toFixed(2) : 0;
    const passed     = score >= exam.pass_marks ? 1 : 0;

    // Insert result
    const [resInsert] = await db.execute(
      `INSERT INTO results (user_id,exam_id,total_questions,correct_answers,wrong_answers,score,percentage,passed,time_taken_secs)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [session.user_id, examId, total, correct, wrong, score, percentage, passed, time_taken_secs||0]
    );
    const resultId = resInsert.insertId;

    // Insert per-question answers
    for (const [qid, chosen, isCorrect] of answerRows) {
      await db.execute('INSERT INTO answers (result_id,question_id,chosen_opt,is_correct) VALUES (?,?,?,?)',
        [resultId, qid, chosen, isCorrect]);
    }

    return send(res, 200, {
      result: { id: resultId, total_questions: total, correct_answers: correct,
                wrong_answers: wrong, skipped: total - correct - wrong,
                score, total_marks: exam.total_marks, percentage, passed }
    });
  }

  // GET /api/results  – student's own results history
  if (pathname === '/api/results' && method === 'GET') {
    const session = await requireStudent(req, res);
    if (!session) return true;
    const [rows] = await db.execute(
      `SELECT r.*, e.title AS exam_title, e.total_marks, s.name AS subject_name
       FROM results r JOIN exams e ON e.id=r.exam_id JOIN subjects s ON s.id=e.subject_id
       WHERE r.user_id=? ORDER BY r.submitted_at DESC`,
      [session.user_id]
    );
    return send(res, 200, rows);
  }

  // GET /api/results/:id  – single result detail
  if (pathname.match(/^\/api\/results\/\d+$/) && method === 'GET') {
    const session = await requireStudent(req, res);
    if (!session) return true;
    const rid = pathname.split('/').pop();
    const [rows] = await db.execute(
      `SELECT r.*, e.title AS exam_title, e.total_marks, s.name AS subject_name
       FROM results r JOIN exams e ON e.id=r.exam_id JOIN subjects s ON s.id=e.subject_id
       WHERE r.id=? AND r.user_id=?`,
      [rid, session.user_id]
    );
    if (!rows.length) return send(res, 404, { error: 'Result not found' });
    // Fetch answer breakdown
    const [ansRows] = await db.execute(
      `SELECT a.*, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_opt
       FROM answers a JOIN questions q ON q.id=a.question_id WHERE a.result_id=?`,
      [rid]
    );
    return send(res, 200, { result: rows[0], answers: ansRows });
  }

  // GET /api/leaderboard  – top students across all exams
  if (pathname === '/api/leaderboard' && method === 'GET') {
    const session = await requireStudent(req, res);
    if (!session) return true;
    const [rows] = await db.execute(
      `SELECT u.full_name, u.username,
              COUNT(r.id)          AS exams_taken,
              AVG(r.percentage)    AS avg_score,
              SUM(r.passed)        AS total_passed,
              MAX(r.percentage)    AS best_score
       FROM results r JOIN users u ON u.id=r.user_id
       GROUP BY r.user_id ORDER BY avg_score DESC LIMIT 20`
    );
    return send(res, 200, rows);
  }

  return null;
}

module.exports = { handle };
