const express = require('express');
const router = express.Router({ mergeParams: true });
const aiService = require('../services/aiService');
const { extractKeywords } = require('../utils/nlp');
const { authenticateToken } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/rbac');

/**
 * POST /api/workspaces/:wsId/ai/query
 * Custom AI retrieval endpoint
 */
router.post("/query", authenticateToken, requireWorkspaceRole('Viewer'), async (req, res) => {
    const { wsId } = req.params;
    const { query } = req.body;
    const userId = req.user.id;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query string is required" });
    }

    try {
        // 1. Extract keywords
        const keywords = extractKeywords(query);

        // 2. Log the query (Bonus requirement)
        await aiService.logQuery(wsId, query, userId);

        // 3. Process query and get ranked results
        const results = await aiService.processQuery(wsId, keywords);

        // 4. Return structured response
        res.json({
            query: query,
            keywords: keywords,
            results: results
        });
    } catch (err) {
        console.error("AI ROUTE ERROR:", err);
        res.status(500).json({ message: "Internal server error during AI processing" });
    }
});

module.exports = router;
