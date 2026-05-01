# 🎓 ExamPro – Dynamic Online Examination & Result Processing System

A full-stack online exam system built with **pure Node.js** (no Express), **Vanilla JavaScript** frontend, and **MySQL** database.

---

## 📋 Tech Stack

| Layer    | Technology                     |
|----------|-------------------------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript|
| Backend  | Node.js (http, fs, url, crypto)|
| Database | MySQL 8.x                     |
| Package  | mysql2 (only dependency)      |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v18+ → https://nodejs.org
- MySQL 8.x → https://dev.mysql.com/downloads/

### 2. Clone / Extract the project
```bash
cd exam-system
```

### 3. Install the single dependency
```bash
npm install
```

### 4. Set up the database
```sql
-- In MySQL client / Workbench / phpMyAdmin:
SOURCE database.sql;
```
Or via CLI:
```bash
mysql -u root -p < database.sql
```

### 5. Configure database credentials (optional)
Edit `db.js` defaults, or set environment variables:
```bash
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=yourpassword
export DB_NAME=exam_system
```

### 6. Start the server
```bash
npm start
# Server starts at http://localhost:3000
```

---

## 🔑 Default Login Credentials

| Role    | Username | Password   |
|---------|----------|------------|
| Admin   | admin    | admin123   |
| Student | alice    | student123 |

---

## 📁 Project Structure

```
exam-system/
├── server.js              # Main HTTP server (no Express)
├── db.js                  # MySQL connection pool
├── package.json
├── database.sql           # Complete schema + sample data
├── README.md
├── routes/
│   ├── auth.js            # Login, register, session mgmt
│   ├── admin.js           # All admin API endpoints
│   └── exam.js            # Student exam endpoints
└── public/
    ├── html/
    │   ├── index.html     # Landing page
    │   ├── login.html     # Student login
    │   ├── register.html  # Student registration
    │   ├── admin-login.html
    │   ├── dashboard.html # Student dashboard
    │   ├── exam.html      # Exam taking interface
    │   ├── result.html    # Result with breakdown
    │   └── admin.html     # Admin panel
    └── css/
        └── main.css       # All styles
```

---

## 🌐 Available Pages

| URL                   | Description                  |
|-----------------------|------------------------------|
| `/`                   | Landing page                 |
| `/login.html`         | Student login                |
| `/register.html`      | Student registration         |
| `/dashboard.html`     | Student dashboard            |
| `/exam.html?id=1`     | Take exam #1                 |
| `/result.html?id=1`   | View result #1               |
| `/admin-login.html`   | Admin login                  |
| `/admin.html`         | Admin panel                  |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint           | Description          |
|--------|--------------------|----------------------|
| POST   | /api/register      | Student registration |
| POST   | /api/login         | Student login        |
| POST   | /api/admin/login   | Admin login          |
| POST   | /api/logout        | Logout               |
| GET    | /api/me            | Get current user     |

### Student
| Method | Endpoint                    | Description         |
|--------|-----------------------------|---------------------|
| GET    | /api/exams                  | List active exams   |
| GET    | /api/exams/:id/start        | Start an exam       |
| POST   | /api/exams/:id/submit       | Submit answers      |
| GET    | /api/results                | My results history  |
| GET    | /api/results/:id            | Detailed result     |
| GET    | /api/leaderboard            | Global leaderboard  |

### Admin
| Method | Endpoint                         | Description         |
|--------|----------------------------------|---------------------|
| GET    | /api/admin/analytics             | Dashboard stats     |
| CRUD   | /api/admin/subjects              | Manage subjects     |
| CRUD   | /api/admin/exams                 | Manage exams        |
| CRUD   | /api/admin/exams/:id/questions   | Manage questions    |
| DELETE | /api/admin/questions/:id         | Delete question     |
| GET    | /api/admin/students              | List students       |
| GET    | /api/admin/results               | All results         |

---

## ✨ Features

- ✅ Student registration & login (SHA-256 passwords)
- ✅ Admin login with separate panel
- ✅ Session-based auth via HttpOnly cookies
- ✅ Create/edit/delete subjects, exams, questions
- ✅ Timed exam with countdown (auto-submit on expire)
- ✅ One question at a time with Previous/Next navigation
- ✅ Question progress dots
- ✅ Anti-cheat: tab-switch warning, back-button block
- ✅ Instant result with ring animation
- ✅ Per-question answer breakdown (correct/wrong/skipped)
- ✅ Exam history with score bars
- ✅ Global leaderboard
- ✅ Admin analytics dashboard
- ✅ Randomize question order per exam
- ✅ Responsive design (mobile-friendly)
- ✅ Dark theme UI

---

## 🛡️ Security Notes

- Passwords hashed with SHA-256 (upgrade to bcrypt for production)
- Sessions stored in DB with 8-hour expiry
- HttpOnly cookies prevent XSS session theft
- Admin routes protected with role checks
- SQL injection prevented via parameterized queries

---

## 🔧 Customization

- **Port**: Set `PORT` environment variable (default: 3000)
- **Session duration**: Edit `8 * 3600 * 1000` in `routes/auth.js`
- **DB credentials**: Edit defaults in `db.js` or use env vars
