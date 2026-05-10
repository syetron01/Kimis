/**
 * AI Retrieval Module — Frontend Logic (redesigned)
 */

async function askAI() {
    const queryInput    = document.getElementById('aiQueryInput');
    const resultsEl     = document.getElementById('aiResultsContainer');
    const askBtn        = document.getElementById('aiAskBtn');
    const query         = queryInput.value.trim();

    if (!query) return;

    const workspaceId = currentWorkspaceId;
    if (!workspaceId) {
        alert('Please select a workspace first.');
        return;
    }

    // Loading state: animate button text
    resultsEl.style.display = 'block';
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

        // Parse safely — never call .json() on plain-text error responses
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (_) {
            throw new Error(`Unexpected server response (${response.status})`);
        }

        if (response.status === 401 || response.status === 403) {
            resultsEl.innerHTML = `
                <div class="ai-no-results" style="color:var(--danger-text)">
                    ⚠️ Session expired. <a href="login.html" style="color:var(--text-accent)">Please log in again.</a>
                </div>`;
            return;
        }

        if (!response.ok) throw new Error(data.message || 'Query failed.');

        renderAIResults(data.keywords || [], data.results || []);
    } catch (err) {
        console.error('AI Assistant Error:', err);
        resultsEl.innerHTML = `<div class="ai-no-results" style="color:var(--danger-text)">⚠️ ${err.message}</div>`;
    } finally {
        askBtn.textContent = 'Ask AI';
        askBtn.disabled    = false;
    }
}

/**
 * Render ranked results using the new design-system classes.
 * Highlights matched keywords in orange.
 */
function renderAIResults(keywords, results) {
    const container = document.getElementById('aiResultsContainer');

    if (!results.length) {
        container.innerHTML = `<div class="ai-no-results">No direct matches found. Try different keywords.</div>`;
        return;
    }

    let html = `<div style="font-size:12px;color:var(--text-tertiary);padding-top:12px;">${results.length} result${results.length > 1 ? 's' : ''} found</div>`;

    results.forEach(item => {
        const typeClass = item.type === 'article' ? 'badge-article' : 'badge-node';
        const typeLabel = item.type === 'article' ? 'Article' : 'Node';

        // Highlight keyword matches in orange
        let snippet = item.snippet || '';
        keywords.forEach(kw => {
            const re = new RegExp(`(${kw})`, 'gi');
            snippet = snippet.replace(re, '<span class="keyword-match">$1</span>');
        });

        let workflowHtml = '';
        if (item.workflow && item.workflow.steps && item.workflow.steps.length) {
            const stepsHtml = item.workflow.steps.map((step, i) =>
                `<span class="ai-step">${step}</span>${i < item.workflow.steps.length - 1 ? '<span class="ai-step-arrow">→</span>' : ''}`
            ).join('');
            workflowHtml = `
                <div class="ai-workflow-steps" style="margin-top:8px;">
                    <span style="font-size:11px;color:var(--text-tertiary);margin-right:4px;">Path:</span>
                    ${stepsHtml}
                </div>`;
        }

        html += `
            <div class="ai-result-row">
                <span class="badge ${typeClass}" style="flex-shrink:0;margin-top:2px;">${typeLabel}</span>
                <div class="ai-result-body">
                    <div class="ai-result-title">${item.title}</div>
                    <div class="ai-result-snippet">${snippet}</div>
                    ${workflowHtml}
                </div>
                <div class="ai-result-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
                    </svg>
                </div>
            </div>`;
    });

    container.innerHTML = html;
}

// Enter key support
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('aiQueryInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') askAI();
        });
    }
});
