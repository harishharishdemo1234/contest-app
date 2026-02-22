const { findOne, insert, update } = require('../db');

const ContestSettings = {
    async findOne() {
        let s = await findOne('settings', { singleton: 'main' });
        if (!s) {
            s = {
                singleton: 'main',
                isActive: false,
                scheduledStart: null,
                contestDuration: 60,
                announcements: [],
                startedAt: null,
                stoppedAt: null
            };
            await insert('settings', s);
        }
        return s;
    },

    async updateOne(data) {
        return await update('settings', { singleton: 'main' }, { $set: data });
    }
};

module.exports = ContestSettings;
