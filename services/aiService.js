const pool = require('../config/db');

/**
 * AI Service for keyword-based data retrieval and ranking
 */
class AIService {
    /**
     * Main query processor
     * @param {number} workspaceId 
     * @param {string[]} keywords 
     */
    async processQuery(workspaceId, keywords) {
        if (keywords.length === 0) return [];

        const articles = await this.getScoredArticles(workspaceId, keywords);
        const nodes = await this.getScoredNodes(workspaceId, keywords);

        // Combine and rank
        const results = [...articles, ...nodes];
        results.sort((a, b) => b.score - a.score);

        // Limit to top 5
        const topResults = results.slice(0, 5);

        // Populate workflow data for articles if linked
        for (const item of topResults) {
            if (item.type === 'article' && item.linked_node_id) {
                item.workflow = await this.getWorkflowStepsForNode(item.linked_node_id);
            }
        }

        return topResults;
    }

    /**
     * Retrieves and scores articles based on keywords
     */
    async getScoredArticles(workspaceId, keywords) {
        // We use a manual scoring logic in JavaScript after fetching candidates
        // to keep the SQL simple and maintainable as requested.
        
        const query = `
            SELECT a.id, a.title, a.content, n.id as linked_node_id,
                   array_agg(t.tag) as tags
            FROM articles a
            LEFT JOIN article_tags t ON a.id = t.article_id
            LEFT JOIN workflow_nodes n ON a.id = n.linked_article_id
            WHERE a.workspace_id = $1 AND a.is_archived = FALSE
            GROUP BY a.id, n.id
        `;
        
        const { rows } = await pool.query(query, [workspaceId]);
        
        const scoredArticles = rows.map(article => {
            let score = 0;
            const titleLower = article.title.toLowerCase();
            const contentLower = article.content.toLowerCase();
            const tags = (article.tags || []).map(t => (t ? t.toLowerCase() : ""));

            let matchFound = false;
            let firstMatchSnippet = "";

            keywords.forEach(keyword => {
                // Title match (+3)
                if (titleLower.includes(keyword)) {
                    score += 3;
                    matchFound = true;
                }
                
                // Tag match (+2)
                if (tags.some(tag => tag.includes(keyword))) {
                    score += 2;
                    matchFound = true;
                }

                // Content match (+1)
                if (contentLower.includes(keyword)) {
                    score += 1;
                    matchFound = true;
                    if (!firstMatchSnippet) {
                        firstMatchSnippet = this.generateSnippet(article.content, keyword);
                    }
                }
            });

            if (!matchFound) return null;

            return {
                type: 'article',
                id: article.id,
                title: article.title,
                score: score,
                snippet: firstMatchSnippet || (article.content.substring(0, 150) + "..."),
                linked_node_id: article.linked_node_id
            };
        }).filter(a => a !== null && a.score > 0);

        return scoredArticles;
    }

    /**
     * Retrieves and scores workflow nodes
     */
    async getScoredNodes(workspaceId, keywords) {
        const query = `
            SELECT n.id, n.title, n.type, w.title as workflow_title, w.id as workflow_id
            FROM workflow_nodes n
            JOIN workflows w ON n.workflow_id = w.id
            WHERE w.workspace_id = $1
        `;

        const { rows } = await pool.query(query, [workspaceId]);

        return rows.map(node => {
            let score = 0;
            const titleLower = node.title.toLowerCase();

            keywords.forEach(keyword => {
                if (titleLower.includes(keyword)) {
                    score += 2;
                }
            });

            if (score === 0) return null;

            return {
                type: 'workflow_node',
                id: node.id,
                title: `${node.workflow_title} > ${node.title}`,
                score: score,
                snippet: `Workflow node of type "${node.type}" found in "${node.workflow_title}".`,
                workflow_id: node.workflow_id
            };
        }).filter(n => n !== null);
    }

    /**
     * Helper: Generates a 150-200 char snippet centered around the keyword
     */
    generateSnippet(content, keyword) {
        const index = content.toLowerCase().indexOf(keyword.toLowerCase());
        if (index === -1) return content.substring(0, 150) + "...";

        const start = Math.max(0, index - 60);
        const end = Math.min(content.length, index + 120);
        
        let snippet = content.substring(start, end);
        if (start > 0) snippet = "..." + snippet;
        if (end < content.length) snippet = snippet + "...";
        
        return snippet;
    }

    /**
     * Helper: Fetches all steps of a workflow given a node ID
     */
    async getWorkflowStepsForNode(nodeId) {
        const wfQuery = `
            SELECT workflow_id FROM workflow_nodes WHERE id = $1
        `;
        const wfRes = await pool.query(wfQuery, [nodeId]);
        if (wfRes.rows.length === 0) return null;

        const workflowId = wfRes.rows[0].workflow_id;

        const stepsQuery = `
            SELECT title FROM workflow_nodes 
            WHERE workflow_id = $1 
            ORDER BY position_y ASC, position_x ASC, id ASC
        `;
        const stepsRes = await pool.query(stepsQuery, [workflowId]);

        return {
            id: workflowId,
            steps: stepsRes.rows.map(r => r.title)
        };
    }

    /**
     * Log the query to the database
     */
    async logQuery(workspaceId, query, userId) {
        try {
            await pool.query(
                "INSERT INTO ai_queries (workspace_id, query, user_id) VALUES ($1, $2, $3)",
                [workspaceId, query, userId]
            );
        } catch (err) {
            console.error("AI LOGGING ERROR:", err.message);
        }
    }
}

module.exports = new AIService();
