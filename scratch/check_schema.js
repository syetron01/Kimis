require('dotenv').config();
const pool = require('../config/db');

async function checkSchema() {
    try {
        const wfNodes = await pool.query(
            'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
            ['workflow_nodes']
        );
        console.log('workflow_nodes columns:', wfNodes.rows.map(r => r.column_name));

        const arts = await pool.query(
            'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
            ['articles']
        );
        console.log('articles columns:', arts.rows.map(r => r.column_name));

        const artTags = await pool.query(
            'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
            ['article_tags']
        );
        console.log('article_tags columns:', artTags.rows.map(r => r.column_name));

    } catch (err) {
        console.error('DB ERROR:', err.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
