const db = require('../db');

function toObj(row) {
    if (!row) return null;
    return {
        ...row,
        isActive: !!row.isActive,
        contestDuration: row.contestDuration || 60,
        announcements: JSON.parse(row.announcements || '[]'),
        save: async function () { ContestSettings._save(this); }
    };
}

const ContestSettings = {
    _save(s) {
        db.prepare(`
            UPDATE contest_settings SET
                isActive=@isActive, scheduledStart=@scheduledStart, contestDuration=@contestDuration,
                announcements=@announcements, startedAt=@startedAt, stoppedAt=@stoppedAt,
                updatedAt=datetime('now')
            WHERE singleton='main'
        `).run({
            isActive: s.isActive ? 1 : 0,
            scheduledStart: s.scheduledStart || null,
            contestDuration: s.contestDuration || 60,
            announcements: JSON.stringify(s.announcements || []),
            startedAt: s.startedAt || null,
            stoppedAt: s.stoppedAt || null
        });
    },

    async findOne(where) {
        const row = db.prepare("SELECT * FROM contest_settings WHERE singleton='main' LIMIT 1").get();
        return toObj(row);
    },

    async create(data) {
        db.prepare(`
            INSERT OR IGNORE INTO contest_settings (singleton, contestDuration)
            VALUES ('main', 60)
        `).run();
        return toObj(db.prepare("SELECT * FROM contest_settings WHERE singleton='main'").get());
    }
};

module.exports = ContestSettings;
