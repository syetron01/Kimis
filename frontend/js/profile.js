// ==========================================
// USER PROFILE & ADMIN PANEL LOGIC
// ==========================================

async function loadUserInfo() {
    const token = getToken();

    try {
        const res = await fetch(`${API_BASE}/me`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();

            const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || '—';
            const initials = [data.first_name?.[0], data.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';

            // ── Profile section ───────────────────────────
            setEl("profileFullName",  fullName);
            setEl("profileUsername",  data.username ? `@${data.username}` : '—');
            setEl("userEmail",        data.email      || '—');
            setEl("userJobTitle",     data.job_title  || '—');
            setEl("userDepartment",   data.department || '—');
            setEl("userRoleDetail",   data.role       || '—');
            // Large profile avatar
            populateAvatar('displayImgLarge', 'avatarInitialsLarge', data.profile_picture, initials);

            // Populate edit form
            setVal("editFirstName",  data.first_name  || "");
            setVal("editLastName",   data.last_name   || "");
            setVal("editUsername",   data.username    || "");
            setVal("editJobTitle",   data.job_title   || "");
            setVal("editDepartment", data.department  || "");

            // Show admin panel if admin
            if (data.role === "admin") {
                const adminPanel = document.getElementById("adminPanel");
                if (adminPanel) adminPanel.style.display = "block";
            }

            // Show workspaces section and load workspaces
            const wsSection = document.getElementById("sectionWorkspaces");
            if (wsSection) wsSection.style.display = "block";
            await loadWorkspaces();

        } else {
            logout();
        }
    } catch (error) {
        console.error("Error verifying token:", error);
    }
}

function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function populateAvatar(imgId, initialsId, profilePicturePath, initials) {
    const img      = document.getElementById(imgId);
    const initsEl  = document.getElementById(initialsId);
    if (!img && !initsEl) return;
    if (profilePicturePath) {
        if (img) { img.src = `http://localhost:8080${profilePicturePath}`; img.style.display = 'block'; }
        if (initsEl) initsEl.style.display = 'none';
    } else {
        if (img) img.style.display = 'none';
        if (initsEl) { initsEl.textContent = initials; initsEl.style.display = 'inline'; }
    }
}

document.addEventListener("DOMContentLoaded", () => {

    // Save Changes
    const editForm = document.getElementById("editForm");
    if (editForm) {
        editForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const token   = getToken();
            const saveBtn = e.target.querySelector(".btn-primary");

            const formData = new FormData();
            formData.append("first_name",  document.getElementById("editFirstName").value);
            formData.append("last_name",   document.getElementById("editLastName").value);
            formData.append("username",    document.getElementById("editUsername").value);
            formData.append("job_title",   document.getElementById("editJobTitle").value);
            formData.append("department",  document.getElementById("editDepartment").value);

            const fileInput = document.getElementById("editProfilePic");
            if (fileInput && fileInput.files[0]) {
                formData.append("profile_picture", fileInput.files[0]);
            }

            if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving···"; }

            try {
                const res = await fetch(`${API_BASE}/me`, {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });

                if (res.ok) {
                    showToast("Profile updated successfully", "success");
                    if (saveBtn) { saveBtn.textContent = "Saved ✓"; saveBtn.style.color = "var(--success-text)"; }
                    setTimeout(async () => {
                        await loadUserInfo();
                        cancelEdit();
                        if (saveBtn) { saveBtn.textContent = "Save Changes"; saveBtn.style.color = ""; saveBtn.disabled = false; }
                    }, 1500);
                } else {
                    const err = await res.json();
                    showToast("Update failed: " + err.message, "error");
                    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Changes"; }
                }
            } catch (error) {
                console.error("Update error:", error);
                showToast("Error connecting to server", "error");
                if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save Changes"; }
            }
        });
    }

    // Admin functionality
    const adminBtn = document.getElementById("fetchAdminDataBtn");
    if (adminBtn) {
        adminBtn.addEventListener("click", async function () {
            const token     = getToken();
            const resultDiv = document.getElementById("adminResult");

            resultDiv.textContent = "Fetching···";

            try {
                const res = await fetch(`${API_BASE}/admin-data`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                    resultDiv.style.color = "var(--success-text)";
                } else {
                    const error = await res.json();
                    resultDiv.textContent = `Error: ${error.message} (${res.status})`;
                    resultDiv.style.color = "var(--danger-text)";
                }
            } catch {
                resultDiv.textContent = "Error: Server not reachable.";
                resultDiv.style.color = "var(--danger-text)";
            }
        });
    }
});
