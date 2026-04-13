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
                container.innerHTML = `<p style="color:#666;">No workflows created yet.</p>`;
                return;
            }
            container.innerHTML = workflows.map(wf => `
                <div class="article-card" onclick="openWorkflow(${wf.id})">
                    <h4>${wf.title}</h4>
                    <p class="article-meta">${wf.description || 'No description'}</p>
                    <p class="article-meta">Created by: ${wf.first_name} ${wf.last_name || ''}</p>
                </div>
            `).join('');
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
            document.getElementById("wfListView").style.display = "none";
            document.getElementById("wfDetailView").style.display = "block";

            document.getElementById("viewWfTitle").innerText = data.workflow.title;
            document.getElementById("viewWfDesc").innerText = data.workflow.description || "";

            currentGraphNodes = data.nodes;
            renderNodes(data.nodes);
            renderEdges(data.edges, data.nodes);
            populateNodeDropdowns(data.nodes);
            populateArticleDropdown();
        }
    } catch (err) {
        console.error("Error fetching workflow graph", err);
    }
}

function renderNodes(nodes) {
    const container = document.getElementById("nodesListContainer");
    if (!nodes || nodes.length === 0) {
        container.innerHTML = `<p style="color:#888;">No nodes in this workflow.</p>`;
        return;
    }

    container.innerHTML = nodes.map(n => `
        <div class="node-item node-${n.type}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <strong>${n.title}</strong>
                    <span class="node-type-badge">${n.type}</span>
                </div>
                ${(currentUserRole !== 'Viewer' && n.type !== 'start') ? `<button class="remove-btn" style="width:auto; margin:0;" onclick="deleteNode(${n.id})">Remove</button>` : ''}
            </div>
            ${n.description ? `<p style="font-size:13px; margin:6px 0 0 0; color:#555;">${n.description}</p>` : ''}
            ${n.linked_article_id ? `<div style="font-size:12px; color:#3498db; margin-top:5px;">📖 Linked: <strong>${n.article_title}</strong></div>` : ''}
        </div>
    `).join('');
}

function renderEdges(edges, nodes) {
    const container = document.getElementById("edgesListContainer");
    if (!edges || edges.length === 0) {
        container.innerHTML = `<p style="color:#888;">No connections yet.</p>`;
        return;
    }

    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n.title);

    container.innerHTML = edges.map(e => `
        <div class="edge-item">
            <span>${nodeMap[e.from_node_id] || '?'} <span class="edge-arrow">→</span> ${nodeMap[e.to_node_id] || '?'}${e.condition ? ` <em style="color:#f39c12;">[${e.condition}]</em>` : ''}</span>
            ${(currentUserRole !== 'Viewer') ? `<button class="remove-btn" style="width:auto; margin:0;" onclick="deleteEdge(${e.id})">✕</button>` : ''}
        </div>
    `).join('');
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
