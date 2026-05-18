const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/rbac');

// GET /api/workspaces/:workspaceId/members
router.get("/", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
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

// POST /api/workspaces/:workspaceId/members
router.post("/", authenticateToken, requireWorkspaceRole('Admin'), async (req, res) => {
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

// PUT /api/workspaces/:workspaceId/members/:userId
router.put("/:userId", authenticateToken, requireWorkspaceRole('Admin'), async (req, res) => {
    const { role: newRole } = req.body;
    const { workspaceId, userId } = req.params;

    if (!newRole) return res.status(400).json({ message: "New role is required" });

    try {
        const currentMember = await pool.query(
            "SELECT role FROM workspace_memberships WHERE user_id = $1 AND workspace_id = $2",
            [userId, workspaceId]
        );
        if (currentMember.rows.length === 0) return res.status(404).json({ message: "Member not found" });
        const currentRole = currentMember.rows[0].role;

        // Admin rules
        if (req.workspaceRole === 'Admin') {
            if (currentRole === 'Owner' || currentRole === 'Admin') {
                return res.status(403).json({ message: "Admin cannot modify an Owner or another Admin" });
            }
            if (newRole === 'Owner' || newRole === 'Admin') {
                return res.status(403).json({ message: "Admin can only assign Editor or Viewer roles" });
            }
        }

        // Owner rules (preventing self-downgrade without transfer)
        if (currentRole === 'Owner' && newRole !== 'Owner') {
            const owners = await pool.query(
                "SELECT COUNT(*) FROM workspace_memberships WHERE workspace_id = $1 AND role = 'Owner'",
                [workspaceId]
            );
            if (parseInt(owners.rows[0].count) <= 1) {
                return res.status(400).json({ message: "Cannot downgrade the only Owner of the workspace. Use Transfer Ownership instead." });
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

// DELETE /api/workspaces/:workspaceId/members/:userId
router.delete("/:userId", authenticateToken, requireWorkspaceRole('Admin'), async (req, res) => {
    const { workspaceId, userId } = req.params;

    try {
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({ message: "You cannot remove yourself. Use 'Leave Workspace' instead." });
        }

        const currentMember = await pool.query(
            "SELECT role FROM workspace_memberships WHERE user_id = $1 AND workspace_id = $2",
            [userId, workspaceId]
        );
        if (currentMember.rows.length === 0) return res.status(404).json({ message: "Member not found" });
        const currentRole = currentMember.rows[0].role;

        // Admin rules
        if (req.workspaceRole === 'Admin') {
            if (currentRole === 'Owner' || currentRole === 'Admin') {
                return res.status(403).json({ message: "Admin cannot remove an Owner or another Admin" });
            }
        }

        // Owner rules
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

// POST /api/workspaces/:workspaceId/members/:userId/transfer-ownership
router.post("/:userId/transfer-ownership", authenticateToken, requireWorkspaceRole('Owner'), async (req, res) => {
    const { workspaceId, userId } = req.params;
    const currentOwnerId = req.user.id;

    if (parseInt(userId) === currentOwnerId) {
        return res.status(400).json({ message: "You are already the owner" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if target is a member
        const targetMember = await client.query(
            "SELECT role FROM workspace_memberships WHERE user_id = $1 AND workspace_id = $2",
            [userId, workspaceId]
        );
        if (targetMember.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: "Target user is not a member of this workspace" });
        }

        // 1. Update target to Owner
        await client.query(
            "UPDATE workspace_memberships SET role = 'Owner' WHERE user_id = $1 AND workspace_id = $2",
            [userId, workspaceId]
        );

        // 2. Update current owner to Admin
        await client.query(
            "UPDATE workspace_memberships SET role = 'Admin' WHERE user_id = $1 AND workspace_id = $2",
            [currentOwnerId, workspaceId]
        );

        await client.query('COMMIT');
        res.json({ message: "Ownership transferred successfully. You are now an Admin." });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

module.exports = router;
