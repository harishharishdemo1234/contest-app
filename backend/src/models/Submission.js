const { findOne, find, insert, update, remove } = require('../db');

const Submission = {
    async find(where = {}, sort = { questionID: 1 }) {
        return await find('submissions', where, sort);
    },

    async findOne(where) {
        return await findOne('submissions', where);
    },

    async updateOne(where, data, opts = {}) {
        return await update('submissions', where, data, opts);
    },

    async insert(data) {
        return await insert('submissions', {
            ...data,
            createdAt: new Date().toISOString()
        });
    },

    async deleteMany(where = {}) {
        return await remove('submissions', where, { multi: true });
    }
};

module.exports = Submission;
