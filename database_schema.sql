-- KiMiS Database Schema Dump
-- Generated automatically by Gemini CLI

-- Structure for table: users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    email CHARACTER VARYING NOT NULL,
    password CHARACTER VARYING NOT NULL,
    role CHARACTER VARYING DEFAULT 'user'::character varying,
    first_name CHARACTER VARYING,
    last_name CHARACTER VARYING,
    username CHARACTER VARYING,
    job_title CHARACTER VARYING,
    department CHARACTER VARYING,
    profile_picture TEXT
);

-- Structure for table: workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER NOT NULL DEFAULT nextval('workspaces_id_seq'::regclass),
    name CHARACTER VARYING NOT NULL,
    description TEXT,
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    profile_image CHARACTER VARYING
);

-- Structure for table: workspace_memberships
CREATE TABLE IF NOT EXISTS workspace_memberships (
    id INTEGER NOT NULL DEFAULT nextval('workspace_memberships_id_seq'::regclass),
    user_id INTEGER,
    workspace_id INTEGER,
    role CHARACTER VARYING NOT NULL,
    joined_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Structure for table: articles
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER NOT NULL DEFAULT nextval('articles_id_seq'::regclass),
    title CHARACTER VARYING NOT NULL,
    content TEXT NOT NULL,
    workspace_id INTEGER,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT false
);

-- Structure for table: article_tags
CREATE TABLE IF NOT EXISTS article_tags (
    id INTEGER NOT NULL DEFAULT nextval('article_tags_id_seq'::regclass),
    article_id INTEGER,
    tag CHARACTER VARYING NOT NULL
);

-- Structure for table: article_versions
CREATE TABLE IF NOT EXISTS article_versions (
    id INTEGER NOT NULL DEFAULT nextval('article_versions_id_seq'::regclass),
    article_id INTEGER,
    content_snapshot TEXT NOT NULL,
    edited_by INTEGER,
    edited_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Structure for table: workflows
CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER NOT NULL DEFAULT nextval('workflows_id_seq'::regclass),
    title CHARACTER VARYING NOT NULL,
    description TEXT,
    workspace_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Structure for table: workflow_nodes
CREATE TABLE IF NOT EXISTS workflow_nodes (
    id INTEGER NOT NULL DEFAULT nextval('workflow_nodes_id_seq'::regclass),
    workflow_id INTEGER,
    type CHARACTER VARYING NOT NULL DEFAULT 'action'::character varying,
    title CHARACTER VARYING NOT NULL,
    description TEXT,
    position_x DOUBLE PRECISION DEFAULT 0,
    position_y DOUBLE PRECISION DEFAULT 0,
    linked_article_id INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Structure for table: workflow_edges
CREATE TABLE IF NOT EXISTS workflow_edges (
    id INTEGER NOT NULL DEFAULT nextval('workflow_edges_id_seq'::regclass),
    workflow_id INTEGER,
    from_node_id INTEGER,
    to_node_id INTEGER,
    condition CHARACTER VARYING,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Structure for table: ai_queries
CREATE TABLE IF NOT EXISTS ai_queries (
    id INTEGER NOT NULL DEFAULT nextval('ai_queries_id_seq'::regclass),
    workspace_id INTEGER,
    user_id INTEGER,
    query TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

