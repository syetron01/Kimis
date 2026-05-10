const express = require('express');
const router = express.Router({ mergeParams: true });
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/rbac');

// POST /api/workspaces/:workspaceId/articles — Create Article
router.post("/", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
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

// GET /api/workspaces/:workspaceId/articles — List Articles
router.get("/", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
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

// GET /api/workspaces/:workspaceId/articles/:articleId — Get Single Article
router.get("/:articleId", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
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

// PUT /api/workspaces/:workspaceId/articles/:articleId — Update Article
router.put("/:articleId", authenticateToken, requireWorkspaceRole('Editor'), async (req, res) => {
    const { workspaceId, articleId } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    if (!title || !content) return res.status(400).json({ message: "Title and content are required" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

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

// DELETE /api/workspaces/:workspaceId/articles/:articleId — Delete Article
router.delete("/:articleId", authenticateToken, requireWorkspaceRole('Admin'), async (req, res) => {
    const { workspaceId, articleId } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM articles WHERE id = $1 AND workspace_id = $2 RETURNING id",
            [articleId, workspaceId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Article not found in this workspace" });
        }

        res.json({ message: "Article deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
