/**
 * services/responseFormatter.js
 * ─────────────────────────────────────────────────────────
 * Formats the final API response payload.
 *
 * Combines:
 *  - Original query
 *  - Gemini's grounded natural-language answer
 *  - Confidence level
 *  - Deduplicated source metadata
 *  - Primary workflow steps (if present)
 *  - Legacy `results` array (for backward-compat with existing frontend)
 * ─────────────────────────────────────────────────────────
 */

/**
 * Formats the complete AI query response.
 *
 * @param {object} options
 * @param {string}            options.query       - Original user query
 * @param {string[]}          options.keywords    - Extracted keywords
 * @param {string}            options.answer      - Gemini-generated text
 * @param {string}            options.confidence  - 'high'|'medium'|'low'|'none'
 * @param {SourceMeta[]}      options.sources     - Articles + workflows used
 * @param {WorkflowMeta|null} options.workflow    - Primary workflow with steps
 * @param {RankedResult[]}    options.rawResults  - Raw ranked results (for legacy renderer)
 * @returns {FormattedResponse}
 */
function formatResponse({
    query,
    keywords,
    answer,
    confidence,
    sources,
    workflow,
    rawResults
}) {
    // Deduplicate sources by type+id
    const seen    = new Set();
    const dedupedSources = sources.filter(s => {
        const key = `${s.type}:${s.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        // ── Core fields ───────────────────────────
        query,
        answer,
        confidence,

        // ── Metadata for UI display ───────────────
        sources: dedupedSources,

        // ── Workflow step-by-step guidance ─────────
        workflow: workflow
            ? { id: workflow.id, title: workflow.title, steps: workflow.steps }
            : null,

        // ── Legacy: keep `keywords` + `results` so the
        //    existing ai.js frontend renderer still works
        //    until it is updated to consume the new schema.
        keywords,
        results: rawResults.map(r => ({
            type:     r.type,
            id:       r.id,
            title:    r.title,
            score:    r.score,
            snippet:  r.snippet || '',
            workflow: r.type === 'workflow_node' && r.workflow_steps?.length
                ? { id: r.workflow_id, steps: r.workflow_steps }
                : undefined
        }))
    };
}

module.exports = { formatResponse };
