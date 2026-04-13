require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ── Core Middleware ──────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Static Files ────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Route Mounting ──────────────────────────────────
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/users'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/workspaces/:workspaceId/members', require('./routes/members'));
app.use('/api/workspaces/:workspaceId/articles', require('./routes/articles'));
app.use('/api/workspaces/:workspaceId/workflows', require('./routes/workflows'));

// ── Root ────────────────────────────────────────────
app.get('/', (req, res) => {
    res.send('Server is up and running! Please access the login endpoint.');
});

// ── Start ───────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});