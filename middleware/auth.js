const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

// Verify JWT token from Authorization header
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }

        req.user = user;
        next();
    });
}

// Check if authenticated user has a specific system role (e.g. 'admin')
function authorizeRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
}

module.exports = { authenticateToken, authorizeRole };
