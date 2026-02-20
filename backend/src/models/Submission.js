const db = require('../db');

function toObj(row) {
    if (!row) return null;
    return {
        ...row,
        evaluated: !!row.evaluated,
        testResults: JSON.parse(row.testResults || '[]'),
        save: async function () { Submission._save(this); }
    };
}

const Submission = {
    _save(sub) {
        db.prepare(`
            UPDATE submissions SET
                code=@code, selectedOption=@selectedOption, output=@output,
                marks=@marks, maxMarks=@maxMarks, testResults=@testResults,
                evaluated=@evaluated, updatedAt=datetime('now')
            WHERE teamID=@teamID AND questionID=@questionID
        `).run({
            ...sub,
            testResults: JSON.stringify(sub.testResults || []),
            evaluated: sub.evaluated ? 1 : 0
        });
    },

    async find(where = {}) {
        const keys = Object.keys(where);
        let clause = '1=1';
        if (keys.length) clause = keys.map(k => `${k}=@${k}`).join(' AND ');
        const rows = db.prepare(`SELECT * FROM submissions WHERE ${clause} ORDER BY questionID ASC`).all(where);
        return rows.map(toObj);
    },

    async findOneAndUpdate(where, data, opts = {}) {
        const existing = db.prepare(
            `SELECT * FROM submissions WHERE teamID=@teamID AND questionID=@questionID LIMIT 1`
        ).get(where);

        if (existing) {
            db.prepare(`
                UPDATE submissions SET
                    type=@type, code=@code, selectedOption=@selectedOption, output=@output,
                    marks=@marks, maxMarks=@maxMarks, evaluated=@evaluated, updatedAt=datetime('now')
                WHERE teamID=@teamID AND questionID=@questionID
            `).run({
                teamID: data.teamID || where.teamID,
                questionID: data.questionID || where.questionID,
                type: data.type || existing.type,
                code: data.code !== undefined ? data.code : existing.code,
                selectedOption: data.selectedOption !== undefined ? data.selectedOption : existing.selectedOption,
                output: data.output || existing.output,
                marks: data.marks !== undefined ? data.marks : existing.marks,
                maxMarks: data.maxMarks !== undefined ? data.maxMarks : existing.maxMarks,
                evaluated: data.evaluated ? 1 : 0
            });
        } else if (opts.upsert) {
            db.prepare(`
                INSERT INTO submissions (teamID, questionID, type, code, selectedOption, output, marks, maxMarks, evaluated)
                VALUES (@teamID, @questionID, @type, @code, @selectedOption, @output, @marks, @maxMarks, @evaluated)
            `).run({
                teamID: data.teamID || where.teamID,
                questionID: data.questionID || where.questionID,
                type: data.type || '',
                code: data.code || '',
                selectedOption: data.selectedOption || '',
                output: data.output || '',
                marks: data.marks || 0,
                maxMarks: data.maxMarks || 0,
                evaluated: data.evaluated ? 1 : 0
            });
        }

        return toObj(db.prepare(
            `SELECT * FROM submissions WHERE teamID=@teamID AND questionID=@questionID LIMIT 1`
        ).get(where));
    },

    _new(data) {
        return {
            ...data,
            testResults: data.testResults || [],
            evaluated: !!data.evaluated,
            save: async function () {
                const existing = db.prepare(
                    `SELECT id FROM submissions WHERE teamID=@teamID AND questionID=@questionID`
                ).get({ teamID: this.teamID, questionID: this.questionID });

                if (existing) {
                    Submission._save(this);
                } else {
                    db.prepare(`
                        INSERT OR IGNORE INTO submissions (teamID, questionID, type, code, selectedOption, output, marks, maxMarks, testResults, evaluated)
                        VALUES (@teamID, @questionID, @type, @code, @selectedOption, @output, @marks, @maxMarks, @testResults, @evaluated)
                    `).run({
                        ...this,
                        testResults: JSON.stringify(this.testResults || []),
                        evaluated: this.evaluated ? 1 : 0
                    });
                }
            }
        };
    }
};

module.exports = new Proxy(Submission, {
    construct(target, args) { return target._new(args[0]); }
});
