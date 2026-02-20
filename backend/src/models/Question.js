const db = require('../db');

function toObj(row) {
    if (!row) return null;
    return {
        ...row,
        section: row.section,
        order: row.orderNum,
        options: JSON.parse(row.options || '[]'),
        testCases: JSON.parse(row.testCases || '[]'),
    };
}

const Question = {
    async findOne(where) {
        const keys = Object.keys(where);
        if (!keys.length) return null;
        const clause = keys.map(k => `${k === 'order' ? 'orderNum' : k}=@${k}`).join(' AND ');
        const row = db.prepare(`SELECT * FROM questions WHERE ${clause} LIMIT 1`).get(where);
        return toObj(row);
    },

    async find(where = {}) {
        const keys = Object.keys(where);
        let clause = '1=1';
        if (keys.length) clause = keys.map(k => `${k}=@${k}`).join(' AND ');
        const rows = db.prepare(`SELECT * FROM questions WHERE ${clause} ORDER BY section ASC, orderNum ASC`).all(where);
        return rows.map(toObj);
    },

    async deleteMany() {
        db.prepare('DELETE FROM questions').run();
    },

    async insertMany(questions) {
        const insert = db.prepare(`
            INSERT OR REPLACE INTO questions
            (questionID, type, section, orderNum, questionText, options, correctAnswer, starterCode, testCases, marks, hint)
            VALUES (@questionID, @type, @section, @orderNum, @questionText, @options, @correctAnswer, @starterCode, @testCases, @marks, @hint)
        `);
        const insertAll = db.transaction((qs) => {
            for (const q of qs) {
                insert.run({
                    questionID: q.questionID,
                    type: q.type,
                    section: q.section,
                    orderNum: q.order || q.orderNum || 0,
                    questionText: q.questionText,
                    options: JSON.stringify(q.options || []),
                    correctAnswer: q.correctAnswer || '',
                    starterCode: q.starterCode || '',
                    testCases: JSON.stringify(q.testCases || []),
                    marks: q.marks,
                    hint: q.hint || ''
                });
            }
        });
        insertAll(questions);
    }
};

module.exports = Question;
