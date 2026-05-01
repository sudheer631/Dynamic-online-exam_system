/**
 * server.js – Entry point
 * Pure Node.js HTTP server (no Express).
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const authRoute  = require('./routes/auth');
const adminRoute = require('./routes/admin');
const examRoute  = require('./routes/exam');

const PORT   = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

/* ── MIME types ─────────────────────────────────────────── */
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml'
};

/* ── Read & parse JSON body ─────────────────────────────── */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.destroy(); });
    req.on('end',  ()    => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

/* ── Serve static file ──────────────────────────────────── */
function serveFile(res, filePath) {
  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    }
  });
}

/* ── Main request handler ───────────────────────────────── */
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url);
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/';

  // CORS headers (useful for dev)
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // ── API routes ─────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    let body = {};
    if (['POST','PUT','PATCH'].includes(req.method)) body = await readBody(req);

    try {
      let handled = await authRoute.handle(req, res, pathname, body);
      if (!handled) handled = await adminRoute.handle(req, res, pathname, body);
      if (!handled) handled = await examRoute.handle(req, res, pathname, body);
      if (!handled) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API route not found' }));
      }
    } catch (err) {
      console.error('API Error:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
    return;
  }

  // ── Static files ──────────────────────────────────────
  // Map root to login page
  let filePath = '';
  if (pathname === '/') {
    filePath = path.join(PUBLIC, 'html', 'index.html');
  } else {
    // Try exact match under public/
    filePath = path.join(PUBLIC, pathname);
    if (!fs.existsSync(filePath)) {
      // Try under html/ subfolder
      filePath = path.join(PUBLIC, 'html', path.basename(pathname));
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    serveFile(res, filePath);
  } else {
    // SPA fallback
    serveFile(res, path.join(PUBLIC, 'html', 'index.html'));
  }
});

server.listen(PORT, () => {
  console.log(`\n🎓  Exam System running at http://localhost:${PORT}`);
  console.log(`    Admin login: admin / admin123`);
  console.log(`    Student login: alice / student123\n`);
});
