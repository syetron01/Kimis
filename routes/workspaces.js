const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');

const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'workspace_profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images are allowed'));
        cb(null, true);
    }
});

// POST /api/workspaces — Create a workspace
router.post("/", authenticateToken, upload.single('profile_image'), async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Workspace name is required" });

    let profileImage = null;
    if (req.file) {
        profileImage = `/uploads/${req.file.filename}`;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const wsResult = await client.query(
            "INSERT INTO workspaces (name, description, created_by, profile_image) VALUES ($1, $2, $3, $4) RETURNING id",
            [name, description, req.user.id, profileImage]
        );
        const workspaceId = wsResult.rows[0].id;

        await client.query(
            "INSERT INTO workspace_memberships (user_id, workspace_id, role) VALUES ($1, $2, 'Owner')",
            [req.user.id, workspaceId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: "Workspace created", workspaceId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error creating workspace:", err);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

// PUT /api/workspaces/:workspaceId — Update workspace details
router.put("/:workspaceId", authenticateToken, upload.single('profile_image'), requireWorkspaceRole('Admin'), async (req, res) => {
    const { workspaceId } = req.params;
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: "Workspace name is required" });

    try {
        // Get current workspace details to handle image replacement
        const currentWs = await pool.query("SELECT profile_image FROM workspaces WHERE id = $1", [workspaceId]);
        if (currentWs.rows.length === 0) return res.status(404).json({ message: "Workspace not found" });

        const oldImage = currentWs.rows[0].profile_image;
        let profileImage = oldImage;

        if (req.file) {
            profileImage = `/uploads/${req.file.filename}`;

            // Delete old image file if it exists and is different
            if (oldImage && oldImage.startsWith('/uploads/')) {
                try {
                    const oldPath = path.join(__dirname, '..', oldImage);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                } catch (unlinkErr) {
                    console.error("Failed to delete old workspace icon:", unlinkErr);
                }
            }
        }

        await pool.query(
            "UPDATE workspaces SET name = $1, description = $2, profile_image = $3 WHERE id = $4",
            [name.trim(), description, profileImage, workspaceId]
        );

        res.json({ message: "Workspace updated successfully", name, description, profileImage });
    } catch (err) {
        console.error("Error updating workspace:", err);
        res.status(500).json({ message: "Server error" });
    }
});
// GET /api/workspaces — List user's workspaces
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                w.id, w.name, w.description, w.profile_image, m.role as user_role,
                (SELECT COUNT(*) FROM workspace_memberships WHERE workspace_id = w.id) as num_members,
                (SELECT COUNT(*) FROM articles WHERE workspace_id = w.id AND is_archived = FALSE) as num_articles,
                (SELECT COUNT(*) FROM workflows WHERE workspace_id = w.id) as num_workflows
             FROM workspace_memberships m 
             JOIN workspaces w ON m.workspace_id = w.id 
             WHERE m.user_id = $1
             ORDER BY w.id DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/workspaces/:workspaceId — Get single workspace
router.get("/:workspaceId", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
    try {
        const wsResult = await pool.query("SELECT * FROM workspaces WHERE id = $1", [req.params.workspaceId]);
        res.json({ ...wsResult.rows[0], user_role: req.workspaceRole });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/workspaces/:workspaceId/leave — Current user leaves workspace
router.post("/:workspaceId/leave", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    const role = req.workspaceRole;

    try {
        // Validation rules
        if (role === 'Owner') {
            const owners = await pool.query(
                "SELECT COUNT(*) FROM workspace_memberships WHERE workspace_id = $1 AND role = 'Owner'",
                [workspaceId]
            );
            if (parseInt(owners.rows[0].count) <= 1) {
                return res.status(400).json({ message: "Owner cannot leave if they are the last remaining Owner" });
            }
        } else if (role === 'Admin') {
            const adminsOrOwners = await pool.query(
                "SELECT COUNT(*) FROM workspace_memberships WHERE workspace_id = $1 AND role IN ('Owner', 'Admin')",
                [workspaceId]
            );
            if (parseInt(adminsOrOwners.rows[0].count) <= 1) {
                return res.status(400).json({ message: "Admin can leave only if another Admin or Owner still exists" });
            }
        }

        await pool.query(
            "DELETE FROM workspace_memberships WHERE user_id = $1 AND workspace_id = $2",
            [userId, workspaceId]
        );
        res.json({ message: "You have left the workspace" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/workspaces/:workspaceId — Delete workspace (Owner only)
router.delete("/:workspaceId", authenticateToken, requireWorkspaceRole('Owner'), async (req, res) => {
    const { workspaceId } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Based on the requirement: "Deleting this workspace will permanently remove: Articles, Workflows, Members, Workflow Nodes, Workspace history"
        // We rely on CASCADE if configured, or delete manually.
        // Let's do manual deletions for safety and clarity if CASCADE is not fully set up.
        
        await client.query("DELETE FROM workflow_edges WHERE workflow_id IN (SELECT id FROM workflows WHERE workspace_id = $1)", [workspaceId]);
        await client.query("DELETE FROM workflow_nodes WHERE workflow_id IN (SELECT id FROM workflows WHERE workspace_id = $1)", [workspaceId]);
        await client.query("DELETE FROM workflows WHERE workspace_id = $1", [workspaceId]);
        
        await client.query("DELETE FROM article_tags WHERE article_id IN (SELECT id FROM articles WHERE workspace_id = $1)", [workspaceId]);
        await client.query("DELETE FROM article_versions WHERE article_id IN (SELECT id FROM articles WHERE workspace_id = $1)", [workspaceId]);
        await client.query("DELETE FROM articles WHERE workspace_id = $1", [workspaceId]);
        
        await client.query("DELETE FROM workspace_memberships WHERE workspace_id = $1", [workspaceId]);
        await client.query("DELETE FROM workspaces WHERE id = $1", [workspaceId]);

        await client.query('COMMIT');
        res.json({ message: "Workspace deleted successfully" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

module.exports = router;
