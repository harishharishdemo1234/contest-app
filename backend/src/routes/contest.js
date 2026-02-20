const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db');
const { evaluateWithTestCases } = require('../utils/codeRunner');

const J = (s) => { try { return JSON.parse(s || '[]') } catch { return [] } };

function getSettings() {
    let s = db.prepare("SELECT * FROM contest_settings WHERE singleton='main' LIMIT 1").get();
    if (!s) {
        db.prepare("INSERT OR IGNORE INTO contest_settings (singleton) VALUES ('main')").run();
        s = db.prepare("SELECT * FROM contest_settings WHERE singleton='main' LIMIT 1").get();
    }
    return { ...s, isActive: !!s.isActive, announcements: J(s.announcements) };
}

function toTeam(row) {
    if (!row) return null;
    return { ...row, disqualified: !!row.disqualified, submitted: !!row.submitted, score: row.score || 0, violations: row.violations || 0 };
}

// GET /api/contest/status
router.get('/status', (req, res) => {
    try {
        const s = getSettings();
        const anns = s.announcements.slice(-5);
        res.json({ isActive: s.isActive, scheduledStart: s.scheduledStart, contestDuration: s.contestDuration, startedAt: s.startedAt, announcements: anns });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/contest/me
router.get('/me', authMiddleware, (req, res) => {
    try {
        const team = toTeam(db.prepare('SELECT * FROM teams WHERE teamID=@teamID LIMIT 1').get({ teamID: req.team.teamID }));
        if (!team) return res.status(404).json({ message: 'Team not found' });
        const { sessionToken, deviceFingerprint, ...safe } = team;
        res.json({ team: safe });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/contest/questions
router.get('/questions', authMiddleware, (req, res) => {
    try {
        const settings = getSettings();
        if (!settings.isActive) return res.status(403).json({ message: 'Contest has not started yet' });

        const rows = db.prepare('SELECT * FROM questions ORDER BY section ASC, orderNum ASC').all();
        const sanitized = rows.map(q => ({
            questionID: q.questionID,
            type: q.type,
            section: q.section,
            order: q.orderNum,
            questionText: q.questionText,
            options: J(q.options),
            marks: q.marks,
            starterCode: q.starterCode || '',
            testCasesCount: J(q.testCases).length
        }));
        res.json({ questions: sanitized });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/contest/drafts
router.get('/drafts', authMiddleware, (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM submissions WHERE teamID=@teamID').all({ teamID: req.team.teamID });
        const drafts = {};
        rows.forEach(s => {
            drafts[s.questionID] = {
                code: s.code, selectedOption: s.selectedOption,
                output: s.output, marks: s.marks, evaluated: !!s.evaluated
            };
        });
        res.json({ drafts });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/contest/save-draft
router.post('/save-draft', authMiddleware, (req, res) => {
    try {
        const { questionID, code, selectedOption } = req.body;
        const team = toTeam(db.prepare('SELECT * FROM teams WHERE teamID=@teamID LIMIT 1').get({ teamID: req.team.teamID }));
        if (!team || team.submitted) return res.status(400).json({ message: 'Already submitted' });

        const question = db.prepare('SELECT * FROM questions WHERE questionID=@questionID LIMIT 1').get({ questionID });
        if (!question) return res.status(404).json({ message: 'Question not found' });

        db.prepare(`
            INSERT INTO submissions (teamID, questionID, type, code, selectedOption, maxMarks)
            VALUES (@teamID, @questionID, @type, @code, @selectedOption, @maxMarks)
            ON CONFLICT(teamID, questionID) DO UPDATE SET
                code=excluded.code, selectedOption=excluded.selectedOption,
                updatedAt=datetime('now')
        `).run({
            teamID: req.team.teamID, questionID,
            type: question.type,
            code: code || '',
            selectedOption: selectedOption || '',
            maxMarks: question.marks
        });
        res.json({ message: 'Draft saved' });
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// POST /api/contest/submit
router.post('/submit', authMiddleware, async (req, res) => {
    try {
        const team = toTeam(db.prepare('SELECT * FROM teams WHERE teamID=@teamID LIMIT 1').get({ teamID: req.team.teamID }));
        if (!team) return res.status(404).json({ message: 'Team not found' });
        if (team.submitted) {
            const sub = db.prepare('SELECT SUM(marks) as total FROM submissions WHERE teamID=@teamID').get({ teamID: team.teamID });
            return res.json({ message: 'Already submitted', score: sub?.total || 0 });
        }

        const questions = db.prepare('SELECT * FROM questions').all();
        const submissions = db.prepare('SELECT * FROM submissions WHERE teamID=@teamID').all({ teamID: req.team.teamID });
        let totalScore = 0;

        for (const question of questions) {
            let sub = submissions.find(s => s.questionID === question.questionID);
            let marks = 0;
            let output = '';
            let testResults = [];

            if (question.type === 'mcq') {
                const correctAnswer = question.correctAnswer;
                const selected = sub?.selectedOption || '';
                if (selected !== '' && selected === correctAnswer) marks = question.marks;
                output = selected;
            } else if (sub?.code?.trim()) {
                const tcs = J(question.testCases);
                if (tcs.length > 0) {
                    const evalResult = await evaluateWithTestCases(sub.code, tcs, question.marks);
                    marks = evalResult.marksEarned;
                    output = evalResult.results.map(r => `TC: ${r.passed ? 'PASS' : 'FAIL'} | Expected: ${r.expected} | Got: ${r.got}`).join('\n');
                    testResults = evalResult.results;
                }
            }

            totalScore += marks;

            if (sub) {
                db.prepare(`
                    UPDATE submissions SET marks=@marks, output=@output, testResults=@testResults, evaluated=1, updatedAt=datetime('now')
                    WHERE teamID=@teamID AND questionID=@questionID
                `).run({ marks, output, testResults: JSON.stringify(testResults), teamID: req.team.teamID, questionID: question.questionID });
            } else {
                db.prepare(`
                    INSERT OR IGNORE INTO submissions (teamID, questionID, type, code, selectedOption, output, marks, maxMarks, testResults, evaluated)
                    VALUES (@teamID, @questionID, @type, '', '', @output, @marks, @maxMarks, @testResults, 1)
                `).run({ teamID: req.team.teamID, questionID: question.questionID, type: question.type, output, marks, maxMarks: question.marks, testResults: JSON.stringify(testResults) });
            }
        }

        db.prepare("UPDATE teams SET score=@score, submitted=1, endTime=datetime('now') WHERE teamID=@teamID").run({ score: totalScore, teamID: req.team.teamID });

        const io = req.app.get('io');
        io.emit('score_update', { teamID: req.team.teamID, score: totalScore });

        res.json({ message: 'Submitted successfully', score: totalScore });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during submission' });
    }
});

// POST /api/contest/violation
router.post('/violation', authMiddleware, (req, res) => {
    try {
        const { type } = req.body;
        const team = toTeam(db.prepare('SELECT * FROM teams WHERE teamID=@teamID LIMIT 1').get({ teamID: req.team.teamID }));
        if (!team || team.submitted) return res.json({ message: 'Already resolved' });

        const newViolations = (team.violations || 0) + 1;
        if (newViolations >= 2) {
            const reason = `Auto-disqualified: ${type || 'violation'} (2nd offense)`;
            db.prepare("UPDATE teams SET violations=@v, disqualified=1, disqualifiedReason=@r, submitted=1, endTime=datetime('now') WHERE teamID=@teamID")
                .run({ v: newViolations, r: reason, teamID: req.team.teamID });
            const io = req.app.get('io');
            io.to(`team_${req.team.teamID}`).emit('disqualified', { reason });
            return res.json({ violations: newViolations, disqualified: true, message: 'Disqualified' });
        }

        db.prepare('UPDATE teams SET violations=@v WHERE teamID=@teamID').run({ v: newViolations, teamID: req.team.teamID });
        res.json({ violations: newViolations, disqualified: false, message: 'Warning issued' });
    } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
