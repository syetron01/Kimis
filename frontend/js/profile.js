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

            // Display labels
            document.getElementById("welcomeMsg").innerText = `Welcome, ${data.first_name || 'User'}!`;
            document.getElementById("userFirstName").innerText = data.first_name || "N/A";
            document.getElementById("userLastName").innerText = data.last_name || "N/A";
            document.getElementById("userUsername").innerText = data.username || "N/A";
            document.getElementById("userEmail").innerText = data.email;
            document.getElementById("userRole").innerText = data.role;
            document.getElementById("userJobTitle").innerText = data.job_title || "N/A";
            document.getElementById("userDepartment").innerText = data.department || "N/A";

            if (data.profile_picture) {
                document.getElementById("displayImg").src = `http://localhost:8080${data.profile_picture}`;
            }

            // Populate edit form
            document.getElementById("editFirstName").value = data.first_name || "";
            document.getElementById("editLastName").value = data.last_name || "";
            document.getElementById("editUsername").value = data.username || "";
            document.getElementById("editJobTitle").value = data.job_title || "";
            document.getElementById("editDepartment").value = data.department || "";

            if (data.role === "admin") {
                document.getElementById("adminPanel").style.display = "block";
            }

            // Load Workspaces after user info is loaded
            document.getElementById("workspacesSection").style.display = "block";
            await loadWorkspaces();
        } else {
            logout();
        }
    } catch (error) {
        console.error("Error verifying token:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Toggle Edit Mode
    const editBtn = document.getElementById("editBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const userInfo = document.getElementById("userInfo");
    const editForm = document.getElementById("editForm");

    if (editBtn && cancelBtn && userInfo && editForm) {
        editBtn.addEventListener("click", () => {
            userInfo.style.display = "none";
            editForm.style.display = "block";
        });

        cancelBtn.addEventListener("click", () => {
            userInfo.style.display = "block";
            editForm.style.display = "none";
        });
    }

    // Save Changes
    if (editForm) {
        editForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const token = getToken();
            const saveBtn = e.target.querySelector(".save-btn");

            const formData = new FormData();
            formData.append("first_name", document.getElementById("editFirstName").value);
            formData.append("last_name", document.getElementById("editLastName").value);
            formData.append("username", document.getElementById("editUsername").value);
            formData.append("job_title", document.getElementById("editJobTitle").value);
            formData.append("department", document.getElementById("editDepartment").value);

            const fileInput = document.getElementById("editProfilePic");
            if (fileInput.files[0]) {
                formData.append("profile_picture", fileInput.files[0]);
            }

            saveBtn.disabled = true;
            saveBtn.innerText = "Saving...";

            try {
                const res = await fetch(`${API_BASE}/me`, {
                    method: "PUT",
                    headers: { "Authorization": `Bearer ${token}` },
                    body: formData
                });

                if (res.ok) {
                    alert("Profile updated successfully!");
                    await loadUserInfo();
                    userInfo.style.display = "block";
                    editForm.style.display = "none";
                } else {
                    const err = await res.json();
                    alert("Update failed: " + err.message);
                }
            } catch (error) {
                console.error("Update error:", error);
                alert("Error connecting to server");
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerText = "Save Changes";
            }
        });
    }

    // Admin functionality
    const adminBtn = document.getElementById("fetchAdminDataBtn");
    if (adminBtn) {
        adminBtn.addEventListener("click", async function () {
            const token = getToken();
            const resultDiv = document.getElementById("adminResult");

            resultDiv.innerText = "Fetching...";
            resultDiv.style.color = "#333";

            try {
                const res = await fetch(`${API_BASE}/admin-data`, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    resultDiv.innerText = JSON.stringify(data, null, 2);
                    resultDiv.style.color = "green";
                } else {
                    const error = await res.json();
                    resultDiv.innerText = `Error: ${error.message} (Status: ${res.status})`;
                    resultDiv.style.color = "red";
                }
            } catch (error) {
                resultDiv.innerText = "Error: Server not reachable.";
                resultDiv.style.color = "red";
            }
        });
    }
});
