# KiMiS System Structure

# 1. Project Overview

* **System Name**: KiMiS (Knowledge Intelligence Management System)
* **Description**: A modular web application designed for collaborative workspace management, documentation, and visual process mapping.
* **Purpose**: To provide teams with a centralized platform to store knowledge articles and visualize complex workflows through interactive graph-based engines.
* **Target Users**: Teams, Project Managers, Knowledge Base Administrators, and Process Designers.

---

# 2. System Architecture

* **High-Level Architecture**: REST-based Client-Server architecture.
* **Main Components**:
    * **Frontend**: Vanilla HTML5, CSS3, and Modular JavaScript (ES6+).
    * **Backend**: Node.js with Express framework.
    * **Database**: PostgreSQL (Relational Database Management System).
    * **Storage**: Local filesystem for profile picture uploads (`/uploads`).
* **Current Communication Flow**:
    1.  **Request**: Frontend sends HTTP requests (JSON) via Fetch API.
    2.  **Middleware**: Backend validates JWT tokens and verifies Workspace-level permissions (RBAC).
    3.  **Logic**: Route handlers interact with the PostgreSQL connection pool.
    4.  **Response**: Backend returns structured JSON responses and HTTP status codes.

---

# 3. Feature Breakdown

### Basic Features
* **Authentication**: Secure Login and Registration with profile picture support. (Implemented)
* **User Profiles**: View and update personal information and job details. (Implemented)
* **Health Monitoring**: API endpoint for system and database connectivity checks. (Implemented)

### Essential Features
* **Workspace Management**: Logical containers for teams and projects. (Implemented)
* **Role-Based Access Control (RBAC)**: Dual-layer permissions (Global and Workspace-specific). (Implemented)
* **Knowledge Base (KB)**: Markdown-supported article creation, tagging, and history versioning. (Implemented)

### Unique Features
* **Visual Workflow Engine**: A directed graph system to map processes using Nodes and Edges. (Implemented)
* **Contextual Linkage**: Ability to link Knowledge Articles directly to Workflow Nodes. (Implemented)
* **Dynamic Graph Persistence**: Saving node coordinates for persistent visual layouts. (Implemented)

---

# 4. Module-by-Module Structure

## Auth Module
* **Description**: Handles user entry and system security.
* **Responsibilities**: Registration, Login, Token generation (JWT).
* **Current Status**: Implemented.
* **Inputs**: User credentials (email, password), Profile data.
* **Outputs**: JWT Token, Authentication status.
* **Dependencies**: `jsonwebtoken`, `multer`.

## User Module
* **Description**: Manages personal user data and system-wide roles.
* **Responsibilities**: Profile updates, Global role assignment (Admin/User).
* **Current Status**: Implemented.
* **Inputs**: Profile metadata, Uploaded images.
* **Outputs**: User profile object, Admin dashboard data.
* **Dependencies**: Auth Module, Database.

## Workspace Module
* **Description**: Core container for all collaboration features.
* **Responsibilities**: CRUD for workspaces, Workspace ownership tracking.
* **Current Status**: Implemented.
* **Inputs**: Workspace name/description.
* **Outputs**: Workspace metadata, List of user workspaces.
* **Dependencies**: Auth Module.

## Knowledge Article (KB) Module
* **Description**: Documentation and information management system.
* **Responsibilities**: Markdown rendering support, Tagging, Soft-delete/Archiving, Version snapshots.
* **Current Status**: Implemented.
* **Inputs**: Markdown content, Title, Tags.
* **Outputs**: Rendered articles, Version history.
* **Dependencies**: Workspace Module, Database.

## Workflow Engine Module
* **Description**: Graphical process mapper.
* **Responsibilities**: Node management (Start, Action, Decision, End), Edge creation with conditions, Visual layout persistence.
* **Current Status**: Implemented.
* **Inputs**: Node coordinates, Node metadata, Edge source/target IDs.
* **Outputs**: Full workflow graph (Nodes + Edges).
* **Dependencies**: KB Module (for article linking), Workspace Module.

---

# 5. Data Flow (CURRENT SYSTEM ONLY)

* **User Interactions**: Users sign in, select a workspace, and either write documentation (Articles) or draw processes (Workflows).
* **API Flow**: 
    1.  Frontend requests protected resource.
    2.  `authenticateToken` middleware verifies the user identity.
    3.  `requireWorkspaceRole` middleware verifies permission within that specific workspace.
    4.  Route handler executes SQL query using parameterized statements.
* **Database Interactions**: 
    *   Transactional writes for Workspace creation (Atomic Workspace + Membership).
    *   Versioning triggers for Article updates.
    *   Cascade deletes for Workflows (removes nodes/edges automatically).

---

# 6. API Overview

| Endpoint | Method | Purpose | Related Module |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | Authenticate user and return JWT | Auth |
| `/api/auth/register` | POST | Create new user account | Auth |
| `/api/me` | GET/PUT | Manage current user profile | User |
| `/api/workspaces` | GET/POST | List and create workspaces | Workspace |
| `/api/workspaces/:wsId/members` | GET/POST/PUT | Manage workspace team roles | Member |
| `/api/workspaces/:wsId/articles` | GET/POST/PUT/DELETE | Full KB management | KB Module |
| `/api/workspaces/:wsId/workflows` | GET/POST/PUT/DELETE | Manage visual workflows | Workflow Engine |
| `/api/workspaces/:wsId/workflows/:wfId/graph` | GET | Retrieve full node/edge data | Workflow Engine |

---

# 7. Database Overview

* **Tables**:
    *   `users`: ID, Email, Password, Global Role, Profile metadata.
    *   `workspaces`: ID, Name, Description, Created_by.
    *   `workspace_memberships`: User_ID, Workspace_ID, Role (Owner, Admin, Editor, Viewer).
    *   `articles`: ID, Title, Content, Workspace_ID, is_archived.
    *   `article_tags`: Article_ID, Tag.
    *   `article_versions`: Article_ID, Content_Snapshot, Edited_by.
    *   `workflows`: ID, Title, Workspace_ID.
    *   `workflow_nodes`: ID, Workflow_ID, Type, Title, Coordinates, Linked_Article_ID.
    *   `workflow_edges`: ID, Workflow_ID, From_Node, To_Node, Condition.

---

# 8. AI Module (PLANNED – NOT YET IMPLEMENTED)

## Status
Planned / Not Yet Implemented.

## Intended Purpose
To provide an "Intelligence Layer" that can answer questions based on the Knowledge Articles and suggest workflow paths based on existing process maps.

## Planned Features
* **Keyword-based query input**: User asks a question in natural language.
* **NLP keyword matching**: Scanning Articles and Node titles for relevant keywords.
* **Structured retrieval logic**: Pulling snippets from linked articles to formulate an answer.
* **Step-by-step response generation**: Explaining a workflow path to the user based on the visual graph.

## Expected Flow (Conceptual Only)
1. User enters query in the AI Search bar.
2. AI Module parses query for Workspace-specific keywords.
3. System retrieves matching Knowledge Articles and Workflow nodes.
4. System assembles a "Path Recommendation" or "Answer" based on the retrieved data.

## Dependencies
* **Knowledge Articles**: Source of truth for raw information.
* **Workflow Engine**: Source of truth for process logic.
* **API Layer**: Secure transport of queries and responses.

---

# 9. User Roles & Permissions

* **Global Roles**:
    *   **Admin**: Access to `/api/admin-data`, can view system metrics.
    *   **User**: Standard system access.
* **Workspace Roles**:
    *   **Owner**: Full control, can delete workspace and manage all roles.
    *   **Admin**: Manage members (except Owner), manage content.
    *   **Editor**: Can create and edit Articles and Workflows.
    *   **Viewer**: Read-only access to articles and visual maps.

---

# 10. Workflow Engine Overview

* **Current Capabilities**: 
    *   Supports logical branching via "Decision" nodes.
    *   Allows "Notes" for unstructured annotation within the graph.
    *   Links process steps to deep documentation (Articles).
* **Usage**: Workflows are created per workspace. Users add nodes and connect them with edges to visualize business processes or logic flows.

---

# 11. System Integration

* **Working**: 
    *   Frontend-to-Backend API connectivity.
    *   JWT Security across all routes.
    *   PostgreSQL relational integrity (Foreign keys, Cascades).
* **Pending**:
    *   AI Intelligence Layer integration.
    *   Real-time collaboration (WebSockets).

---

# 12. Development Status Summary

* **Completed Modules**: Auth, User, Workspace, Member, Knowledge Articles, Workflow Engine (Graph).
* **In-Progress Modules**: None.
* **Pending Modules**: AI Intelligence Module.

---

# 13. Developer Notes

* **Assumptions**: Users have a modern browser with `localStorage` support for JWT storage.
* **Limitations**: Currently supports single-file uploads for profile pictures only; article images are not yet implemented.
* **Next Steps**: Initialize the AI Module by defining a keyword extraction service and a search indexing route.
