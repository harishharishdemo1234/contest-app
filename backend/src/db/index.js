const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'contest.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== CREATE TABLES =====
db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
        teamName TEXT NOT NULL,
        leaderName TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        teamID TEXT NOT NULL UNIQUE,
        score INTEGER DEFAULT 0,
        disqualified INTEGER DEFAULT 0,
        disqualifiedReason TEXT DEFAULT '',
        violations INTEGER DEFAULT 0,
        startTime TEXT,
        endTime TEXT,
        submitted INTEGER DEFAULT 0,
        deviceFingerprint TEXT DEFAULT '',
        sessionToken TEXT DEFAULT '',
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questions (
        questionID TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        section INTEGER NOT NULL,
        orderNum INTEGER NOT NULL,
        questionText TEXT NOT NULL,
        options TEXT DEFAULT '[]',
        correctAnswer TEXT DEFAULT '',
        starterCode TEXT DEFAULT '',
        testCases TEXT DEFAULT '[]',
        marks INTEGER NOT NULL,
        hint TEXT DEFAULT '',
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teamID TEXT NOT NULL,
        questionID TEXT NOT NULL,
        type TEXT NOT NULL,
        code TEXT DEFAULT '',
        selectedOption TEXT DEFAULT '',
        output TEXT DEFAULT '',
        marks INTEGER DEFAULT 0,
        maxMarks INTEGER DEFAULT 0,
        testResults TEXT DEFAULT '[]',
        evaluated INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now')),
        UNIQUE(teamID, questionID)
    );

    CREATE TABLE IF NOT EXISTS contest_settings (
        singleton TEXT NOT NULL UNIQUE DEFAULT 'main',
        isActive INTEGER DEFAULT 0,
        scheduledStart TEXT,
        contestDuration INTEGER DEFAULT 60,
        announcements TEXT DEFAULT '[]',
        startedAt TEXT,
        stoppedAt TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        updatedAt TEXT DEFAULT (datetime('now'))
    );
`);

// Ensure default settings row exists
const existing = db.prepare("SELECT * FROM contest_settings WHERE singleton = 'main'").get();
if (!existing) {
    db.prepare("INSERT OR IGNORE INTO contest_settings (singleton) VALUES ('main')").run();
}

console.log('SQLite database initialized:', DB_PATH);

module.exports = db;
