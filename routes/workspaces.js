const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/rbac');

// POST /api/workspaces — Create a workspace
router.post("/", authenticateToken, async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Workspace name is required" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const wsResult = await client.query(
            "INSERT INTO workspaces (name, description, created_by) VALUES ($1, $2, $3) RETURNING id",
            [name, description, req.user.id]
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
        console.error(err);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

// GET /api/workspaces — List user's workspaces
router.get("/", authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                w.id, w.name, w.description, m.role as user_role,
                (SELECT COUNT(*) FROM workspace_memberships WHERE workspace_id = w.id) as num_members,
                (SELECT COUNT(*) FROM articles WHERE workspace_id = w.id AND is_archived = FALSE) as num_articles,
                (SELECT COUNT(*) FROM workflows WHERE workspace_id = w.id) as num_workflows
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

module.exports = router;
