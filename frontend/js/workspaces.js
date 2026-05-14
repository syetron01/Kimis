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

            container.innerHTML = workspaces.map(ws => {
                const roleClass = {
                    'Owner': 'badge-owner', 'Admin': 'badge-admin',
                    'Editor': 'badge-editor', 'Viewer': 'badge-viewer'
                }[ws.user_role] || 'badge-viewer';

                return `
                    <div class="workspace-card" data-id="${ws.id}" data-role="${ws.user_role}" data-name="${ws.name}">
                        <div class="workspace-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="2" y="11" width="6" height="10" rx="1"/><rect x="9" y="11" width="13" height="10" rx="1"/></svg>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div class="workspace-name">${ws.name}</div>
                            <div class="workspace-meta">${ws.description || 'No description'}</div>
                        </div>
                        <span class="badge ${roleClass} workspace-role">${ws.user_role}</span>
                    </div>`;
            }).join('');

            const urlParams = new URLSearchParams(window.location.search);
            const targetWsId = urlParams.get('workspaceId');
            const targetArtId = urlParams.get('articleId');

            if (targetWsId && !currentWorkspaceId) {
                const ws = workspaces.find(w => w.id == targetWsId);
                if (ws) {
                    manageWorkspace(ws.id, ws.user_role, ws.name).then(() => {
                        if (targetArtId) {
                            setTimeout(() => {
                                switchWsTab('articles');
                                openArticleEditor(targetArtId);
                                window.history.replaceState({}, document.title, window.location.pathname);
                            }, 300);
                        }
                    });
                }
            }
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

    // Delegated click listener for dynamic workspace cards
    document.getElementById("workspacesContainer")?.addEventListener("click", (e) => {
        const card = e.target.closest(".workspace-card");
        if (card) {
            const id   = card.getAttribute("data-id");
            const role = card.getAttribute("data-role");
            const name = card.getAttribute("data-name");
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

                const initials = [m.first_name?.[0], m.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
                const roleClass = {
                    'Owner': 'badge-owner', 'Admin': 'badge-admin',
                    'Editor': 'badge-editor', 'Viewer': 'badge-viewer'
                }[m.role] || 'badge-viewer';

                let actionHtml = '';
                if (canEdit || currentUserRole === 'Owner') {
                    actionHtml = `
                        <select class="action-select" onchange="updateMemberRole(${m.id}, this.value)">
                            <option value="Viewer"  ${m.role === 'Viewer'  ? 'selected' : ''}>Viewer</option>
                            <option value="Editor"  ${m.role === 'Editor'  ? 'selected' : ''}>Editor</option>
                            <option value="Admin"   ${m.role === 'Admin'   ? 'selected' : ''}>Admin</option>
                            ${currentUserRole === 'Owner' ? `<option value="Owner" ${m.role === 'Owner' ? 'selected' : ''}>Owner</option>` : ''}
                        </select>
                        <button class="btn btn-danger btn-sm" onclick="removeMember(${m.id})" style="margin:0;">Remove</button>
                    `;
                } else {
                    actionHtml = `<span style="color:var(--text-tertiary);font-size:12px;">No access</span>`;
                }

                if (m.role === 'Owner' && currentUserRole !== 'Owner') actionHtml = '';

                return `
                    <tr>
                        <td>
                            <div class="member-name-cell">
                                <div class="member-avatar">${initials}</div>
                                <div>
                                    <div class="member-name">${m.first_name} ${m.last_name || ''}</div>
                                    <div class="member-email">${m.email}</div>
                                </div>
                            </div>
                        </td>
                        <td style="color:var(--text-secondary);font-size:13px;">${m.email}</td>
                        <td><span class="badge ${roleClass}">${m.role}</span></td>
                        <td>${actionHtml}</td>
                    </tr>`;
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
