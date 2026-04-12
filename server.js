const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware to parse JSON bodies and allow cross-origin requests
app.use(cors());
app.use(express.json());

// Serve frontend files statically
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
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

app.post("/api/register", upload.single('profile_picture'), async (req, res) => {
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

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "healthy", database: "connected" });
    } catch (err) {
        console.error("DIAGNOSTIC - DATABASE CONNECTION FAILED:", err);
        res.status(500).json({ status: "unhealthy", error: err.message });
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

app.put("/api/me", authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        const { first_name, last_name, username, job_title, department } = req.body;
        const userId = req.user.id;
        
        // Basic validation
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

// Workspace Access Middleware and Logic
const roleHierarchy = {
    'Owner': 4,
    'Admin': 3,
    'Editor': 2,
    'Viewer': 1
};

function requireWorkspaceRole(minRole) {
    return async (req, res, next) => {
        const workspaceId = req.params.workspaceId || req.body.workspaceId;
        const userId = req.user.id;

        if (!workspaceId) {
            return res.status(400).json({ message: "Workspace ID is required" });
        }

        try {
            const result = await pool.query(
                "SELECT role FROM workspace_memberships WHERE user_id = $1 AND workspace_id = $2",
                [userId, workspaceId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ message: "Access denied: Not a member of this workspace" });
            }

            const userRole = result.rows[0].role;
            if (roleHierarchy[userRole] < roleHierarchy[minRole]) {
                return res.status(403).json({ message: `Access denied: Required role ${minRole} or higher` });
            }

            req.workspaceRole = userRole;
            next();
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Server error during role verification" });
        }
    };
}

// Workspace Endpoints
app.post("/api/workspaces", authenticateToken, async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Workspace name is required" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Create Workspace
        const wsResult = await client.query(
            "INSERT INTO workspaces (name, description, created_by) VALUES ($1, $2, $3) RETURNING id",
            [name, description, req.user.id]
        );
        const workspaceId = wsResult.rows[0].id;

        // 2. Assign Creator as Owner
        await client.query(
            "INSERT INTO workspace_memberships (user_id, workspace_id, role) VALUES ($1, $2, 'Owner')",
            [req.user.id, workspaceId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: "Workspace created", workspaceId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

app.get("/api/workspaces", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT w.id, w.name, w.description, m.role as user_role 
             FROM workspace_memberships m 
             JOIN workspaces w ON m.workspace_id = w.id 
             WHERE m.user_id = $1`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/api/workspaces/:workspaceId", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
    try {
        const wsResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [req.params.workspaceId]);
        res.json({ ...wsResult.rows[0], user_role: req.workspaceRole });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Member Management Endpoints
app.get("/api/workspaces/:workspaceId/members", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, m.role 
             FROM workspace_memberships m 
             JOIN users u ON m.user_id = u.id 
             WHERE m.workspace_id = $1`,
            [req.params.workspaceId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/api/workspaces/:workspaceId/members", authenticateToken, requireWorkspaceRole('Admin'), async (req, res) => {
    const { user_email, role } = req.body;
    const { workspaceId } = req.params;

    if (!user_email || !role) return res.status(400).json({ message: "User email and role are required" });
    if (role === 'Owner' && req.workspaceRole !== 'Owner') {
        return res.status(403).json({ message: "Only an Owner can assign the Owner role" });
    }

    try {
        const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [user_email]);
        if (userResult.rows.length === 0) return res.status(404).json({ message: "User not found" });
        const targetUserId = userResult.rows[0].id;

        await pool.query(
            "INSERT INTO workspace_memberships (user_id, workspace_id, role) VALUES ($1, $2, $3)",
            [targetUserId, workspaceId, role]
        );
        res.status(201).json({ message: "Member added successfully" });
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ message: "User is already a member of this workspace" });
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/api/workspaces/:workspaceId/members/:userId", authenticateToken, requireWorkspaceRole('Admin'), async (req, res) => {
    const { role: newRole } = req.body;
    const { workspaceId, userId } = req.params;

    if (!newRole) return res.status(400).json({ message: "New role is required" });

    try {
        // 1. Get current member data
        const currentMember = await pool.query(
            "SELECT role FROM workspace_memberships WHERE user_id = $1 AND workspace_id = $2",
            [userId, workspaceId]
        );
        if (currentMember.rows.length === 0) return res.status(404).json({ message: "Member not found" });
        const currentRole = currentMember.rows[0].role;

        // 2. Permission Checks
        if (currentRole === 'Owner' && req.workspaceRole !== 'Owner') {
            return res.status(403).json({ message: "Admin cannot modify an Owner's role" });
        }
        if (newRole === 'Owner' && req.workspaceRole !== 'Owner') {
            return res.status(403).json({ message: "Only an Owner can assign the Owner role" });
        }

        // 3. Prevent removing the last owner
        if (currentRole === 'Owner' && newRole !== 'Owner') {
            const owners = await pool.query(
                "SELECT COUNT(*) FROM workspace_memberships WHERE workspace_id = $1 AND role = 'Owner'",
                [workspaceId]
            );
            if (parseInt(owners.rows[0].count) <= 1) {
                return res.status(400).json({ message: "Cannot downgrade the only Owner of the workspace" });
            }
        }

        await pool.query(
            "UPDATE workspace_memberships SET role = $1 WHERE user_id = $2 AND workspace_id = $3",
            [newRole, userId, workspaceId]
        );
        res.json({ message: "Role updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/api/workspaces/:workspaceId/members/:userId", authenticateToken, requireWorkspaceRole('Admin'), async (req, res) => {
    const { workspaceId, userId } = req.params;

    try {
        const currentMember = await pool.query(
            "SELECT role FROM workspace_memberships WHERE user_id = $1 AND workspace_id = $2",
            [userId, workspaceId]
        );
        if (currentMember.rows.length === 0) return res.status(404).json({ message: "Member not found" });
        const currentRole = currentMember.rows[0].role;

        if (currentRole === 'Owner' && req.workspaceRole !== 'Owner') {
            return res.status(403).json({ message: "Admin cannot remove an Owner" });
        }

        if (currentRole === 'Owner') {
            const owners = await pool.query(
                "SELECT COUNT(*) FROM workspace_memberships WHERE workspace_id = $1 AND role = 'Owner'",
                [workspaceId]
            );
            if (parseInt(owners.rows[0].count) <= 1) {
                return res.status(400).json({ message: "Cannot remove the only Owner of the workspace" });
            }
        }

        await pool.query(
            "DELETE FROM workspace_memberships WHERE user_id = $1 AND workspace_id = $2",
            [userId, workspaceId]
        );
        res.json({ message: "Member removed successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// KNOWLEDGE ARTICLES ENDPOINTS
// ==========================================

// Create Article
app.post("/api/workspaces/:workspaceId/articles", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { workspaceId } = req.params;
    const { title, content, tags } = req.body;
    const userId = req.user.id;

    if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const articleResult = await client.query(
            `INSERT INTO articles (title, content, workspace_id, created_by, updated_by) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
            [title, content, workspaceId, userId, userId]
        );
        const newArticleId = articleResult.rows[0].id;

        if (tags && Array.isArray(tags)) {
            for (const tag of tags) {
                await client.query(
                    "INSERT INTO article_tags (article_id, tag) VALUES ($1, $2)",
                    [newArticleId, tag]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: "Article created successfully", articleId: newArticleId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

// List Articles (Metadata only)
app.get("/api/workspaces/:workspaceId/articles", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
    const { workspaceId } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT a.id, a.title, a.created_at, a.updated_at, a.is_archived,
                    u_created.first_name as author_first_name, u_created.last_name as author_last_name
             FROM articles a
             LEFT JOIN users u_created ON a.created_by = u_created.id
             WHERE a.workspace_id = $1 AND a.is_archived = FALSE
             ORDER BY a.updated_at DESC`,
            [workspaceId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Get Single Article
app.get("/api/workspaces/:workspaceId/articles/:articleId", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
    const { workspaceId, articleId } = req.params;
    
    try {
        const articleResult = await pool.query(
            `SELECT a.*, 
                    u_created.first_name as author_first_name, u_created.last_name as author_last_name,
                    u_updated.first_name as editor_first_name, u_updated.last_name as editor_last_name
             FROM articles a
             LEFT JOIN users u_created ON a.created_by = u_created.id
             LEFT JOIN users u_updated ON a.updated_by = u_updated.id
             WHERE a.id = $1 AND a.workspace_id = $2`,
            [articleId, workspaceId]
        );

        if (articleResult.rows.length === 0) {
            return res.status(404).json({ message: "Article not found in this workspace" });
        }

        const tagsResult = await pool.query("SELECT tag FROM article_tags WHERE article_id = $1", [articleId]);
        const tags = tagsResult.rows.map(row => row.tag);

        res.json({ ...articleResult.rows[0], tags });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Update Article
app.put("/api/workspaces/:workspaceId/articles/:articleId", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { workspaceId, articleId } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    if (!title || !content) return res.status(400).json({ message: "Title and content are required" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Ensure article exists and is in this workspace
        const currentCheck = await client.query(
            "SELECT content, is_archived FROM articles WHERE id = $1 AND workspace_id = $2",
            [articleId, workspaceId]
        );
        
        if (currentCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Article not found" });
        }
        if (currentCheck.rows[0].is_archived) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: "Cannot edit an archived article" });
        }

        // Store version snapshot
        const oldContent = currentCheck.rows[0].content;
        await client.query(
            "INSERT INTO article_versions (article_id, content_snapshot, edited_by) VALUES ($1, $2, $3)",
            [articleId, oldContent, userId]
        );

        // Update article
        await client.query(
            "UPDATE articles SET title = $1, content = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
            [title, content, userId, articleId]
        );

        await client.query('COMMIT');
        res.json({ message: "Article updated successfully" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

// Archive Article
app.delete("/api/workspaces/:workspaceId/articles/:articleId", authenticateToken, requireWorkspaceRole('Admin'), async (req, res) => {
    const { workspaceId, articleId } = req.params;

    try {
        const result = await pool.query(
            "UPDATE articles SET is_archived = TRUE WHERE id = $1 AND workspace_id = $2 RETURNING id",
            [articleId, workspaceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Article not found in this workspace" });
        }

        res.json({ message: "Article archived successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

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