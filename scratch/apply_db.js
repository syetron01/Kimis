require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runUpdate() {
    try {
        console.log("Applying database updates...");
        const sql = fs.readFileSync(path.join(__dirname, 'db_update.sql'), 'utf8');
        await pool.query(sql);
        console.log("Database updated successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Database update failed:", err.message);
        process.exit(1);
    }
}

runUpdate();
