/**
 * routes/aiRoutes.js
 * ─────────────────────────────────────────────────────────
 * POST /api/workspaces/:wsId/ai/query
 *
 * Retrieval-first AI query endpoint.
 *
 * Pipeline:
 *   1. Extract keywords (NLP)
 *   2. Retrieve + score articles and workflow nodes from DB
 *   3. Rank and limit results
 *   4. Build structured prompt context
 *   5. Send context to Gemini for natural-language rewrite
 *   6. Format and return structured JSON response
 *
 * Protected by:
 *   - authenticateToken  (JWT required)
 *   - requireWorkspaceRole('Viewer')  (minimum workspace access)
 * ─────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router({ mergeParams: true });
const pool    = require('../config/db');

// ── Middleware ────────────────────────────────────────────
const { authenticateToken }    = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/rbac');

// ── Pipeline Services ─────────────────────────────────────
const { extractKeywords }           = require('../utils/nlp');
const { retrieveArticles,
        retrieveWorkflowNodes,
        rankResults }               = require('../services/aiRetrievalService');
const { buildContext }              = require('../services/contextBuilderService');
const { generateGroundedAnswer,
        computeConfidence }         = require('../services/geminiService');
const { formatResponse }            = require('../services/responseFormatter');

// ─────────────────────────────────────────────────────────
// POST /api/workspaces/:wsId/ai/query
// ─────────────────────────────────────────────────────────
router.post(
    '/query',
    authenticateToken,
    requireWorkspaceRole('Viewer'),
    async (req, res) => {
        const { wsId }  = req.params;
        const { query } = req.body;
        const userId    = req.user.id;

        // ── Input validation ─────────────────────────────
        if (!query || typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({ message: 'A non-empty query string is required.' });
        }

        try {
            // ── Step 1: Keyword Extraction ────────────────
            const keywords = extractKeywords(query);
            console.log(`[AI] Query: "${query}" → keywords: [${keywords.join(', ')}]`);

            if (keywords.length === 0) {
                return res.json({
                    query,
                    answer: 'Your query did not contain any searchable keywords. Please try rephrasing with more specific terms.',
                    confidence: 'none',
                    sources: [],
                    workflow: null,
                    keywords: [],
                    results: []
                });
            }

            // ── Step 2: Retrieve ──────────────────────────
            const [articles, nodes] = await Promise.all([
                retrieveArticles(wsId, keywords),
                retrieveWorkflowNodes(wsId, keywords)
            ]);

            console.log(`[AI] Retrieved: ${articles.length} article(s), ${nodes.length} node(s)`);

            // ── Step 3: Rank (top 5) ──────────────────────
            const rankedResults = await rankResults(articles, nodes, 5);

            // ── Step 4: Build Context ─────────────────────
            const { contextText, sources, workflow } = buildContext(query, rankedResults);

            // ── Step 5: Generate Gemini Answer ────────────
            let answer;
            if (rankedResults.length === 0) {
                // Nothing retrieved — tell user clearly without calling Gemini
                answer = `The KiMiS knowledge base does not currently contain articles or workflow steps matching your query: "${query}". Please check with your workspace administrators to ensure relevant content has been added.`;
            } else {
                answer = await generateGroundedAnswer(contextText);
            }

            // ── Step 6: Compute confidence & format ───────
            const confidence = computeConfidence(sources);

            const responsePayload = formatResponse({
                query,
                keywords,
                answer,
                confidence,
                sources,
                workflow,
                rawResults: rankedResults
            });

            // ── Step 7: Log query (fire-and-forget) ───────
            logQuery(wsId, query, userId, keywords).catch(err =>
                console.error('[AI] Logging error:', err.message)
            );

            return res.json(responsePayload);

        } catch (err) {
            console.error('[AI] Pipeline error:', err);
            return res.status(500).json({ message: 'Internal server error during AI processing.' });
        }
    }
);

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/**
 * Persists the query to the ai_queries table.
 * Fails silently — query logging must never break the main response.
 *
 * @param {string|number} workspaceId
 * @param {string}        query
 * @param {string|number} userId
 * @param {string[]}      keywords
 */
async function logQuery(workspaceId, query, userId, keywords) {
    try {
        await pool.query(
            `INSERT INTO ai_queries (workspace_id, query, user_id, keywords)
             VALUES ($1, $2, $3, $4)`,
            [workspaceId, query, userId, keywords]
        );
    } catch (err) {
        // Table may not exist yet — log and continue gracefully
        console.warn('[AI] Could not log query (table may be missing):', err.message);
    }
}

module.exports = router;
