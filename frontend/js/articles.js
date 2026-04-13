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
                container.innerHTML = `<p style="color:#666;">No articles found in this workspace.</p>`;
                return;
            }

            container.innerHTML = articles.map(a => `
                <div class="article-card" onclick="openArticleEditor(${a.id})">
                    <h4>${a.title}</h4>
                    <p class="article-meta">By ${a.author_first_name} ${a.author_last_name || ''} | Updated: ${new Date(a.updated_at).toLocaleDateString()}</p>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error("Error loading articles", err);
    }
}

function openArticleEditor(articleId) {
    document.getElementById("articlesListView").style.display = "none";
    document.getElementById("articleEditorView").style.display = "block";
    document.getElementById("markdownPreviewBox").style.display = "none";

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
                    document.getElementById("readArticleTags").innerText = data.tags ? data.tags.map(t => `#${t}`).join(' ') : "";
                    document.getElementById("readArticleContent").innerHTML = marked.parse(data.content);
                    document.getElementById("readArticleAuthor").innerText = `${data.editor_first_name} ${data.editor_last_name || ''}`;

                    // Populate Edit Mode (in case they toggle)
                    document.getElementById("editArticleTitle").value = data.title;
                    document.getElementById("editArticleContent").value = data.content;
                    document.getElementById("editArticleTags").value = data.tags ? data.tags.join(', ') : "";

                    // Role Based Actions
                    const actions = document.getElementById("readModeActions");
                    const archBtn = document.querySelector(".remove-btn[onclick='archiveArticle()']");

                    if (currentUserRole === 'Owner' || currentUserRole === 'Admin') {
                        actions.style.display = "block";
                        archBtn.style.display = "inline-block";
                    } else if (currentUserRole === 'Editor') {
                        actions.style.display = "block";
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
    }
}

function toggleArticleEditMode(isEditing) {
    document.getElementById("articleForm").style.display = isEditing ? "block" : "none";
    document.getElementById("articleReadMode").style.display = isEditing ? "none" : "block";
}

function closeArticleEditor() {
    document.getElementById("articleEditorView").style.display = "none";
    document.getElementById("articlesListView").style.display = "block";

    // Reload list to reflect changes
    loadArticles();
}

function previewMarkdown() {
    const content = document.getElementById("editArticleContent").value;
    const previewBox = document.getElementById("markdownPreviewBox");
    previewBox.innerHTML = marked.parse(content);
    previewBox.style.display = previewBox.style.display === "none" ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
    // Submit Article (Create or Update)
    const artForm = document.getElementById("articleForm");
    if (artForm) {
        artForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const token = getToken();

            const articleId = document.getElementById("editArticleId").value;
            const title = document.getElementById("editArticleTitle").value;
            const content = document.getElementById("editArticleContent").value;
            const tags = document.getElementById("editArticleTags").value
                .split(',').map(t => t.trim()).filter(t => t.length > 0);

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
                    alert(articleId ? "Article updated!" : "Article created!");
                    closeArticleEditor();
                } else {
                    const data = await res.json();
                    alert(data.message);
                }
            } catch (err) {
                console.error("Error saving article", err);
            }
        });
    }
});

async function archiveArticle() {
    const articleId = document.getElementById("editArticleId").value;
    if (!articleId) return;
    if (!confirm("Archive this article? It will be hidden from the list.")) return;

    const token = getToken();

    try {
        const res = await fetch(`${API_BASE}/workspaces/${currentWorkspaceId}/articles/${articleId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            alert("Article archived.");
            closeArticleEditor();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (err) {
        console.error("Error archiving article", err);
    }
}
