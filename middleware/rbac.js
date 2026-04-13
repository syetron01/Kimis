const pool = require('../config/db');

// Workspace role hierarchy — higher number = more privilege
const roleHierarchy = {
    'Owner': 4,
    'Admin': 3,
    'Editor': 2,
    'Viewer': 1
};

// Middleware to check if the user has at least `minRole` in the workspace
function requireWorkspaceRole(minRole) {
    return async (req, res, next) => {
        const workspaceId = req.params.workspaceId || req.body.workspaceId;
        const userId = req.user.id;

        if (!workspaceId) {
            return res.status(400).json({ message: "Workspace ID is required" });
        }

        try {
            const result = await pool.query(
                "SELECT role FROM workspace_memberships WHERE user_id = $1 AND workspace_id = $2",
                [userId, workspaceId]
            );

            if (result.rows.length === 0) {
                return res.status(403).json({ message: "Access denied: Not a member of this workspace" });
            }

            const userRole = result.rows[0].role;
            if (roleHierarchy[userRole] < roleHierarchy[minRole]) {
                return res.status(403).json({ message: `Access denied: Required role ${minRole} or higher` });
            }

            req.workspaceRole = userRole;
            next();
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Server error during role verification" });
        }
    };
}

module.exports = { requireWorkspaceRole, roleHierarchy };
