const express = require('express');
const router = express.Router();
const { runCCode } = require('../utils/codeRunner');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/code/run — compile and run C code
router.post('/run', authMiddleware, async (req, res) => {
    try {
        const { code, input } = req.body;
        if (!code || code.trim().length === 0) {
            return res.status(400).json({ message: 'No code provided' });
        }
        if (code.length > 50000) {
            return res.status(400).json({ message: 'Code too large' });
        }

        const result = await runCCode(code, input || '');
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error', output: '' });
    }
});

module.exports = router;
