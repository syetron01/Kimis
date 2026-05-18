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

// Sub-resources first
app.use('/api/workspaces/:workspaceId/members', require('./routes/members'));
app.use('/api/workspaces/:workspaceId/articles', require('./routes/articles'));
app.use('/api/workspaces/:workspaceId/workflows', require('./routes/workflows'));
app.use('/api/workspaces/:wsId/ai', require('./routes/aiRoutes'));

// General resource last
app.use('/api/workspaces', require('./routes/workspaces'));

// ── Root ────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ── Start ───────────────────────────────────────────
const PORT = process.env.PORT || 8080;

// ── Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("GLOBAL ERROR HANDLER:", err);
    
    // Handle Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            message: "File too large. Maximum allowed size is 10MB."
        });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            message: "Unexpected file field."
        });
    }

    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});