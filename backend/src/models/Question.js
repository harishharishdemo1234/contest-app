const { findOne, find, insert, remove } = require('../db');

const Question = {
    async findOne(where) {
        return await findOne('questions', where);
    },

    async find(where = {}, sort = { section: 1, order: 1 }) {
        return await find('questions', where, sort);
    },

    async deleteMany(where = {}) {
        return await remove('questions', where, { multi: true });
    },

    async insertMany(questions) {
        return await insert('questions', questions);
    }
};

module.exports = Question;
