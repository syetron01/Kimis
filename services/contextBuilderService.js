/**
 * services/contextBuilderService.js
 * ─────────────────────────────────────────────────────────
 * Converts ranked retrieval results into a concise, structured
 * text block that is forwarded to the Gemini API.
 *
 * Goal: give Gemini exactly what it needs to produce a grounded
 * answer — no raw database dumps, no irrelevant fields.
 * ─────────────────────────────────────────────────────────
 */

// Maximum characters of article content to include per article
const MAX_ARTICLE_CONTENT_CHARS = 800;

/**
 * Builds a structured prompt context string from ranked results.
 *
 * @param {string}        userQuery  - Original user query
 * @param {RankedResult[]} results   - Top ranked items from retrieval layer
 * @param {object}        workspaceContext - Overall info about the workspace
 * @returns {{ contextText: string, sources: SourceMeta[], workflow: WorkflowMeta|null }}
 */
function buildContext(userQuery, results, workspaceContext) {
    const articleResults  = results.filter(r => r.type === 'article');
    const workflowResults = results.filter(r => r.type === 'workflow_node');

    // ── Build workspace metadata block ────────────────────
    let workspaceBlock = '';
    const sources    = [];

    if (workspaceContext) {
        workspaceBlock += `Workspace Overview:\n`;
        workspaceBlock += `Name: ${workspaceContext.name}\n`;
        if (workspaceContext.description) workspaceBlock += `Description: ${workspaceContext.description}\n`;
        
        workspaceBlock += `\nMembers (${workspaceContext.members.length}):\n`;
        workspaceContext.members.forEach(m => {
            workspaceBlock += `- ${m.first_name} ${m.last_name} (${m.email}) - Role: ${m.role}\n`;
        });
        
        workspaceBlock += `\nAvailable Articles (${workspaceContext.articleTitles.length}):\n`;
        if (workspaceContext.articleTitles.length) {
            workspaceBlock += `- ${workspaceContext.articleTitles.join(', ')}\n`;
        } else {
            workspaceBlock += `(No articles)\n`;
        }
        
        workspaceBlock += `\nAvailable Workflows (${workspaceContext.workflowTitles.length}):\n`;
        if (workspaceContext.workflowTitles.length) {
            workspaceBlock += `- ${workspaceContext.workflowTitles.join(', ')}\n`;
        } else {
            workspaceBlock += `(No workflows)\n`;
        }
        workspaceBlock += `\n`;

        // Push general workspace context as a source to give a baseline confidence level
        sources.push({ type: 'workspace', id: 'overview', title: 'Workspace Metadata & Members' });
    }

    // ── Collect unique workflow IDs and their steps ─────
    const workflowMap = new Map();
    for (const node of workflowResults) {
        if (!workflowMap.has(node.workflow_id)) {
            workflowMap.set(node.workflow_id, {
                id:    node.workflow_id,
                title: node.workflow_title,
                steps: node.workflow_steps || []
            });
        }
        // If a node has a linked article, push it as an extra article source
        if (node.linked_article) {
            const alreadyIncluded = articleResults.some(a => a.id === node.linked_article.id);
            if (!alreadyIncluded) {
                articleResults.push({
                    type:    'article',
                    id:      node.linked_article.id,
                    title:   node.linked_article.title,
                    content: node.linked_article.content,
                    tags:    [],
                    score:   node.score // inherit parent score
                });
            }
        }
    }

    // ── Build article context block ─────────────────────
    let articleBlock = '';

    if (articleResults.length) {
        articleBlock = 'Retrieved Knowledge Articles (Specifically matching query):\n';
        for (const art of articleResults) {
            const truncatedContent = art.content
                ? art.content.substring(0, MAX_ARTICLE_CONTENT_CHARS) +
                  (art.content.length > MAX_ARTICLE_CONTENT_CHARS ? '\n[content truncated]' : '')
                : '(no content)';

            articleBlock += `\n— Article: "${art.title}"\n${truncatedContent}\n`;

            sources.push({ type: 'article', id: art.id, title: art.title });
        }
    }

    // ── Build workflow context block ────────────────────
    let workflowBlock     = '';
    let primaryWorkflow   = null;

    if (workflowMap.size) {
        workflowBlock = '\nRetrieved Workflow Steps (Specifically matching query):\n';

        let first = true;
        for (const [, wf] of workflowMap) {
            workflowBlock += `\nWorkflow: "${wf.title}"\n`;

            if (wf.steps.length) {
                wf.steps.forEach((step, i) => {
                    workflowBlock += `  ${i + 1}. ${step}\n`;
                });
            } else {
                workflowBlock += '  (no steps defined)\n';
            }

            sources.push({ type: 'workflow', id: wf.id, title: wf.title });

            // Expose the highest-ranked workflow for the structured response field
            if (first && wf.steps.length) {
                primaryWorkflow = { id: wf.id, title: wf.title, steps: wf.steps };
                first = false;
            }
        }
    }

    // ── Combine into single context string ──────────────
    const contextText = [
        `User Question:\n"${userQuery}"`,
        `\n--- CONTEXT ---\n`,
        workspaceBlock,
        articleBlock,
        workflowBlock
    ].filter(Boolean).join('\n');

    return { contextText, sources, workflow: primaryWorkflow };
}

module.exports = { buildContext };
