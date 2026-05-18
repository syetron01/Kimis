require('dotenv').config();
const pool = require('../config/db');

async function checkAndSeed() {
    try {
        const bobEmail = 'bob@test.com';
        const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [bobEmail]);
        if (userRes.rows.length === 0) {
            console.log("Bob user not found.");
            process.exit(0);
        }
        const bobId = userRes.rows[0].id;

        // Find Bob's "Bob's Engineering Hub" workspace
        const wsRes = await pool.query("SELECT id FROM workspaces WHERE name = $1 AND created_by = $2", ["Bob's Engineering Hub", bobId]);
        
        let workspaceId;
        if (wsRes.rows.length === 0) {
            console.log("Workspace not found, creating it...");
            const newWs = await pool.query(
                "INSERT INTO workspaces (name, description, created_by) VALUES ($1, $2, $3) RETURNING id",
                ["Bob's Engineering Hub", "A sandbox for Bob's projects.", bobId]
            );
            workspaceId = newWs.rows[0].id;
            await pool.query(
                "INSERT INTO workspace_memberships (user_id, workspace_id, role) VALUES ($1, $2, 'Owner')",
                [bobId, workspaceId]
            );
        } else {
            workspaceId = wsRes.rows[0].id;
            console.log(`Working with Workspace ID: ${workspaceId}`);
        }

        // Check Members
        const members = await pool.query("SELECT count(*) FROM workspace_memberships WHERE workspace_id = $1", [workspaceId]);
        console.log(`Members count: ${members.rows[0].count}`);
        if (parseInt(members.rows[0].count) <= 1) {
            console.log("Adding dummy members...");
            const users = await pool.query("SELECT id, email FROM users WHERE email IN ('charlie@test.com', 'edward@test.com', 'alice@test.com')");
            for (const u of users.rows) {
                if (u.id !== bobId) {
                    await pool.query(
                        "INSERT INTO workspace_memberships (user_id, workspace_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
                        [u.id, workspaceId, u.email === 'alice@test.com' ? 'Admin' : 'Viewer']
                    );
                }
            }
        }

        // Check Articles
        const articles = await pool.query("SELECT count(*) FROM articles WHERE workspace_id = $1", [workspaceId]);
        console.log(`Articles count: ${articles.rows[0].count}`);
        if (parseInt(articles.rows[0].count) === 0) {
            console.log("Seeding dummy articles...");
            await pool.query(
                "INSERT INTO articles (title, content, workspace_id, created_by, updated_by) VALUES ($1, $2, $3, $4, $5)",
                ["System Architecture 101", "# Welcome\n\nThis is basic doc for system arch.", workspaceId, bobId, bobId]
            );
            await pool.query(
                "INSERT INTO articles (title, content, workspace_id, created_by, updated_by) VALUES ($1, $2, $3, $4, $5)",
                ["Security Protocols", "Always use SSH and MFA.", workspaceId, bobId, bobId]
            );
        }

        // Check Workflows
        const workflows = await pool.query("SELECT count(*) FROM workflows WHERE workspace_id = $1", [workspaceId]);
        console.log(`Workflows count: ${workflows.rows[0].count}`);
        if (parseInt(workflows.rows[0].count) === 0) {
            console.log("Seeding dummy workflow...");
            const wf = await pool.query(
                "INSERT INTO workflows (title, description, workspace_id, created_by) VALUES ($1, $2, $3, $4) RETURNING id",
                ["Deployment Pipeline", "Standard CI/CD flow", workspaceId, bobId]
            );
            const wfId = wf.rows[0].id;
            
            // Nodes
            const n1 = await pool.query(
                "INSERT INTO workflow_nodes (workflow_id, type, title, position_x, position_y) VALUES ($1, 'start', 'Start', 100, 100) RETURNING id",
                [wfId]
            );
            const n2 = await pool.query(
                "INSERT INTO workflow_nodes (workflow_id, type, title, position_x, position_y) VALUES ($1, 'action', 'Build', 300, 100) RETURNING id",
                [wfId]
            );
            const n3 = await pool.query(
                "INSERT INTO workflow_nodes (workflow_id, type, title, position_x, position_y) VALUES ($1, 'end', 'Deploy', 500, 100) RETURNING id",
                [wfId]
            );

            // Edges
            await pool.query(
                "INSERT INTO workflow_edges (workflow_id, from_node_id, to_node_id) VALUES ($1, $2, $3)",
                [wfId, n1.rows[0].id, n2.rows[0].id]
            );
            await pool.query(
                "INSERT INTO workflow_edges (workflow_id, from_node_id, to_node_id) VALUES ($1, $2, $3)",
                [wfId, n2.rows[0].id, n3.rows[0].id]
            );
        }

        console.log("Check and seed complete.");
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAndSeed();
