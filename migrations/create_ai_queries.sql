-- ============================================================
-- KiMiS AI Query Log Table Migration
-- Run this once against your `kimis` PostgreSQL database.
-- ============================================================

-- Stores every AI query for auditing / analytics purposes.
-- The `keywords` column uses a text array (native PostgreSQL type).
-- The route logs silently — this table is optional but recommended.

CREATE TABLE IF NOT EXISTS ai_queries (
    id           SERIAL       PRIMARY KEY,
    workspace_id INTEGER      NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      INTEGER      NOT NULL REFERENCES users(id)      ON DELETE SET NULL,
    query        TEXT         NOT NULL,
    keywords     TEXT[]       DEFAULT '{}',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for efficient workspace-level audit queries
CREATE INDEX IF NOT EXISTS idx_ai_queries_workspace
    ON ai_queries (workspace_id, created_at DESC);

-- Index for per-user query history
CREATE INDEX IF NOT EXISTS idx_ai_queries_user
    ON ai_queries (user_id, created_at DESC);
