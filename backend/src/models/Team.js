const db = require('../db');
const { v4: uuidv4 } = require('uuid');

function toObj(row) {
    if (!row) return null;
    return {
        ...row,
        disqualified: !!row.disqualified,
        submitted: !!row.submitted,
        score: row.score || 0,
        violations: row.violations || 0,
        save: async function () { Team._save(this); }
    };
}

const Team = {
    _save(team) {
        db.prepare(`
            UPDATE teams SET
                teamName=@teamName, leaderName=@leaderName, score=@score,
                disqualified=@disqualified, disqualifiedReason=@disqualifiedReason,
                violations=@violations, startTime=@startTime, endTime=@endTime,
                submitted=@submitted, deviceFingerprint=@deviceFingerprint,
                sessionToken=@sessionToken, updatedAt=datetime('now')
            WHERE email=@email
        `).run({
            ...team,
            disqualified: team.disqualified ? 1 : 0,
            submitted: team.submitted ? 1 : 0
        });
    },

    async findOne(where) {
        const keys = Object.keys(where);
        if (!keys.length) return null;
        const clause = keys.map(k => `${k}=@${k}`).join(' AND ');
        const row = db.prepare(`SELECT * FROM teams WHERE ${clause} LIMIT 1`).get(where);
        return toObj(row);
    },

    async find(where = {}) {
        const keys = Object.keys(where);
        let clause = '1=1';
        if (keys.length) clause = keys.map(k => {
            if (where[k] === true) return `${k}=1`;
            if (where[k] === false) return `${k}=0`;
            if (where[k] !== undefined && typeof where[k] === 'object' && where[k].$gte !== undefined) {
                return `${k}>=${where[k].$gte}`;
            }
            return `${k}=@${k}`;
        }).join(' AND ');

        const params = {};
        keys.forEach(k => {
            if (typeof where[k] !== 'object') params[k] = where[k];
        });

        let rows = db.prepare(`SELECT * FROM teams WHERE ${clause}`).all(params);
        return rows.map(toObj);
    },

    async countDocuments(where = {}) {
        const keys = Object.keys(where);
        let clause = '1=1';
        if (keys.length) clause = keys.map(k => {
            if (where[k] === true) return `${k}=1`;
            if (where[k] === false) return `${k}=0`;
            return `${k}=@${k}`;
        }).join(' AND ');
        const params = {};
        keys.forEach(k => { if (typeof where[k] !== 'object') params[k] = where[k]; });
        const row = db.prepare(`SELECT COUNT(*) as cnt FROM teams WHERE ${clause}`).get(params);
        return row.cnt;
    },

    _new(data) {
        const team = {
            teamName: data.teamName,
            leaderName: data.leaderName,
            email: data.email,
            teamID: data.teamID || ('TEAM-' + uuidv4().slice(0, 8).toUpperCase()),
            score: data.score || 0,
            disqualified: data.disqualified ? 1 : 0,
            disqualifiedReason: data.disqualifiedReason || '',
            violations: data.violations || 0,
            startTime: data.startTime || null,
            endTime: data.endTime || null,
            submitted: data.submitted ? 1 : 0,
            deviceFingerprint: data.deviceFingerprint || '',
            sessionToken: data.sessionToken || ''
        };
        return {
            ...team,
            disqualified: !!team.disqualified,
            submitted: !!team.submitted,
            save: async function () {
                try {
                    db.prepare(`
                        INSERT OR REPLACE INTO teams
                        (teamName,leaderName,email,teamID,score,disqualified,disqualifiedReason,violations,startTime,endTime,submitted,deviceFingerprint,sessionToken)
                        VALUES (@teamName,@leaderName,@email,@teamID,@score,@disqualified,@disqualifiedReason,@violations,@startTime,@endTime,@submitted,@deviceFingerprint,@sessionToken)
                    `).run({ ...team, disqualified: this.disqualified ? 1 : 0, submitted: this.submitted ? 1 : 0, sessionToken: this.sessionToken || '' });
                } catch (err) {
                    if (err.message.includes('UNIQUE')) { const e = new Error('Duplicate'); e.code = 11000; throw e; }
                    throw err;
                }
            }
        };
    }
};

// Proxy so `new Team({...})` works
module.exports = new Proxy(Team, {
    construct(target, args) { return target._new(args[0]); }
});
