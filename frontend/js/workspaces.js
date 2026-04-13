// ==========================================
// WORKSPACE MANAGEMENT & MEMBERS LOGIC
// ==========================================

let currentWorkspaceId = null;
let currentUserRole = null;

async function loadWorkspaces() {
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/workspaces`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const workspaces = await res.json();
            const container = document.getElementById("workspacesContainer");

            if (workspaces.length === 0) {
                container.innerHTML = "<p>You don't belong to any workspaces yet.</p>";
                return;
            }

            container.innerHTML = workspaces.map(ws => `
                <div class="workspace-item">
                    <div class="workspace-info">
                        <h4>${ws.name} <span style="font-size:12px; font-weight:normal; color:#888;">(${ws.user_role})</span></h4>
                        <p>${ws.description || 'No description'}</p>
                    </div>
                    <button class="manage-btn" data-id="${ws.id}" data-role="${ws.user_role}" data-name="${ws.name}">Manage</button>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Error loading workspaces", err);
    }
}

async function manageWorkspace(id, role, name) {
    currentWorkspaceId = id;
    currentUserRole = role;

    document.getElementById("managerWsName").innerText = name;
    document.getElementById("managerWsRole").innerText = `Your Role: ${role}`;

    document.getElementById("workspacesListView").style.display = "none";
    document.getElementById("workspaceManagerView").style.display = "block";

    // Show add member form & Create article button based on role
    const addForm = document.getElementById("addMemberForm");
    const createArtBtn = document.getElementById("createArticleBtn");
    if (role === 'Owner' || role === 'Admin') {
        if (addForm) addForm.style.display = "flex";
        if (createArtBtn) createArtBtn.style.display = "block";
        document.getElementById("createWorkflowBtn").style.display = "block";
        document.getElementById("deleteWfBtn").style.display = "inline-block";
    } else if (role === 'Editor') {
        if (addForm) addForm.style.display = "none";
        if (createArtBtn) createArtBtn.style.display = "block";
        document.getElementById("createWorkflowBtn").style.display = "block";
        document.getElementById("deleteWfBtn").style.display = "none";
    } else {
        if (addForm) addForm.style.display = "none";
        if (createArtBtn) createArtBtn.style.display = "none";
        document.getElementById("createWorkflowBtn").style.display = "none";
        document.getElementById("deleteWfBtn").style.display = "none";
    }

    // Node/Edge controls for Editor+
    document.getElementById("addNodeContainer").style.display = (role === 'Viewer') ? 'none' : 'block';

    // Standard reset tabs
    if (typeof switchWsTab === 'function') {
        switchWsTab('members');
    }
    await loadMembers();
}

document.addEventListener("DOMContentLoaded", () => {
    // Create Workspace Form
    const createWsForm = document.getElementById("createWorkspaceForm");
    if (createWsForm) {
        createWsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const token = getToken();
            const name = document.getElementById("newWsName").value;
            const description = document.getElementById("newWsDesc").value;

            try {
                const res = await fetch(`${API_BASE}/workspaces`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, description })
                });

                if (res.ok) {
                    document.getElementById("newWsName").value = '';
                    document.getElementById("newWsDesc").value = '';
                    await loadWorkspaces();
                } else {
                    const data = await res.json();
                    alert(data.message);
                }
            } catch (err) {
                console.error("Error creating workspace", err);
            }
        });
    }

    // Back to list button
    const backBtn = document.getElementById("backToWsListBtn");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            document.getElementById("workspaceManagerView").style.display = "none";
            document.getElementById("workspacesListView").style.display = "block";
            currentWorkspaceId = null;
            currentUserRole = null;
        });
    }

    // Delegated click listener for dynamic "Manage" buttons
    document.getElementById("workspacesContainer")?.addEventListener("click", (e) => {
        if (e.target.classList.contains("manage-btn")) {
            const id = e.target.getAttribute("data-id");
            const role = e.target.getAttribute("data-role");
            const name = e.target.getAttribute("data-name");
            manageWorkspace(id, role, name);
        }
    });
});


// ── Members ─────────────────────────────────

async function loadMembers() {
    if (!currentWorkspaceId) return;
    const token = getToken();

    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/members`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const members = await res.json();
            const tbody = document.getElementById("membersTableBody");

            tbody.innerHTML = members.map(m => {
                const canEdit = (currentUserRole === 'Owner' && m.role !== 'Owner') ||
                    (currentUserRole === 'Admin' && m.role !== 'Owner' && m.role !== 'Admin');

                let actionHtml = '';
                if (canEdit || currentUserRole === 'Owner') {
                    actionHtml = `
                        <select class="action-select" onchange="updateMemberRole(${m.id}, this.value)">
                            <option value="Viewer" ${m.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
                            <option value="Editor" ${m.role === 'Editor' ? 'selected' : ''}>Editor</option>
                            <option value="Admin" ${m.role === 'Admin' ? 'selected' : ''}>Admin</option>
                            ${currentUserRole === 'Owner' ? `<option value="Owner" ${m.role === 'Owner' ? 'selected' : ''}>Owner</option>` : ''}
                        </select>
                        <button class="remove-btn" onclick="removeMember(${m.id})">Remove</button>
                    `;
                } else {
                    actionHtml = `<span style="color:#999;font-size:12px;">No access</span>`;
                }

                if (m.role === 'Owner') {
                    if (currentUserRole !== 'Owner') {
                        actionHtml = '';
                    }
                }

                return `
                    <tr>
                        <td>${m.first_name} ${m.last_name || ''}</td>
                        <td>${m.email}</td>
                        <td>${m.role}</td>
                        <td>${actionHtml}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error("Error loading members", err);
    }
}

document.getElementById("addMemberForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentWorkspaceId) return;

    const token = getToken();
    const email = document.getElementById("newMemberEmail").value;
    const role = document.getElementById("newMemberRole").value;

    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ user_email: email, role })
        });

        if (res.ok) {
            document.getElementById("newMemberEmail").value = '';
            await loadMembers();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (err) {
        console.error("Error adding member", err);
    }
});

async function updateMemberRole(userId, newRole) {
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/members/${userId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ role: newRole })
        });

        if (res.ok) {
            await loadMembers();
        } else {
            const data = await res.json();
            alert(data.message);
            await loadMembers();
        }
    } catch (err) {
        console.error("Error updating role", err);
    }
}

async function removeMember(userId) {
    if (!confirm("Are you sure you want to remove this member?")) return;

    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/members/${userId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            await loadMembers();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (err) {
        console.error("Error removing member", err);
    }
}
