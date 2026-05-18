require('dotenv').config();
const pool = require('../config/db');

async function alterWorkspaces() {
    try {
        await pool.query("ALTER TABLE workspaces ADD COLUMN profile_image VARCHAR;");
        console.log("Column profile_image added to workspaces.");
    } catch (e) {
        if (e.code === '42701') {
            console.log("Column already exists.");
        } else {
            console.error("Error modifying database:", e);
        }
    } finally {
        process.exit();
    }
}

alterWorkspaces();
