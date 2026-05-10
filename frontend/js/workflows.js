// ==========================================
// VISUAL WORKFLOW ENGINE LOGIC (Graph-Based)
// ==========================================

let currentWorkflowId = null;
let currentGraphNodes = []; // cache for dropdowns

async function loadWorkflows() {
    if (!currentWorkspaceId) return;
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/workflows`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const container = document.getElementById("workflowsListContainer");
        if (res.ok) {
            const workflows = await res.json();
            if (workflows.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-tertiary);margin-bottom:12px;"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
                        <p>No workflows yet. Create one to map out a process.</p>
                    </div>`;
                return;
            }
            container.innerHTML = workflows.map(wf => {
                const initials = [wf.first_name?.[0], (wf.last_name || '')?.[0]].filter(Boolean).join('').toUpperCase() || '?';
                return `
                    <div class="workflow-item" onclick="openWorkflow(${wf.id})">
                        <div class="workflow-item-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
                        </div>
                        <div class="workflow-item-body">
                            <div class="workflow-item-title">${wf.title}</div>
                            ${wf.description ? `<div class="workflow-item-desc">${wf.description}</div>` : ''}
                            <div class="workflow-item-meta">
                                <div class="article-author-chip">
                                    <div class="article-author-avatar">${initials}</div>
                                    <span>${wf.first_name} ${wf.last_name || ''}</span>
                                </div>
                            </div>
                        </div>
                        <div class="article-row-arrow">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                    </div>`;
            }).join('');
        }
    } catch (err) {
        console.error("Error loading workflows", err);
    }
}

function showCreateWorkflowForm() {
    document.getElementById("createWorkflowFormUI").style.display = "flex";
}
function hideCreateWorkflowForm() {
    document.getElementById("createWorkflowFormUI").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
    const createWfForm = document.getElementById("createWorkflowFormUI");
    if (createWfForm) {
        createWfForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const token = getToken();
            const title = document.getElementById("newWfTitle").value;
            const description = document.getElementById("newWfDesc").value;

            try {
                const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/workflows`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, description })
                });

                if (res.ok) {
                    document.getElementById("newWfTitle").value = '';
                    document.getElementById("newWfDesc").value = '';
                    hideCreateWorkflowForm();
                    await loadWorkflows();
                } else {
                    const data = await res.json();
                    alert(data.message);
                }
            } catch (err) {
                console.error("Error creating workflow", err);
            }
        });
    }

    // Add Node Form
    const addNodeForm = document.getElementById("addNodeForm");
    if (addNodeForm) {
        addNodeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentWorkflowId) return;
            const token = getToken();

            const payload = {
                title: document.getElementById("newNodeTitle").value,
                description: document.getElementById("newNodeDesc").value,
                type: document.getElementById("newNodeType").value,
                linked_article_id: document.getElementById("newNodeArticle").value || null,
                position_x: Math.random() * 400 + 50,
                position_y: (currentGraphNodes.length) * 100 + 50
            };

            try {
                const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/workflows/${currentWorkflowId}/nodes`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    document.getElementById("newNodeTitle").value = '';
                    document.getElementById("newNodeDesc").value = '';
                    document.getElementById("newNodeArticle").value = '';
                    await openWorkflow(currentWorkflowId);
                } else {
                    const data = await res.json();
                    alert(data.message);
                }
            } catch (err) { console.error(err); }
        });
    }

    // Add Edge Form
    const addEdgeForm = document.getElementById("addEdgeForm");
    if (addEdgeForm) {
        addEdgeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentWorkflowId) return;
            const token = getToken();

            const from_node_id = parseInt(document.getElementById("edgeFromNode").value);
            const to_node_id = parseInt(document.getElementById("edgeToNode").value);
            const condition = document.getElementById("edgeCondition").value || null;

            if (!from_node_id || !to_node_id) { alert("Select both nodes."); return; }

            try {
                const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/workflows/${currentWorkflowId}/edges`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                    body: JSON.stringify({ from_node_id, to_node_id, condition })
                });
                if (res.ok) {
                    document.getElementById("edgeCondition").value = '';
                    await openWorkflow(currentWorkflowId);
                } else {
                    const data = await res.json();
                    alert(data.message);
                }
            } catch (err) { console.error(err); }
        });
    }
});

async function openWorkflow(id) {
    currentWorkflowId = id;
    const token = getToken();

    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/workflows/${id}/graph`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            document.getElementById("wfListView").style.display    = "none";
            document.getElementById("wfDetailView").style.display  = "block";

            document.getElementById("viewWfTitle").innerText = data.workflow.title;
            document.getElementById("viewWfDesc").innerText  = data.workflow.description || "";

            currentGraphNodes = data.nodes;

            // Render the FigJam-style canvas
            renderWorkflowCanvas(data.nodes, data.edges);

            // Populate add-node / add-edge forms
            populateNodeDropdowns(data.nodes);
            populateArticleDropdown();
        }
    } catch (err) {
        console.error("Error fetching workflow graph", err);
    }
}

// ── Node type config ───────────────────────────────────
const NODE_CONFIG = {
    start:    { label: 'Start',    color: '#4ADE80', icon: '<path d="M5 3l14 9-14 9V3z"/>' },
    action:   { label: 'Action',   color: '#60A5FA', icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
    decision: { label: 'Decision', color: '#FCD34D', icon: '<line x1="6" y1="3" x2="6" y2="15"/><path d="M18 3a3 3 0 0 1 0 6H6a3 3 0 0 1 0-6"/><path d="M6 21V9"/><circle cx="18" cy="21" r="3"/>' },
    end:      { label: 'End',      color: '#F87171', icon: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' },
    note:     { label: 'Note',     color: '#A1A1AA', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
};

function renderNodes(nodes) {
    const container = document.getElementById("nodesListContainer");
    if (!nodes || nodes.length === 0) {
        container.innerHTML = `<p style="color:var(--text-tertiary);font-size:13px;padding:12px 0;">No nodes in this workflow yet.</p>`;
        return;
    }

    container.innerHTML = nodes.map((n, idx) => {
        const cfg = NODE_CONFIG[n.type] || NODE_CONFIG.note;
        const canDelete = currentUserRole !== 'Viewer' && n.type !== 'start';
        return `
            <div class="node-item node-${n.type}">
                <div class="node-index">${idx + 1}</div>
                <div class="node-content">
                    <div class="node-header">
                        <span class="node-type-chip" style="color:${cfg.color};">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${cfg.icon}</svg>
                            ${cfg.label}
                        </span>
                        ${canDelete ? `
                            <button class="node-delete-btn" onclick="deleteNode(${n.id})" aria-label="Delete node">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>` : ''}
                    </div>
                    <div class="node-title">${n.title}</div>
                    ${n.description ? `<div class="node-description">${n.description}</div>` : ''}
                    ${n.linked_article_id ? `
                        <div class="node-article-link">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            Linked: <strong>${n.article_title}</strong>
                        </div>` : ''}
                </div>
            </div>`;
    }).join('');
}

function renderEdges(edges, nodes) {
    const container = document.getElementById("edgesListContainer");
    if (!edges || edges.length === 0) {
        container.innerHTML = `<p style="color:var(--text-tertiary);font-size:13px;padding:12px 0;">No connections yet. Add nodes above, then connect them.</p>`;
        return;
    }

    const nodeMap = {};
    const nodeTypeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n.title; nodeTypeMap[n.id] = n.type; });

    container.innerHTML = `<div class="edges-list">
        ${edges.map(e => {
            const fromCfg = NODE_CONFIG[nodeTypeMap[e.from_node_id]] || NODE_CONFIG.note;
            const toCfg   = NODE_CONFIG[nodeTypeMap[e.to_node_id]]   || NODE_CONFIG.note;
            const canDelete = currentUserRole !== 'Viewer';
            return `
                <div class="edge-row">
                    <div class="edge-from" style="border-color:${fromCfg.color}33;">
                        <span class="edge-node-dot" style="background:${fromCfg.color};"></span>
                        ${nodeMap[e.from_node_id] || '?'}
                    </div>
                    <div class="edge-connector">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        ${e.condition ? `<span class="edge-condition">${e.condition}</span>` : ''}
                    </div>
                    <div class="edge-to" style="border-color:${toCfg.color}33;">
                        <span class="edge-node-dot" style="background:${toCfg.color};"></span>
                        ${nodeMap[e.to_node_id] || '?'}
                    </div>
                    ${canDelete ? `
                        <button class="node-delete-btn" onclick="deleteEdge(${e.id})" aria-label="Remove edge" style="margin-left:auto;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>` : ''}
                </div>`;
        }).join('')}
    </div>`;
}

function populateNodeDropdowns(nodes) {
    const fromSelect = document.getElementById("edgeFromNode");
    const toSelect = document.getElementById("edgeToNode");
    const options = '<option value="">Select...</option>' +
        nodes.map(n => `<option value="${n.id}">${n.title} (${n.type})</option>`).join('');
    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;
}

async function populateArticleDropdown() {
    const token = getToken();
    const select = document.getElementById("newNodeArticle");
    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/articles`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const articles = await res.json();
            select.innerHTML = '<option value="">None</option>' +
                articles.map(a => `<option value="${a.id}">${a.title}</option>`).join('');
        }
    } catch (err) { }
}

// Add Node - Handled in DOMContentLoaded above


// Add Edge - Handled in DOMContentLoaded above


async function deleteNode(nodeId) {
    if (!confirm("Delete this node? All connected edges will also be removed.")) return;
    const token = getToken();
    try {
        await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/workflows/${currentWorkflowId}/nodes/${nodeId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
        });
        await openWorkflow(currentWorkflowId);
    } catch (err) { }
}

async function deleteEdge(edgeId) {
    if (!confirm("Remove this connection?")) return;
    const token = getToken();
    try {
        await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/workflows/${currentWorkflowId}/edges/${edgeId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
        });
        await openWorkflow(currentWorkflowId);
    } catch (err) { }
}

async function deleteWorkflow() {
    if (!confirm("Delete this ENTIRE workflow? This cannot be undone.")) return;
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/workflows/${currentWorkflowId}`, {
            method: "DELETE", headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) closeWorkflowDetail();
    } catch (err) { }
}

function closeWorkflowDetail() {
    document.getElementById("wfDetailView").style.display = "none";
    document.getElementById("wfListView").style.display = "block";
    currentWorkflowId = null;
    currentGraphNodes = [];
    loadWorkflows();
}
