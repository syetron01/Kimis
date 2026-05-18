const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Multer configuration for profile picture uploads
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

// GET /api/me — Get current user profile
router.get("/me", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({
            id: user.id,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            job_title: user.job_title,
            department: user.department,
            profile_picture: user.profile_picture
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /api/me — Update current user profile
router.put("/me", authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const { first_name, last_name, username, job_title, department } = req.body;
        const userId = req.user.id;

        if (!first_name || !username) {
            return res.status(400).json({ message: "First name and username are required" });
        }

        let query = "UPDATE users SET first_name = $1, last_name = $2, username = $3, job_title = $4, department = $5";
        let params = [first_name, last_name, username, job_title, department];

        if (req.file) {
            const profile_picture = `/uploads/${req.file.filename}`;
            query += ", profile_picture = $6 WHERE id = $7";
            params.push(profile_picture, userId);
        } else {
            query += " WHERE id = $6";
            params.push(userId);
        }

        await pool.query(query, params);
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("DEBUG - PROFILE UPDATE ERROR:", err);
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "File too large. Max size is 5MB." });
        }
        res.status(500).json({ message: "Server error", details: err.message });
    }
});

// GET /api/admin-data — Admin-only data
router.get("/admin-data", authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const result = await pool.query("SELECT COUNT(*) FROM users");
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

module.exports = router;
