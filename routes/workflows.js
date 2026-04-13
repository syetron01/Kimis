const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/rbac');

// ==========================================
// WORKFLOW CRUD
// ==========================================

// POST — Create Workflow (auto-creates START node)
router.post("/", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { title, description } = req.body;
    const { workspaceId } = req.params;

    if (!title) return res.status(400).json({ message: "Title is required" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const wfResult = await client.query(
            "INSERT INTO workflows (title, description, workspace_id, created_by) VALUES ($1, $2, $3, $4) RETURNING id",
            [title, description, workspaceId, req.user.id]
        );
        const workflowId = wfResult.rows[0].id;

        // Auto-create a START node
        await client.query(
            "INSERT INTO workflow_nodes (workflow_id, type, title, position_x, position_y) VALUES ($1, 'start', 'Start', 250, 50)",
            [workflowId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: "Workflow created", workflowId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

// GET — List Workflows
router.get("/", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
    const { workspaceId } = req.params;
    const { search } = req.query;

    try {
        let query = "SELECT w.*, u.first_name, u.last_name FROM workflows w JOIN users u ON w.created_by = u.id WHERE w.workspace_id = $1";
        const params = [workspaceId];

        if (search) {
            query += " AND w.title ILIKE $2";
            params.push(`%${search}%`);
        }

        query += " ORDER BY w.updated_at DESC";
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT — Update Workflow metadata
router.put("/:workflowId", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { title, description } = req.body;
    const { workflowId, workspaceId } = req.params;

    try {
        const result = await pool.query(
            "UPDATE workflows SET title = COALESCE($1, title), description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND workspace_id = $4 RETURNING id",
            [title, description, workflowId, workspaceId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Workflow not found" });
        res.json({ message: "Workflow updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE — Delete Workflow
router.delete("/:workflowId", authenticateToken, requireWorkspaceRole('Admin'), async (req, res) => {
    const { workflowId, workspaceId } = req.params;
    try {
        const result = await pool.query("DELETE FROM workflows WHERE id = $1 AND workspace_id = $2 RETURNING id", [workflowId, workspaceId]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Workflow not found" });
        res.json({ message: "Workflow deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// GRAPH RETRIEVAL
// ==========================================

// GET — Full workflow graph (nodes + edges)
router.get("/:workflowId/graph", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
    const { workflowId, workspaceId } = req.params;

    try {
        const wfCheck = await pool.query("SELECT * FROM workflows WHERE id = $1 AND workspace_id = $2", [workflowId, workspaceId]);
        if (wfCheck.rows.length === 0) return res.status(404).json({ message: "Workflow not found" });

        const nodesResult = await pool.query(
            `SELECT n.*, a.title as article_title 
             FROM workflow_nodes n 
             LEFT JOIN articles a ON n.linked_article_id = a.id 
             WHERE n.workflow_id = $1 
             ORDER BY n.created_at ASC`,
            [workflowId]
        );

        const edgesResult = await pool.query(
            "SELECT * FROM workflow_edges WHERE workflow_id = $1 ORDER BY created_at ASC",
            [workflowId]
        );

        res.json({
            workflow: wfCheck.rows[0],
            nodes: nodesResult.rows,
            edges: edgesResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// NODES
// ==========================================

// POST — Add Node
router.post("/:workflowId/nodes", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { type, title, description, position_x, position_y, linked_article_id } = req.body;
    const { workflowId, workspaceId } = req.params;

    if (!title || !type) return res.status(400).json({ message: "Title and type are required" });

    const validTypes = ['start', 'action', 'decision', 'note', 'end'];
    if (!validTypes.includes(type)) return res.status(400).json({ message: "Invalid node type" });

    try {
        // Enforce single START node
        if (type === 'start') {
            const startCheck = await pool.query(
                "SELECT id FROM workflow_nodes WHERE workflow_id = $1 AND type = 'start'", [workflowId]
            );
            if (startCheck.rows.length > 0) {
                return res.status(400).json({ message: "A workflow can only have one START node" });
            }
        }

        // Validate linked article workspace
        if (linked_article_id) {
            const artCheck = await pool.query("SELECT workspace_id FROM articles WHERE id = $1", [linked_article_id]);
            if (artCheck.rows.length === 0 || artCheck.rows[0].workspace_id != workspaceId) {
                return res.status(400).json({ message: "Linked article must belong to the same workspace" });
            }
        }

        const result = await pool.query(
            `INSERT INTO workflow_nodes (workflow_id, type, title, description, position_x, position_y, linked_article_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [workflowId, type, title, description, position_x || 0, position_y || 0, linked_article_id]
        );

        res.status(201).json({ message: "Node added", nodeId: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT — Update Node content
router.put("/:workflowId/nodes/:nodeId", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { title, description, type, linked_article_id } = req.body;
    const { nodeId, workflowId, workspaceId } = req.params;

    try {
        if (linked_article_id) {
            const artCheck = await pool.query("SELECT workspace_id FROM articles WHERE id = $1", [linked_article_id]);
            if (artCheck.rows.length === 0 || artCheck.rows[0].workspace_id != workspaceId) {
                return res.status(400).json({ message: "Linked article must belong to the same workspace" });
            }
        }

        const result = await pool.query(
            `UPDATE workflow_nodes SET 
                title = COALESCE($1, title), 
                description = COALESCE($2, description), 
                type = COALESCE($3, type), 
                linked_article_id = $4,
                updated_at = CURRENT_TIMESTAMP 
             WHERE id = $5 AND workflow_id = $6 RETURNING id`,
            [title, description, type, linked_article_id, nodeId, workflowId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Node not found" });
        res.json({ message: "Node updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH — Update Node position (drag-and-drop)
router.patch("/:workflowId/nodes/:nodeId/position", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { position_x, position_y } = req.body;
    const { nodeId, workflowId } = req.params;

    if (position_x === undefined || position_y === undefined) {
        return res.status(400).json({ message: "position_x and position_y are required" });
    }

    try {
        const result = await pool.query(
            "UPDATE workflow_nodes SET position_x = $1, position_y = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND workflow_id = $4 RETURNING id",
            [position_x, position_y, nodeId, workflowId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Node not found" });
        res.json({ message: "Position updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE — Delete Node (cascade deletes connected edges)
router.delete("/:workflowId/nodes/:nodeId", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { nodeId, workflowId } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM workflow_nodes WHERE id = $1 AND workflow_id = $2 RETURNING id",
            [nodeId, workflowId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Node not found" });
        res.json({ message: "Node and connected edges deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// EDGES
// ==========================================

// POST — Create Edge
router.post("/:workflowId/edges", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { from_node_id, to_node_id, condition } = req.body;
    const { workflowId } = req.params;

    if (!from_node_id || !to_node_id) {
        return res.status(400).json({ message: "from_node_id and to_node_id are required" });
    }

    if (from_node_id === to_node_id) {
        return res.status(400).json({ message: "Cannot create self-referencing edge" });
    }

    try {
        // Validate both nodes belong to this workflow
        const nodesCheck = await pool.query(
            "SELECT id FROM workflow_nodes WHERE id IN ($1, $2) AND workflow_id = $3",
            [from_node_id, to_node_id, workflowId]
        );
        if (nodesCheck.rows.length < 2) {
            return res.status(400).json({ message: "Both nodes must belong to this workflow" });
        }

        // Prevent duplicate edges
        const dupCheck = await pool.query(
            "SELECT id FROM workflow_edges WHERE from_node_id = $1 AND to_node_id = $2 AND workflow_id = $3",
            [from_node_id, to_node_id, workflowId]
        );
        if (dupCheck.rows.length > 0) {
            return res.status(400).json({ message: "Edge already exists between these nodes" });
        }

        const result = await pool.query(
            "INSERT INTO workflow_edges (workflow_id, from_node_id, to_node_id, condition) VALUES ($1, $2, $3, $4) RETURNING id",
            [workflowId, from_node_id, to_node_id, condition]
        );

        res.status(201).json({ message: "Edge created", edgeId: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE — Delete Edge
router.delete("/:workflowId/edges/:edgeId", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { edgeId, workflowId } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM workflow_edges WHERE id = $1 AND workflow_id = $2 RETURNING id",
            [edgeId, workflowId]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: "Edge not found" });
        res.json({ message: "Edge deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
