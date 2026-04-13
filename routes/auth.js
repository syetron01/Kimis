const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');

const SECRET = process.env.JWT_SECRET;

// Multer configuration for registration profile picture
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/login
router.post("/login", async (req, res) => {
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

// POST /api/register
router.post("/register", upload.single('profile_picture'), async (req, res) => {
    try {
        const { email, password, first_name, last_name, username, job_title, department } = req.body;
        const profile_picture = req.file ? `/uploads/${req.file.filename}` : null;

        if (!email || !password || !first_name || !username) {
            return res.status(400).json({ message: "Missing required fields (email, password, first name, username)" });
        }

        const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: "Email already registered" });
        }

        await pool.query(
            "INSERT INTO users (email, password, role, first_name, last_name, username, job_title, department, profile_picture) VALUES ($1, $2, 'user', $3, $4, $5, $6, $7, $8)",
            [email, password, first_name, last_name, username, job_title, department, profile_picture]
        );

        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        console.error("DEBUG - REGISTRATION ERROR:", err);
        if (err instanceof multer.MulterError) {
            console.error("MULTER ERROR CODE:", err.code);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: "File too large. Max size is 5MB." });
            }
        }
        res.status(500).json({ message: "Server error", details: err.message });
    }
});

// GET /api/health
router.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "healthy", database: "connected" });
    } catch (err) {
        console.error("DIAGNOSTIC - DATABASE CONNECTION FAILED:", err);
        res.status(500).json({ status: "unhealthy", error: err.message });
    }
});

module.exports = router;
