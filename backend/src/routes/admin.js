const express = require('express');
const router = express.Router();
const adminMiddleware = require('../middleware/adminMiddleware');
const db = require('../db');
const XLSX = require('xlsx');

const J = (s) => { try { return JSON.parse(s || '[]') } catch { return [] } };

function toTeam(row) {
    if (!row) return null;
    return { ...row, disqualified: !!row.disqualified, submitted: !!row.submitted, score: row.score || 0, violations: row.violations || 0 };
}

function getSettings() {
    let s = db.prepare("SELECT * FROM contest_settings WHERE singleton='main' LIMIT 1").get();
    if (!s) {
        db.prepare("INSERT OR IGNORE INTO contest_settings (singleton) VALUES ('main')").run();
        s = db.prepare("SELECT * FROM contest_settings WHERE singleton='main' LIMIT 1").get();
    }
    return { ...s, isActive: !!s.isActive, announcements: J(s.announcements) };
}

function saveSettings(s) {
    db.prepare(`
        UPDATE contest_settings SET isActive=@isActive, scheduledStart=@scheduledStart,
        contestDuration=@contestDuration, announcements=@announcements,
        startedAt=@startedAt, stoppedAt=@stoppedAt, updatedAt=datetime('now')
        WHERE singleton='main'
    `).run({
        isActive: s.isActive ? 1 : 0,
        scheduledStart: s.scheduledStart || null,
        contestDuration: s.contestDuration || 60,
        announcements: JSON.stringify(s.announcements || []),
        startedAt: s.startedAt || null,
        stoppedAt: s.stoppedAt || null
    });
}

// GET /api/admin/teams
router.get('/teams', adminMiddleware, (req, res) => {
    try {
        const { search, disqualified } = req.query;
        let sql = 'SELECT * FROM teams WHERE 1=1';
        const params = {};

        if (search) {
            sql += ` AND (teamName LIKE @search OR email LIKE @search OR leaderName LIKE @search)`;
            params.search = `%${search}%`;
        }
        if (disqualified !== undefined) {
            sql += ` AND disqualified=@dq`;
            params.dq = disqualified === 'true' ? 1 : 0;
        }
        sql += ' ORDER BY score DESC';

        const teams = db.prepare(sql).all(params).map(toTeam);
        res.json({ teams });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/admin/leaderboard
router.get('/leaderboard', adminMiddleware, (req, res) => {
    try {
        const teams = db.prepare('SELECT * FROM teams WHERE submitted=1 ORDER BY score DESC, endTime ASC').all();
        const lb = teams.map((t, i) => ({
            rank: i + 1, teamName: t.teamName, leaderName: t.leaderName, email: t.email,
            teamID: t.teamID, score: t.score, disqualified: !!t.disqualified, endTime: t.endTime
        }));
        res.json({ leaderboard: lb });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/admin/team/:teamID/submissions
router.get('/team/:teamID/submissions', adminMiddleware, (req, res) => {
    try {
        const team = toTeam(db.prepare('SELECT * FROM teams WHERE teamID=@teamID LIMIT 1').get({ teamID: req.params.teamID }));
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const rows = db.prepare('SELECT * FROM submissions WHERE teamID=@teamID ORDER BY questionID ASC').all({ teamID: req.params.teamID });
        const submissions = rows.map(r => ({ ...r, evaluated: !!r.evaluated, testResults: J(r.testResults) }));

        const qRows = db.prepare('SELECT * FROM questions ORDER BY section ASC, orderNum ASC').all();
        const questions = qRows.map(q => ({ ...q, order: q.orderNum, options: J(q.options), testCases: J(q.testCases) }));

        res.json({ team, submissions, questions });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/admin/export
router.get('/export', adminMiddleware, (req, res) => {
    try {
        const teams = db.prepare('SELECT * FROM teams ORDER BY score DESC').all().map(toTeam);
        const data = teams.map((t, i) => ({
            Rank: i + 1, 'Team Name': t.teamName, 'Leader Name': t.leaderName,
            Email: t.email, 'Team ID': t.teamID, Score: t.score,
            'Submit Status': t.submitted ? 'Submitted' : 'Not Submitted',
            Disqualified: t.disqualified ? 'Yes' : 'No',
            'Disqualification Reason': t.disqualifiedReason || '',
            Violations: t.violations || 0,
            'Start Time': t.startTime ? new Date(t.startTime).toLocaleString() : '',
            'End Time': t.endTime ? new Date(t.endTime).toLocaleString() : ''
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Results');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="contest_results.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/admin/contest/start
router.post('/contest/start', adminMiddleware, (req, res) => {
    try {
        const { scheduledStart, duration } = req.body;
        const settings = getSettings();
        settings.isActive = true;
        settings.startedAt = scheduledStart ? new Date(scheduledStart).toISOString() : new Date().toISOString();
        settings.scheduledStart = scheduledStart ? new Date(scheduledStart).toISOString() : null;
        settings.stoppedAt = null;
        if (duration) settings.contestDuration = Number(duration);
        saveSettings(settings);
        const io = req.app.get('io');
        io.emit('contest_started', { startedAt: settings.startedAt, duration: settings.contestDuration });
        res.json({ message: 'Contest started', settings });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// POST /api/admin/contest/stop
router.post('/contest/stop', adminMiddleware, (req, res) => {
    try {
        const settings = getSettings();
        settings.isActive = false;
        settings.stoppedAt = new Date().toISOString();
        saveSettings(settings);
        const io = req.app.get('io');
        io.emit('contest_stopped', { stoppedAt: settings.stoppedAt });
        res.json({ message: 'Contest stopped' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/admin/announce
router.post('/announce', adminMiddleware, (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ message: 'Announcement cannot be empty' });
        const settings = getSettings();
        const ann = { message: message.trim(), createdAt: new Date().toISOString() };
        settings.announcements.push(ann);
        if (settings.announcements.length > 50) settings.announcements.shift();
        saveSettings(settings);
        const io = req.app.get('io');
        io.emit('announcement', ann);
        res.json({ message: 'Announcement sent', announcement: ann });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/admin/disqualify/:teamID
router.post('/disqualify/:teamID', adminMiddleware, (req, res) => {
    try {
        const team = db.prepare('SELECT * FROM teams WHERE teamID=@teamID LIMIT 1').get({ teamID: req.params.teamID });
        if (!team) return res.status(404).json({ message: 'Team not found' });
        db.prepare("UPDATE teams SET disqualified=1, disqualifiedReason=@reason WHERE teamID=@teamID").run({
            teamID: req.params.teamID,
            reason: req.body.reason || 'Manual disqualification by admin'
        });
        res.json({ message: 'Team disqualified' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/admin/stats
router.get('/stats', adminMiddleware, (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as cnt FROM teams').get().cnt;
        const submitted = db.prepare('SELECT COUNT(*) as cnt FROM teams WHERE submitted=1').get().cnt;
        const disqualified = db.prepare('SELECT COUNT(*) as cnt FROM teams WHERE disqualified=1').get().cnt;
        const settings = getSettings();
        res.json({ total, submitted, disqualified, isActive: settings.isActive, startedAt: settings.startedAt, duration: settings.contestDuration });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
