const { findOne, find, insert, update, remove, count } = require('../db');
const { v4: uuidv4 } = require('uuid');

const Team = {
    async findOne(where) {
        return await findOne('teams', where);
    },

    async find(where = {}, sort = { score: -1 }) {
        return await find('teams', where, sort);
    },

    async countDocuments(where = {}) {
        return await count('teams', where);
    },

    async updateOne(where, data, opts = {}) {
        return await update('teams', where, data, opts);
    },

    async create(data) {
        const teamID = data.teamID || ('TEAM-' + uuidv4().slice(0, 8).toUpperCase());
        const newTeam = {
            teamName: data.teamName,
            leaderName: data.leaderName,
            email: data.email,
            teamID,
            score: data.score || 0,
            disqualified: !!data.disqualified,
            disqualifiedReason: data.disqualifiedReason || '',
            violations: data.violations || 0,
            startTime: data.startTime || new Date().toISOString(),
            endTime: data.endTime || null,
            submitted: !!data.submitted,
            deviceFingerprint: data.deviceFingerprint || '',
            sessionToken: data.sessionToken || '',
            createdAt: new Date().toISOString()
        };
        return await insert('teams', newTeam);
    }
};

module.exports = Team;
