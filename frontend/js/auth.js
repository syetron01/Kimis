// ==========================================
// AUTH HELPERS & SESSION MANAGEMENT
// ==========================================

const API_BASE = "http://localhost:8080/api";

function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function authHeaders() {
    return { "Authorization": `Bearer ${getToken()}` };
}

function logout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = "login.html";
}

// Boot: redirect if no token, otherwise load the dashboard
document.addEventListener("DOMContentLoaded", () => {
    const token = getToken();
    if (!token) {
        window.location.href = "login.html";
        return;
    }
    loadUserInfo();

    // Attach logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }
});
