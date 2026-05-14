/**
 * frontend/js/ai.js
 * ─────────────────────────────────────────────────────────
 * KiMiS AI Knowledge Assistant — Frontend Logic
 *
 * Handles:
 *  - Sending queries to POST /api/workspaces/:id/ai/query
 *  - Rendering the Gemini-grounded natural-language answer
 *  - Displaying structured workflow steps
 *  - Displaying source references
 *  - Backward-compatible fallback to legacy results renderer
 * ─────────────────────────────────────────────────────────
 */

async function askAI() {
    const queryInput = document.getElementById('aiQueryInput');
    const resultsEl  = document.getElementById('aiResultsContainer');
    const askBtn     = document.getElementById('aiAskBtn');
    const query      = queryInput.value.trim();

    if (!query) return;

    const workspaceId = currentWorkspaceId;
    if (!workspaceId) {
        alert('Please select a workspace first.');
        return;
    }

    // ── Loading state ────────────────────────────────────
    resultsEl.innerHTML = `<div class="ai-loading"><span class="ai-spinner"></span>Consulting KiMiS Knowledge Base…</div>`;
    askBtn.textContent  = '···';
    askBtn.disabled     = true;

    try {
        const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/ai/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ query })
        });

        const text = await response.text();
        let data;
        try { data = JSON.parse(text); }
        catch (_) { throw new Error(`Unexpected server response (${response.status})`); }

        if (response.status === 401 || response.status === 403) {
            resultsEl.innerHTML = `
                <div class="ai-no-results" style="color:var(--danger-text)">
                    ⚠️ Session expired. <a href="login.html" style="color:var(--text-accent)">Please log in again.</a>
                </div>`;
            return;
        }

        if (!response.ok) throw new Error(data.message || 'Query failed.');

        // ── Render the new Gemini-enhanced response ───────
        renderAIResponse(data);

    } catch (err) {
        console.error('AI Assistant Error:', err);
        resultsEl.innerHTML = `<div class="ai-no-results" style="color:var(--danger-text)">⚠️ ${err.message}</div>`;
    } finally {
        askBtn.textContent = 'Ask AI';
        askBtn.disabled    = false;
    }
}

// ─────────────────────────────────────────────────────────
// Render full Gemini-grounded response
// ─────────────────────────────────────────────────────────
function renderAIResponse(data) {
    const container = document.getElementById('aiResultsContainer');

    // ── Confidence badge ─────────────────────────────────
    const confidenceColors = {
        high:   'var(--success-text,#4ade80)',
        medium: 'var(--text-accent)',
        low:    'var(--text-secondary)',
        none:   'var(--text-tertiary)'
    };
    const confidenceColor = confidenceColors[data.confidence] || confidenceColors.none;
    const confidenceBadge = data.confidence
        ? `<span style="font-size:11px;color:${confidenceColor};border:1px solid ${confidenceColor};border-radius:4px;padding:1px 6px;margin-left:8px;">${data.confidence.toUpperCase()}</span>`
        : '';

    // ── AI Answer block ──────────────────────────────────
    const answerHtml = data.answer
        ? `<div class="ai-answer-block" style="
                margin-top:14px;
                padding:16px 18px;
                background:var(--bg-elevated);
                border:1px solid var(--border-default);
                border-radius:8px;
                font-size:14px;
                line-height:1.75;
                color:var(--text-primary);
                white-space:pre-wrap;
           ">${escapeHtml(data.answer)}</div>`
        : '';

    // ── Workflow steps block ─────────────────────────────
    let workflowHtml = '';
    if (data.workflow && data.workflow.steps && data.workflow.steps.length) {
        const stepsHtml = data.workflow.steps.map((step, i) =>
            `<div style="display:flex;align-items:baseline;gap:10px;padding:6px 0;border-bottom:1px solid var(--border-subtle);">
                <span style="font-size:11px;font-family:'IBM Plex Mono',monospace;color:var(--text-accent);flex-shrink:0;min-width:20px;">${i + 1}.</span>
                <span style="font-size:13px;color:var(--text-primary);">${escapeHtml(step)}</span>
             </div>`
        ).join('');

        workflowHtml = `
            <div style="margin-top:14px;">
                <div style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.07em;color:var(--text-tertiary);margin-bottom:8px;">
                    Workflow: ${escapeHtml(data.workflow.title || 'Steps')}
                </div>
                <div style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:8px;padding:4px 14px;">
                    ${stepsHtml}
                </div>
            </div>`;
    }

    // ── Sources block ────────────────────────────────────
    let sourcesHtml = '';
    if (data.sources && data.sources.length) {
        const articleSources  = data.sources.filter(s => s.type === 'article');
        const workflowSources = data.sources.filter(s => s.type === 'workflow');

        const makePills = (arr, label) => arr.length
            ? arr.map(s => `<span style="
                    font-size:11px;
                    font-family:'IBM Plex Mono',monospace;
                    background:var(--bg-elevated);
                    border:1px solid var(--border-subtle);
                    border-radius:4px;
                    padding:2px 8px;
                    color:var(--text-secondary);
                ">${label}: ${escapeHtml(s.title)}</span>`).join(' ')
            : '';

        sourcesHtml = `
            <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                <span style="font-size:11px;color:var(--text-tertiary);flex-shrink:0;">Sources:</span>
                ${makePills(articleSources,  'Article')}
                ${makePills(workflowSources, 'Workflow')}
            </div>`;
    }

    // ── Fallback raw results ─────────────────────────────
    // Rendered below the answer for additional context visibility
    let rawResultsHtml = '';
    if (data.results && data.results.length) {
        const keywords = data.keywords || [];
        rawResultsHtml = `
            <div style="margin-top:18px;border-top:1px solid var(--border-subtle);padding-top:14px;">
                <div style="font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.07em;color:var(--text-tertiary);margin-bottom:10px;">
                    Matched Knowledge Entries
                </div>
                ${data.results.map(item => renderResultRow(item, keywords)).join('')}
            </div>`;
    }

    // ── Assemble ─────────────────────────────────────────
    container.innerHTML = `
        <div style="padding-top:12px;">
            <div style="display:flex;align-items:center;font-size:12px;color:var(--text-tertiary);">
                KiMiS AI Answer ${confidenceBadge}
            </div>
            ${answerHtml}
            ${workflowHtml}
            ${sourcesHtml}
            ${rawResultsHtml}
        </div>`;
}

// ─────────────────────────────────────────────────────────
// Render a single ranked result row (legacy-style)
// ─────────────────────────────────────────────────────────
function renderResultRow(item, keywords) {
    const typeLabel = item.type === 'article' ? 'Article' : 'Node';
    let snippet = item.snippet || '';
    keywords.forEach(kw => {
        const re = new RegExp(`(${kw})`, 'gi');
        snippet  = snippet.replace(re, '<span class="keyword-match">$1</span>');
    });

    let workflowSteps = '';
    if (item.workflow && item.workflow.steps && item.workflow.steps.length) {
        const stepsHtml = item.workflow.steps.map((step, i) =>
            `<span class="ai-step">${step}</span>${i < item.workflow.steps.length - 1 ? '<span class="ai-step-arrow">→</span>' : ''}`
        ).join('');
        workflowSteps = `
            <div class="ai-workflow-steps" style="margin-top:8px;">
                <span style="font-size:11px;color:var(--text-tertiary);margin-right:4px;">Path:</span>
                ${stepsHtml}
            </div>`;
    }

    let onClickAttr = '';
    let cursorStyle = '';
    if (item.type === 'article') {
        onClickAttr = `onclick="switchWsTab('articles'); openArticleEditor(${item.id});"`;
        cursorStyle = 'cursor: pointer;';
    } else if (item.type === 'workflow_node' || item.type === 'node') {
        onClickAttr = `onclick="switchWsTab('workflows'); openWorkflow(${item.workflow_id});"`;
        cursorStyle = 'cursor: pointer;';
    }

    return `
        <div class="ai-result-row" ${onClickAttr} style="${cursorStyle}">
            <span class="badge ${item.type === 'article' ? 'badge-article' : 'badge-node'}" style="flex-shrink:0;margin-top:2px;">${typeLabel}</span>
            <div class="ai-result-body">
                <div class="ai-result-title">${escapeHtml(item.title)}</div>
                <div class="ai-result-snippet">${snippet}</div>
                ${workflowSteps}
            </div>
            <div class="ai-result-arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
                </svg>
            </div>
        </div>`;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/** Prevent XSS when inserting user/AI text into innerHTML */
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── Enter key support ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('aiQueryInput');
    if (input) {
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') askAI();
        });
    }
});
