const jwt = require('jsonwebtoken');

const adminMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No admin token provided' });

    try {
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        if (!decoded.isAdmin) return res.status(403).json({ message: 'Forbidden' });
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired admin token' });
    }
};

module.exports = adminMiddleware;
