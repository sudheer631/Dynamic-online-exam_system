-- ============================================================
--  Dynamic Online Examination & Result Processing System
--  MySQL Database Schema + Sample Data
-- ============================================================
CREATE DATABASE IF NOT EXISTS exam_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE exam_system;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  full_name  VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  username   VARCHAR(60)  NOT NULL UNIQUE,
  password   VARCHAR(64)  NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(60) NOT NULL UNIQUE,
  password   VARCHAR(64) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exams (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  subject_id       INT          NOT NULL,
  title            VARCHAR(200) NOT NULL,
  description      TEXT,
  duration_mins    INT          NOT NULL DEFAULT 30,
  total_marks      INT          NOT NULL DEFAULT 0,
  pass_marks       INT          NOT NULL DEFAULT 0,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  random_questions TINYINT(1)   NOT NULL DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  exam_id     INT          NOT NULL,
  question    TEXT         NOT NULL,
  option_a    VARCHAR(255) NOT NULL,
  option_b    VARCHAR(255) NOT NULL,
  option_c    VARCHAR(255) NOT NULL,
  option_d    VARCHAR(255) NOT NULL,
  correct_opt CHAR(1)      NOT NULL,
  marks       INT          NOT NULL DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS results (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  exam_id         INT NOT NULL,
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL DEFAULT 0,
  wrong_answers   INT NOT NULL DEFAULT 0,
  score           DECIMAL(5,2) NOT NULL DEFAULT 0,
  percentage      DECIMAL(5,2) NOT NULL DEFAULT 0,
  passed          TINYINT(1)   NOT NULL DEFAULT 0,
  time_taken_secs INT          NOT NULL DEFAULT 0,
  submitted_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (exam_id) REFERENCES exams(id)  ON DELETE CASCADE,
  UNIQUE KEY unique_attempt (user_id, exam_id)
);

CREATE TABLE IF NOT EXISTS answers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  result_id   INT    NOT NULL,
  question_id INT    NOT NULL,
  chosen_opt  CHAR(1),
  is_correct  TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (result_id)   REFERENCES results(id)   ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id         VARCHAR(64) PRIMARY KEY,
  user_id    INT,
  admin_id   INT,
  role       ENUM('student','admin') NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Sample Data ──────────────────────────────────────────────
-- admin / admin123
INSERT INTO admins (username, password) VALUES
('admin','240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9')
ON DUPLICATE KEY UPDATE id=id;

-- alice / student123
INSERT INTO users (full_name, email, username, password) VALUES
('Alice Johnson','alice@example.com','alice',
'1ef7e4e4ec12adb10b0f05d2ae21f2c57afbd2e3c8cd42ef3e5efbb2f02a8ae3')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO subjects (name, description) VALUES
('Mathematics','Algebra, Geometry, Calculus'),
('Science','Physics, Chemistry, Biology'),
('English','Grammar, Comprehension, Literature'),
('Computer Science','Programming, Algorithms, Data Structures')
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO exams (subject_id, title, description, duration_mins, total_marks, pass_marks, is_active) VALUES
(1,'Basic Algebra Quiz','Test your algebra skills',20,10,6,1),
(2,'Physics Fundamentals','Newtons Laws and Kinematics',25,10,6,1),
(4,'JavaScript Basics','Variables loops and functions',30,10,6,1);

INSERT INTO questions (exam_id,question,option_a,option_b,option_c,option_d,correct_opt,marks) VALUES
(1,'Solve 2x+3=7 for x','x=1','x=2','x=3','x=4','b',1),
(1,'Which is a quadratic equation?','2x+1=0','x2+3x+2=0','3x=9','x/2=4','b',1),
(1,'Simplify 3(x+4)-2x','x+12','x+6','5x+12','x+4','a',1),
(1,'Slope of y=3x+5','5','3','3x','1','b',1),
(1,'Solve x2=16','x=4','x=+-4','x=2','x=8','b',1),
(1,'Factor x2-9','(x+3)(x-3)','(x-9)(x+1)','(x+9)(x-1)','(x-3)2','a',1),
(1,'If f(x)=2x+1 find f(3)','5','6','7','8','c',1),
(1,'Value of |-5|','-5','5','25','0','b',1),
(1,'Expand (x+2)2','x2+4','x2+4x+4','x2+2x+4','x2+4x','b',1),
(1,'GCD of 12 and 18','2','3','6','9','c',1),
(2,'SI unit of Force','Joule','Newton','Pascal','Watt','b',1),
(2,'F=ma is Newtons which law','First','Second','Third','Fourth','b',1),
(2,'Speed of light approx','3e6 m/s','3e8 m/s','3e10 m/s','3e4 m/s','b',1),
(2,'Free fall acceleration on Earth','8.9 m/s2','9.8 m/s2','10.8 m/s2','11 m/s2','b',1),
(2,'E=mc2 was given by','Newton','Einstein','Bohr','Faraday','b',1),
(2,'Work = Force times?','Mass','Time','Displacement','Velocity','c',1),
(2,'SI unit of Power','Joule','Newton','Watt','Pascal','c',1),
(2,'Object at rest stays at rest - which law','Second','Third','First','Zeroth','c',1),
(2,'Kinetic energy formula','0.5mv','0.5mv2','mv2','2mv','b',1),
(2,'Wavelength times Frequency equals','Amplitude','Speed','Energy','Momentum','b',1),
(3,'Block-scoped variable keyword','var','let','const','all','b',1),
(3,'typeof null returns','null','object','undefined','string','b',1),
(3,'Which is NOT a JS data type','String','Boolean','Float','Symbol','c',1),
(3,'Output of 2 + 2 in string','4','22','NaN','Error','b',1),
(3,'Arrow function syntax','function()=>{}','()=>{}','=>(){}','func()=>','b',1),
(3,'Method to add at end of array','push','pop','shift','unshift','a',1),
(3,'=== checks','Value only','Type only','Value and type','Neither','c',1),
(3,'Third Promise state besides fulfilled rejected','Done','Waiting','Pending','Settled','c',1),
(3,'DOM stands for','Data Object Model','Document Object Model','Display Object Mode','Dynamic Object Map','b',1),
(3,'JSON.parse converts to','XML','HTML','JS object','Array','c',1);
