const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// Middleware to parse JSON bodies and allow cross-origin requests
app.use(cors());
app.use(express.json());

const SECRET = "your_super_secret_key";

// PostgreSQL database connection pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'kimis',
    password: '11111',
    port: 5432,
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1 AND password = $2",
            [email, password]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful",
            token: token
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/api/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }

        await pool.query(
            "INSERT INTO users (email, password, role) VALUES ($1, $2, 'user')",
            [email, password]
        );

        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/me", authenticateToken, async (req, res) => {
    try {
        // Find the user details based on the token
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return user details without password
        res.json({
            id: user.id,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/admin-data", authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const result = await pool.query("SELECT COUNT(*) FROM users");
        // This endpoint is only accessible if authenticateToken AND authorizeRole('admin') pass
        res.json({
            message: "Sensitive Admin Information Accessed Successfully!",
            serverStatus: "Healthy",
            activeUsers: parseInt(result.rows[0].count, 10)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

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

function authorizeRole(role) {

    return (req, res, next) => {

        if (req.user.role !== role) {
            return res.status(403).json({ message: "Access denied" });
        }

        next();

    };

}

app.get('/', (req, res) => {
    res.send('Server is up and running! Please access the login endpoint.');
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});