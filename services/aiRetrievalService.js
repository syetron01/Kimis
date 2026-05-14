/**
 * services/aiRetrievalService.js
 * ─────────────────────────────────────────────────────────
 * Retrieval layer: searches workspace-specific articles and
 * workflow nodes against extracted keywords and scores them.
 *
 * Scoring rubric:
 *   Article title match  → +3 per keyword hit
 *   Article tag match    → +2 per keyword hit
 *   Article content match→ +1 per keyword hit
 *   Node title match     → +2 per keyword hit
 *
 * Only results with score > 0 are returned.
 * Top 5 results are returned after combined ranking.
 * ─────────────────────────────────────────────────────────
 */

const pool = require('../config/db');

// ── Article Retrieval ─────────────────────────────────────

/**
 * Fetches all non-archived articles in a workspace, then scores
 * each article in JS (avoids messy SQL full-text ranking logic).
 *
 * @param {number|string} workspaceId
 * @param {string[]}      keywords
 * @returns {Promise<ArticleResult[]>}
 */
async function retrieveArticles(workspaceId, keywords) {
    const { rows } = await pool.query(
        `SELECT
            a.id,
            a.title,
            a.content,
            COALESCE(array_agg(t.tag) FILTER (WHERE t.tag IS NOT NULL), '{}') AS tags
         FROM articles a
         LEFT JOIN article_tags t ON a.id = t.article_id
         WHERE a.workspace_id = $1
           AND a.is_archived = FALSE
         GROUP BY a.id`,
        [workspaceId]
    );

    const scored = rows
        .map(article => scoreArticle(article, keywords))
        .filter(r => r !== null && r.score > 0);

    return scored;
}

/**
 * Score a single article against extracted keywords.
 * @param {object}   article  - DB row (id, title, content, tags)
 * @param {string[]} keywords
 * @returns {ArticleResult|null}
 */
function scoreArticle(article, keywords) {
    const titleLower   = article.title.toLowerCase();
    const contentLower = article.content ? article.content.toLowerCase() : '';
    const tags         = (article.tags || []).map(t => (t || '').toLowerCase());

    let score = 0;
    let snippet = '';

    for (const kw of keywords) {
        // Title match = +3
        if (titleLower.includes(kw)) score += 3;

        // Tag match = +2
        if (tags.some(tag => tag.includes(kw))) score += 2;

        // Content match = +1 (first match also generates snippet)
        if (contentLower.includes(kw)) {
            score += 1;
            if (!snippet) snippet = buildSnippet(article.content, kw);
        }
    }

    if (score === 0) return null;

    return {
        type:    'article',
        id:      article.id,
        title:   article.title,
        score,
        // Expose full content for context builder (not for the response)
        content: article.content,
        tags:    article.tags.filter(Boolean),
        snippet: snippet || (article.content ? article.content.substring(0, 150) + '…' : '')
    };
}

// ── Workflow Retrieval ────────────────────────────────────

/**
 * Scores workflow nodes across all workflows in a workspace.
 * If a matching node has a linked article, that article's data
 * is loaded and attached to give context to the builder.
 *
 * @param {number|string} workspaceId
 * @param {string[]}      keywords
 * @returns {Promise<WorkflowResult[]>}
 */
async function retrieveWorkflowNodes(workspaceId, keywords) {
    const { rows } = await pool.query(
        `SELECT
            n.id,
            n.title,
            n.type,
            n.description,
            n.linked_article_id,
            w.id   AS workflow_id,
            w.title AS workflow_title
         FROM workflow_nodes n
         JOIN workflows w ON n.workflow_id = w.id
         WHERE w.workspace_id = $1`,
        [workspaceId]
    );

    const scored = [];

    for (const node of rows) {
        const score = scoreNode(node, keywords);
        if (score === 0) continue;

        const result = {
            type:           'workflow_node',
            id:             node.id,
            workflow_id:    node.workflow_id,
            workflow_title: node.workflow_title,
            title:          node.title,
            node_type:      node.type,
            score,
            snippet: `Step "${node.title}" (${node.type}) in workflow "${node.workflow_title}".`
        };

        // If node links to an article, attach that article's content for richer context
        if (node.linked_article_id) {
            const art = await pool.query(
                'SELECT id, title, content FROM articles WHERE id = $1',
                [node.linked_article_id]
            );
            if (art.rows.length) result.linked_article = art.rows[0];
        }

        scored.push(result);
    }

    return scored;
}

/**
 * Score a workflow node against extracted keywords.
 * @param {object}   node
 * @param {string[]} keywords
 * @returns {number} score
 */
function scoreNode(node, keywords) {
    const titleLower = (node.title || '').toLowerCase();
    const descLower  = (node.description || '').toLowerCase();

    let score = 0;
    for (const kw of keywords) {
        if (titleLower.includes(kw))   score += 2;
        if (descLower.includes(kw))    score += 1;
    }
    return score;
}

// ── Workflow Step Extraction ──────────────────────────────

/**
 * Given a workflow_id, returns its ordered step titles.
 * Order: position_y ASC → position_x ASC → id ASC
 *
 * @param {number|string} workflowId
 * @returns {Promise<string[]>}
 */
async function getWorkflowSteps(workflowId) {
    const { rows } = await pool.query(
        `SELECT title
         FROM workflow_nodes
         WHERE workflow_id = $1
         ORDER BY
            COALESCE(position_y, 0) ASC,
            COALESCE(position_x, 0) ASC,
            id ASC`,
        [workflowId]
    );
    return rows.map(r => r.title);
}

// ── Combined Ranking ──────────────────────────────────────

/**
 * Merge article and workflow results, sort by score desc,
 * attach ordered workflow steps, and cap at top N.
 *
 * @param {ArticleResult[]}  articles
 * @param {WorkflowResult[]} nodes
 * @param {number}           limit  - Default 5
 * @returns {Promise<RankedResult[]>}
 */
async function rankResults(articles, nodes, limit = 5) {
    const combined = [...articles, ...nodes];
    combined.sort((a, b) => b.score - a.score);

    const top = combined.slice(0, limit);

    // Attach full workflow step list to any workflow_node result
    for (const item of top) {
        if (item.type === 'workflow_node') {
            item.workflow_steps = await getWorkflowSteps(item.workflow_id);
        }
    }

    return top;
}

// ── Snippet Helper ────────────────────────────────────────

/**
 * Generates a ~150-char snippet centered on the first keyword occurrence.
 * @param {string} content
 * @param {string} keyword
 * @returns {string}
 */
function buildSnippet(content, keyword) {
    if (!content) return '';
    const idx = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx === -1) return content.substring(0, 150) + '…';

    const start = Math.max(0, idx - 60);
    const end   = Math.min(content.length, idx + 120);
    let   snip  = content.substring(start, end);

    if (start > 0)           snip = '…' + snip;
    if (end < content.length) snip = snip + '…';

    return snip;
}

module.exports = {
    retrieveArticles,
    retrieveWorkflowNodes,
    rankResults,
    getWorkflowSteps
};
