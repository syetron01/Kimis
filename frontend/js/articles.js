// ==========================================
// KNOWLEDGE ARTICLES LOGIC & TABS
// ==========================================

function switchWsTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) targetContent.classList.add('active');

    if (tabName === 'articles') {
        loadArticles();
        closeArticleEditor();
    } else if (tabName === 'workflows') {
        if (typeof loadWorkflows === 'function') {
            loadWorkflows();
        }
    }
}

async function loadArticles() {
    if (!currentWorkspaceId) return;
    const token = getToken();

    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/articles`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const container = document.getElementById("articlesListContainer");

        if (res.ok) {
            const articles = await res.json();

            if (articles.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-tertiary);margin-bottom:12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <p>No articles yet. Create one to get started.</p>
                    </div>`;
                return;
            }

            container.innerHTML = articles.map(a => {
                const date = new Date(a.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const initials = [a.author_first_name?.[0], (a.author_last_name || '')?.[0]].filter(Boolean).join('').toUpperCase() || '?';
                const tags = a.tags && a.tags.length ? a.tags.map(t => `<span class="article-tag">#${t}</span>`).join('') : '';

                return `
                    <div class="article-row-card" onclick="openArticleEditor(${a.id})">
                        <div class="article-row-accent"></div>
                        <div class="article-row-body">
                            <div class="article-row-title">${a.title}</div>
                            ${tags ? `<div class="article-tags-row">${tags}</div>` : ''}
                            <div class="article-row-meta">
                                <div class="article-author-chip">
                                    <div class="article-author-avatar">${initials}</div>
                                    <span>${a.author_first_name} ${a.author_last_name || ''}</span>
                                </div>
                                <div class="article-row-date">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    ${date}
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
        console.error("Error loading articles", err);
    }
}

function openArticleEditor(articleId) {
    document.getElementById("articlesListView").style.display = "none";
    document.getElementById("articleEditorView").style.display = "block";

    document.getElementById("editArticleId").value = "";
    document.getElementById("editArticleTitle").value = "";
    document.getElementById("editArticleTags").value = "";
    document.getElementById("editArticleContent").value = "";

    const form = document.getElementById("articleForm");
    const readMode = document.getElementById("articleReadMode");

    if (articleId) {
        // Editing existing article
        document.getElementById("editorTitleMode").innerText = "View Article";
        form.style.display = "none"; // start in read mode
        readMode.style.display = "block";
        document.getElementById("saveArticleBtn").style.display = "none";
        document.getElementById("editArticleId").value = articleId;

        // Fetch full article
        const token = getToken();
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/articles/${articleId}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    // Populate Read Mode
                    document.getElementById("readArticleTitle").innerText = data.title;

                    // Tags as styled chips
                    const tagsEl = document.getElementById("readArticleTags");
                    tagsEl.innerHTML = data.tags && data.tags.length
                        ? data.tags.map(t => `<span class="article-tag">#${t}</span>`).join('')
                        : '';

                    document.getElementById("readArticleContent").innerHTML = marked.parse(data.content);

                    // Author name + avatar initials
                    const authorName = `${data.editor_first_name} ${data.editor_last_name || ''}`.trim();
                    document.getElementById("readArticleAuthor").innerText = authorName;
                    const initials = [data.editor_first_name?.[0], (data.editor_last_name || '')?.[0]].filter(Boolean).join('').toUpperCase() || '?';
                    document.getElementById("readArticleAvatarEl").innerText = initials;

                    // Date
                    const dateStr = data.updated_at
                        ? new Date(data.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : '—';
                    document.getElementById("readArticleDate").innerText = dateStr;

                    // Populate Edit Mode (in case they toggle)
                    document.getElementById("editArticleTitle").value = data.title;
                    document.getElementById("editArticleContent").value = data.content;
                    document.getElementById("editArticleTags").value = data.tags ? data.tags.join(', ') : "";

                    // Role Based Actions
                    const actions = document.getElementById("readModeActions");
                    const archBtn = document.querySelector(".remove-btn[onclick='deleteArticle()']");

                    if (currentUserRole === 'Owner' || currentUserRole === 'Admin') {
                        actions.style.display = "flex";
                        archBtn.style.display = "inline-block";
                    } else if (currentUserRole === 'Editor') {
                        actions.style.display = "flex";
                        archBtn.style.display = "none";
                    } else {
                        actions.style.display = "none";
                    }
                }
            } catch (err) {
                console.error("Error fetching article", err);
            }
        })();
    } else {
        // Creating new article
        document.getElementById("editorTitleMode").innerText = "Create Article";
        form.style.display = "block";
        readMode.style.display = "none";
        document.getElementById("saveArticleBtn").style.display = "inline-block";
    }
}

function toggleArticleEditMode(isEditing) {
    document.getElementById("articleForm").style.display = isEditing ? "block" : "none";
    document.getElementById("articleReadMode").style.display = isEditing ? "none" : "block";
    document.getElementById("saveArticleBtn").style.display = isEditing ? "inline-block" : "none";
}

function toggleArticleDetails() {
    const panel = document.getElementById('articleDetailsPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
    } else {
        panel.style.display = 'none';
    }
}

function closeArticleEditor() {
    document.getElementById("articleEditorView").style.display = "none";
    document.getElementById("articlesListView").style.display = "block";

    // Reload list to reflect changes
    loadArticles();
}


async function saveArticle() {
    const token = getToken();

    const articleId = document.getElementById("editArticleId").value;
    const title = document.getElementById("editArticleTitle").value;
    const content = document.getElementById("editArticleContent").value;
    const tags = document.getElementById("editArticleTags").value
        .split(',').map(t => t.trim()).filter(t => t.length > 0);

    if (!title.trim()) {
        showToast("Article title is required.", 'error');
        return;
    }

    const url = articleId
        ? `${API_BASE}/workspaces/${currentWorkspaceId}/articles/${articleId}`
        : `${API_BASE}/workspaces/${currentWorkspaceId}/articles`;
    const method = articleId ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title, content, tags })
        });

        if (res.ok) {
            showToast(articleId ? "Article updated!" : "Article created!", 'success');
            closeArticleEditor();
        } else {
            const data = await res.json();
            showToast(data.message, 'error');
        }
    } catch (err) {
        console.error("Error saving article", err);
    }
}

async function deleteArticle() {
    const articleId = document.getElementById("editArticleId").value;
    if (!articleId) return;
    const confirmed = await showConfirm("Delete Article", "Are you sure you want to delete this article? This action cannot be undone.");
    if (!confirmed) return;

    const token = getToken();

    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/articles/${articleId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            showToast("Article deleted.", 'success');
            closeArticleEditor();
        } else {
            const data = await res.json();
            showToast(data.message, 'error');
        }
    } catch (err) {
        console.error("Error deleting article", err);
    }
}
