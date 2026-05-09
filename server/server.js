const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-me';

// Middleware
app.use(cors());
app.use(express.json());

// База данных
const db = new sqlite3('salary.db');

// Создание таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    week_id TEXT NOT NULL,
    entries TEXT DEFAULT '[]',
    overtime_carry REAL DEFAULT 0,
    custom_label TEXT,
    week_note TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, week_id)
  );

  CREATE TABLE IF NOT EXISTS config (
    user_id INTEGER PRIMARY KEY,
    rate REAL DEFAULT 650,
    overtime_rate REAL DEFAULT 300,
    overtime_hours REAL DEFAULT 4,
    goal REAL DEFAULT 0,
    theme TEXT DEFAULT 'dark',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// JWT Middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// Регистрация
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }

  if (username.length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Логин минимум 3 символа, пароль минимум 4' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);

    // Создаём дефолтный конфиг
    db.prepare('INSERT INTO config (user_id) VALUES (?)').run(result.lastInsertRowid);

    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ token, userId: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(400).json({ error: 'Неверный логин или пароль' });

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: 'Неверный логин или пароль' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, userId: user.id });
});

// Получение данных
app.get('/api/data', authenticate, (req, res) => {
  const weeks = db.prepare('SELECT * FROM weeks WHERE user_id = ?').all(req.userId);
  const config = db.prepare('SELECT * FROM config WHERE user_id = ?').get(req.userId);

  const data = {
    weeks: {},
    customWeekLabels: {},
    weekNotes: {},
    config: {}
  };

  weeks.forEach(w => {
    data.weeks[w.week_id] = {
      entries: JSON.parse(w.entries),
      overtimeCarry: w.overtime_carry
    };
    if (w.custom_label) data.customWeekLabels[w.week_id] = w.custom_label;
    if (w.week_note) data.weekNotes[w.week_id] = w.week_note;
  });

  if (config) {
    data.config = {
      rate: config.rate,
      overtimeRate: config.overtime_rate,
      overtimeHours: config.overtime_hours,
      goal: config.goal,
      theme: config.theme
    };
  }

  res.json(data);
});

// Сохранение данных
app.post('/api/data', authenticate, (req, res) => {
  const { weeks, customWeekLabels, weekNotes, config } = req.body;

  const transaction = db.transaction(() => {
    // Удаляем старые записи
    db.prepare('DELETE FROM weeks WHERE user_id = ?').run(req.userId);

    // Сохраняем недели
    const insertWeek = db.prepare(`
      INSERT OR REPLACE INTO weeks (user_id, week_id, entries, overtime_carry, custom_label, week_note)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const [wid, weekData] of Object.entries(weeks || {})) {
      insertWeek.run(
        req.userId,
        wid,
        JSON.stringify(weekData.entries || []),
        weekData.overtimeCarry || 0,
        customWeekLabels?.[wid] || null,
        weekNotes?.[wid] || null
      );
    }

    // Сохраняем конфиг
    if (config) {
      db.prepare(`
        INSERT OR REPLACE INTO config (user_id, rate, overtime_rate, overtime_hours, goal, theme)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        req.userId,
        config.rate || 650,
        config.overtimeRate || 300,
        config.overtimeHours || 4,
        config.goal || 0,
        config.theme || 'dark'
      );
    }
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});