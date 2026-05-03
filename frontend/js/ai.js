/**
 * AI Retrieval Module Frontend Logic
 */

/**
 * Executes the AI search query
 */
async function askAI() {
    const queryInput = document.getElementById('aiQueryInput');
    const resultsContainer = document.getElementById('aiResultsContainer');
    const query = queryInput.value.trim();

    if (!query) return;

    const workspaceId = currentWorkspaceId; // Assuming this global exists from workspaces.js
    if (!workspaceId) {
        alert("Please select a workspace first.");
        return;
    }

    // Show loading state
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = `
        <div class="ai-loading">
            <div class="ai-loading-spinner"></div>
            <p style="font-size:13px; color:#666; margin-top:10px;">Consulting KiMiS Knowledge Base...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/ai/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ query })
        });

        // Always parse as text first, then try JSON (prevents SyntaxError on plain-text responses)
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (_) {
            throw new Error(`Server returned non-JSON response (status ${response.status})`);
        }

        if (response.status === 401 || response.status === 403) {
            // Token expired or invalid — redirect to login
            resultsContainer.innerHTML = `
                <div class="ai-no-results" style="color:#e74c3c;">
                    ⚠️ Session expired. <a href="login.html">Please log in again.</a>
                </div>
            `;
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch AI results");
        }

        renderAIResults(data.results);
    } catch (err) {
        console.error("AI Assistant Error:", err);
        resultsContainer.innerHTML = `
            <div class="ai-no-results" style="color:#e74c3c;">
                ⚠️ Error: ${err.message}
            </div>
        `;
    }
}

/**
 * Renders the ranked results into the UI
 * @param {Array} results 
 */
function renderAIResults(results) {
    const container = document.getElementById('aiResultsContainer');
    
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="ai-no-results">
                No direct matches found. Try using different keywords.
            </div>
        `;
        return;
    }

    let html = `<div style="font-size:12px; color:#7f8c8d; margin-bottom:10px;">Found ${results.length} relevant items:</div>`;

    results.forEach(item => {
        const typeLabel = item.type === 'article' ? 'Article' : 'Workflow Node';
        
        html += `
            <div class="ai-result-item">
                <div class="ai-result-header">
                    <span class="ai-result-title">${item.title}</span>
                    <span class="ai-result-type">${typeLabel}</span>
                </div>
                <div class="ai-result-snippet">
                    ${item.snippet}
                </div>
        `;

        // If it's an article with a linked workflow, show the steps
        if (item.workflow && item.workflow.steps && item.workflow.steps.length > 0) {
            html += `
                <div class="ai-workflow-box">
                    <span class="ai-workflow-title">🗺️ Recommended Process Path:</span>
                    <div class="ai-workflow-steps">
                        ${item.workflow.steps.map((step, index) => `
                            <span class="ai-step">${step}</span>
                            ${index < item.workflow.steps.length - 1 ? '<span class="ai-step-arrow">→</span>' : ''}
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += `</div>`;
    });

    container.innerHTML = html;
}

// Add event listener for Enter key on the input
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('aiQueryInput');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                askAI();
            }
        });
    }
});
